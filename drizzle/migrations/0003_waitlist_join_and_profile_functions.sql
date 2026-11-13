ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS child_age_bands text[],
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS class_interest text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS learner_count text,
  ADD COLUMN IF NOT EXISTS wishlist text;

DROP FUNCTION IF EXISTS public.join_waitlist(text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.save_waitlist_profile(uuid, text, text[], text, text, text, text, text, text, text);

CREATE FUNCTION public.join_waitlist(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_referral_code text,
  p_referred_by text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_referrer text
)
RETURNS TABLE(id uuid, "position" integer, referral_code text, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.waitlist_signups (email, whatsapp, name, referral_code, referred_by, utm_source, utm_medium, utm_campaign, referrer)
    VALUES (v_email, v_whatsapp, NULLIF(trim(p_name), ''), p_referral_code, p_referred_by, p_utm_source, p_utm_medium, p_utm_campaign, p_referrer)
    RETURNING waitlist_signups.id, waitlist_signups.position, waitlist_signups.referral_code
    INTO v_id, v_position, v_referral_code;

    RETURN QUERY SELECT v_id, v_position, v_referral_code, true;
  EXCEPTION WHEN unique_violation THEN
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
$function$;

CREATE FUNCTION public.save_waitlist_profile(
  p_id uuid,
  p_role text,
  p_child_age_bands text[],
  p_goal text,
  p_device text,
  p_location text,
  p_class_interest text,
  p_school_name text,
  p_learner_count text,
  p_wishlist text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.waitlist_signups
  SET role = NULLIF(trim(p_role), ''),
      child_age_bands = p_child_age_bands,
      goal = NULLIF(trim(p_goal), ''),
      device = NULLIF(trim(p_device), ''),
      location = NULLIF(trim(p_location), ''),
      class_interest = NULLIF(trim(p_class_interest), ''),
      school_name = NULLIF(trim(p_school_name), ''),
      learner_count = NULLIF(trim(p_learner_count), ''),
      wishlist = NULLIF(trim(p_wishlist), '')
  WHERE waitlist_signups.id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_waitlist_profile(uuid, text, text[], text, text, text, text, text, text, text) TO anon, authenticated;