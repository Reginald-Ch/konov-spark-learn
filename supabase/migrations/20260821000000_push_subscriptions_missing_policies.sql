-- Live-state diagnostic (SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'push_subscriptions') came back with exactly ONE
-- policy: INSERT ("Anyone can subscribe to push"). The migration history
-- shows an UPDATE policy ("Anyone can update their push subscription",
-- 20260803170000) and a DELETE policy ("Anyone can delete their push
-- subscription", 20260803260000) were both written, but neither is live —
-- same "migration written, never actually applied" gap this session has
-- hit repeatedly elsewhere.
--
-- Concretely broken as a result:
--   - Re-subscribing: usePushNotifications.ts upserts on endpoint conflict;
--     the UPDATE half of that upsert has no policy to allow it, so RLS
--     silently denies it for anyone re-subscribing on a device that
--     already had a row (e.g. switching topics).
--   - Unsubscribing: the "turn notifications off" flow does
--     .delete().eq("endpoint", endpoint) — with no DELETE policy this
--     matches zero rows. No error surfaces; the subscription just never
--     actually gets removed and keeps receiving pushes.
--
-- No SELECT policy is being added here — that gap in the audit turned out
-- to be the opposite of a problem: nothing anon/authenticated needs
-- actually reads this table (the hook only ever upserts/deletes; the real
-- reader, send-push-notification, uses the service-role key and bypasses
-- RLS entirely), so leaving SELECT with no policy (default deny) is
-- correct and should stay that way.
--
-- USING(true)/WITH CHECK(true) matches this table's own established
-- posture on its other policies — no per-user auth exists to scope an
-- anonymous push endpoint by.

DROP POLICY IF EXISTS "Anyone can update their push subscription" ON public.push_subscriptions;
CREATE POLICY "Anyone can update their push subscription"
ON public.push_subscriptions FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete their push subscription" ON public.push_subscriptions;
CREATE POLICY "Anyone can delete their push subscription"
ON public.push_subscriptions FOR DELETE USING (true);
