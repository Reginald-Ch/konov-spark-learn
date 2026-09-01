-- Hackathon readiness / capacity audit finding.
--
-- community_messages has never had an index on channel_id — only its
-- implicit PRIMARY KEY index on id (see the original 20260113013047
-- migration). Every single message load in Community Chat filters by
-- channel_id and sorts by created_at:
--   fetchMessages:      WHERE channel_id = X ORDER BY created_at DESC LIMIT N
--   loadOlderMessages:  WHERE channel_id = X AND created_at < Y
--                       ORDER BY created_at DESC LIMIT N
-- Without a matching index, both run a full sequential scan of the WHOLE
-- table, filtering out every other channel's rows in-memory, on every
-- channel switch, every initial page load, every "Load earlier messages"
-- click, and every realtime-triggered refetch — for every connected
-- participant. Harmless at today's row count; guaranteed to degrade,
-- exactly when it matters most, as a week-long live hackathon's chat
-- history accumulates under real concurrent load. Every comparably hot
-- table elsewhere in this schema (challenge_submissions, point_events,
-- ai_projects, lesson_progress) already has this kind of index — this one
-- table was missed.
--
-- DESC to match the query's own ORDER BY direction exactly, so both the
-- "newest page" and "older than X" queries can walk the index directly
-- without an extra sort step.

CREATE INDEX IF NOT EXISTS idx_community_messages_channel_created
  ON public.community_messages (channel_id, created_at DESC);
