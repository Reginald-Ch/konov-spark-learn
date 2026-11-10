-- Waitlist marketing data: the form now asks for the parent's first name,
-- records where each signup came from (UTM tags, referring site), and adds
-- an optional "get your child's MeAI ready" profile step after joining.
--
-- Access model is unchanged from 20260915010000: anon/authenticated still
-- have no direct table access. join_waitlist replaces submit_waitlist_signup
-- for new clients (the old function is kept so a cached older page keeps
-- working), and save_waitlist_profile can only write profile fields onto
-- the row whose id the caller already received from join_waitlist. It never
-- returns any stored data.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS child_age_bands text[],
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS class_interest text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS learner_count text,
  ADD COLUMN IF NOT EXISTS wishlist text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

-- Ghana numbers were stored as typed ("024…", "233…", "+233…"), so one
-- parent could sign up twice and local-format numbers don't work in wa.me
-- links. Normalise existing rows to +233… where that doesn't collide with
-- a row already stored in that format.
UPDATE public.waitlist_signups w
SET whatsapp = '+233' || substr(w.whatsapp, 2)
WHERE w.whatsapp ~ '^0\d{9}$'
  AND NOT EXISTS (SELECT 1 FROM public.waitlist_signups o WHERE o.whatsapp = '+233' || substr(w.whatsapp, 2));

UPDATE public.waitlist_signups w
SET whatsapp = '+' || w.whatsapp
WHERE w.whatsapp ~ '^233\d{9}$'
  AND NOT EXISTS (SELECT 1 FROM public.waitlist_signups o WHERE o.whatsapp = '+' || w.whatsapp);

CREATE OR REPLACE FUNCTION public.normalize_waitlist_whatsapp(p_whatsapp TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN v ~ '^0\d{9}$' THEN '+233' || substr(v, 2)
    WHEN v ~ '^233\d{9}$' THEN '+' || v
    ELSE v
  END
  FROM (SELECT NULLIF(regexp_replace(coalesce(p_whatsapp, ''), '[\s\-()]', '', 'g'), '') AS v) s;
$$;

CREATE OR REPLACE FUNCTION public.join_waitlist(
  p_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_referral_code TEXT,
  p_referred_by TEXT,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, "position" INTEGER, referral_code TEXT, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := NULLIF(left(trim(p_name), 80), '');
  v_email TEXT := NULLIF(lower(trim(p_email)), '');
  v_whatsapp TEXT := public.normalize_waitlist_whatsapp(p_whatsapp);
  v_id UUID;
  v_position INTEGER;
  v_referral_code TEXT;
BEGIN
  IF v_email IS NULL AND v_whatsapp IS NULL THEN
    RAISE EXCEPTION 'Either email or whatsapp is required';
  END IF;

  BEGIN
    INSERT INTO public.waitlist_signups
      (name, email, whatsapp, referral_code, referred_by, utm_source, utm_medium, utm_campaign, referrer)
    VALUES (
      v_name, v_email, v_whatsapp, p_referral_code,
      -- A signup can't credit itself or an unknown code.
      CASE WHEN p_referred_by IS NOT NULL AND p_referred_by <> p_referral_code
             AND EXISTS (SELECT 1 FROM public.waitlist_signups r WHERE r.referral_code = p_referred_by)
           THEN p_referred_by END,
      left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100), left(p_referrer, 300)
    )
    RETURNING waitlist_signups.id, waitlist_signups.position, waitlist_signups.referral_code
    INTO v_id, v_position, v_referral_code;

    RETURN QUERY SELECT v_id, v_position, v_referral_code, true;
  EXCEPTION WHEN unique_violation THEN
    -- Same duplicate handling as submit_waitlist_signup. A returning parent
    -- who left their name blank the first time gets it filled in now.
    SELECT w.id, w.position, w.referral_code INTO v_id, v_position, v_referral_code
    FROM public.waitlist_signups w
    WHERE (v_email IS NOT NULL AND w.email = v_email)
       OR (v_whatsapp IS NOT NULL AND w.whatsapp = v_whatsapp)
    LIMIT 1;

    IF v_id IS NULL THEN
      RAISE;
    END IF;

    UPDATE public.waitlist_signups SET name = v_name
    WHERE waitlist_signups.id = v_id AND waitlist_signups.name IS NULL AND v_name IS NOT NULL;

    RETURN QUERY SELECT v_id, v_position, v_referral_code, false;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.join_waitlist(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_waitlist_profile(
  p_id UUID,
  p_role TEXT,
  p_child_age_bands TEXT[],
  p_goal TEXT,
  p_device TEXT,
  p_location TEXT,
  p_class_interest TEXT,
  p_school_name TEXT,
  p_learner_count TEXT,
  p_wishlist TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the answer values the form offers are stored; anything else is dropped.
  UPDATE public.waitlist_signups SET
    role = CASE WHEN p_role IN ('parent', 'school') THEN p_role END,
    child_age_bands = (SELECT array_agg(DISTINCT b) FROM unnest(coalesce(p_child_age_bands, '{}')) b WHERE b IN ('6-8', '9-11', '12-14', 'other')),
    goal = CASE WHEN p_goal IN ('coding', 'ai', 'screen_time', 'confidence', 'future_careers') THEN p_goal END,
    device = CASE WHEN p_device IN ('phone', 'tablet', 'laptop', 'none') THEN p_device END,
    location = CASE WHEN p_location IN ('accra', 'kumasi', 'ghana_other', 'outside_ghana') THEN p_location END,
    class_interest = CASE WHEN p_class_interest IN ('weekend', 'after_school', 'summer', 'not_now') THEN p_class_interest END,
    school_name = NULLIF(left(trim(p_school_name), 150), ''),
    learner_count = CASE WHEN p_learner_count IN ('under_50', '50_200', '200_500', 'over_500') THEN p_learner_count END,
    wishlist = NULLIF(left(trim(p_wishlist), 500), ''),
    profile_completed_at = now()
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.save_waitlist_profile(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_waitlist_profile(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- The owner dashboard (0000_private_waitlist_owner_access) also returns the
-- new profile and attribution fields. Same owner-role check and grants.
CREATE OR REPLACE FUNCTION public.get_private_waitlist(p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'waitlist_owner') THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
 END IF;
 IF p_offset < 0 THEN RAISE EXCEPTION 'Invalid offset'; END IF;
 RETURN jsonb_build_object('total', (SELECT count(*) FROM public.waitlist_signups), 'rows', COALESCE((SELECT jsonb_agg(row_data) FROM (SELECT id, name, email, whatsapp, position, referral_code, referred_by, created_at, role, child_age_bands, goal, device, location, class_interest, school_name, learner_count, wishlist, utm_source, utm_medium, utm_campaign, referrer, profile_completed_at FROM public.waitlist_signups ORDER BY created_at DESC, id LIMIT 500 OFFSET p_offset) row_data), '[]'::jsonb));
END;
$$;

NOTIFY pgrst, 'reload schema';
