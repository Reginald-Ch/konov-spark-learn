-- mergeAndUpsertScore (shared by grade_submission and auto_grade_challenge)
-- did SELECT existing row → compute in JS → upsert, as separate round trips.
-- If auto-grading and a manual judge grade land on the SAME submission at
-- close to the same moment (a real scenario: "Auto-Grade All" runs for a
-- while over many submissions while a judge is grading in parallel), both
-- reads can see the same stale "before" state, and whichever upsert commits
-- second silently overwrites the first's half of the score — a lost update.
-- One judge's score, or the whole auto-grade result, could vanish with no
-- error to anyone.
--
-- Fix: do the whole read-merge-write as one SQL statement using SELECT ...
-- FOR UPDATE to hold a real row lock for the duration — a concurrent call
-- for the same submission now blocks and re-reads the true post-commit
-- state instead of racing off a stale one.
CREATE OR REPLACE FUNCTION public.merge_submission_score(
  p_submission_id UUID,
  p_hackathon_id UUID,
  p_challenge_id UUID,
  p_participant_email TEXT,
  p_auto_score INTEGER,
  p_auto_breakdown JSONB,
  p_judge_score INTEGER,
  p_judge_breakdown JSONB,
  p_on_time BOOLEAN
)
RETURNS TABLE (auto_score INTEGER, judge_score INTEGER, total_sp INTEGER, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.submission_scores;
  v_was_finalized BOOLEAN;
  v_new_auto INTEGER;
  v_new_judge INTEGER;
  v_new_auto_breakdown JSONB;
  v_new_judge_breakdown JSONB;
  v_is_finalized BOOLEAN;
  v_total_sp INTEGER;
BEGIN
  -- Ensure a row exists, then lock it — INSERT ... ON CONFLICT DO NOTHING is
  -- itself atomic, so this never races even on the very first grade.
  INSERT INTO public.submission_scores (submission_id, status)
  VALUES (p_submission_id, 'pending')
  ON CONFLICT (submission_id) DO NOTHING;

  SELECT * INTO v_row FROM public.submission_scores WHERE submission_id = p_submission_id FOR UPDATE;

  v_was_finalized := (v_row.status = 'finalized');
  v_new_auto := COALESCE(p_auto_score, v_row.auto_score);
  v_new_auto_breakdown := COALESCE(p_auto_breakdown, v_row.auto_breakdown);
  v_new_judge := COALESCE(p_judge_score, v_row.judge_score);
  v_new_judge_breakdown := COALESCE(p_judge_breakdown, v_row.judge_breakdown);
  v_is_finalized := (v_new_auto IS NOT NULL AND v_new_judge IS NOT NULL);
  v_total_sp := CASE WHEN v_is_finalized THEN v_new_auto + v_new_judge ELSE NULL END;

  UPDATE public.submission_scores SET
    auto_score = v_new_auto,
    auto_breakdown = v_new_auto_breakdown,
    judge_score = v_new_judge,
    judge_breakdown = v_new_judge_breakdown,
    total_sp = v_total_sp,
    status = CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END,
    scored_at = now()
  WHERE submission_id = p_submission_id;

  IF v_is_finalized THEN
    DELETE FROM public.point_events
    WHERE event_type = 'daily_challenge_sp' AND metadata->>'submission_id' = p_submission_id::text;

    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'daily_challenge_sp', v_total_sp, p_hackathon_id,
      jsonb_build_object('submission_id', p_submission_id, 'challenge_id', p_challenge_id));

    -- Key + Boost Token only on the FIRST finalization of this submission —
    -- re-grading (auto-grade re-run, judge correction) never mints extras.
    IF NOT v_was_finalized THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_key', 1, p_hackathon_id,
        jsonb_build_object('source', 'challenge', 'submission_id', p_submission_id, 'challenge_id', p_challenge_id));

      IF p_on_time THEN
        INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
        VALUES (p_participant_email, 'boost_token', 1, p_hackathon_id,
          jsonb_build_object('source', 'on_time_completion', 'submission_id', p_submission_id, 'challenge_id', p_challenge_id));
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_auto, v_new_judge, v_total_sp, (CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN) TO service_role;
