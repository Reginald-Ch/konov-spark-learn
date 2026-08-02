CREATE TABLE public.ai_gateway_slots (
  slot_id integer PRIMARY KEY,
  locked_at timestamp with time zone,
  expires_at timestamp with time zone
);

GRANT ALL ON public.ai_gateway_slots TO service_role;

INSERT INTO public.ai_gateway_slots (slot_id, locked_at, expires_at)
SELECT gs, NULL, NULL FROM generate_series(1, 10) AS gs;

ALTER TABLE public.ai_gateway_slots ENABLE ROW LEVEL SECURITY;

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

  RETURN v_slot_id;
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