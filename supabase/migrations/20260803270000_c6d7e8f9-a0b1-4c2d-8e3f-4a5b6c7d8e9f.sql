-- The admin Community Staff panel had no way to tell whether a sent invite
-- link had ever actually been opened — an organizer adds someone, sends the
-- link, and has zero visibility until (or unless) that person posts a
-- message. Track redemption explicitly so the panel can show real status.

ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS token_redeemed_at TIMESTAMPTZ;

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

  SELECT * INTO v_staff FROM public.community_staff
  WHERE staff_token_hash IS NOT NULL AND staff_token_hash = crypt(p_token, staff_token_hash)
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Only stamp the first redemption — re-opening the same link on a second
  -- device shouldn't overwrite when the staffer was FIRST actually verified.
  IF v_staff.token_redeemed_at IS NULL THEN
    UPDATE public.community_staff SET token_redeemed_at = now() WHERE participant_email = v_staff.participant_email;
  END IF;

  RETURN QUERY SELECT true, v_staff.participant_email, v_staff.display_name, v_staff.role_label, v_staff.badge_emoji;
END;
$$;

-- upsert_community_staff already clears/resets on rotation — a freshly
-- issued link should read as "not redeemed yet" again until it's opened.
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

  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, staff_token_hash, token_issued_at, token_redeemed_at)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji, crypt(v_token, gen_salt('bf')), now(), NULL)
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    staff_token_hash = EXCLUDED.staff_token_hash,
    token_issued_at = EXCLUDED.token_issued_at,
    token_redeemed_at = NULL;

  RETURN QUERY SELECT v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) TO service_role;
