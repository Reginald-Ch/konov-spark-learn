-- Push notification / mention pipeline audit.
--
-- notify-mention/index.ts is reachable directly from the browser with just
-- the public anon key (same "verify_jwt accepts any valid JWT, including
-- the anon key" gap already called out in send-push-notification's own
-- comment) and, unlike every other mutating community endpoint in this app
-- (send_community_message: 8/10s, add_community_reaction: 20/10s,
-- claim_community_quest: 5/10s, join/leave_voice_room: 8/10s), it has no
-- rate limit or idempotency check at all. Its only guard is "message is
-- younger than 2 minutes" (checked against edited_at when that's more
-- recent than created_at) — so:
--
--   1. Anyone can replay the same message_id against notify-mention
--      repeatedly within that window and get a fresh real push notification
--      sent to a real mentioned person every time.
--   2. edited_at resets on every edit_own_community_message call, which has
--      no rate limit of its own and doesn't require content to actually
--      change — so a message's own author can keep the 2-minute window open
--      indefinitely by saving trivial edits, and CommunityChat.tsx already
--      fires notify-mention after every edit that contains mention markup.
--      One legitimate mention becomes unlimited push spam toward a real
--      person, using nothing but ordinary chat permissions.
--
-- Fix: make notifying idempotent per (message_id, recipient) instead of
-- purely time-bounded, the same ON CONFLICT DO NOTHING pattern already used
-- throughout this schema for exactly this kind of "act at most once" gate.
-- Service-role only, matching voice_room_action_log's posture — nothing
-- anon/authenticated ever needs to read or write this directly.

CREATE TABLE IF NOT EXISTS public.community_mention_notifications (
  message_id UUID NOT NULL,
  participant_email TEXT NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, participant_email)
);
ALTER TABLE public.community_mention_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_mention_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.community_mention_notifications TO service_role;
