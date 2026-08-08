-- Message edit/delete for regular (non-staff, non-announcement) messages —
-- previously absent entirely; a sent message could never be corrected or
-- taken back.
--
-- Same trust model as everything else in this table (no real per-user auth
-- exists anywhere in the app, so RLS can't verify "this browser really is
-- sender_email" any more than it can for INSERT) — the client only ever
-- shows edit/delete controls for messages matching the caller's own claimed
-- email, same bar as message sending itself and the existing reactions
-- DELETE policy. What IS enforced server-side: nobody can touch a
-- staff-authored message this way — those went through the PIN/token-
-- verified send_staff_message path specifically to prevent exactly this
-- kind of unauthenticated tampering, so carving out an unauthenticated
-- edit/delete backdoor for them here would undo that.

ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE POLICY "Anyone can edit their own non-staff messages"
ON public.community_messages FOR UPDATE
USING (NOT EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = sender_email))
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = sender_email));

CREATE POLICY "Anyone can delete their own non-staff messages"
ON public.community_messages FOR DELETE
USING (NOT EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = sender_email));

-- community_messages is already in the supabase_realtime publication with
-- its default replica identity (primary key), which is all UPDATE/DELETE
-- events need here — `old.id` to know which row changed, `new.content`/
-- `new.edited_at` for the edit itself.
