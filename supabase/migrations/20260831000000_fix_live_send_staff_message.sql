-- Corrective migration, confirmed via live diagnostic query (pg_proc/
-- information_schema introspection, not assumed from file history — this
-- exact table has needed that treatment multiple times this session).
--
-- The community_staff/send_staff_message trio actually running in
-- production is NOT what earlier migrations in this repo assumed: it uses
-- SHA-256 (extensions.digest(token, 'sha256'), hex-encoded) against an
-- `invite_token_hash` column, not bcrypt/crypt() against a
-- `staff_token_hash` column. redeem_staff_invite and upsert_community_staff
-- are correct as they stand and are NOT touched here — only
-- send_staff_message needed fixing, confirmed by pulling its real prosrc:
--
-- 1) No length cap at all — every sibling send path (send_community_message,
--    edit_own_community_message, and now this one) is supposed to enforce
--    4000 chars server-side; this one only ever checked for empty content.
-- 2) RETURNS TABLE (ok, message) only — no message_id. Two earlier
--    migrations in this repo's history were written specifically to add a
--    returned message_id here (so staff @mentions could notify, and so
--    the client's optimistic local echo could work for staff sends) but
--    neither one ever actually applied to whatever is really live — the
--    live function still doesn't return it, so both of those fixes have
--    silently been no-ops the whole time: staff members' @mentions still
--    never notify anyone, and staff sends never get an optimistic echo.
-- 3) The verification-failure message has a corrupted character
--    ('failed â ask...' instead of an em dash) — replaced with a plain
--    hyphen so it can't mangle again regardless of what tool touches it.
--
-- Return-column change (2 -> 3), so DROP + CREATE, matching this session's
-- established convention for that (CREATE OR REPLACE can't change a
-- function's OUT-parameter/return-column set).

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
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::UUID; RETURN;
  END IF;

  IF length(trim(p_content)) > 4000 THEN
    RETURN QUERY SELECT false, 'Message is too long (4000 character limit)', NULL::UUID; RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff
  WHERE community_staff.participant_email = lower(trim(p_participant_email));
  IF v_staff IS NULL OR v_staff.invite_token_hash IS NULL
     OR v_staff.invite_token_hash <> encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex') THEN
    RETURN QUERY SELECT false, 'Staff verification failed - ask your organizer for a fresh invite link', NULL::UUID; RETURN;
  END IF;

  SELECT channel_type INTO v_channel_type FROM public.community_channels WHERE id = p_channel_id;
  IF v_channel_type = 'announcement' THEN
    RETURN QUERY SELECT false, 'Use the organizer announcement composer for this channel', NULL::UUID; RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_staff.display_name, v_staff.participant_email, trim(p_content), 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_staff_message(TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_staff_message(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
