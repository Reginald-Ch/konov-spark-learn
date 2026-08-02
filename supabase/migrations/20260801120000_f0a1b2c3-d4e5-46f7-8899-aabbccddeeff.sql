-- FORGE admin/gamification foundation.
--
-- Two things happen in this migration:
--
-- 1) Security hardening. Prior to this, `hackathons` had fully open
--    create/update/delete policies (USING/WITH CHECK (true)) and `point_events`
--    had an open delete policy — any site visitor could create/edit/delete
--    hackathon events or wipe the entire points ledger with a direct API call.
--    Those policies are dropped. Privileged writes now go exclusively through
--    the `admin-actions` edge function (service-role client, passphrase-gated),
--    the same pattern already used by `ai_gateway_slots`.
--
-- 2) New schema for the daily-challenge / SP / Forge Coin / reward-box loop.

-- ============================================================
-- 1) Harden existing tables
-- ============================================================

DROP POLICY IF EXISTS "Anyone can create hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Anyone can delete hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Allow hackathon status updates" ON public.hackathons;
-- "Anyone can view active hackathons" (SELECT) is left as-is.

DROP POLICY IF EXISTS "Anyone can delete point events" ON public.point_events;
DROP POLICY IF EXISTS "Anyone can insert point events" ON public.point_events;

-- Client code still inserts a handful of low-stakes engagement events directly
-- (first_run_success, project_deployed, submitted_on_time, judge_score — see
-- ProjectEditor.tsx, PublishModal.tsx, JudgeDashboardPanel.tsx). Those stay
-- publicly insertable. The new currency/SP event types introduced below do not:
-- they can only be written by the admin-actions edge function (service role,
-- which bypasses RLS entirely).
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp'));

-- No delete policy at all now — resets happen via admin-actions ("reset_leaderboard").

-- ============================================================
-- 2) Daily challenges
-- ============================================================

CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  auto_max_points INTEGER NOT NULL DEFAULT 70,
  judge_max_points INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, day_number)
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- Readable by everyone (including drafts, so the admin panel can list/edit
-- them with the same anon key it uses everywhere else) — only writes are
-- gated. If a "don't reveal draft challenges to participants" requirement
-- shows up later, this should become a service-role-only read via
-- admin-actions instead of loosening this further.
CREATE POLICY "Anyone can view daily challenges"
ON public.daily_challenges FOR SELECT
USING (true);
-- No insert/update/delete policy: organizer-only, via admin-actions.

-- ============================================================
-- 3) Challenge submissions ("requests")
-- ============================================================

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  content_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, participant_email)
);

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenge submissions"
ON public.challenge_submissions FOR SELECT
USING (true);

CREATE POLICY "Participants can submit their own entry"
ON public.challenge_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update their own entry"
ON public.challenge_submissions FOR UPDATE
USING (true) WITH CHECK (true);

-- ============================================================
-- 4) Submission scores (70 automated + 30 judge rubric)
-- ============================================================
-- Deliberately no public write policy: scores are only ever written by the
-- admin-actions edge function, so a participant can never set their own score.

CREATE TABLE public.submission_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  auto_score INTEGER,
  auto_breakdown JSONB,
  judge_score INTEGER,
  judge_breakdown JSONB,
  total_sp INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finalized')),
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view submission scores"
ON public.submission_scores FOR SELECT
USING (true);

-- ============================================================
-- 5) Reward boxes (Issue Box for everyone who completes, Magic Box for top 3)
-- ============================================================

CREATE TABLE public.reward_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  box_type TEXT NOT NULL CHECK (box_type IN ('issue', 'magic')),
  contents_label TEXT,
  status TEXT NOT NULL DEFAULT 'unopened' CHECK (status IN ('unopened', 'opened', 'fulfilled')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

ALTER TABLE public.reward_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reward boxes"
ON public.reward_boxes FOR SELECT
USING (true);
-- No insert/update/delete policy: awarded and fulfilled only via admin-actions.

CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_reward_boxes_participant ON public.reward_boxes(participant_email);

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_boxes;

-- ============================================================
-- 6) Forge Coins: 100-coin signup bonus on hackathon registration
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_forge_coin_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (NEW.participant_email, 'forge_coin_grant', 100, NEW.hackathon_id, jsonb_build_object('reason', 'registration_bonus'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER grant_forge_coins_on_registration
AFTER INSERT ON public.hackathon_registrations
FOR EACH ROW
EXECUTE FUNCTION public.grant_forge_coin_signup_bonus();
