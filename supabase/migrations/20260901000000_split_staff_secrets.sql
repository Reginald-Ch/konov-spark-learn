-- Security hardening (live-verified via pg_policies): community_staff's
-- one SELECT policy ("Staff list is viewable by everyone", USING(true))
-- has no column restriction, so invite_token_hash (and the unused
-- staff_pin_hash) are readable by anyone with the anon key via a direct
-- `select('*')`. Low practical severity — invite_token_hash is SHA-256 of
-- a 256-bit random token (upsert_community_staff mints it as two
-- concatenated gen_random_uuid()s), not a guessable secret, so exposing
-- the hash doesn't meaningfully help forge a valid invite. Still worth
-- closing properly, and a column-level REVOKE alone would NOT actually
-- fix it: community_staff has a live realtime subscription
-- ('community-staff-global' in CommunityChat.tsx), and Realtime's
-- postgres_changes broadcasts the FULL row to any client whose row-level
-- RLS policy passes, regardless of column-level GRANT/REVOKE — the same
-- reasoning that put proof_image/rejection_reason in their own table
-- earlier. token_redeemed_at stays on community_staff (not sensitive, and
-- the admin panel's list_community_staff already displays it directly).

CREATE TABLE IF NOT EXISTS public.community_staff_secrets (
  participant_email TEXT NOT NULL PRIMARY KEY REFERENCES public.community_staff(participant_email) ON DELETE CASCADE,
  invite_token_hash TEXT,
  staff_pin_hash TEXT
);
ALTER TABLE public.community_staff_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_staff_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.community_staff_secrets TO service_role;

-- Preserve every currently-issued invite's redemption state — this must
-- run before the columns it reads are ever dropped from community_staff.
INSERT INTO public.community_staff_secrets (participant_email, invite_token_hash, staff_pin_hash)
SELECT participant_email, invite_token_hash, staff_pin_hash FROM public.community_staff
ON CONFLICT (participant_email) DO NOTHING;

DROP FUNCTION IF EXISTS public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.upsert_community_staff(
  p_participant_email TEXT,
  p_display_name TEXT,
  p_role_label TEXT,
  p_badge_emoji TEXT
)
RETURNS TABLE (invite_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_email TEXT := lower(trim(p_participant_email));
BEGIN
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, token_redeemed_at)
  VALUES (v_email, p_display_name, p_role_label, p_badge_emoji, NULL)
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    token_redeemed_at = NULL;

  INSERT INTO public.community_staff_secrets (participant_email, invite_token_hash)
  VALUES (v_email, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  ON CONFLICT (participant_email) DO UPDATE SET
    invite_token_hash = EXCLUDED.invite_token_hash;

  RETURN QUERY SELECT v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.redeem_staff_invite(TEXT);

CREATE FUNCTION public.redeem_staff_invite(p_token TEXT)
RETURNS TABLE (ok BOOLEAN, participant_email TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text; RETURN;
  END IF;

  SELECT cs.participant_email, cs.display_name
  INTO v_staff
  FROM public.community_staff cs
  JOIN public.community_staff_secrets secrets ON secrets.participant_email = cs.participant_email
  WHERE secrets.invite_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text; RETURN;
  END IF;

  UPDATE public.community_staff SET token_redeemed_at = COALESCE(token_redeemed_at, now())
  WHERE community_staff.participant_email = v_staff.participant_email;

  RETURN QUERY SELECT true, v_staff.participant_email, v_staff.display_name;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_staff_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_staff_invite(TEXT) TO anon, authenticated;

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
  v_secret RECORD;
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
  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, 'Staff verification failed - ask your organizer for a fresh invite link', NULL::UUID; RETURN;
  END IF;

  SELECT * INTO v_secret FROM public.community_staff_secrets
  WHERE community_staff_secrets.participant_email = v_staff.participant_email;
  IF v_secret IS NULL OR v_secret.invite_token_hash IS NULL
     OR v_secret.invite_token_hash <> encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex') THEN
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

-- Only now, after every function reading them has been repointed at
-- community_staff_secrets — dropping first would break the functions
-- above mid-migration.
ALTER TABLE public.community_staff DROP COLUMN IF EXISTS invite_token_hash;
ALTER TABLE public.community_staff DROP COLUMN IF EXISTS staff_pin_hash;

NOTIFY pgrst, 'reload schema';
