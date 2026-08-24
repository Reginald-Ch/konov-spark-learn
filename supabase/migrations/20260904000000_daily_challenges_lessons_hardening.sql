-- Deep-audit sweep of DailyChallengePanel.tsx and LessonsPanel.tsx.
--
-- 1) register_for_hackathon: a genuinely NEW RPC. RegistrationModal.tsx and
--    src/lib/identity.ts's ensureHackathonRegistration() (called from
--    Publish, Lessons, Daily Challenges, wherever a real name/email is
--    first captured) both did a raw `supabase.from('hackathon_registrations')
--    .insert(...)`. That table's anon/authenticated privileges were
--    correctly revoked in 20260903000001 (closing a real "anyone can write
--    anything" hole) — but no replacement RPC was ever added, so EVERY
--    registration path in the app has been silently failing with a
--    permission-denied error since that migration went live. This is a
--    process gap from that earlier fix, caught by this session's Daily
--    Challenges audit. Mints a device token on first use (same as
--    submit_challenge_entry) since Registration is often a participant's
--    very first identity-establishing action in the app.
--
-- 2) get_my_projects: gains a hackathon_id column. DailyChallengePanel.tsx's
--    "link a FORGE project" dropdown filters the RPC's results by
--    `p.hackathon_id === hackathonId` client-side — but the RPC never
--    returned that column (only id/project_name/is_published/updated_at),
--    so every row's hackathon_id was undefined and the filter always
--    produced an empty list. The dropdown has been permanently empty since
--    this RPC's return shape was narrowed in 20260808232003. ProjectGallery
--    (this RPC's other caller) ignores the extra column, so this is a safe
--    additive change.
--
-- 3) get_my_lesson_progress: gains device-token verification. This RPC was
--    conspicuously absent from 20260903000002's hardening sweep (which
--    fixed get_my_point_events/get_my_lesson_coin_points/
--    get_my_latest_hackathon_registration/get_my_challenge_submissions) —
--    it sits in the exact same client-side Promise.all as
--    get_my_lesson_coin_points, which WAS fixed. A clear miss, not an
--    intentional exception: anyone holding the public anon key could call
--    this with any participant's email and read their full lesson
--    completion history. Read-only, no side effects — verify-or-return-
--    empty, no minting, matching get_my_lesson_coin_points' own pattern.
--
-- 4) get_lesson_content / get_quiz_questions: gain device-token
--    verification. Same gap as #3 — anyone could pass a classmate's email
--    to read lesson content/quiz questions for any lesson that email has
--    unlocked, or probe which lessons a specific participant has reached.
--    Unlike get_my_lesson_progress, these two have a first-lesson
--    auto-unlock INSERT side effect (a brand new participant's very first
--    call is what unlocks Lesson 1 for them) — so unlike the pure reads,
--    these mint a device token on first use rather than rejecting an
--    identity with no token yet, or a genuinely new participant could never
--    open their first lesson at all.

CREATE OR REPLACE FUNCTION public.register_for_hackathon(
  p_hackathon_id UUID,
  p_participant_name TEXT,
  p_participant_email TEXT,
  p_device_token TEXT DEFAULT NULL,
  p_participant_phone TEXT DEFAULT NULL,
  p_skills TEXT DEFAULT NULL,
  p_experience_level TEXT DEFAULT NULL,
  p_looking_for_team BOOLEAN DEFAULT false
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, already_registered BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_name TEXT := trim(coalesce(p_participant_name, ''));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_row_count INT;
BEGIN
  IF v_email = '' OR v_name = '' THEN
    RETURN QUERY SELECT false, 'Name and email are required', NULL::TEXT, false;
    RETURN;
  END IF;
  IF p_hackathon_id IS NULL THEN
    RETURN QUERY SELECT false, 'No hackathon specified', NULL::TEXT, false;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — register from there, or use a different email.', NULL::TEXT, false;
    RETURN;
  END IF;

  -- ON CONFLICT DO NOTHING — a re-registration attempt (e.g. the
  -- best-effort ensureHackathonRegistration seed firing after a student
  -- already formally registered) must never clobber a fuller registration
  -- with a partial one (identity.ts's callers often only have name+email,
  -- not phone/skills/experience_level).
  INSERT INTO public.hackathon_registrations (hackathon_id, participant_name, participant_email, participant_phone, skills, experience_level, looking_for_team)
  VALUES (p_hackathon_id, v_name, v_email, p_participant_phone, p_skills, p_experience_level, coalesce(p_looking_for_team, false))
  ON CONFLICT (hackathon_id, participant_email) DO NOTHING;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN QUERY SELECT true,
    CASE WHEN v_row_count > 0 THEN 'Registered' ELSE 'Already registered' END,
    v_minted_token,
    (v_row_count = 0);
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_hackathon(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_for_hackathon(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_projects(TEXT, TEXT);

CREATE FUNCTION public.get_my_projects(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id uuid, project_name text, is_published boolean, updated_at timestamp with time zone, hackathon_id uuid)
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

  RETURN QUERY
    SELECT p.id, p.project_name, p.is_published, p.updated_at, p.hackathon_id
    FROM public.ai_projects p
    WHERE lower(trim(p.author_email)) = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_projects(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_projects(TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_lesson_progress(TEXT);

CREATE FUNCTION public.get_my_lesson_progress(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS SETOF public.lesson_progress
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

  RETURN QUERY SELECT * FROM public.lesson_progress WHERE participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_lesson_progress(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_lesson_progress(TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_lesson_content(TEXT, UUID);

-- Return shape changed from a bare JSONB blob to a one-row table wrapping
-- it — needed so a freshly-minted token has somewhere to go back to the
-- client (mirroring every other mint-on-first-use RPC's new_device_token
-- output), without hacking it into the lesson content payload itself,
-- which the client parses as literal lesson content.
CREATE FUNCTION public.get_lesson_content(p_participant_email TEXT, p_lesson_id UUID, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (content JSONB, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
  v_minted_token TEXT;
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing participant email';
  END IF;

  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RAISE EXCEPTION 'This email is already active on another device — open lessons from there, or use a different email.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = v_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT l.id FROM public.lessons l WHERE l.is_published = true ORDER BY l.order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (v_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  RETURN QUERY
    SELECT lc.content, v_minted_token FROM public.lesson_content lc WHERE lc.lesson_id = p_lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_content(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_content(TEXT, UUID, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_quiz_questions(TEXT, UUID);

CREATE FUNCTION public.get_quiz_questions(p_participant_email TEXT, p_lesson_id UUID, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, order_index INTEGER, question TEXT, options JSONB, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
  v_minted_token TEXT;
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing participant email';
  END IF;

  -- By the time a participant reaches a quiz, get_lesson_content has
  -- already minted a token for a genuinely new identity and the client has
  -- round-tripped it back — this mint branch only fires at all if
  -- get_quiz_questions is somehow the very first call for this email.
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RAISE EXCEPTION 'This email is already active on another device — open lessons from there, or use a different email.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = v_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT l.id FROM public.lessons l WHERE l.is_published = true ORDER BY l.order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (v_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  RETURN QUERY
  SELECT q.id, q.order_index, q.question, q.options, v_minted_token
  FROM public.lesson_quiz_questions q
  WHERE q.lesson_id = p_lesson_id
  ORDER BY q.order_index;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(TEXT, UUID, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
