-- Reward system simplification, per audit:
--
-- 1. Boost Tokens cut entirely. Confirmed earn-only with zero spend/redeem
--    mechanic anywhere in the app — a currency that only ever goes up with
--    no purpose is dead weight. "Finished on time" is already captured in
--    the score itself (the timeliness component of auto_score), so nothing
--    is lost by removing the separate currency wrapped around it.
--
-- 2. Forge Keys merged into Forge Coins. Keys had the exact same problem as
--    Boost Tokens (earn-only, nothing to spend them on) AND the coin
--    economy had a real, confirmed fairness bug: signup grants a one-time
--    100 coins, every lesson costs 10, and there was NO ongoing way to earn
--    more — a participant unlocking eagerly early on hits a permanent wall
--    with no path forward except an organizer manually granting more.
--    Replacing the key-milestone awards with coin bonuses fixes both
--    problems in one move: one fewer currency to track, and a real,
--    sustainable "keep learning, keep earning" loop instead of a dead end.
--    Amounts: 30 coins per 3-lesson milestone (was 1 key), 50 coins on a
--    challenge's first finalization (was 1 key) — challenges are a bigger
--    commitment than a single lesson, so a bigger bonus.

-- submit_lesson_quiz: key_awarded (boolean) becomes bonus_coins_awarded
-- (integer, 0 or 30) — a genuine return-type change, so CREATE OR REPLACE
-- can't be used; the old signature has to be dropped first.
DROP FUNCTION IF EXISTS public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]);

CREATE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, bonus_coins_awarded INTEGER, correct_flags BOOLEAN[], explanations TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_idx INTEGER := 1;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_flags BOOLEAN[] := ARRAY[]::BOOLEAN[];
  v_explanations TEXT[] := ARRAY[]::TEXT[];
  v_was_passed BOOLEAN;
  v_passed_count INTEGER;
  v_bonus_coins INTEGER := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;

  FOR v_question IN
    SELECT correct_index, explanation FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id ORDER BY order_index
  LOOP
    IF p_answers[v_idx] IS NOT NULL AND p_answers[v_idx] = v_question.correct_index THEN
      v_score := v_score + 1;
      v_flags := v_flags || true;
    ELSE
      v_flags := v_flags || false;
    END IF;
    v_explanations := v_explanations || COALESCE(v_question.explanation, '');
    v_idx := v_idx + 1;
  END LOOP;

  SELECT passed INTO v_was_passed FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress
  SET attempts = attempts + 1,
      best_score = GREATEST(best_score, v_score),
      passed = passed OR (v_score >= 5),
      completed_at = CASE WHEN passed OR v_score >= 5 THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_score >= 5 THEN
    SELECT COUNT(*) INTO v_passed_count FROM public.lesson_progress WHERE participant_email = p_participant_email AND passed = true;
    IF v_passed_count % 3 = 0 THEN
      v_bonus_coins := 30;
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_coin_grant', v_bonus_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_milestone_bonus', 'lesson_id', p_lesson_id, 'lessons_passed', v_passed_count));
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, (v_score >= 5), v_bonus_coins, v_flags, v_explanations;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) TO anon, authenticated;

-- merge_submission_score: return signature is unchanged (auto_score,
-- judge_score, total_sp, status) — only the internal award logic changes,
-- so a plain CREATE OR REPLACE is fine here. p_on_time is kept in the
-- signature (now unused in the body) rather than dropped, so the existing
-- caller in admin-actions doesn't need to change — it was only ever used
-- to gate the now-removed Boost Token award.
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

    -- Bonus coins only on the FIRST finalization of this submission —
    -- re-grading (auto-grade re-run, judge correction) never mints extras.
    -- Boost Token award removed entirely (see migration header) — on-time
    -- completion is still reflected in the score itself via the
    -- timeliness component of auto_score, just not as a separate currency.
    IF NOT v_was_finalized THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_coin_grant', 50, p_hackathon_id,
        jsonb_build_object('reason', 'challenge_completion_bonus', 'submission_id', p_submission_id, 'challenge_id', p_challenge_id));
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_auto, v_new_judge, v_total_sp, (CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN) TO service_role;

-- Both forge_key and boost_token are now permanently retired — nothing
-- inserts them anymore, but keep blocking direct client insertion of the
-- names for consistency with the rest of this policy (harmless either way).
