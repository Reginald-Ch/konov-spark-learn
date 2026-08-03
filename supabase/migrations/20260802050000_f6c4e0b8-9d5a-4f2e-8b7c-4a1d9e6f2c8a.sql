-- Gamification anti-cheat pass. Threat model: a participant calling the
-- Supabase REST API directly with the anon key (not through the UI at all)
-- — RLS `WITH CHECK (true)` on challenge_submissions previously let anyone
-- forge whatever they wanted. Each fix below closes one concrete exploit
-- found while auditing every write path a participant has into the system.

-- Frozen at submission time, so grading always reflects what existed then —
-- even if the linked project is edited (by anyone) afterward.
ALTER TABLE public.challenge_submissions ADD COLUMN submitted_code_snapshot TEXT;

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
  -- Exploit: submitted_at defaults to now() but a client can override it in
  -- the INSERT payload, faking "on time" for a late submission (the Boost
  -- Token gate reads exactly this column). Never trust the client's value.
  IF TG_OP = 'INSERT' THEN
    NEW.submitted_at := now();
  END IF;

  -- Exploit: nothing previously required the submitter to have registered —
  -- anyone could insert a submission under a made-up email, including for
  -- the express purpose of burning paid Auto-Grade calls on junk.
  SELECT EXISTS (
    SELECT 1 FROM public.hackathon_registrations
    WHERE hackathon_id = NEW.hackathon_id AND participant_email = NEW.participant_email
  ) INTO v_registered;
  IF NOT v_registered THEN
    RAISE EXCEPTION 'You must register for this hackathon before submitting.';
  END IF;

  -- Exploit: a submission could be inserted for a draft (unreleased) or
  -- already-closed challenge, gaming timing or seeing draft content early.
  SELECT status INTO v_challenge_status FROM public.daily_challenges WHERE id = NEW.challenge_id;
  IF v_challenge_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'This challenge is not currently open for submissions.';
  END IF;

  -- Exploit: project_id was trusted with no ownership check — participant A
  -- could point their submission at participant B's excellent project and
  -- get graded on B's work. Validate ownership, then snapshot the code so
  -- later edits (by anyone) can't retroactively change what gets graded.
  IF NEW.project_id IS NOT NULL THEN
    SELECT author_email, code INTO v_project_owner, v_project_code FROM public.ai_projects WHERE id = NEW.project_id;
    IF v_project_owner IS NULL OR v_project_owner <> NEW.participant_email THEN
      RAISE EXCEPTION 'You can only link a project you authored.';
    END IF;
    NEW.submitted_code_snapshot := v_project_code;
  END IF;

  -- Exploit: submissions were editable forever, including after grading —
  -- swap in different (or better) work post-score with no re-review.
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

-- Exploit: judge_score was never added to the privileged-event exclusion
-- list (it predates this system), so any participant could self-insert a
-- fake judge score directly via point_events — no judge or passphrase
-- involved. Locking it down here requires judges to submit scores through
-- admin-actions instead (see submit_gallery_score, wired up in the same
-- pass as this migration).
DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token', 'judge_score'));

-- Judge Dashboard's old gate was a hardcoded client-side code ('2059') that
-- the database never verified — closing point_events above would otherwise
-- just break that page. Seed a real judge credential (same DB-backed system
-- as the Admin Panel) so it keeps working with actual server-side auth.
-- Rotate this from the Admin Panel's Passphrases dialog whenever convenient.
SELECT public.set_admin_credential('judge', 'judge2059');
