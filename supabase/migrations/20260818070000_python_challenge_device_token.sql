-- Round 6 audit: python-challenge-grade (unlike submit_challenge_entry,
-- claim_community_quest, and submit_lesson_quiz — all hardened with the
-- participant_device_tokens TOFU pattern this session) took a bare
-- self-asserted participant_email with NO device-token check anywhere, and
-- confirmed verify_jwt = false in supabase/config.toml means it doesn't
-- even require a valid anon JWT at the gateway. Anyone could POST any known
-- registered participant's email directly to this edge function and mint
-- Python Challenge coins onto their balance / overwrite their attempt
-- history.
--
-- Standalone, reusable version of the mint-or-verify check already inlined
-- three times (submit_challenge_entry, claim_community_quest,
-- submit_lesson_quiz) — this one has no other side effect, so it's a clean
-- extraction rather than a fourth copy-paste. Deliberately NOT granted to
-- anon/authenticated: this is only ever called from inside the
-- python-challenge-grade edge function using its service-role client,
-- same reasoning as record_python_challenge_attempt's own grant comment —
-- the edge function is the trusted boundary, not this RPC in isolation.
CREATE OR REPLACE FUNCTION public.verify_or_mint_device_token(
  p_participant_email TEXT,
  p_device_token TEXT DEFAULT NULL
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
    RETURN QUERY SELECT true, 'Minted', v_minted_token;
    RETURN;
  END IF;

  IF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — submit from there, or use a different email.', NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Verified', NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_or_mint_device_token(TEXT, TEXT) FROM PUBLIC;
