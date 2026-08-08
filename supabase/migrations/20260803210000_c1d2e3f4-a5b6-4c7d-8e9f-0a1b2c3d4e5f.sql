-- Race condition fix: unlock_lesson and submit_lesson_quiz both read a
-- participant's current state (coin balance / passed-lesson count), then
-- write based on what they read — classic time-of-check-time-of-use gap.
--
-- Concretely exploitable with nothing more exotic than an impatient double-
-- click or two open tabs:
--   - unlock_lesson: unlocking two DIFFERENT lessons at the same instant can
--     have both transactions read the same starting balance before either
--     commits its deduction, letting a participant unlock more lessons than
--     their coins actually cover (their balance goes negative).
--   - submit_lesson_quiz: passing two DIFFERENT lessons at the same instant
--     can have both transactions independently compute "this is my 3rd/6th/
--     9th lesson passed" from the same pre-commit count, awarding two Forge
--     Keys for what should only be one milestone.
--
-- Fix: a transaction-scoped advisory lock keyed by the participant's email,
-- taken as the first statement. Concurrent calls for the SAME participant
-- now queue instead of racing; different participants are unaffected (each
-- gets a different lock key) and every existing check remains correct — this
-- just makes sure a second concurrent call for the same person re-reads
-- fresh state instead of racing off a stale read.

CREATE OR REPLACE FUNCTION public.unlock_lesson(p_participant_email TEXT, p_hackathon_id UUID, p_lesson_id UUID)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
  v_published BOOLEAN;
  v_balance INTEGER;
  v_already BOOLEAN;
  v_coins_enabled BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT coin_cost, is_published INTO v_cost, v_published FROM public.lessons WHERE id = p_lesson_id;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Lesson not found';
    RETURN;
  END IF;
  IF NOT v_published THEN
    RETURN QUERY SELECT false, 'This lesson is not available yet';
    RETURN;
  END IF;

  IF p_hackathon_id IS NOT NULL THEN
    SELECT COALESCE((settings->>'coins_unlock_lessons')::boolean, true) INTO v_coins_enabled
    FROM public.hackathons WHERE id = p_hackathon_id;
    IF v_coins_enabled IS FALSE THEN
      RETURN QUERY SELECT false, 'Lesson unlocking is currently paused by the organizer for this event';
      RETURN;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already unlocked';
    RETURN;
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.point_events
  WHERE participant_email = p_participant_email
    AND hackathon_id = p_hackathon_id
    AND event_type IN ('forge_coin_grant', 'forge_coin_adjust');

  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, format('Not enough Forge Coins — you have %s, this costs %s', v_balance, v_cost);
    RETURN;
  END IF;

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (p_participant_email, 'forge_coin_adjust', -v_cost, p_hackathon_id, jsonb_build_object('reason', 'lesson_unlock', 'lesson_id', p_lesson_id));

  INSERT INTO public.lesson_progress (participant_email, lesson_id)
  VALUES (p_participant_email, p_lesson_id);

  RETURN QUERY SELECT true, 'Unlocked';
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, key_awarded BOOLEAN, correct_flags BOOLEAN[], explanations TEXT[])
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
  v_key_awarded BOOLEAN := false;
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
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_key', 1, p_hackathon_id, jsonb_build_object('source', 'lessons', 'lesson_id', p_lesson_id, 'lessons_passed', v_passed_count));
      v_key_awarded := true;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, (v_score >= 5), v_key_awarded, v_flags, v_explanations;
END;
$$;
