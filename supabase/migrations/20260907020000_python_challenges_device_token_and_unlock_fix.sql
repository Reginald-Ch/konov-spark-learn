-- Found during a dedicated audit of the Python Challenges system.
--
-- 1) CRITICAL, live: PythonChallengesPanel.tsx's unlock-gate check calls
--    get_my_lesson_progress WITHOUT a p_device_token argument (it just
--    reads `{ p_participant_email: normalizedEmail }`, no token field at
--    all). Since 20260904000000 hardened that RPC's signature to
--    `(p_participant_email, p_device_token DEFAULT NULL)` with
--    `p_device_token IS NULL` as one of its unconditional "return empty"
--    branches, every call from this specific caller has been getting back
--    zero progress rows regardless of how many lessons the student has
--    actually passed — the caller simply never got updated to match the
--    signature change, the same class of drift already found and fixed
--    elsewhere this session. Concretely: `isUnlocked = total > 0 &&
--    passed >= total` can never be true once any lesson is published,
--    since `passed` is always computed as 0. Python Challenges — an
--    entire advertised "advanced track" feature — has been permanently
--    locked for every student who has ever established a device token on
--    this browser (i.e. anyone who's used Chat/Daily Challenges/Build
--    Studio/Lessons before), independent of their real progress. This
--    migration doesn't touch get_my_lesson_progress itself (already
--    correct) — the matching client fix (passing p_device_token through)
--    ships alongside this migration.
--
-- 2) HIGH, privacy: get_my_python_challenge_progress has NEVER had
--    device-token verification — it's a bare
--    `get_my_python_challenge_progress(p_participant_email TEXT)`,
--    granted to anon/authenticated with zero identity check, unlike every
--    sibling get_my_* RPC in this app (get_my_lesson_progress,
--    get_my_projects, get_my_reward_boxes, etc., all hardened earlier
--    this session). python_challenge_attempts.last_submitted_code is a
--    student's actual private code submission — anyone holding the
--    public anon key could read any registered participant's full
--    challenge history and submitted code just by knowing/guessing their
--    email. Hardened here to the same verify-or-return-empty pattern
--    (read-only RPC, no minting needed).

DROP FUNCTION IF EXISTS public.get_my_python_challenge_progress(TEXT);

CREATE FUNCTION public.get_my_python_challenge_progress(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS SETOF public.python_challenge_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.python_challenge_attempts WHERE participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_python_challenge_progress(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_python_challenge_progress(TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
