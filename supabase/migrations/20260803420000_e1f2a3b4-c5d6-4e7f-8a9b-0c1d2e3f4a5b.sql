-- Lessons system bug-hunt: two fixes to submit_lesson_quiz.
--
-- 1. Answer-key leak via free retakes. Retakes are free and unlimited by
--    design (no penalty for retrying), but every question's explanation
--    text was returned on EVERY attempt regardless of whether that question
--    was answered correctly — and explanation text typically restates the
--    correct answer in prose. A student could submit a throwaway/blank
--    attempt, read the full explanation set, then immediately retake with
--    the now-known answers for a guaranteed pass. Fix: on a FAILING
--    attempt, withhold the explanation for any question answered wrong
--    (only questions genuinely answered correctly this attempt still show
--    their explanation). Once an attempt actually PASSES, there's no cheat
--    left to protect — the milestone bonus can only fire once, the moment a
--    lesson first passes — so a passing attempt still returns full
--    explanations as a legitimate post-pass review.
--
-- 2. Hardcoded "score >= 5" pass threshold, independent of the actual
--    question count (v_total). Every lesson today happens to have exactly
--    7 questions, so this was never visibly broken, but it's a latent trap:
--    a future lesson authored with fewer than 5 questions would become
--    mathematically impossible to pass. Now scaled to the same ~71% bar
--    (5/7) against however many questions the lesson actually has.

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
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
  v_pass_threshold INTEGER;
  v_passed_now BOOLEAN;
  v_flags BOOLEAN[] := ARRAY[]::BOOLEAN[];
  v_explanations TEXT[] := ARRAY[]::TEXT[];
  v_was_passed BOOLEAN;
  v_passed_count INTEGER;
  v_bonus_coins INTEGER := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;
  v_pass_threshold := CEIL(v_total * 5.0 / 7);

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

  v_passed_now := (v_score >= v_pass_threshold);

  IF NOT v_passed_now THEN
    FOR v_idx IN 1..array_length(v_explanations, 1) LOOP
      IF NOT v_flags[v_idx] THEN
        v_explanations[v_idx] := '';
      END IF;
    END LOOP;
  END IF;

  SELECT passed INTO v_was_passed FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress
  SET attempts = attempts + 1,
      best_score = GREATEST(best_score, v_score),
      passed = passed OR v_passed_now,
      completed_at = CASE WHEN passed OR v_passed_now THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_passed_now THEN
    SELECT COUNT(*) INTO v_passed_count FROM public.lesson_progress WHERE participant_email = p_participant_email AND passed = true;
    IF v_passed_count % 3 = 0 THEN
      v_bonus_coins := 30;
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_coin_grant', v_bonus_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_milestone_bonus', 'lesson_id', p_lesson_id, 'lessons_passed', v_passed_count));
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, v_passed_now, v_bonus_coins, v_flags, v_explanations;
END;
$$;
