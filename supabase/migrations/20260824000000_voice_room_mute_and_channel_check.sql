-- Community Chat deep audit (round 3): mute only ever disabled the text
-- composer (send_community_message already checks community_muted_users)
-- — join_voice_room had NO mute check at all. A muted participant could
-- freely join and talk in any voice channel over real Jitsi audio, with
-- nothing telling them mute is text-only, and nothing telling the
-- organizer who muted them that voice remained wide open. An organizer
-- trying to actually silence a disruptive participant had no way to do so
-- through this feature. Adds the same community_muted_users check
-- send_community_message already uses, on top of the capacity check from
-- the previous migration (kept, not removed).

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

  INSERT INTO public.voice_room_participants (channel_id, participant_name, participant_email)
  VALUES (p_channel_id, p_participant_name, v_email)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Joined', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
