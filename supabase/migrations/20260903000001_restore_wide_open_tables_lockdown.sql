-- Retroactive migration file — same situation as 20260903000000: this
-- exact fix (REVOKE + policy cleanup on four tables found to have full
-- anon/authenticated table privileges — INSERT/SELECT/UPDATE/DELETE/
-- TRUNCATE, not just an open SELECT) was already found, written as a
-- chat-provided SQL block, run by the user, and confirmed live earlier
-- this session — but never committed to the repo as a migration file,
-- so a later file-only audit round still flagged these tables as
-- vulnerable. Writing it now to close that repo-tracking gap; safe to
-- re-run regardless of current live state (REVOKE/DROP POLICY IF EXISTS
-- are both idempotent).
--
-- The bug this restores the fix for: point_events, hackathon_registrations,
-- challenge_submissions, and submission_scores all had FULL anon/
-- authenticated table privileges (INSERT, SELECT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES, TRIGGER) — confirmed via live
-- information_schema.role_table_grants, not just an overly-permissive
-- RLS policy. Anyone with the public anon key could forge/delete point
-- events (coins, badges, judge scores), tamper with or delete hackathon
-- registrations, rewrite any participant's challenge submission content
-- after the fact, rewrite or wipe judge scores before or after reveal,
-- or TRUNCATE any of these tables outright. The app itself never reads/
-- writes these tables directly (confirmed via grep — everything already
-- routes through privacy-safe SECURITY DEFINER RPCs), so revoking is
-- safe and doesn't break anything legitimate.

REVOKE ALL ON public.point_events FROM anon, authenticated;
REVOKE ALL ON public.hackathon_registrations FROM anon, authenticated;
REVOKE ALL ON public.challenge_submissions FROM anon, authenticated;
REVOKE ALL ON public.submission_scores FROM anon, authenticated;

-- Defense-in-depth cleanup: these permissive policies do nothing once the
-- grants above are revoked (PostgREST checks table grants before RLS is
-- ever evaluated), but leaving them in place is a landmine — a future
-- migration that accidentally re-grants access would silently reopen
-- this exact hole with no additional review, since the policy itself
-- was never the thing actually blocking anything.
DROP POLICY IF EXISTS "Anyone can register for hackathons" ON public.hackathon_registrations;
DROP POLICY IF EXISTS "Users can view their registrations" ON public.hackathon_registrations;
DROP POLICY IF EXISTS "Users can update their registration" ON public.hackathon_registrations;
DROP POLICY IF EXISTS "Anyone can view point events" ON public.point_events;
DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
DROP POLICY IF EXISTS "Anyone can view challenge submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Anyone can view submission scores" ON public.submission_scores;
