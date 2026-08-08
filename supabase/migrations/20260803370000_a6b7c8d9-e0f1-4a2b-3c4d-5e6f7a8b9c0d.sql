-- Bug audit fix (item 4): gallery-judged code was never frozen anywhere —
-- JudgeDashboardPanel reads `code` LIVE off ai_projects at judging time,
-- but autosave (every 2 min while a project is dirty) keeps overwriting
-- that same column regardless of publish state, since save_own_project's
-- autosave path omits p_publish and COALESCE(p_publish, is_published)
-- only preserves the publish FLAG, not the code that was actually live
-- when a judge scored it. Unlike daily-challenge submissions (which
-- already snapshot via submitted_code_snapshot for exactly this reason),
-- there was no permanent record of what a judge actually reviewed — if
-- the code changed 5 minutes later, there'd be no way to ever check
-- whether a score still reflected reality, or to resolve a dispute.
--
-- Fix: snapshot `code` into gallery_feedback at the moment each judge
-- scores a project. Doesn't stop the code from changing afterward (that's
-- a bigger draft/live-split change, not taken on here) but does mean
-- every score now has a permanent, checkable record of what it was
-- actually scoring.

ALTER TABLE public.gallery_feedback ADD COLUMN IF NOT EXISTS code_snapshot TEXT;

CREATE OR REPLACE FUNCTION public.submit_gallery_score(
  p_project_id UUID,
  p_participant_email TEXT,
  p_points INTEGER,
  p_project_name TEXT,
  p_judge_name TEXT,
  p_feedback TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hackathon_id UUID;
  v_code_snapshot TEXT;
BEGIN
  IF p_judge_name IS NULL OR length(trim(p_judge_name)) = 0 THEN
    RAISE EXCEPTION 'judge_name is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gallery_judges WHERE judge_name = trim(p_judge_name)) THEN
    RAISE EXCEPTION 'Unknown judge — ask an organizer to add "%" to the judge roster first.', trim(p_judge_name);
  END IF;

  SELECT hackathon_id, code INTO v_hackathon_id, v_code_snapshot FROM public.ai_projects WHERE id = p_project_id;

  PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text || ':' || trim(p_judge_name)));

  DELETE FROM public.point_events
  WHERE event_type = 'judge_score'
    AND participant_email = p_participant_email
    AND metadata->>'project_id' = p_project_id::text
    AND metadata->>'judge_name' = trim(p_judge_name);

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (
    p_participant_email,
    'judge_score',
    GREATEST(0, LEAST(70, p_points)),
    v_hackathon_id,
    jsonb_build_object('project_id', p_project_id, 'project_name', p_project_name, 'judge_name', trim(p_judge_name))
  );

  -- Note: re-scoring (ON CONFLICT DO UPDATE) intentionally re-snapshots to
  -- whatever code is live NOW — that's correct, since a re-score means
  -- this judge is deliberately looking at it again at this moment.
  INSERT INTO public.gallery_feedback (project_id, participant_email, judge_name, feedback, code_snapshot)
  VALUES (p_project_id, p_participant_email, trim(p_judge_name), COALESCE(p_feedback, ''), v_code_snapshot)
  ON CONFLICT (project_id, judge_name) DO UPDATE SET
    feedback = EXCLUDED.feedback,
    participant_email = EXCLUDED.participant_email,
    code_snapshot = EXCLUDED.code_snapshot,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;
