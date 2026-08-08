-- Push notification bell could only ever be turned ON — the button
-- disables itself once subscribed with no way back, since usePushNotifications
-- never had an unsubscribe path. Fixing the hook needs a DELETE policy here;
-- matches the existing INSERT/UPDATE policies' security bar (USING(true)),
-- consistent with this table having no real per-user auth to scope by.
CREATE POLICY "Anyone can delete their push subscription"
ON public.push_subscriptions FOR DELETE USING (true);
