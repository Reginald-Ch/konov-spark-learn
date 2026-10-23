-- WARNING: push_subscriptions' UPDATE and DELETE policies were both
-- USING(true)/WITH CHECK(true) — added in 20260821000000 to fix a real
-- break (re-subscribing and unsubscribing were both silently failing with
-- no policy at all), but with no ownership check at all, ANY row could be
-- updated or deleted by anyone with the anon key regardless of which row
-- they claimed to target. Concretely: a direct REST call like
-- `PATCH /push_subscriptions?id=eq.<any-id>` with an attacker's own
-- endpoint/p256dh/auth would silently redirect that victim's future push
-- notifications to the attacker's device, and a filterless DELETE could
-- wipe every subscriber at once. Discovered via a security scan
-- 2026-09-15.
--
-- This app's own code (usePushNotifications.ts) never actually needed
-- "update/delete any row" — it only ever upserts or deletes the ONE row
-- matching a specific endpoint value it already possesses (the browser's
-- own PushManager subscription endpoint, an opaque per-device value only
-- that device knows). Routing both operations through SECURITY DEFINER
-- functions that take endpoint as a required parameter enforces exactly
-- that: the caller must already know the specific endpoint they're
-- modifying, the same "knowledge equals authorization" boundary this app
-- uses everywhere else it has no real per-user auth to check against.

DROP POLICY IF EXISTS "Anyone can update their push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete their push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_waitlist_signup_id UUID DEFAULT NULL,
  p_participant_email TEXT DEFAULT NULL,
  p_topics TEXT[] DEFAULT '{}'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.push_subscriptions (endpoint, p256dh, auth, waitlist_signup_id, participant_email, topics)
  VALUES (p_endpoint, p_p256dh, p_auth, p_waitlist_signup_id, p_participant_email, COALESCE(p_topics, '{}'))
  ON CONFLICT (endpoint) DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    waitlist_signup_id = EXCLUDED.waitlist_signup_id,
    participant_email = EXCLUDED.participant_email,
    topics = EXCLUDED.topics;
$$;
REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, UUID, TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, UUID, TEXT, TEXT[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
$$;
REVOKE ALL ON FUNCTION public.delete_push_subscription(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
