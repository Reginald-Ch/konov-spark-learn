-- Community Chat deep audit: the sender-spoofing fix earlier this session
-- (send_community_message, migration 20260808010000) minted a per-email
-- bearer "device token" in participant_device_tokens and required it to
-- SEND a message — but three other participant-identity actions in this
-- same feature were never brought up to that same bar, so knowing someone's
-- email alone is still enough to act as them there:
--
--   1. edit_own_community_message / delete_own_community_message only ever
--      compared p_participant_email to the row's sender_email — no token
--      check at all. After the send-side fix, an attacker can no longer
--      POST a new message as someone else, but could still silently REWRITE
--      or DELETE their existing messages just by knowing their email. That's
--      a direct regression relative to the fix this session already shipped
--      for the same table.
--   2. community_message_reactions' INSERT/DELETE policies are bare
--      USING/WITH CHECK (true) — anyone can add a reaction attributed to any
--      participant_email (impersonation) or delete any other participant's
--      reaction (griefing), with zero ownership check anywhere.
--   3. voice_room_participants' INSERT/DELETE policies are the same bare
--      USING/WITH CHECK (true) — anyone can insert a fake "in voice" row for
--      someone else or delete a real participant's presence row.
--
-- Fix: reuse the SAME participant_device_tokens table (already the
-- established per-email TOFU credential) for all three instead of adding
-- new token types. Reactions and voice joins can each mint-on-first-use
-- exactly like send_community_message does, since a participant may react
-- or join voice before ever sending a message. Edit/delete never mint —
-- by the time a message exists to edit/delete, sending it already required
-- (and minted, if needed) a token for that email.

-- ── 1. edit/delete: require the device token, don't just trust the claim ──

DROP FUNCTION IF EXISTS public.edit_own_community_message(UUID, TEXT, TEXT);

CREATE FUNCTION public.edit_own_community_message(
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
  v_sender_email TEXT;
  v_trimmed TEXT := trim(p_content);
  v_token_hash TEXT;
BEGIN
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;

  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> p_participant_email THEN
    RAISE EXCEPTION 'You can only edit your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be changed through the verified staff channel.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = p_participant_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  UPDATE public.community_messages
  SET content = v_trimmed, edited_at = now()
  WHERE id = p_message_id;

  RETURN QUERY SELECT cm.content, cm.edited_at FROM public.community_messages cm WHERE cm.id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.delete_own_community_message(UUID, TEXT);

CREATE FUNCTION public.delete_own_community_message(
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
  v_sender_email TEXT;
  v_token_hash TEXT;
BEGIN
  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> p_participant_email THEN
    RAISE EXCEPTION 'You can only delete your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be removed by an organizer.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = p_participant_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  DELETE FROM public.community_messages WHERE id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_community_message(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_community_message(UUID, TEXT, TEXT) TO anon, authenticated;

-- ── 2. Reactions: RPC-only, same TOFU bar as messages ──

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

REVOKE ALL ON FUNCTION public.add_community_reaction(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_community_reaction(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.remove_community_reaction(
  p_message_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT,
  p_emoji TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_token_hash TEXT;
BEGIN
  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RETURN QUERY SELECT false, 'This browser isn''t verified for that email.';
    RETURN;
  END IF;

  DELETE FROM public.community_message_reactions
  WHERE message_id = p_message_id AND emoji = p_emoji AND participant_email = v_email;

  RETURN QUERY SELECT true, 'Removed';
END;
$$;

REVOKE ALL ON FUNCTION public.remove_community_reaction(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_community_reaction(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can add a reaction" ON public.community_message_reactions;
DROP POLICY IF EXISTS "Participants can remove their own reaction" ON public.community_message_reactions;

-- ── 3. Voice presence: same treatment ──

CREATE OR REPLACE FUNCTION public.join_voice_room(
  p_channel_id UUID,
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT
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
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing email', NULL::TEXT;
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

  INSERT INTO public.voice_room_participants (channel_id, participant_name, participant_email)
  VALUES (p_channel_id, p_participant_name, v_email)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Joined', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.leave_voice_room(
  p_channel_id UUID,
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
  v_token_hash TEXT;
BEGIN
  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  -- Leaving is best-effort cleanup (tab close, beforeunload beacon) — a
  -- token mismatch here just means don't delete, not raise. Nothing in
  -- this table is sensitive enough to justify blocking a tab-close cleanup
  -- attempt over it, and RAISE would surface as an ugly console/toast error
  -- for something the user isn't even watching happen.
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RETURN;
  END IF;

  DELETE FROM public.voice_room_participants
  WHERE channel_id = p_channel_id AND participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can join voice rooms" ON public.voice_room_participants;
DROP POLICY IF EXISTS "Participants can leave voice rooms" ON public.voice_room_participants;
