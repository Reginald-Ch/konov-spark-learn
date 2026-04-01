
-- Create waitlist_signups table
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  referral_code text NOT NULL UNIQUE,
  referred_by text,
  position serial NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO public
WITH CHECK (true);

-- Public can count total signups (needed for social proof counter)
CREATE POLICY "Anyone can count waitlist"
ON public.waitlist_signups
FOR SELECT
TO public
USING (true);

-- Function to generate a short referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code on insert
CREATE TRIGGER waitlist_generate_referral
  BEFORE INSERT ON public.waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();
