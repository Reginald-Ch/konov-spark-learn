-- Round 6 audit findings on submit_lesson_quiz:
--
-- 1. Zero-question free pass: v_pass_threshold := CEIL(v_total * 5.0 / 7)
--    with v_total = 0 evaluates to 0, and 0 >= 0 is true — a lesson that's
--    published but has no quiz questions authored yet (LessonsPanel.tsx's
--    own client-side guard already treats this as a real, expected
--    transient organizer state) could be "passed" for free by calling this
--    public RPC directly with p_answers: [], since nothing server-side
--    required v_total > 0.
--
-- 2. No device-token gating at all: unlike submit_challenge_entry and
--    claim_community_quest (both hardened earlier this session with the
--    same participant_device_tokens TOFU pattern), this RPC took a bare
--    self-asserted p_participant_email — anyone with the anon key could
--    force-complete any registered participant's lesson, mint lesson_coin
--    points onto their balance, and overwrite their lesson_progress row
--    just by knowing their email.
--
-- Signature gains p_device_token (appended, so existing positional callers
-- still bind correctly) and the return row gains new_device_token, matching
-- submit_challenge_entry's shape. RETURNS TABLE columns are otherwise
-- unchanged in order/type, but the column list changed so DROP is required.

DROP FUNCTION IF EXISTS public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]);

CREATE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[],
  p_device_token TEXT DEFAULT NULL
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, bonus_coins_awarded INTEGER, correct_flags BOOLEAN[], explanations TEXT[], new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
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
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing participant email';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_email));

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RAISE EXCEPTION 'This email is already active on another device — submit from there, or use a different email.';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;

  -- Was the entire vulnerability above: nothing stopped a zero-question
  -- lesson (a real, expected transient organizer state — see
  -- LessonsPanel.tsx's own client-side guard) from being "passed" for free.
  IF v_total = 0 THEN
    RAISE EXCEPTION 'This lesson has no quiz questions yet';
  END IF;

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

  SELECT lp.passed INTO v_was_passed FROM public.lesson_progress lp
  WHERE lp.participant_email = v_email AND lp.lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress lp
  SET attempts = lp.attempts + 1,
      best_score = GREATEST(lp.best_score, v_score),
      passed = lp.passed OR v_passed_now,
      completed_at = CASE WHEN lp.passed OR v_passed_now THEN COALESCE(lp.completed_at, now()) ELSE lp.completed_at END
  WHERE lp.participant_email = v_email AND lp.lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_passed_now THEN
    v_lesson_coins := 10;
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (v_email, 'lesson_coin', v_lesson_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_complete', 'lesson_id', p_lesson_id));

    SELECT order_index INTO v_current_order FROM public.lessons WHERE id = p_lesson_id;
    SELECT id INTO v_next_lesson_id FROM public.lessons
      WHERE is_published = true AND order_index > v_current_order
      ORDER BY order_index ASC LIMIT 1;
    IF v_next_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (v_email, v_next_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, v_passed_now, v_lesson_coins, v_flags, v_explanations, v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[], TEXT) TO anon, authenticated;
