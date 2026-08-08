-- Admin passphrase brute-force protection. There was none at all — the
-- verify endpoint is public (CORS *), and set_admin_credential only required
-- 6+ characters, so a short passphrase was crackable over the network with
-- no rate limiting, no lockout, nothing in between an attacker and the
-- organizer's full admin access.

-- 1) Raise the floor for new/rotated passphrases. Existing ones already
-- below this aren't force-invalidated (would lock out the organizer with no
-- warning) — this only applies going forward.
CREATE OR REPLACE FUNCTION public.set_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_passphrase IS NULL OR length(p_passphrase) < 10 THEN
    RAISE EXCEPTION 'Passphrase must be at least 10 characters';
  END IF;
  INSERT INTO public.admin_credentials (role, passphrase_hash, updated_at)
  VALUES (p_role, crypt(p_passphrase, gen_salt('bf')), now())
  ON CONFLICT (role) DO UPDATE SET passphrase_hash = EXCLUDED.passphrase_hash, updated_at = now();
END;
$$;

-- 2) Per-IP lockout after repeated failures. No RLS policies — service role
-- only, same pattern as admin_credentials itself.
CREATE TABLE public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_failed_admin_attempt(p_ip TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_login_attempts (ip_address) VALUES (COALESCE(p_ip, 'unknown'));
$$;

CREATE OR REPLACE FUNCTION public.count_recent_admin_failures(p_ip TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.admin_login_attempts
  WHERE ip_address = COALESCE(p_ip, 'unknown') AND created_at > now() - interval '15 minutes';
$$;

REVOKE ALL ON FUNCTION public.record_failed_admin_attempt(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_recent_admin_failures(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_admin_attempt(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_recent_admin_failures(TEXT) TO service_role;

-- Old rows aren't useful after the lockout window passes — cheap periodic
-- cleanup isn't set up here (no pg_cron in use elsewhere in this project),
-- so this table will grow slowly; fine at this traffic scale, revisit if not.
