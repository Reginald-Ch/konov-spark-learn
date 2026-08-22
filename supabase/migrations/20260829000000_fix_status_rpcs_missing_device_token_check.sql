-- Security audit: get_my_mute_status and get_my_quest_status both take a
-- bare p_participant_email with NO device-token check at all — despite
-- both existing specifically to guard sensitive per-person text
-- (community_muted_users.reason, community_quest_proof_reviews.
-- rejection_reason) that got its public RLS/column access deliberately
-- locked down earlier this session. Anyone with the anon key could call
-- either RPC with an ARBITRARY email — no proof of identity required —
-- and read whether that person is muted, until when, and the organizer's
-- free-text reason for it (which can be genuinely sensitive commentary
-- about a specific teen's behavior), or their quest rejection reason.
-- The RLS/column lockdown these two RPCs exist to route around was real
-- and correct; the RPCs themselves just never got the same device-token
-- proof-of-identity check every other participant-scoped RPC in this app
-- already requires (send_community_message, claim_community_quest,
-- join_voice_room, etc.). Fixed the same way: verify the caller's device
-- token against participant_device_tokens before returning anything.
-- Unlike those mutating RPCs, this one never MINTS a token on a miss —
-- minting is a side effect that belongs to the first real mutating action,
-- not a read. An email with no token yet (never sent a message/joined
-- voice/claimed a quest on this browser) has nothing to check identity
-- against, so it just gets an empty result — normal and expected the
-- first time these poll right after joining, before any device token
-- exists yet.

DROP FUNCTION IF EXISTS public.get_my_mute_status(TEXT);

CREATE FUNCTION public.get_my_mute_status(p_participant_email TEXT, p_device_token TEXT)
RETURNS TABLE (muted_until TIMESTAMPTZ, reason TEXT)
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
    SELECT mu.muted_until, mu.reason FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now();
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_mute_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_mute_status(TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_quest_status(TEXT);

CREATE FUNCTION public.get_my_quest_status(p_participant_email TEXT, p_device_token TEXT)
RETURNS TABLE (quest_id UUID, status TEXT, rejection_reason TEXT)
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
    SELECT qc.quest_id, qc.status, pr.rejection_reason
    FROM public.community_quest_completions qc
    LEFT JOIN public.community_quest_proof_reviews pr ON pr.completion_id = qc.id
    WHERE qc.participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_quest_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_quest_status(TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
