-- claim_community_quest was the one mutating community RPC with zero
-- ownership check — no device token, unlike send_community_message /
-- add_community_reaction / edit_own_community_message / etc., which all
-- mint-or-verify one via participant_device_tokens. Anyone could call
-- supabase.rpc('claim_community_quest', { p_participant_email: 'anyone@
-- else.edu', ... }) directly and insert a community_quest_completions row
-- for an email that isn't theirs — those rows render as badges next to
-- that person's name on every message they've ever sent. Also normalizes
-- p_participant_email (was compared raw against sender_email, which is
-- always lowercase — the same class of bug 20260816000000 already fixed
-- for edit/delete_own_community_message).

DROP FUNCTION IF EXISTS public.claim_community_quest(TEXT, TEXT, UUID);

CREATE FUNCTION public.claim_community_quest(
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_quest_id UUID,
  p_device_token TEXT DEFAULT NULL
)
RETURNS TABLE (ok BOOLEAN, message TEXT, badge_emoji TEXT, badge_label TEXT, new_device_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_quest RECORD;
  v_already BOOLEAN;
  v_has_post BOOLEAN;
  v_existing_hash TEXT;
  v_minted_token TEXT;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_quest FROM public.community_quests WHERE id = p_quest_id AND is_active = true;
  IF v_quest IS NULL THEN
    RETURN QUERY SELECT false, 'This quest is not available right now', NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.community_quest_completions
    WHERE quest_id = p_quest_id AND participant_email = v_email
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already claimed', v_quest.badge_emoji, v_quest.badge_label, NULL::TEXT;
    RETURN;
  END IF;

  -- Same mint-or-verify pattern as every other mutating community RPC —
  -- first-ever call for this email mints a token and proceeds (nothing to
  -- verify against yet); every call after that must present the matching
  -- token, same as sending a message or reacting.
  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This browser isn''t verified for that email — send a community message first.', NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_quest.quest_type = 'chat_action' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.community_messages cm
      JOIN public.community_channels cc ON cc.id = cm.channel_id
      WHERE cm.sender_email = v_email AND cc.name = v_quest.action_channel_name
    ) INTO v_has_post;
    IF NOT v_has_post THEN
      RETURN QUERY SELECT false, format('Post in #%s first, then come back to claim!', v_quest.action_channel_name), NULL::TEXT, NULL::TEXT, v_minted_token;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.community_quest_completions (quest_id, participant_email, participant_name)
  VALUES (p_quest_id, v_email, p_participant_name)
  ON CONFLICT (quest_id, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Quest complete!', v_quest.badge_emoji, v_quest.badge_label, v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

-- community_muted_users had a genuinely public SELECT policy ("viewable by
-- everyone") even though the client only ever needs its own row (see
-- CommunityChat.tsx's mutedUntil check) — anyone with the anon key could
-- dump the whole table: who's muted, until when, and the organizer's
-- free-text reason. The app itself already treats the full list as
-- organizer-only (routes through the passphrase-gated
-- list_muted_community_users admin action).
--
-- There's no real per-request auth in this app (self-asserted email over
-- the shared anon key, same limitation documented elsewhere in this
-- schema) — so an RLS policy has no session identity to scope a "your own
-- row only" check against; a JWT-claim-based policy would be security
-- theater here, not a real restriction. Same fix this codebase already
-- uses everywhere else for this exact shape of problem (get_my_projects,
-- get_my_point_events, etc.): drop public SELECT entirely and go through
-- a SECURITY DEFINER RPC that takes the email as an explicit parameter
-- instead of relying on RLS to infer it.
DROP POLICY IF EXISTS "Mute status is viewable by everyone" ON public.community_muted_users;
REVOKE SELECT ON public.community_muted_users FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_mute_status(p_participant_email TEXT)
RETURNS TABLE (muted_until TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mu.muted_until FROM public.community_muted_users mu
  WHERE mu.participant_email = lower(trim(p_participant_email)) AND mu.muted_until > now();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_mute_status(TEXT) TO anon, authenticated;
