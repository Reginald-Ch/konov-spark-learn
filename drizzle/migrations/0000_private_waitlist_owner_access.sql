CREATE TYPE public.app_role AS ENUM ('waitlist_owner');
CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 UNIQUE(user_id, role),
 UNIQUE(role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own assigned role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE FUNCTION public.get_private_waitlist(p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'waitlist_owner') THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
 END IF;
 IF p_offset < 0 THEN RAISE EXCEPTION 'Invalid offset'; END IF;
 RETURN jsonb_build_object('total', (SELECT count(*) FROM public.waitlist_signups), 'rows', COALESCE((SELECT jsonb_agg(row_data) FROM (SELECT id, name, email, whatsapp, position, referral_code, referred_by, created_at FROM public.waitlist_signups ORDER BY created_at DESC, id LIMIT 500 OFFSET p_offset) row_data), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.get_private_waitlist(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_private_waitlist(integer) TO authenticated;
COMMENT ON FUNCTION public.get_private_waitlist(integer) IS 'Owner-only waitlist access; account role must be provisioned by trusted operator, never public signup.';