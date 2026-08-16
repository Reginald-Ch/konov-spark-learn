-- Fixes a live, blocking bug: EVERY quiz submission has been failing with
-- "column reference \"passed\" is ambiguous" since 20260813060000 went live.
--
-- Root cause: submit_lesson_quiz's RETURNS TABLE declares an output column
-- named "passed" (RETURNS TABLE (..., passed BOOLEAN, ...)). In PL/pgSQL,
-- RETURNS TABLE columns are implicit OUT-parameter variables in scope for
-- the WHOLE function body — not just the final RETURN QUERY. Any bare,
-- unqualified "passed" inside a SQL statement in the body is genuinely
-- ambiguous to Postgres (does it mean the OUT variable or the
-- lesson_progress.passed column?), and fails at call time, not create time
-- — which is why this shipped invisibly and only broke on first real use.
--
-- get_quiz_questions has the identical class of bug: its RETURNS TABLE
-- declares "id" and "order_index" columns, which collide with the bare
-- "id"/"order_index" referenced in its own first-lesson bootstrap subquery
-- against public.lessons.
--
-- Both bugs were inherited verbatim from 20260802100000/20260802110000's
-- original function bodies, which — per this session's broader finding that
-- migration files were never actually applied to the live database until
-- now — had apparently never been exercised end-to-end against a real
-- Postgres instance before 20260813060000 finally shipped them live.
--
-- get_lesson_content is NOT touched: it RETURNS JSONB (no OUT-parameter
-- columns at all), so its own bare "id"/"order_index" bootstrap subquery has
-- nothing to collide with. Already confirmed working live.
--
-- Both signatures are unchanged (same return columns, same args), so
-- CREATE OR REPLACE is safe here — no DROP needed.

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_participant_email TEXT, p_lesson_id UUID)
RETURNS TABLE (id UUID, order_index INTEGER, question TEXT, options JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    -- Qualified with alias "l" — bare id/order_index here would collide
    -- with this function's own RETURNS TABLE columns of the same names.
    SELECT (p_lesson_id = (SELECT l.id FROM public.lessons l WHERE l.is_published = true ORDER BY l.order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  RETURN QUERY
  SELECT q.id, q.order_index, q.question, q.options
  FROM public.lesson_quiz_questions q
  WHERE q.lesson_id = p_lesson_id
  ORDER BY q.order_index;
END;
$$;

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
  v_lesson_coins INTEGER := 0;
  v_current_order INTEGER;
  v_next_lesson_id UUID;
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

  -- Qualified with alias "lp" — bare "passed" here collided with this
  -- function's own RETURNS TABLE "passed" column. This was the exact
  -- statement (and the UPDATE below) that produced the live
  -- "column reference \"passed\" is ambiguous" error on every submission.
  SELECT lp.passed INTO v_was_passed FROM public.lesson_progress lp
  WHERE lp.participant_email = p_participant_email AND lp.lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress lp
  SET attempts = lp.attempts + 1,
      best_score = GREATEST(lp.best_score, v_score),
      passed = lp.passed OR v_passed_now,
      completed_at = CASE WHEN lp.passed OR v_passed_now THEN COALESCE(lp.completed_at, now()) ELSE lp.completed_at END
  WHERE lp.participant_email = p_participant_email AND lp.lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_passed_now THEN
    v_lesson_coins := 10;
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'lesson_coin', v_lesson_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_complete', 'lesson_id', p_lesson_id));

    SELECT order_index INTO v_current_order FROM public.lessons WHERE id = p_lesson_id;
    SELECT id INTO v_next_lesson_id FROM public.lessons
      WHERE is_published = true AND order_index > v_current_order
      ORDER BY order_index ASC LIMIT 1;
    IF v_next_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, v_next_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, v_passed_now, v_lesson_coins, v_flags, v_explanations;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(TEXT, UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) TO anon, authenticated;
