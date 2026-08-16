-- Adversarial follow-up pass over the whole Community Chat identity/RPC
-- system, done after confirming the reported bugs (couldn't send, couldn't
-- join voice) were actually fixed live — this migration is about things
-- nobody reported yet, found by deliberately trying to break what's there.
--
-- 1. Real bug: edit_own_community_message / delete_own_community_message
--    never normalized p_participant_email (no lower(trim(...))), unlike
--    every other function in this system (send_community_message,
--    add/remove_community_reaction, join/leave_voice_room, set_my_profile,
--    submit_challenge_entry all do). Currently masked because the only
--    caller (CommunityChat.tsx) always sends already-lowercased email, but
--    it's fragile — any future caller passing mixed-case email would get a
--    false "you can only edit your own messages" or "browser isn't
--    verified" rejection for their own message, since sender_email and the
--    device-token table are both keyed on lowercase.
--
-- 2. Real gap: send_community_message and add_community_reaction had zero
--    rate limiting — nothing stopped a client from sending messages/
--    reactions as fast as it could open requests. Added a rolling-window
--    cap (generous enough for real conversation bursts, tight enough to
--    stop a scripted flood).
--
-- 3. Real gap: no message length cap — a single message could be
--    arbitrarily large (storage/rendering abuse vector). Capped at 4000
--    characters, matching the same order of magnitude as Discord's own
--    limit.
--
-- All three signatures are unchanged — CREATE OR REPLACE is safe here, no
-- DROP needed.

CREATE INDEX IF NOT EXISTS community_messages_sender_created_idx
  ON public.community_messages (sender_email, created_at);

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
  v_trimmed TEXT := trim(coalesce(p_content, ''));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_message_id UUID;
BEGIN
  IF v_trimmed = '' THEN
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF length(v_trimmed) > 4000 THEN
    RETURN QUERY SELECT false, 'Messages can''t be longer than 4000 characters.', NULL::TEXT, NULL::UUID;
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

  -- Rate limit: max 8 messages per rolling 10-second window per sender.
  IF (
    SELECT COUNT(*) FROM public.community_messages cm
    WHERE cm.sender_email = v_email AND cm.created_at > now() - interval '10 seconds'
  ) >= 8 THEN
    RETURN QUERY SELECT false, 'You are sending messages too quickly — slow down a moment.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device. If that''s you, chat from there — otherwise use a different email.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, p_participant_name, v_email, v_trimmed, 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_minted_token, v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT,
  p_content TEXT,
  p_device_token TEXT
)
RETURNS TABLE (content TEXT, edited_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_sender_email TEXT;
  v_trimmed TEXT := trim(p_content);
  v_token_hash TEXT;
BEGIN
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;
  IF length(v_trimmed) > 4000 THEN
    RAISE EXCEPTION 'Messages can''t be longer than 4000 characters.';
  END IF;

  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> v_email THEN
    RAISE EXCEPTION 'You can only edit your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be changed through the verified staff channel.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  UPDATE public.community_messages
  SET content = v_trimmed, edited_at = now()
  WHERE id = p_message_id;

  RETURN QUERY SELECT cm.content, cm.edited_at FROM public.community_messages cm WHERE cm.id = p_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_sender_email TEXT;
  v_token_hash TEXT;
BEGIN
  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> v_email THEN
    RAISE EXCEPTION 'You can only delete your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be removed by an organizer.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  DELETE FROM public.community_messages WHERE id = p_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_community_reaction(
  p_message_id UUID,
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT,
  p_emoji TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
BEGIN
  IF v_email = '' OR p_emoji IS NULL OR length(trim(p_emoji)) = 0 THEN
    RETURN QUERY SELECT false, 'Missing email or emoji', NULL::TEXT;
    RETURN;
  END IF;

  -- Rate limit: max 20 reactions per rolling 10-second window per
  -- participant — more generous than messages since a reaction is a much
  -- smaller, lower-stakes action, but still not unlimited.
  IF (
    SELECT COUNT(*) FROM public.community_message_reactions cmr
    WHERE cmr.participant_email = v_email AND cmr.created_at > now() - interval '10 seconds'
  ) >= 20 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before reacting again.', NULL::TEXT;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device.', NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.community_message_reactions (message_id, emoji, participant_email, participant_name)
  VALUES (p_message_id, p_emoji, v_email, p_participant_name)
  ON CONFLICT (message_id, emoji, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Reacted', v_minted_token;
END;
$$;
