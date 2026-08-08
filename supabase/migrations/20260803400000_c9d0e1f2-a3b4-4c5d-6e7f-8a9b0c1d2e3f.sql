-- Build Studio bug-hunt (round 3): ai_projects' INSERT policy has been
-- WITH CHECK (true) since the very first migration that created it and
-- was never revisited when SELECT/UPDATE/DELETE got locked down behind
-- owner-checked RPCs (20260803340000). With the public anon key alone,
-- anyone can insert a row with is_published:true, any author_email
-- (including a real classmate's — the app's whole ownership model, so
-- this also attributes a forged project to a real student), any
-- hackathon_id, and — critically — a demo_url containing a javascript:
-- URI, which Leaderboard.tsx renders as a plain <a href>. A judge or
-- participant clicking that "Demo" link on a poisoned leaderboard entry
-- executes attacker script in the app's own origin, with access to the
-- same localStorage identity keys every other component trusts.
--
-- Real per-request ownership verification would need real auth (out of
-- scope, same accepted limitation as everywhere else in this app). What
-- IS fixable without that: matching WITH CHECK to what the two actual
-- legitimate insert call sites ever send. ProjectEditor.tsx's autosave
-- path always inserts is_published:false, points_earned:0, no demo_url
-- (defaults to NULL). PublishModal.tsx's first-publish path always
-- inserts demo_url:null explicitly and never sets points_earned (so it
-- takes the column default of 10). Neither ever sets a non-null
-- demo_url or a hackathon_id that isn't the currently-live event.
CREATE OR REPLACE FUNCTION public.is_live_hackathon(p_hackathon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_hackathon_id IS NULL OR EXISTS (
    SELECT 1 FROM public.hackathons WHERE id = p_hackathon_id AND status = 'live'
  );
$$;

DROP POLICY IF EXISTS "Anyone can insert projects" ON public.ai_projects;

CREATE POLICY "Anyone can insert projects matching the real publish flow"
ON public.ai_projects
FOR INSERT
WITH CHECK (
  demo_url IS NULL
  AND points_earned IN (0, 10)
  AND public.is_live_hackathon(hackathon_id)
);
