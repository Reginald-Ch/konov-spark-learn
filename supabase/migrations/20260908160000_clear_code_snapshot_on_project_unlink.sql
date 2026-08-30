-- enforce_submission_integrity only ever refreshed submitted_code_snapshot
-- when a project was linked (IF NEW.project_id IS NOT NULL THEN ...), with
-- no ELSE branch. A participant who links a project, submits, gets auto-
-- graded against its real code, then edits their submission to unlink it
-- (project_id -> NULL, switching to a link/notes-only entry) kept the OLD
-- project's code frozen in submitted_code_snapshot forever. The sibling fix
-- one block below (20260906000000) correctly detects the project_id change
-- and clears the auto-score to force a re-grade, but auto_grade_challenge
-- (admin-actions/index.ts) checks submitted_code_snapshot before project_id
-- — so the re-grade silently ran against a project the participant
-- explicitly removed, not the link/notes they actually left behind.
-- Directly contradicts this pipeline's own stated invariant: "grading must
-- reflect what existed then, not whatever the linked project currently
-- contains."
--
-- Fix: whenever this row leaves an UPDATE with no project linked, the
-- snapshot leaves with it. Harmless on INSERT (already NULL by default,
-- this just makes it explicit) and on an UPDATE that never had a project to
-- begin with (NULL -> NULL, no-op).

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

  IF NEW.content_url IS NOT NULL AND NEW.content_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Link must start with http:// or https://';
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
  ELSE
    -- No project on this row anymore (never had one, or just unlinked) —
    -- nothing real to grade code against, so no stale snapshot should
    -- survive into an auto-grade run.
    NEW.submitted_code_snapshot := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT (status = 'finalized') INTO v_already_finalized
    FROM public.submission_scores WHERE submission_id = NEW.id;
    IF v_already_finalized THEN
      RAISE EXCEPTION 'This submission has already been graded and can no longer be edited.';
    END IF;
    NEW.updated_at := now();

    IF NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.content_url IS DISTINCT FROM OLD.content_url
      OR NEW.notes IS DISTINCT FROM OLD.notes
    THEN
      UPDATE public.submission_scores
      SET auto_score = NULL, auto_breakdown = NULL, total_sp = NULL
      WHERE submission_id = NEW.id AND status <> 'finalized';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
