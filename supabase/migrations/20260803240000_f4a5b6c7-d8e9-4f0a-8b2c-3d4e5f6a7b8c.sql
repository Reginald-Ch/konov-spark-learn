-- Replace the staff PIN with an admin-issued invite link.
--
-- The PIN had a real gap: send_staff_message is callable directly by anon
-- with no login/session/CAPTCHA involved, and a short human-typed PIN is
-- guessable by a script — quietly reopening the exact staff-badge
-- impersonation hole the PIN system was built to close.
--
-- Admin still authorizes the person through the panel (that part doesn't
-- change — the community_staff row IS the authorization). What changes is
-- how a browser proves it's really them: instead of a short PIN typed on
-- every session, upsert_community_staff now mints a long random bearer
-- token, shown once to the admin as a shareable link
-- (/hackathons?staff_invite=<token>). The staffer opens it once, the client
-- verifies it via redeem_staff_invite and keeps it in localStorage forever
-- (not sessionStorage) — no further prompts, on that device, ever again.
--
-- A 32-byte random token has ~256 bits of entropy, computationally
-- infeasible to brute force — unlike a short PIN, no rate-limit/lockout
-- bookkeeping is needed; the entropy itself is the defense. Re-running
-- upsert_community_staff for the same email immediately invalidates any
-- previously issued link (old hash is overwritten), which doubles as a
-- one-click "revoke and reissue" if a link ever leaks.

ALTER TABLE public.community_staff DROP COLUMN IF EXISTS staff_pin_hash;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS staff_token_hash TEXT;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ;

-- Old 5-arg (…, p_pin) signature is being replaced by a 4-arg one below —
-- different arg count means CREATE OR REPLACE won't overwrite it in place,
-- so drop it explicitly to avoid leaving two overloads behind.
DROP FUNCTION IF EXISTS public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Admin-only (service role, via admin-actions). Mints/rotates the bearer
-- token and returns it in plaintext exactly once — only the hash is stored.
CREATE OR REPLACE FUNCTION public.upsert_community_staff(
  p_participant_email TEXT,
  p_display_name TEXT,
  p_role_label TEXT,
  p_badge_emoji TEXT
)
RETURNS TABLE (invite_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, staff_token_hash, token_issued_at)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji, crypt(v_token, gen_salt('bf')), now())
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    staff_token_hash = EXCLUDED.staff_token_hash,
    token_issued_at = EXCLUDED.token_issued_at;

  RETURN QUERY SELECT v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Public-callable — this is how the staffer's browser redeems the link.
-- On success the client auto-joins as that identity and keeps the raw token
-- in localStorage to present with future send_staff_message calls.
CREATE OR REPLACE FUNCTION public.redeem_staff_invite(p_token TEXT)
RETURNS TABLE (ok BOOLEAN, participant_email TEXT, display_name TEXT, role_label TEXT, badge_emoji TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Small table (a handful of staff), so a per-row bcrypt comparison scan
  -- is cheap; a token can't be looked up by index since it's only ever
  -- stored hashed.
  SELECT * INTO v_staff FROM public.community_staff
  WHERE staff_token_hash IS NOT NULL AND staff_token_hash = crypt(p_token, staff_token_hash)
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_staff.participant_email, v_staff.display_name, v_staff.role_label, v_staff.badge_emoji;
END;
$$;

-- send_staff_message now verifies the bearer token instead of a PIN.
CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_token TEXT,
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
  IF v_staff IS NULL OR v_staff.staff_token_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Not a recognized staff account';
    RETURN;
  END IF;

  IF v_staff.staff_token_hash != crypt(p_token, v_staff.staff_token_hash) THEN
    RETURN QUERY SELECT false, 'Staff verification expired or invalid — reopen your invite link';
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
