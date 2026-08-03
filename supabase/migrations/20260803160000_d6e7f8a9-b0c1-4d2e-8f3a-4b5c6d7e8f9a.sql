-- Close the staff-badge impersonation loophole: previously, anyone could type
-- a staff member's exact email when joining community chat and their own
-- messages would render with that person's gold badge, with zero verification.
-- Fix: staff members get a bcrypt-hashed PIN (same pattern as admin_credentials).
-- Any message whose sender_email matches a community_staff row now has to go
-- through send_staff_message, which verifies the PIN before inserting — direct
-- client inserts using a staff email are blocked at the RLS layer.

ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;

-- Managing staff (including setting/rotating the PIN) is organizer-only, via
-- the service-role admin-actions endpoint — never called directly by anon.
CREATE OR REPLACE FUNCTION public.upsert_community_staff(
  p_participant_email TEXT,
  p_display_name TEXT,
  p_role_label TEXT,
  p_badge_emoji TEXT,
  p_pin TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RAISE EXCEPTION 'Staff PIN must be at least 4 characters';
  END IF;
  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, staff_pin_hash)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji, crypt(p_pin, gen_salt('bf')))
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    staff_pin_hash = EXCLUDED.staff_pin_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Callable directly by participants (this is how a real staff member actually
-- sends a verified message) — verifies the PIN server-side before inserting.
CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_pin TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff RECORD;
  v_channel_type TEXT;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty';
    RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff WHERE participant_email = lower(trim(p_participant_email));
  IF v_staff IS NULL OR v_staff.staff_pin_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Not a recognized staff account';
    RETURN;
  END IF;

  IF v_staff.staff_pin_hash != crypt(p_pin, v_staff.staff_pin_hash) THEN
    RETURN QUERY SELECT false, 'Incorrect staff PIN';
    RETURN;
  END IF;

  SELECT channel_type INTO v_channel_type FROM public.community_channels WHERE id = p_channel_id;
  IF v_channel_type = 'announcement' THEN
    RETURN QUERY SELECT false, 'Use the organizer announcement composer for this channel';
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_staff.display_name, v_staff.participant_email, trim(p_content), 'text');

  RETURN QUERY SELECT true, 'Sent';
END;
$$;

-- Block any direct client insert where sender_email belongs to a staff
-- member — those must go through send_staff_message above instead.
DROP POLICY IF EXISTS "Anyone can send messages in non-announcement channels" ON public.community_messages;
CREATE POLICY "Anyone can send messages as themselves, non-staff, non-announcement"
ON public.community_messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = channel_id AND cc.channel_type = 'announcement'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_staff cs
    WHERE cs.participant_email = sender_email
  )
);
