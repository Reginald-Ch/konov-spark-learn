-- Per-participant tracking codes (e.g. ABS-2026-0001), issued at
-- registration for the AI Builder Sprint. Separate from admin_credentials
-- entirely — this only ever resolves a code to a name for the public
-- participant-facing access gate, and grants no role/admin/judge access.

CREATE TABLE IF NOT EXISTS public.participant_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.participant_codes ENABLE ROW LEVEL SECURITY;
-- No table-level grants to anon/authenticated on purpose — the table is
-- only ever read through the name-only RPC below, so a participant can
-- resolve their own exact code but can't SELECT/enumerate the whole roster.

-- Case/whitespace-insensitive exact-code lookup. Returns at most one row
-- and only the name — never the full roster, never other participants'
-- codes, keeping this safe to expose to anon.
CREATE OR REPLACE FUNCTION public.lookup_participant_code(p_code TEXT)
RETURNS TABLE(full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pc.full_name
  FROM public.participant_codes pc
  WHERE pc.code = upper(trim(p_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_participant_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_participant_code(TEXT) TO anon, authenticated;
