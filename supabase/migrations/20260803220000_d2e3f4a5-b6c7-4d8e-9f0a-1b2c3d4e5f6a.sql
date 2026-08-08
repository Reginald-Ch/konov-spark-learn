-- submit_gallery_score had the same delete-then-insert pattern as the lesson
-- RPCs just fixed — two rapid submissions for the same (project, judge) pair
-- (a double-click, a flaky connection triggering a retry) could both DELETE
-- 0 rows then both INSERT, leaving two judge_score rows for one judge on one
-- project. The leaderboard averages per project across all judge_score rows,
-- so a duplicate silently double-weights that one judge's opinion.
--
-- Moved the whole operation into a locked RPC (same advisory-lock pattern as
-- unlock_lesson/submit_lesson_quiz) so admin-actions no longer does raw
-- delete+insert against point_events for this.
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
BEGIN
  IF p_judge_name IS NULL OR length(trim(p_judge_name)) = 0 THEN
    RAISE EXCEPTION 'judge_name is required';
  END IF;

  -- Locked per (project, judge) pair, not just the judge — two different
  -- judges scoring the same project concurrently should NOT block each
  -- other, only a judge racing against their own resubmission should.
  PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text || ':' || trim(p_judge_name)));

  DELETE FROM public.point_events
  WHERE event_type = 'judge_score'
    AND participant_email = p_participant_email
    AND metadata->>'project_id' = p_project_id::text
    AND metadata->>'judge_name' = trim(p_judge_name);

  INSERT INTO public.point_events (participant_email, event_type, points, metadata)
  VALUES (
    p_participant_email,
    'judge_score',
    GREATEST(0, LEAST(70, p_points)),
    jsonb_build_object('project_id', p_project_id, 'project_name', p_project_name, 'judge_name', trim(p_judge_name), 'feedback', COALESCE(p_feedback, ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;
