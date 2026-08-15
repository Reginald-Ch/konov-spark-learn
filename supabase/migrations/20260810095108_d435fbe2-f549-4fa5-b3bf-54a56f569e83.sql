-- 1. Idempotency: one lesson_coin award per participant per lesson
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lesson_coin_per_lesson
  ON public.point_events (participant_email, (metadata->>'lesson_id'))
  WHERE event_type = 'lesson_coin';

-- 2. Challenge SP must be written as 'daily_challenge_sp' (what the leaderboard + unique index expect)
CREATE OR REPLACE FUNCTION public.merge_submission_score(p_submission_id uuid, p_hackathon_id uuid, p_challenge_id uuid, p_participant_email text, p_auto_score integer DEFAULT NULL::integer, p_auto_breakdown jsonb DEFAULT NULL::jsonb, p_judge_score integer DEFAULT NULL::integer, p_judge_breakdown jsonb DEFAULT NULL::jsonb, p_on_time boolean DEFAULT false)
 RETURNS TABLE(auto_score integer, judge_score integer, total_sp integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.submission_scores; v_total integer; v_status text;
BEGIN
  INSERT INTO public.submission_scores (submission_id, auto_score, auto_breakdown, judge_score, judge_breakdown, status)
  VALUES (p_submission_id, p_auto_score, p_auto_breakdown, p_judge_score, p_judge_breakdown, 'pending')
  ON CONFLICT (submission_id) DO UPDATE SET
    auto_score = COALESCE(EXCLUDED.auto_score, public.submission_scores.auto_score),
    auto_breakdown = COALESCE(EXCLUDED.auto_breakdown, public.submission_scores.auto_breakdown),
    judge_score = COALESCE(EXCLUDED.judge_score, public.submission_scores.judge_score),
    judge_breakdown = COALESCE(EXCLUDED.judge_breakdown, public.submission_scores.judge_breakdown)
  RETURNING * INTO v_row;

  v_total := COALESCE(v_row.auto_score, 0) + COALESCE(v_row.judge_score, 0) + CASE WHEN p_on_time THEN 5 ELSE 0 END;
  v_status := CASE WHEN v_row.judge_score IS NOT NULL THEN 'finalized' ELSE 'pending' END;

  UPDATE public.submission_scores
  SET total_sp = v_total, status = v_status, scored_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  IF v_status = 'finalized' THEN
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (lower(trim(p_participant_email)), 'daily_challenge_sp', v_total, p_hackathon_id,
            jsonb_build_object('challenge_id', p_challenge_id, 'submission_id', p_submission_id))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_row.auto_score, v_row.judge_score, v_row.total_sp, v_row.status;
END; $function$;

-- 3. Lesson pass also emits lesson_coin (learning-record axis used by the Learning Leaderboard)
CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(p_participant_email text, p_hackathon_id uuid, p_lesson_id uuid, p_answers integer[])
 RETURNS TABLE(score integer, total integer, passed boolean, key_awarded boolean, bonus_coins_awarded integer, correct_flags boolean[], explanations text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Learning-record coins: fixed 10 per lesson passed, lifetime scope.
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'lesson_coin', 10, p_hackathon_id,
            jsonb_build_object('lesson_id', p_lesson_id))
    ON CONFLICT DO NOTHING;

    -- Spendable Forge Coins bonus (perfect score pays more)
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
END; $function$;