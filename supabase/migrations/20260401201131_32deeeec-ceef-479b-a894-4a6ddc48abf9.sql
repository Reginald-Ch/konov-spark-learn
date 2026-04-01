CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_signup_id uuid REFERENCES public.waitlist_signups(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to push" ON public.push_subscriptions
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view push subscriptions" ON public.push_subscriptions
  FOR SELECT TO public USING (true);