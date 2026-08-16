-- Community Chat + Voice corrective migration — confirmed live via direct
-- diagnostic query (not assumed from the older, never-applied
-- 20260813070000 migration file), scoped narrowly to what's actually
-- reported broken right now: sending messages, reacting, and joining voice
-- channels. All three fail because the RPCs CommunityChat.tsx calls
-- (send_community_message, add_community_reaction, remove_community_reaction,
-- join_voice_room, leave_voice_room) don't exist live at all, and
-- edit/delete_own_community_message exist but with older signatures missing
-- the p_device_token parameter the frontend now always sends — both produce
-- the exact "Could not find the function ... in the schema cache" class of
-- error the user hit.
--
-- Deliberately NOT touched here, confirmed still fine/out of scope:
--   - community_staff and its 3 functions (upsert_community_staff,
--     redeem_staff_invite, send_staff_message) — already live and working
--     with a DIFFERENT token scheme (invite_token_hash/token_redeemed_at)
--     than what the old 20260813070000 draft assumed
--     (staff_token_hash/token_issued_at). Applying that file's "1a" section
--     now would just add two new, unused, confusing columns on top of an
--     already-working system — skipped entirely.
--   - Daily Challenges / merge_submission_score / submission_scores — not
--     part of what was reported broken this time; submit_challenge_entry is
--     ALSO confirmed missing live (same root cause), but is being left for
--     a separate, explicitly-scoped follow-up rather than bundled in here.
--
-- pgcrypto's crypt()/gen_salt()/gen_random_bytes() are assumed already
-- available — this codebase already uses them elsewhere (admin credential
-- hashing), so no extension setup is included here.

CREATE TABLE IF NOT EXISTS public.participant_device_tokens (
  participant_email TEXT NOT NULL PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participant_device_tokens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.participant_device_tokens TO service_role;

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
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_message_id UUID;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing sender email', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = p_channel_id AND cc.channel_type = 'announcement'
  ) THEN
    RETURN QUERY SELECT false, 'Only organizers can post in this channel', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_email) THEN
    RETURN QUERY SELECT false, 'This email belongs to a staff account — use your staff invite link to chat', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'You are currently muted', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device. If that''s you, chat from there — otherwise use a different email.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, p_participant_name, v_email, trim(p_content), 'text')
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, 'Sent', v_minted_token, v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_community_message(TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_community_message(TEXT, TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

-- Live-confirmed exact policy names — note the second one is genuinely
-- truncated to 63 characters ("...non-announce", missing "ment") by
-- Postgres's NAMEDATALEN limit at CREATE time. The old draft migration's
-- DROP used the untruncated name and would have silently no-op'd, leaving
-- this spoofable policy in place.
DROP POLICY IF EXISTS "Anyone can send messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announce" ON public.community_messages;

DROP FUNCTION IF EXISTS public.edit_own_community_message(UUID, TEXT, TEXT);

CREATE FUNCTION public.edit_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT,
  p_content TEXT,
  p_device_token TEXT
)
RETURNS TABLE (content TEXT, edited_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_email TEXT;
  v_trimmed TEXT := trim(p_content);
  v_token_hash TEXT;
BEGIN
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;

  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> p_participant_email THEN
    RAISE EXCEPTION 'You can only edit your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be changed through the verified staff channel.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = p_participant_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  UPDATE public.community_messages
  SET content = v_trimmed, edited_at = now()
  WHERE id = p_message_id;

  RETURN QUERY SELECT cm.content, cm.edited_at FROM public.community_messages cm WHERE cm.id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.delete_own_community_message(UUID, TEXT);

CREATE FUNCTION public.delete_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_email TEXT;
  v_token_hash TEXT;
BEGIN
  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> p_participant_email THEN
    RAISE EXCEPTION 'You can only delete your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be removed by an organizer.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = p_participant_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  DELETE FROM public.community_messages WHERE id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_community_message(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_community_message(UUID, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_community_reaction(
  p_message_id UUID,
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT,
  p_emoji TEXT
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
  IF v_email = '' OR p_emoji IS NULL OR length(trim(p_emoji)) = 0 THEN
    RETURN QUERY SELECT false, 'Missing email or emoji', NULL::TEXT;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device.', NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.community_message_reactions (message_id, emoji, participant_email, participant_name)
  VALUES (p_message_id, p_emoji, v_email, p_participant_name)
  ON CONFLICT (message_id, emoji, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Reacted', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_reaction(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_community_reaction(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.remove_community_reaction(
  p_message_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT,
  p_emoji TEXT
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
  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RETURN QUERY SELECT false, 'This browser isn''t verified for that email.';
    RETURN;
  END IF;

  DELETE FROM public.community_message_reactions
  WHERE message_id = p_message_id AND emoji = p_emoji AND participant_email = v_email;

  RETURN QUERY SELECT true, 'Removed';
END;
$$;

REVOKE ALL ON FUNCTION public.remove_community_reaction(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_community_reaction(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can add a reaction" ON public.community_message_reactions;
DROP POLICY IF EXISTS "Participants can remove their own reaction" ON public.community_message_reactions;

CREATE OR REPLACE FUNCTION public.join_voice_room(
  p_channel_id UUID,
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_device_token TEXT
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
    RETURN QUERY SELECT false, 'Missing email', NULL::TEXT;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device.', NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.voice_room_participants (channel_id, participant_name, participant_email)
  VALUES (p_channel_id, p_participant_name, v_email)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Joined', v_minted_token;
END;
$$;

REVOKE ALL ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_voice_room(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.leave_voice_room(
  p_channel_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_token_hash TEXT;
BEGIN
  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RETURN;
  END IF;

  DELETE FROM public.voice_room_participants
  WHERE channel_id = p_channel_id AND participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can join voice rooms" ON public.voice_room_participants;
DROP POLICY IF EXISTS "Participants can leave voice rooms" ON public.voice_room_participants;
