-- Moderation: mute a participant, and let organizers remove ANY message
-- (previously only your own — there was no way to handle abuse/spam once
-- it happened beyond removing someone's entire staff badge).
--
-- Mute enforcement lives in the existing message INSERT policy so it can't
-- be bypassed by hitting the table directly; deleting someone else's
-- message and muting/unmuting both go through admin-actions (service role)
-- since there's no organizer-scoped RLS concept in this app (same reason
-- every other organizer-only action already routes through there).

CREATE TABLE public.community_muted_users (
  participant_email TEXT NOT NULL PRIMARY KEY,
  muted_until TIMESTAMPTZ NOT NULL,
  muted_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_muted_users ENABLE ROW LEVEL SECURITY;

-- Public read so the client can show "you're muted until X" — no direct
-- write from anon at all, muting is exclusively an admin-actions operation.
CREATE POLICY "Mute status is viewable by everyone"
ON public.community_muted_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement" ON public.community_messages;
CREATE POLICY "Anyone can send messages as themselves, non-staff, non-announcement, non-muted"
ON public.community_messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = channel_id AND cc.channel_type = 'announcement'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_staff cs
    WHERE cs.participant_email = sender_email
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = sender_email AND mu.muted_until > now()
  )
);

-- Pinned messages — there was no way to keep an important message visible
-- above the normal scroll (only #announcements existed, which is a whole
-- separate channel organizers have to context-switch to).
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS pinned_by TEXT;
