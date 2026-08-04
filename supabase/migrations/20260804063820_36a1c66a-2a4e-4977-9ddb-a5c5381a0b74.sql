-- Community staff allowlist (admin panel: Community Staff tab)
CREATE TABLE IF NOT EXISTS public.community_staff (
  participant_email TEXT NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL,
  role_label TEXT NOT NULL DEFAULT 'Team',
  badge_emoji TEXT NOT NULL DEFAULT '👑',
  staff_pin_hash TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_staff TO anon;
GRANT SELECT ON public.community_staff TO authenticated;
GRANT ALL ON public.community_staff TO service_role;

ALTER TABLE public.community_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff list is viewable by everyone" ON public.community_staff;
CREATE POLICY "Staff list is viewable by everyone"
ON public.community_staff FOR SELECT USING (true);

-- Organizer-only (service role) upsert with hashed PIN
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
SET search_path = public, extensions
AS $$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RAISE EXCEPTION 'Staff PIN must be at least 4 characters';
  END IF;
  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, staff_pin_hash)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji,
          extensions.crypt(p_pin, extensions.gen_salt('bf')))
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    staff_pin_hash = EXCLUDED.staff_pin_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- PIN-verified staff message send
CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_pin TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff RECORD;
  v_channel_type TEXT;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty';
    RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff
  WHERE participant_email = lower(trim(p_participant_email));

  IF v_staff IS NULL OR v_staff.staff_pin_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Not a recognized staff account';
    RETURN;
  END IF;

  IF v_staff.staff_pin_hash <> extensions.crypt(p_pin, v_staff.staff_pin_hash) THEN
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

-- Block direct client inserts that impersonate a staff email
DROP POLICY IF EXISTS "Anyone can send messages in non-announcement channels" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement" ON public.community_messages;
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

-- Admin passphrase functions: secure admin endpoint only
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_credential(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_credential(TEXT, TEXT) TO service_role;