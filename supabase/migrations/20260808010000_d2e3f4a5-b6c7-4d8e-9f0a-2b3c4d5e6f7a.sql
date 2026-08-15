-- Close the community chat sender-spoofing gap: the INSERT policy on
-- community_messages could check WHO a client claimed to be (not staff,
-- not muted, not posting to #announcements) but never verified the client
-- actually IS that email — anyone could insert a message with any
-- classmate's sender_email and have it render exactly as if they said it.
-- Real impersonation/harassment vector on a platform for teenagers, not
-- theoretical.
--
-- This app has no real authentication anywhere (participant identity is a
-- self-declared email everywhere — an accepted, documented tradeoff for
-- every RPC in this codebase), so a full login system is out of scope
-- here. What IS in scope, and what this does: extend the SAME
-- trust-on-first-use bearer-token pattern already used for staff messages
-- (see send_staff_message/redeem_staff_invite) to regular participants —
-- the first browser to ever send a message as a given email mints a
-- token that "owns" that identity going forward; a later send attempt for
-- the same email without the right token is rejected instead of silently
-- succeeding. Not real auth (nothing stops a race on someone's very first
-- message), but it closes the actual live exploit: casually typing a
-- classmate's already-active email to post as them.

CREATE TABLE public.participant_device_tokens (
  participant_email TEXT NOT NULL PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participant_device_tokens ENABLE ROW LEVEL SECURITY;
-- No public policies at all — only reachable via send_community_message
-- below, same "no direct table access" pattern as every other sensitive
-- write in this app.
GRANT ALL ON public.participant_device_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.send_community_message(
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, message_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_message_id UUID;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing sender email', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = p_channel_id AND cc.channel_type = 'announcement'
  ) THEN
    RETURN QUERY SELECT false, 'Only organizers can post in this channel', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_email) THEN
    RETURN QUERY SELECT false, 'This email belongs to a staff account — use your staff invite link to chat', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'You are currently muted', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    -- First time anyone has sent as this email — this browser claims it.
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device. If that''s you, chat from there — otherwise use a different email.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, p_participant_name, v_email, trim(p_content), 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_minted_token, v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_community_message(TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_community_message(TEXT, TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

-- Both staff and regular messages now route through SECURITY DEFINER
-- RPCs — no direct client insert path remains at all.
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement, non-muted" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement" ON public.community_messages;
