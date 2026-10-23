-- CRITICAL: waitlist_signups' SELECT policy was USING(true) — intended
-- only to power a public "X people already joined" counter (the original
-- migration's own comment says "needed for social proof counter"), but a
-- row-level USING(true) policy grants full-row SELECT to anyone with the
-- public anon key, not just a count. Every signup's email, WhatsApp/phone
-- number, name, and referral code were readable via a direct REST call
-- (e.g. `GET /rest/v1/waitlist_signups?select=*`), independent of what
-- this app's own UI happens to query for — discovered via a security scan
-- 2026-09-15.
--
-- Closed by removing anon/authenticated access to the table entirely and
-- routing the two legitimate anonymous needs — a public count, and a
-- signer reading back their OWN just-submitted row — through SECURITY
-- DEFINER functions instead, the same pattern this app already uses
-- everywhere else for owner-scoped reads (get_own_project_by_id, etc).
-- submit_waitlist_signup requires the caller to already know the exact
-- email/whatsapp they're claiming before it will return that row, so it
-- can't be used to enumerate or read anyone else's signup.

DROP POLICY IF EXISTS "Anyone can count waitlist" ON public.waitlist_signups;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_signups;
REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.waitlist_signups;
$$;
REVOKE ALL ON FUNCTION public.get_waitlist_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_waitlist_signup(
  p_email TEXT,
  p_whatsapp TEXT,
  p_referral_code TEXT,
  p_referred_by TEXT
)
RETURNS TABLE(id UUID, "position" INTEGER, referral_code TEXT, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := NULLIF(lower(trim(p_email)), '');
  v_whatsapp TEXT := NULLIF(trim(p_whatsapp), '');
  v_id UUID;
  v_position INTEGER;
  v_referral_code TEXT;
BEGIN
  IF v_email IS NULL AND v_whatsapp IS NULL THEN
    RAISE EXCEPTION 'Either email or whatsapp is required';
  END IF;

  BEGIN
    INSERT INTO public.waitlist_signups (email, whatsapp, referral_code, referred_by)
    VALUES (v_email, v_whatsapp, p_referral_code, p_referred_by)
    RETURNING waitlist_signups.id, waitlist_signups.position, waitlist_signups.referral_code
    INTO v_id, v_position, v_referral_code;

    RETURN QUERY SELECT v_id, v_position, v_referral_code, true;
  EXCEPTION WHEN unique_violation THEN
    -- Mirrors the client's prior behavior: any unique-constraint hit
    -- (email, whatsapp, or the vanishingly-rare referral_code collision)
    -- was already treated as "this is a duplicate signup" and resolved by
    -- looking the caller's own row back up by the contact value they
    -- supplied — never by trusting an id sent back from the client.
    SELECT w.id, w.position, w.referral_code INTO v_id, v_position, v_referral_code
    FROM public.waitlist_signups w
    WHERE (v_email IS NOT NULL AND w.email = v_email)
       OR (v_whatsapp IS NOT NULL AND w.whatsapp = v_whatsapp)
    LIMIT 1;

    IF v_id IS NULL THEN
      RAISE;
    END IF;

    RETURN QUERY SELECT v_id, v_position, v_referral_code, false;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_waitlist_signup(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_waitlist_signup(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
