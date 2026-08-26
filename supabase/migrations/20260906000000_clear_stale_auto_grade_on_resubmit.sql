-- Found during DailyChallengePanel.tsx's second audit round, made more
-- consequential by the recent auto-grader rewrite (admin-actions/index.ts
-- now actually runs a submission's real code against each benchmark test,
-- rather than having an LLM imagine the response).
--
-- enforce_submission_integrity already blocks editing a FINALIZED
-- submission (once a judge scores it), but a submission that's only been
-- auto-graded (status still 'pending' — judge_score is what flips it to
-- 'finalized', per merge_submission_score) stays fully editable. Nothing
-- re-triggered grading or cleared the old result when that happened, so a
-- participant could: submit -> get auto-graded -> edit their project link/
-- notes/content -> DailyChallengePanel.tsx keeps showing the OLD
-- auto-grade's score/"On Time" badge as if it reflects what's there now,
-- when it actually describes code that was never re-run. This is a data-
-- integrity bug, not just a display one — the stale auto_score also
-- contributes to total_sp if a judge later finalizes without the organizer
-- separately noticing content changed and re-running Auto-Grade.
--
-- Clears auto_score/auto_breakdown/total_sp on UPDATE whenever the actual
-- submitted content (project_id/content_url/notes) changes and the
-- submission isn't finalized — forcing a re-grade before this submission
-- can finalize again, the same as a genuinely fresh submission. Judge-half
-- scoring is untouched either way (a judge hasn't acted yet in this branch,
-- since a finalized row is already blocked earlier in this same trigger).

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
