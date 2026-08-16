-- submit_challenge_entry — confirmed missing live (same root cause as the
-- Community Chat/voice fix in 20260815050000: this RPC was drafted but
-- never actually reached the live database). DailyChallengePanel.tsx only
-- ever calls this RPC, no fallback, so Daily Challenge submissions have
-- been completely broken for anyone.
--
-- Reused verbatim from the draft (20260813020000) — verified it still
-- matches everything currently live: the frontend's exact call signature
-- (p_challenge_id, p_hackathon_id, p_participant_email, p_device_token,
-- p_project_id, p_content_url, p_notes), the enforce_submission_integrity
-- trigger (confirmed live, unchanged, still enforces registration/
-- challenge-status/project-ownership/no-edit-after-finalized), and the
-- exact live policy names being dropped below (confirmed via diagnostic:
-- "Participants can submit their own entry" / "...update their own entry",
-- both well under the 63-char truncation limit that bit the chat migration,
-- so no truncated-name surprise here).

DROP POLICY IF EXISTS "Participants can submit their own entry" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Participants can update their own entry" ON public.challenge_submissions;

CREATE OR REPLACE FUNCTION public.submit_challenge_entry(
  p_challenge_id UUID,
  p_hackathon_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT,
  p_project_id UUID,
  p_content_url TEXT,
  p_notes TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, submission_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_submission_id UUID;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — submit from there, or use a different email.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- enforce_submission_integrity (BEFORE INSERT OR UPDATE trigger) still
  -- runs here and raises its own exceptions (not registered, challenge not
  -- live, project not yours, already finalized) — those propagate as a
  -- normal Postgres error, exactly like the raw insert/update they replace.
  INSERT INTO public.challenge_submissions (challenge_id, hackathon_id, participant_email, project_id, content_url, notes)
  VALUES (p_challenge_id, p_hackathon_id, v_email, p_project_id, p_content_url, p_notes)
  ON CONFLICT (challenge_id, participant_email) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    content_url = EXCLUDED.content_url,
    notes = EXCLUDED.notes
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT true, 'Submitted', v_minted_token, v_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_challenge_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_challenge_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) TO anon, authenticated;
