-- Repairs organizer/judge login. A functions listing run against the live
-- database (2026-08-17) showed set_admin_credential but not
-- verify_admin_credential — the RPC the "verify"/login path actually calls
-- was missing (or errored) live. admin-actions/index.ts's resolveRole()
-- only destructures `data` from that RPC call and discards `error`, so a
-- missing/erroring function silently reads as "wrong passphrase" instead
-- of surfacing the real cause — every login attempt failed with a generic
-- "Invalid passphrase" regardless of what was typed.
--
-- Fully idempotent (CREATE ... IF NOT EXISTS / CREATE OR REPLACE / ON
-- CONFLICT) so it's safe to run even if some pieces already exist from an
-- earlier partially-applied migration — no need to know exactly which
-- prior migration did or didn't take effect live.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  role TEXT PRIMARY KEY CHECK (role IN ('organizer', 'judge')),
  passphrase_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- search_path includes `extensions` because Supabase projects install
-- pgcrypto there by default (not `public`) — confirmed live: the plain
-- `SET search_path = public` version below errored with "function
-- crypt(text, text) does not exist" the moment set_admin_credential
-- actually ran, since crypt/gen_salt aren't visible under public-only.
CREATE OR REPLACE FUNCTION public.verify_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_passphrase IS NULL OR length(p_passphrase) = 0 THEN
    RETURN false;
  END IF;
  SELECT passphrase_hash INTO v_hash FROM public.admin_credentials WHERE role = p_role;
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_hash = crypt(p_passphrase, v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_passphrase IS NULL OR length(p_passphrase) < 6 THEN
    RAISE EXCEPTION 'Passphrase must be at least 6 characters';
  END IF;
  INSERT INTO public.admin_credentials (role, passphrase_hash, updated_at)
  VALUES (p_role, crypt(p_passphrase, gen_salt('bf')), now())
  ON CONFLICT (role) DO UPDATE SET passphrase_hash = EXCLUDED.passphrase_hash, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_credential(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_credential(TEXT, TEXT) TO service_role;

-- Re-seed both passphrases so they're definitely active, regardless of
-- what did or didn't apply before.
SELECT public.set_admin_credential('organizer', 'admin098@konov');
SELECT public.set_admin_credential('judge', 'judge2059');

-- Brute-force lockout infra admin-actions/index.ts also calls on every
-- request (count_recent_admin_failures / record_failed_admin_attempt) —
-- fails safe if missing (treated as 0 recent failures), but a missing
-- table here means failed attempts are never actually tracked.
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
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

-- Clear any lockout state that debugging attempts may have tripped.
DELETE FROM public.admin_login_attempts;
