-- Moves admin/judge login off Edge Function env secrets (which require Supabase
-- dashboard/CLI access to set — a hard wall from this coding environment) onto
-- a DB-backed hashed-credential table instead. This lets:
--   1) A migration seed the very first passphrase.
--   2) The organizer rotate either passphrase later from inside the Admin
--      Panel itself, with no Supabase dashboard access ever required.
--
-- Only two roles exist: 'organizer' (full access) and 'judge' (grading only —
-- see admin-actions' JUDGE_ALLOWED_ACTIONS). No public policies at all on this
-- table; it's only ever touched via the SECURITY DEFINER functions below,
-- called by the edge function's service-role client.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.admin_credentials (
  role TEXT PRIMARY KEY CHECK (role IN ('organizer', 'judge')),
  passphrase_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: anon/authenticated get zero direct access.

CREATE OR REPLACE FUNCTION public.verify_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_credential(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_credential(TEXT, TEXT) TO service_role;

-- Seed the organizer passphrase requested in chat. Rotate it any time from
-- the Admin Panel — no need to touch this table directly again.
SELECT public.set_admin_credential('organizer', 'admin098@konov');
