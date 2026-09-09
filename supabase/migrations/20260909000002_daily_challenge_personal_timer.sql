-- Personal per-participant 1-hour clock for daily challenges. Previously
-- editability was gated ONLY on the challenge's own global `status = 'live'`
-- (enforce_submission_integrity), with no per-participant concept at all —
-- so closing the tab and coming back had no personal deadline, just the
-- shared challenge-wide window. This adds a `started_at` timestamp captured
-- the moment a specific participant begins (not when they submit), and a
-- 1-hour deadline computed from THAT — reopening the tab keeps the same
-- real-clock deadline (it is never reset), and the participant's own
-- project code is restored by ProjectEditor's existing save/restore path
-- exactly as before; nothing about that mechanism changes here.

ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Idempotent "begin" call: creates a placeholder submission row (no
-- project/link/notes yet) recording the participant's own start time, or
-- silently returns the EXISTING started_at if they already began — so
-- reopening the tab, or clicking "Continue" again, never resets their clock.
CREATE OR REPLACE FUNCTION public.start_challenge_attempt(
  p_challenge_id UUID,
  p_hackathon_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, submission_id UUID, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_submission_id UUID;
  v_started_at TIMESTAMPTZ;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — continue from there, or use a different email.', NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- enforce_submission_integrity still runs (registration + challenge-live
  -- checks) exactly as it does for submit_challenge_entry. started_at is
  -- set by the trigger itself on INSERT — never touched on the DO UPDATE
  -- branch, so an already-started attempt keeps its original clock.
  INSERT INTO public.challenge_submissions (challenge_id, hackathon_id, participant_email)
  VALUES (p_challenge_id, p_hackathon_id, v_email)
  ON CONFLICT (challenge_id, participant_email) DO UPDATE SET
    participant_email = EXCLUDED.participant_email -- no-op write, just to return the existing row
  RETURNING id, challenge_submissions.started_at INTO v_submission_id, v_started_at;

  RETURN QUERY SELECT true, 'Started', v_minted_token, v_submission_id, v_started_at;
END;
$$;

REVOKE ALL ON FUNCTION public.start_challenge_attempt(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_challenge_attempt(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- enforce_submission_integrity: stamp started_at on first INSERT, and add
-- the personal 1-hour deadline check alongside the existing challenge-wide
-- 'live' check. Both must hold: the organizer hasn't closed the challenge
-- AND this participant's own hour (from their own start) hasn't run out.
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

  -- Personal deadline — only meaningful once started_at exists (it always
  -- will after the INSERT branch above, so this effectively applies to
  -- every UPDATE from here on). The very first INSERT always passes: at
  -- that instant started_at = now(), so no time has elapsed yet.
  IF NEW.started_at IS NOT NULL AND now() > NEW.started_at + interval '1 hour' THEN
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
    -- started_at is intentionally never reassigned on UPDATE — the clock
    -- some in this row is preserved even across the DO UPDATE branch in
    -- start_challenge_attempt/submit_challenge_entry.
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

-- get_my_challenge_submissions needs started_at added to its return shape
-- so the frontend can compute/resume each participant's own countdown.
DROP FUNCTION IF EXISTS public.get_my_challenge_submissions(text, uuid[], text);
CREATE FUNCTION public.get_my_challenge_submissions(p_participant_email TEXT, p_challenge_ids UUID[], p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, challenge_id UUID, content_url TEXT, notes TEXT, project_id UUID, total_sp INTEGER, score_status TEXT, auto_breakdown JSONB, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT cs.id, cs.challenge_id, cs.content_url, cs.notes, cs.project_id,
           ss.total_sp, ss.status, ss.auto_breakdown, cs.started_at
    FROM public.challenge_submissions cs
    LEFT JOIN public.submission_scores ss ON ss.submission_id = cs.id
    WHERE cs.participant_email = v_email
      AND cs.challenge_id = ANY(p_challenge_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
