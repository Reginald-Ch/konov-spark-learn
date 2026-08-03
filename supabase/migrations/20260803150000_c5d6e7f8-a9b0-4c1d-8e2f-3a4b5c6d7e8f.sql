-- Distinguish community managers / team members from participants in chat.
-- A real allowlist (not a client-trusted flag) so the badge can't be spoofed —
-- only organizers can add/remove entries, via the admin-actions edge function.

CREATE TABLE public.community_staff (
  participant_email TEXT NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL,
  role_label TEXT NOT NULL DEFAULT 'Team',
  badge_emoji TEXT NOT NULL DEFAULT '👑',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_staff ENABLE ROW LEVEL SECURITY;

-- Public read so the badge can render for everyone in chat; no public write —
-- managed exclusively through the service-role admin-actions endpoint.
CREATE POLICY "Staff list is viewable by everyone"
ON public.community_staff FOR SELECT USING (true);
