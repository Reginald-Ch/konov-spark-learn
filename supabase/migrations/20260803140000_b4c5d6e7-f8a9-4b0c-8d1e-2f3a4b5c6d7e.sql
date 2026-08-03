-- Persist community message reactions (previously local-only React state,
-- so reactions never synced across users and vanished on refresh).

CREATE TABLE public.community_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, emoji, participant_email)
);

ALTER TABLE public.community_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
ON public.community_message_reactions FOR SELECT USING (true);

CREATE POLICY "Anyone can add a reaction"
ON public.community_message_reactions FOR INSERT WITH CHECK (true);

-- Matches the existing "Participants can leave voice rooms" policy's
-- security bar (USING (true)) — this system has no real per-user auth yet,
-- so removal is trusted client-side same as everywhere else in community chat.
CREATE POLICY "Participants can remove their own reaction"
ON public.community_message_reactions FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_message_reactions;
