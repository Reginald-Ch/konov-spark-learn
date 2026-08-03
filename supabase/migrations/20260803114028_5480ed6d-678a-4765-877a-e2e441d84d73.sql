DROP POLICY IF EXISTS "Anyone can create hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Anyone can delete hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Allow hackathon status updates" ON public.hackathons;
DROP POLICY IF EXISTS "Anyone can delete point events" ON public.point_events;
DROP POLICY IF EXISTS "Anyone can insert point events" ON public.point_events;

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
  benchmark_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, day_number)
);
GRANT SELECT ON public.daily_challenges TO anon, authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily challenges"
ON public.daily_challenges FOR SELECT
USING (true);

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.ai_projects(id) ON DELETE SET NULL,
  content_url TEXT,
  notes TEXT,
  submitted_code_snapshot TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, participant_email)
);
GRANT SELECT, INSERT, UPDATE ON public.challenge_submissions TO anon, authenticated;
GRANT ALL ON public.challenge_submissions TO service_role;
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
GRANT SELECT ON public.submission_scores TO anon, authenticated;
GRANT ALL ON public.submission_scores TO service_role;
ALTER TABLE public.submission_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view submission scores"
ON public.submission_scores FOR SELECT
USING (true);

CREATE TABLE public.reward_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  box_type TEXT NOT NULL CHECK (box_type IN ('issue', 'mission')),
  contents_label TEXT,
  status TEXT NOT NULL DEFAULT 'unopened' CHECK (status IN ('unopened', 'opened', 'fulfilled')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);
GRANT SELECT ON public.reward_boxes TO service_role;
GRANT ALL ON public.reward_boxes TO service_role;
ALTER TABLE public.reward_boxes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_reward_boxes_participant ON public.reward_boxes(participant_email);

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_boxes;

CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token', 'judge_score'));

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
DROP TRIGGER IF EXISTS grant_forge_coins_on_registration ON public.hackathon_registrations;
CREATE TRIGGER grant_forge_coins_on_registration
AFTER INSERT ON public.hackathon_registrations
FOR EACH ROW
EXECUTE FUNCTION public.grant_forge_coin_signup_bonus();

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.admin_credentials (
  role TEXT PRIMARY KEY CHECK (role IN ('organizer', 'judge')),
  passphrase_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_credentials TO service_role;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verify_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_passphrase IS NULL OR length(p_passphrase) = 0 THEN
    RETURN false;
  END IF;
  SELECT passphrase_hash INTO v_hash FROM public.admin_credentials WHERE role = p_role;
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_hash = extensions.crypt(p_passphrase, v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_credential(p_role TEXT, p_passphrase TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_passphrase IS NULL OR length(p_passphrase) < 6 THEN
    RAISE EXCEPTION 'Passphrase must be at least 6 characters';
  END IF;
  INSERT INTO public.admin_credentials (role, passphrase_hash, updated_at)
  VALUES (p_role, extensions.crypt(p_passphrase, extensions.gen_salt('bf')), now())
  ON CONFLICT (role) DO UPDATE SET passphrase_hash = EXCLUDED.passphrase_hash, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.verify_admin_credential(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_admin_credential(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_credential(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_credential(TEXT, TEXT) TO service_role;
SELECT public.set_admin_credential('organizer', 'admin098@konov');
SELECT public.set_admin_credential('judge', 'judge2059');

ALTER TABLE public.hackathons
  ADD COLUMN settings JSONB NOT NULL DEFAULT '{"mission_bonus_top_n": 5, "voting_enabled": false, "coins_unlock_lessons": true}'::jsonb;

CREATE OR REPLACE FUNCTION public.get_my_reward_boxes(p_participant_email TEXT, p_hackathon_id UUID)
RETURNS SETOF public.reward_boxes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reward_boxes
  WHERE participant_email = p_participant_email AND hackathon_id = p_hackathon_id;
$$;
REVOKE ALL ON FUNCTION public.get_my_reward_boxes(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_reward_boxes(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.open_reward_box(p_box_id UUID, p_participant_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reward_boxes
  SET status = 'opened', opened_at = now()
  WHERE id = p_box_id AND status = 'unopened' AND participant_email = p_participant_email;
END;
$$;
REVOKE ALL ON FUNCTION public.open_reward_box(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_reward_box(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_submission_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registered BOOLEAN;
  v_challenge_status TEXT;
  v_project_owner TEXT;
  v_project_code TEXT;
  v_already_finalized BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.submitted_at := now();
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.hackathon_registrations
    WHERE hackathon_id = NEW.hackathon_id AND participant_email = NEW.participant_email
  ) INTO v_registered;
  IF NOT v_registered THEN
    RAISE EXCEPTION 'You must register for this hackathon before submitting.';
  END IF;
  SELECT status INTO v_challenge_status FROM public.daily_challenges WHERE id = NEW.challenge_id;
  IF v_challenge_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'This challenge is not currently open for submissions.';
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT author_email, code INTO v_project_owner, v_project_code FROM public.ai_projects WHERE id = NEW.project_id;
    IF v_project_owner IS NULL OR v_project_owner <> NEW.participant_email THEN
      RAISE EXCEPTION 'You can only link a project you authored.';
    END IF;
    NEW.submitted_code_snapshot := v_project_code;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT (status = 'finalized') INTO v_already_finalized
    FROM public.submission_scores WHERE submission_id = NEW.id;
    IF v_already_finalized THEN
      RAISE EXCEPTION 'This submission has already been graded and can no longer be edited.';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_submission_integrity_trigger ON public.challenge_submissions;
CREATE TRIGGER enforce_submission_integrity_trigger
BEFORE INSERT OR UPDATE ON public.challenge_submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_integrity();

ALTER TABLE public.point_events DROP CONSTRAINT IF EXISTS point_events_hackathon_id_fkey;
ALTER TABLE public.point_events ADD CONSTRAINT point_events_hackathon_id_fkey
  FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id) ON DELETE CASCADE;
ALTER TABLE public.ai_projects DROP CONSTRAINT IF EXISTS ai_projects_hackathon_id_fkey;
ALTER TABLE public.ai_projects ADD CONSTRAINT ai_projects_hackathon_id_fkey
  FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id) ON DELETE SET NULL;