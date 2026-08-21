-- Community Chat functional audit: a staff-authored message containing an
-- @[name](email) mention rendered the mention pill fine, but never
-- triggered a push notification for the mentioned person — the client's
-- staff-send branch had nothing to call notify-mention WITH, since
-- send_staff_message never returned the new message's id in the first
-- place (unlike send_community_message, which already does). Regular
-- participants' mentions notify correctly; staff members' silently did
-- not. Column list changed, so DROP is required (same pattern as every
-- other RETURNS TABLE column change this session).

DROP FUNCTION IF EXISTS public.send_staff_message(TEXT, TEXT, UUID, TEXT);

CREATE FUNCTION public.send_staff_message(
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
