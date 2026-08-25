-- Closes a real, confirmed gap found during this session's python-ai-assist
-- audit: the edge function has `verify_jwt = false` (consistent with the
-- rest of this app's anon-key architecture) and no per-caller request-volume
-- limit at all — only a fixed 10-slot ai_gateway_slots pool bounding how
-- many gateway calls can be IN FLIGHT at once, not how many a single caller
-- can make over time. Since ProjectView.tsx's chat interface is a fully
-- public, unauthenticated page, and the edge function trusts whatever
-- systemPrompt/knowledgeBase/botConfig/studentCode a caller sends with no
-- verification it belongs to a real project, this was a real cost-abuse
-- vector: a script could hit the endpoint directly, as fast as slots freed
-- up, indefinitely, against the platform's shared paid LLM key.
--
-- Deliberately per-IP request-volume throttling, not a rewrite of the
-- open-proxy issue itself (verifying request content against a real
-- project server-side is a separate, larger change with real risk of
-- subtly changing how published bots respond — flagged for a later,
-- unhurried pass). This is the purely-additive fix: it can't change
-- behavior for any legitimate caller under the limit, only reject a caller
-- making requests faster than any real person plausibly would.
--
-- service_role only — this table/function is called exclusively from
-- python-ai-assist's own server-side code (which already holds the service
-- role key for ai_gateway_slots), never reachable by anon/authenticated
-- directly.

CREATE TABLE IF NOT EXISTS public.ai_assist_rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_assist_rate_limit_events_identifier_created_at_idx
  ON public.ai_assist_rate_limit_events (identifier, created_at);

ALTER TABLE public.ai_assist_rate_limit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_assist_rate_limit_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_ai_assist_rate_limit(
  p_identifier TEXT,
  p_max_requests INT DEFAULT 20,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Opportunistic cleanup of this identifier's own stale rows (piggybacked
  -- on every call, no cron job needed) keeps the table from growing
  -- unbounded without ever needing a scheduled sweep.
  DELETE FROM public.ai_assist_rate_limit_events
  WHERE identifier = p_identifier
    AND created_at < now() - (p_window_seconds || ' seconds')::interval;

  SELECT count(*) INTO v_count
  FROM public.ai_assist_rate_limit_events
  WHERE identifier = p_identifier;

  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_assist_rate_limit_events (identifier) VALUES (p_identifier);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_assist_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_assist_rate_limit(TEXT, INT, INT) TO service_role;

NOTIFY pgrst, 'reload schema';
