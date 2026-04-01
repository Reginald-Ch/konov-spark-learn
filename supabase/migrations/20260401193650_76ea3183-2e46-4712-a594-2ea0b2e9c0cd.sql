
ALTER TABLE public.waitlist_signups ADD COLUMN whatsapp text;
ALTER TABLE public.waitlist_signups ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.waitlist_signups DROP CONSTRAINT waitlist_signups_email_key;
ALTER TABLE public.waitlist_signups ADD CONSTRAINT email_or_whatsapp CHECK (email IS NOT NULL OR whatsapp IS NOT NULL);
CREATE UNIQUE INDEX waitlist_signups_email_uniq ON public.waitlist_signups(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX waitlist_signups_whatsapp_uniq ON public.waitlist_signups(whatsapp) WHERE whatsapp IS NOT NULL;
