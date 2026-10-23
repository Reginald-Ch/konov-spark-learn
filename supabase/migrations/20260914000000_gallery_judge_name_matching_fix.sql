-- Bug: submit_gallery_score matched judge_name against the gallery_judges
-- roster with a raw, case-sensitive, untrimmed equality check. The roster
-- itself is stored trimmed (JudgeDashboardPanel's "Add" trims before
-- insert), but the judge's login name typed on a different device/session
-- was never normalized before being sent here — a trailing space or
-- different capitalization ("John " vs "John", "john" vs "John") made an
-- otherwise-correct judge look "unknown" and silently reject the score
-- (thrown as an exception the client surfaced as "Failed to submit score").
-- This is the actual cause of judges reporting their scores "don't go
-- through" even after being added to the roster.
--
-- Fix: trim + case-fold both sides of every judge_name comparison here,
-- the same lower(trim(...)) idiom this file already uses for participant
-- emails. The trimmed (but original-case) name is still what's stored in
-- point_events.metadata, so display names in the UI are unaffected.

CREATE OR REPLACE FUNCTION public.submit_gallery_score(
  p_project_id uuid, p_participant_email text, p_points integer,
  p_project_name text, p_judge_name text, p_feedback text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hackathon_id uuid; v_judge_name text; v_is_judge boolean;
BEGIN
  v_judge_name := trim(p_judge_name);

  SELECT EXISTS(
    SELECT 1 FROM public.gallery_judges WHERE lower(judge_name) = lower(v_judge_name)
  ) INTO v_is_judge;
  IF NOT v_is_judge THEN
    RAISE EXCEPTION 'Unknown judge — add this judge to the roster first.';
  END IF;

  SELECT hackathon_id INTO v_hackathon_id FROM public.ai_projects WHERE id = p_project_id;

  DELETE FROM public.point_events
  WHERE event_type = 'judge_score'
    AND participant_email = lower(trim(p_participant_email))
    AND metadata->>'project_id' = p_project_id::text
    AND lower(metadata->>'judge_name') = lower(v_judge_name);

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (lower(trim(p_participant_email)), 'judge_score', GREATEST(0, LEAST(p_points, 70)), v_hackathon_id,
          jsonb_build_object('project_id', p_project_id, 'project_name', p_project_name,
                             'judge_name', v_judge_name, 'feedback', p_feedback));
END; $$;

REVOKE ALL ON FUNCTION public.submit_gallery_score(uuid, text, integer, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(uuid, text, integer, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
