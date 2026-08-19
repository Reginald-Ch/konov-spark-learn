-- Round 2 audit fixes for Community Chat. Several of these correct gaps
-- left by the round 1 fixes, found by re-auditing with fresh eyes.

-- 1. community_muted_users actually had TWO separate wide-open SELECT
-- policies, created by two different migrations ("Mute status is viewable
-- by everyone" from 20260803290000, "Anyone can read mute status" from
-- 20260808232003) — the round-1 fix only dropped the first one. The
-- REVOKE SELECT already applied is what's actually been closing the leak
-- since GRANTs are checked before RLS, but the second policy (and the
-- GRANT SELECT sitting right above it in its origin migration) are still
-- live and would reopen this immediately if that block is ever re-applied.
DROP POLICY IF EXISTS "Anyone can read mute status" ON public.community_muted_users;
-- Idempotent re-statement, in case ordering ever changes.
REVOKE SELECT ON public.community_muted_users FROM anon, authenticated;

-- 2. leave_voice_room RETURNS VOID and does a bare RETURN (success, deletes
-- nothing) on a device-token mismatch — the round-1 fix that checks
-- `{ error }` from this RPC can never actually detect that failure mode,
-- which is exactly the scenario its own comment named (an early voice
-- join before any device token has been minted). Now returns (ok, message)
-- like every sibling community RPC, so the frontend can tell a real
-- failure apart from a silent no-op.
DROP FUNCTION IF EXISTS public.leave_voice_room(UUID, TEXT, TEXT);

CREATE FUNCTION public.leave_voice_room(
  p_channel_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT DEFAULT NULL
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_token_hash TEXT;
BEGIN
  IF v_email = '' OR p_channel_id IS NULL THEN
    RETURN QUERY SELECT false, 'Missing email or channel'; RETURN;
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    -- Not verified for this email — nothing to delete under someone
    -- else's identity, but this is a real failure the caller needs to
    -- know about (previously silent: RETURNS VOID with a bare RETURN
    -- here read identically to a genuine success to any caller checking
    -- only for a thrown error).
    RETURN QUERY SELECT false, 'This browser is not verified for that email'; RETURN;
  END IF;

  DELETE FROM public.voice_room_participants
  WHERE channel_id = p_channel_id AND participant_email = v_email;

  RETURN QUERY SELECT true, 'Left';
END;
$$;

REVOKE ALL ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) TO anon, authenticated;

-- 3. Same server-side length/character floor as set_my_profile already
-- applies to usernames — send_community_message never validated
-- p_participant_name at all, which matters now that display names get
-- embedded into OTHER people's messages via @mentions (see the
-- CommunityChat.tsx fix for the client-side half of this: escaping `]`
-- and `)` when building the mention markup). A name containing those
-- characters could otherwise forge a fake link inside someone else's
-- message when they @mention the attacker.
CREATE OR REPLACE FUNCTION public.send_community_message(
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, message_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_name TEXT := trim(coalesce(p_participant_name, ''));
  v_trimmed TEXT := trim(coalesce(p_content, ''));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_message_id UUID;
BEGIN
  IF v_trimmed = '' THEN
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::TEXT, NULL::UUID; RETURN;
  END IF;
  IF length(v_trimmed) > 4000 THEN
    RETURN QUERY SELECT false, 'Messages can''t be longer than 4000 characters.', NULL::TEXT, NULL::UUID; RETURN;
  END IF;
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing sender email', NULL::TEXT, NULL::UUID; RETURN;
  END IF;
  IF v_name = '' OR length(v_name) > 60 THEN
    RETURN QUERY SELECT false, 'Display name must be 1-60 characters.', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = p_channel_id AND cc.channel_type = 'announcement'
  ) THEN
    RETURN QUERY SELECT false, 'Only organizers can post in this channel', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_email) THEN
    RETURN QUERY SELECT false, 'This email belongs to a staff account — use your staff invite link to chat', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'You are currently muted', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  IF (
    SELECT COUNT(*) FROM public.community_messages cm
    WHERE cm.sender_email = v_email AND cm.created_at > now() - interval '10 seconds'
  ) >= 8 THEN
    RETURN QUERY SELECT false, 'You are sending messages too quickly — slow down a moment.', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device. If that''s you, chat from there — otherwise use a different email.', NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_name, v_email, v_trimmed, 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_minted_token, v_message_id;
END;
$$;

-- 4. claim_community_quest: the "already claimed" check ran before the
-- device-token check, so an unverified anon caller could still probe any
-- (email, quest_id) pair for claim status with zero proof of identity.
-- Reordered so the token check always runs first. Also adds the same
-- rate limit every other mutating community RPC already has.
CREATE OR REPLACE FUNCTION public.claim_community_quest(
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
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  IF (
    SELECT COUNT(*) FROM public.community_quest_completions qc
    WHERE qc.participant_email = v_email AND qc.completed_at > now() - interval '10 seconds'
  ) >= 5 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before claiming another quest.', NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This browser isn''t verified for that email — send a community message first.', NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  SELECT * INTO v_quest FROM public.community_quests WHERE id = p_quest_id AND is_active = true;
  IF v_quest IS NULL THEN
    RETURN QUERY SELECT false, 'This quest is not available right now', NULL::TEXT, NULL::TEXT, v_minted_token; RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.community_quest_completions
    WHERE quest_id = p_quest_id AND participant_email = v_email
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already claimed', v_quest.badge_emoji, v_quest.badge_label, v_minted_token; RETURN;
  END IF;

  IF v_quest.quest_type = 'chat_action' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.community_messages cm
      JOIN public.community_channels cc ON cc.id = cm.channel_id
      WHERE cm.sender_email = v_email AND cc.name = v_quest.action_channel_name
    ) INTO v_has_post;
    IF NOT v_has_post THEN
      RETURN QUERY SELECT false, format('Post in #%s first, then come back to claim!', v_quest.action_channel_name), NULL::TEXT, NULL::TEXT, v_minted_token; RETURN;
    END IF;
  END IF;

  INSERT INTO public.community_quest_completions (quest_id, participant_email, participant_name)
  VALUES (p_quest_id, v_email, p_participant_name)
  ON CONFLICT (quest_id, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Quest complete!', v_quest.badge_emoji, v_quest.badge_label, v_minted_token;
END;
$$;
