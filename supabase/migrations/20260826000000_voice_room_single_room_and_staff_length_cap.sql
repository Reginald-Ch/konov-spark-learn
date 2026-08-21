-- Community Chat deep audit (round 5, first dedicated Voice Channels pass):
--
-- 1) "One voice room at a time" was only a client-side invariant — the
--    unique constraint on voice_room_participants is (channel_id,
--    participant_email), never global on participant_email alone, and
--    join_voice_room's insert was a plain ON CONFLICT DO NOTHING with no
--    cross-channel check. Two browser tabs (or the SPA state simply being
--    per-tab) could join a participant into two different voice rooms at
--    once, showing them as genuinely present with two live Jitsi sessions
--    in both simultaneously. Deleting any of the caller's other
--    voice_room_participants rows before inserting the new one makes
--    single-room membership authoritative in the database, not just an
--    assumption the client UI happens to uphold.
--
-- 2) send_community_message and edit_own_community_message both got a
--    4000-char cap in an earlier migration; send_staff_message never did.
--    Harmless in practice today (the client's shared composer maxLength
--    already caps staff sends the same as everyone else's), but a direct
--    RPC call bypassing the UI could insert an unbounded staff-authored
--    (gold-badge) message. No signature change, so CREATE OR REPLACE.

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
  v_current_count INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing email', NULL::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'You are currently muted, which also applies to voice channels.', NULL::TEXT;
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

  IF NOT EXISTS (
    SELECT 1 FROM public.voice_room_participants
    WHERE channel_id = p_channel_id AND participant_email = v_email
  ) THEN
    SELECT COUNT(*) INTO v_current_count FROM public.voice_room_participants WHERE channel_id = p_channel_id;
    IF v_current_count >= 24 THEN
      RETURN QUERY SELECT false, 'This voice channel is full right now — try again in a moment or use another channel.', v_minted_token;
      RETURN;
    END IF;
  END IF;

  -- Authoritative single-room-at-a-time: leave any OTHER voice room this
  -- person is currently shown in before joining this one. Without this, a
  -- second tab (or any client that skips the app's own leave-before-join
  -- flow) could leave someone present in two rooms with two live Jitsi
  -- sessions, visible to everyone in both.
  DELETE FROM public.voice_room_participants
  WHERE participant_email = v_email AND channel_id != p_channel_id;

  INSERT INTO public.voice_room_participants (channel_id, participant_name, participant_email)
  VALUES (p_channel_id, p_participant_name, v_email)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Joined', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_token TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, message_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff RECORD;
  v_channel_type TEXT;
  v_message_id UUID;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::UUID;
    RETURN;
  END IF;

  IF length(trim(p_content)) > 4000 THEN
    RETURN QUERY SELECT false, 'Message is too long (4000 character limit)', NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff WHERE participant_email = lower(trim(p_participant_email));
  IF v_staff IS NULL OR v_staff.staff_token_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Not a recognized staff account', NULL::UUID;
    RETURN;
  END IF;

  IF v_staff.staff_token_hash != crypt(p_token, v_staff.staff_token_hash) THEN
    RETURN QUERY SELECT false, 'Staff verification expired or invalid — reopen your invite link', NULL::UUID;
    RETURN;
  END IF;

  SELECT channel_type INTO v_channel_type FROM public.community_channels WHERE id = p_channel_id;
  IF v_channel_type = 'announcement' THEN
    RETURN QUERY SELECT false, 'Use the organizer announcement composer for this channel', NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_staff.display_name, v_staff.participant_email, trim(p_content), 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_staff_message(TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_staff_message(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;
