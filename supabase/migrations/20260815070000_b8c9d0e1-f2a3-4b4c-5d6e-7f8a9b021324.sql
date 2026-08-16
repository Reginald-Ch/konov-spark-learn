-- Participant profiles: username + preset emoji avatar, layered on top of
-- the existing email-based identity (email stays the real key everything —
-- coins, lesson progress, device tokens, chat — is already keyed by;
-- changing that would touch every feature built this session, which is why
-- this is additive, not a replacement).
--
-- Reads are public (username/avatar are meant to be shown everywhere a
-- participant's name currently is — chat, leaderboards — so this is no more
-- sensitive than a chat message itself). Writes go through an RPC gated by
-- the SAME participant_device_tokens TOFU check chat/voice/challenges use —
-- claiming a username is exactly the kind of "prove you're this email"
-- action that check exists for, so this reuses the one identity-
-- verification mechanism already in the app rather than inventing a
-- second one.

CREATE TABLE public.participant_profiles (
  participant_email TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness — "Ava" and "ava" are the same claimed
-- identity for anti-impersonation purposes, not two distinct usernames.
CREATE UNIQUE INDEX participant_profiles_username_lower_idx ON public.participant_profiles (lower(username));

ALTER TABLE public.participant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.participant_profiles
FOR SELECT USING (true);
-- No public INSERT/UPDATE policy — writes only via set_my_profile below.

CREATE OR REPLACE FUNCTION public.set_my_profile(
  p_participant_email TEXT,
  p_device_token TEXT,
  p_username TEXT,
  p_avatar_emoji TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_username TEXT := trim(coalesce(p_username, ''));
  v_existing_hash TEXT;
  v_minted_token TEXT;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT;
    RETURN;
  END IF;

  IF v_username !~ '^[A-Za-z0-9_]{3,20}$' THEN
    RETURN QUERY SELECT false, 'Username must be 3-20 characters: letters, numbers, and underscores only.', NULL::TEXT;
    RETURN;
  END IF;

  IF p_avatar_emoji IS NULL OR length(trim(p_avatar_emoji)) = 0 THEN
    RETURN QUERY SELECT false, 'Pick an avatar.', NULL::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.participant_profiles pp
    WHERE lower(pp.username) = lower(v_username) AND pp.participant_email <> v_email
  ) THEN
    RETURN QUERY SELECT false, 'That username is already taken — try another.', NULL::TEXT;
    RETURN;
  END IF;

  -- Same TOFU pattern as send_community_message/join_voice_room/etc. —
  -- first-ever identity action from a browser mints the shared device
  -- token; every later one (from any of these RPCs) must match it.
  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — set your profile from there, or use a different email.', NULL::TEXT;
    RETURN;
  END IF;

  -- ON CONFLICT above only covers the participant_email primary key, not
  -- the separate lower(username) unique index — the EXISTS check earlier
  -- only guards against a non-concurrent claim, so two different emails
  -- racing to claim the identical username within the same instant can
  -- still hit a real unique-violation here. Caught explicitly so that loses
  -- as a clean message, not a raw Postgres error.
  BEGIN
    INSERT INTO public.participant_profiles (participant_email, username, avatar_emoji, updated_at)
    VALUES (v_email, v_username, p_avatar_emoji, now())
    ON CONFLICT (participant_email) DO UPDATE
    SET username = v_username, avatar_emoji = p_avatar_emoji, updated_at = now();
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'That username was just taken — try another.', NULL::TEXT;
    RETURN;
  END;

  RETURN QUERY SELECT true, 'Profile saved', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_profile(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_profile(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
