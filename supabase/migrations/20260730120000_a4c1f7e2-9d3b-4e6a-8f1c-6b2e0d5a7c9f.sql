-- Concurrency gate for the shared AI gateway used by python-ai-assist.
--
-- Every AI-assisted action in FORGE (Run, chat, code review, bot battles) shares
-- one Lovable AI Gateway key with no queue of its own. This table is a semaphore:
-- a fixed pool of "slots" the edge function must acquire before calling the
-- gateway, so a synchronized burst (a whole class hitting "Run" at once) queues
-- at our own door — returning a clear, retryable 429 — instead of everyone racing
-- the shared gateway's own rate limit at the same instant.
--
-- The pool size (rows seeded below) is a starting guess, not a verified-safe
-- number — nobody has visibility into the actual Lovable AI account rate limit
-- from this codebase. Raise or lower the `generate_series(1, 10)` bound below
-- and re-migrate based on real load testing.
--
-- Slots self-heal via expires_at: if an edge function invocation crashes after
-- acquiring a slot but before releasing it, the slot becomes reclaimable once
-- its lease expires, instead of leaking capacity forever.

CREATE TABLE public.ai_gateway_slots (
  slot_id integer PRIMARY KEY,
  locked_at timestamp with time zone,
  expires_at timestamp with time zone
);

INSERT INTO public.ai_gateway_slots (slot_id, locked_at, expires_at)
SELECT gs, NULL, NULL FROM generate_series(1, 10) AS gs;

ALTER TABLE public.ai_gateway_slots ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: this table is only ever touched via the
-- SECURITY DEFINER functions below (called by the edge function's service-role
-- client). Anon and authenticated clients get zero direct access.

CREATE OR REPLACE FUNCTION public.acquire_ai_slot(p_ttl_seconds integer DEFAULT 120)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id integer;
BEGIN
  UPDATE public.ai_gateway_slots
  SET locked_at = now(), expires_at = now() + make_interval(secs => p_ttl_seconds)
  WHERE slot_id = (
    SELECT slot_id FROM public.ai_gateway_slots
    WHERE locked_at IS NULL OR expires_at < now()
    ORDER BY slot_id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING slot_id INTO v_slot_id;

  RETURN v_slot_id; -- NULL when no slot is currently available
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_slot(p_slot_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_gateway_slots
  SET locked_at = NULL, expires_at = NULL
  WHERE slot_id = p_slot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_ai_slot(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_slot(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_ai_slot(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_slot(integer) TO service_role;
