-- push_subscriptions only had an INSERT policy. The hook now upserts on
-- endpoint conflict (fixing a bug where re-subscribing with a new topic
-- silently no-op'd against an existing row) — that upsert's UPDATE path
-- needs its own policy or RLS denies it by default.
CREATE POLICY "Anyone can update their push subscription"
ON public.push_subscriptions FOR UPDATE USING (true) WITH CHECK (true);
