-- Community Chat deep audit: voice_room_participants had no capacity
-- guardrail at all — nothing prevented a single voice channel from growing
-- unusably crowded (and, separately, meet.jit.si's own free-tier practical
-- limits would eventually make the call itself degrade with no FORGE-level
-- warning beforehand). 24, not something smaller — comfortably covers a
-- full team/study-group voice channel while still capping runaway growth
-- in one room. Checked before the INSERT so a full room fails cleanly with
-- a real message instead of silently degrading call quality for everyone
-- already in it.
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

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device.', NULL::TEXT;
    RETURN;
  END IF;

  -- Already-present (rejoining after a stale row, or a real duplicate
  -- click) never counts against the cap — only actually blocks a genuinely
  -- NEW participant from a genuinely full room.
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
