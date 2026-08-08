-- Judge feedback (free-text commentary on a participant's project) was
-- stored inside point_events.metadata, and point_events has always had
-- `FOR SELECT USING (true)` — fully public, no restriction. That means any
-- participant could read every judge's private commentary on every
-- project via a direct query, with no auth required, even though no UI in
-- the app ever displayed it. Nothing currently reads metadata.feedback back
-- (grep-confirmed) so moving it out is a clean, zero-regression change.
--
-- Fixed by moving feedback into its own table with NO public policy at
-- all (service-role only) — everything else point_events already exposes
-- (points, project_id, judge_name) stays exactly where it is, since the
-- leaderboard and judge dashboard both still need to read that.
--
-- While in here: submit_gallery_score has never set hackathon_id on the
-- judge_score row it inserts (the column is nullable, so this never
-- errored — it just silently left it NULL). Any query filtering
-- point_events by hackathon_id for judge_score — which the project-score
-- leaderboard does — would therefore match zero rows, showing every
-- project's judge score as 0 regardless of how many points were actually
-- awarded. Fixed by deriving hackathon_id server-side from the project
-- itself (ai_projects.hackathon_id is already the reliable source of
-- truth used everywhere else) rather than trusting the client to pass the
-- right value.

CREATE TABLE public.gallery_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  judge_name TEXT NOT NULL,
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, judge_name)
);

ALTER TABLE public.gallery_feedback ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies at all — RLS with zero policies denies every
-- role but service_role's implicit bypass. Read access (if ever needed by
-- an organizer/judge UI) should go through admin-actions like every other
-- privileged read in this app, not a public SELECT policy.

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
BEGIN
  IF p_judge_name IS NULL OR length(trim(p_judge_name)) = 0 THEN
    RAISE EXCEPTION 'judge_name is required';
  END IF;

  SELECT hackathon_id INTO v_hackathon_id FROM public.ai_projects WHERE id = p_project_id;

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

  INSERT INTO public.gallery_feedback (project_id, participant_email, judge_name, feedback)
  VALUES (p_project_id, p_participant_email, trim(p_judge_name), COALESCE(p_feedback, ''))
  ON CONFLICT (project_id, judge_name) DO UPDATE SET
    feedback = EXCLUDED.feedback,
    participant_email = EXCLUDED.participant_email,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- Backfill any judge_score rows already submitted through the old version
-- of the function (gallery judging has been in real use, unlike the
-- project-score leaderboard this is being fixed for) — otherwise pre-existing
-- scores would stay permanently invisible to any hackathon_id-filtered query.
UPDATE public.point_events pe
SET hackathon_id = ap.hackathon_id
FROM public.ai_projects ap
WHERE pe.event_type = 'judge_score'
  AND pe.hackathon_id IS NULL
  AND pe.metadata->>'project_id' = ap.id::text;
