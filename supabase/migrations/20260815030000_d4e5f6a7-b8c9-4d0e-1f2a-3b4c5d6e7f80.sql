-- Atomic, race-safe persistence for Python Challenge attempts — same
-- advisory-lock pattern as submit_lesson_quiz (see 20260815000000_...sql),
-- because a submit-then-persist done as separate round trips from the edge
-- function could let two concurrent submissions both read stale
-- "not yet passed" state and both think they're the first pass.
--
-- Deliberately NOT granted to anon/authenticated (unlike every other RPC in
-- this codebase, which explicitly grants both). This function trusts
-- p_passed_count/p_total as given — the actual grading (running the
-- student's code against real test cases) can only happen in the
-- python-challenge-grade edge function, since that's the only place the
-- interpreter runs. If this RPC were callable directly via the normal
-- Supabase client, anyone could call it with p_passed_count = p_total and
-- claim a pass without ever running real code — REVOKE ALL FROM PUBLIC with
-- no compensating GRANT is what keeps this reachable only by the edge
-- function's service-role client, which bypasses grants entirely. Don't
-- "fix" this by adding the usual anon/authenticated grant.
CREATE OR REPLACE FUNCTION public.record_python_challenge_attempt(
  p_participant_email TEXT,
  p_challenge_id UUID,
  p_passed_count INTEGER,
  p_total INTEGER,
  p_code TEXT
)
RETURNS TABLE (passed BOOLEAN, bonus_coins_awarded INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_passed BOOLEAN;
  v_passed_now BOOLEAN;
  v_sticky_passed BOOLEAN;
  v_coin_reward INTEGER;
  v_bonus INTEGER := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email || ':' || p_challenge_id::text));

  SELECT pca.passed INTO v_was_passed
  FROM public.python_challenge_attempts pca
  WHERE pca.participant_email = p_participant_email AND pca.challenge_id = p_challenge_id;
  v_was_passed := COALESCE(v_was_passed, false);

  v_passed_now := (p_total > 0 AND p_passed_count = p_total);
  v_sticky_passed := v_was_passed OR v_passed_now;

  INSERT INTO public.python_challenge_attempts (participant_email, challenge_id, attempts, best_passed_count, total_tests, passed, last_submitted_code, completed_at)
  VALUES (p_participant_email, p_challenge_id, 1, p_passed_count, p_total, v_sticky_passed, p_code, CASE WHEN v_sticky_passed THEN now() ELSE NULL END)
  ON CONFLICT (participant_email, challenge_id) DO UPDATE
  SET attempts = public.python_challenge_attempts.attempts + 1,
      best_passed_count = GREATEST(public.python_challenge_attempts.best_passed_count, p_passed_count),
      total_tests = p_total,
      passed = v_sticky_passed,
      last_submitted_code = p_code,
      completed_at = CASE WHEN v_sticky_passed THEN COALESCE(public.python_challenge_attempts.completed_at, now()) ELSE public.python_challenge_attempts.completed_at END;

  -- First-pass-only, same as submit_lesson_quiz's lesson_coin award — a
  -- challenge that's already passed can't retrigger this via retakes.
  IF NOT v_was_passed AND v_passed_now THEN
    SELECT coin_reward INTO v_coin_reward FROM public.python_challenges WHERE id = p_challenge_id;
    v_bonus := COALESCE(v_coin_reward, 0);
    IF v_bonus > 0 THEN
      INSERT INTO public.point_events (participant_email, event_type, points, metadata)
      VALUES (p_participant_email, 'python_challenge_coin', v_bonus, jsonb_build_object('reason', 'python_challenge_complete', 'challenge_id', p_challenge_id));
    END IF;
  END IF;

  RETURN QUERY SELECT v_sticky_passed, v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.record_python_challenge_attempt(TEXT, UUID, INTEGER, INTEGER, TEXT) FROM PUBLIC;
