-- Community Chat deep audit: create_community_channel checked-then-inserted
-- with nothing backing the uniqueness check transactionally — two
-- organizers submitting the identical (or same-except-case) channel name
-- at the same instant could both pass the check and create true
-- duplicates. A real unique index closes the race at the database level;
-- admin-actions/index.ts now also catches the resulting 23505
-- unique-violation and turns it into the same friendly "already exists"
-- message the normal check-first path already gives.
CREATE UNIQUE INDEX IF NOT EXISTS community_channels_name_lower_idx
ON public.community_channels (lower(name));
