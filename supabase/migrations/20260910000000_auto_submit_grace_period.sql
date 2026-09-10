-- The personal 1-hour deadline (20260909000002) blocked ANY write the
-- instant now() passed started_at + 1 hour — including a legitimate
-- client-triggered "time's up, auto-submit whatever they have" call racing
-- the clock. That auto-submit fires off a periodic client-side check
-- (polling every few seconds) rather than a precise server timer, so it can
-- genuinely arrive a few seconds to a couple minutes after the exact
-- deadline (poll interval + network latency + minor clock drift) — without
-- slack here, the auto-submit itself would routinely get rejected by the
-- same trigger it's trying to beat. A short, fixed grace window lets that
-- one final write through without meaningfully extending anyone's actual
-- working time (a participant with the page open the whole time has no way
-- to make productive use of scrambling for 3 extra minutes once they see
-- the countdown hit zero and Start Challenge is already disabled by then).
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
    IF NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
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

  -- 3-minute grace window past the nominal 1-hour deadline, specifically so
  -- the client's own "time's up" auto-submit can still land.
  IF NEW.started_at IS NOT NULL AND now() > NEW.started_at + interval '1 hour 3 minutes' THEN
    RAISE EXCEPTION 'Your 1-hour window for this challenge has ended.';
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT author_email, code INTO v_project_owner, v_project_code FROM public.ai_projects WHERE id = NEW.project_id;
    IF v_project_owner IS NULL OR v_project_owner <> NEW.participant_email THEN
      RAISE EXCEPTION 'You can only link a project you authored.';
    END IF;
    NEW.submitted_code_snapshot := v_project_code;
  ELSE
    NEW.submitted_code_snapshot := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT (status = 'finalized') INTO v_already_finalized
    FROM public.submission_scores WHERE submission_id = NEW.id;
    IF v_already_finalized THEN
      RAISE EXCEPTION 'This submission has already been graded and can no longer be edited.';
    END IF;
    NEW.updated_at := now();
    NEW.started_at := OLD.started_at;

    IF NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.content_url IS DISTINCT FROM OLD.content_url
      OR NEW.notes IS DISTINCT FROM OLD.notes
    THEN
      UPDATE public.submission_scores
      SET auto_score = NULL, auto_breakdown = NULL, total_sp = NULL
      WHERE submission_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
