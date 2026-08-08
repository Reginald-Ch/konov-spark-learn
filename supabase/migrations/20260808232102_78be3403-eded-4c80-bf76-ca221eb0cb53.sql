DROP FUNCTION IF EXISTS public.submit_lesson_quiz(text, uuid, uuid, integer[]);

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_participant_email text, p_hackathon_id uuid, p_lesson_id uuid, p_answers integer[])
RETURNS TABLE(score integer, total integer, passed boolean, key_awarded boolean, bonus_coins_awarded integer, correct_flags boolean[], explanations text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  v_bonus INTEGER := 0;
BEGIN
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

  SELECT lp.passed INTO v_was_passed FROM public.lesson_progress lp
  WHERE lp.participant_email = p_participant_email AND lp.lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress lp
  SET attempts = lp.attempts + 1,
      best_score = GREATEST(lp.best_score, v_score),
      passed = lp.passed OR (v_score >= 5),
      completed_at = CASE WHEN lp.passed OR v_score >= 5 THEN COALESCE(lp.completed_at, now()) ELSE lp.completed_at END
  WHERE lp.participant_email = p_participant_email AND lp.lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_score >= 5 THEN
    -- First-time pass bonus coins (perfect score pays more)
    v_bonus := CASE WHEN v_total > 0 AND v_score = v_total THEN 25 ELSE 15 END;
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'forge_coin_grant', v_bonus, p_hackathon_id,
            jsonb_build_object('reason', 'lesson_quiz_pass', 'lesson_id', p_lesson_id));

    SELECT COUNT(*) INTO v_passed_count FROM public.lesson_progress lp
    WHERE lp.participant_email = p_participant_email AND lp.passed = true;
    IF v_passed_count % 3 = 0 THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_key', 1, p_hackathon_id,
              jsonb_build_object('source', 'lessons', 'lesson_id', p_lesson_id, 'lessons_passed', v_passed_count));
      v_key_awarded := true;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, (v_score >= 5), v_key_awarded, v_bonus, v_flags, v_explanations;
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(text, uuid, uuid, integer[]) TO anon, authenticated;
