-- Announcement audit finding: 'team@forge.internal' is the synthetic
-- sender_email post_community_announcement/edit_community_announcement use
-- for every announcement (admin-actions/index.ts) — the whole "announcements
-- are organizer-only" design rests on the assumption that no REAL
-- participant's own identity ever equals that string. Nothing actually
-- enforced that assumption anywhere in the database.
--
-- edit_own_community_message/delete_own_community_message only ever
-- excluded community_staff members from the "this is your own message"
-- self-service path — 'team@forge.internal' was never inserted into
-- community_staff (it's not a real staff account), so it fell straight
-- through that check. And nothing stopped a participant from literally
-- typing "team@forge.internal" into the join screen's free-text email field
-- as their OWN identity, then sending one ordinary message to any text
-- channel — send_community_message's own staff check is the same
-- community_staff-only lookup, so it happily accepts it and, via the usual
-- trust-on-first-use flow, MINTS a device token bound to that exact
-- identity for whoever typed it in.
--
-- Put together: anyone can claim 'team@forge.internal' as their own chat
-- identity, and from that point on, edit_own_community_message's/
-- delete_own_community_message's ownership check (sender_email = the
-- caller's own email) passes for literally every announcement ever posted
-- — a full bypass of the organizer-only edit_community_announcement/
-- admin-actions gate this whole system is supposed to be protected by, not
-- from a bug in that gate itself but from something upstream of it never
-- being blocked. Fix: reject this identity explicitly, same shape as the
-- existing community_staff exclusion, at both the point it would first get
-- minted (send_community_message) and the two places it would actually let
-- someone tamper with an announcement (edit/delete_own_community_message).
-- Voice join, reactions, and quest claims aren't touched by this migration
-- — none of them grant any destructive capability over announcement
-- content, so there's nothing there for this identity to actually abuse.

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
  -- Reserved for the announcement system's own synthetic sender — never a
  -- real participant's identity to claim.
  IF v_email = 'team@forge.internal' THEN
    RETURN QUERY SELECT false, 'This email address is reserved and can''t be used to chat.', NULL::TEXT, NULL::UUID; RETURN;
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

CREATE OR REPLACE FUNCTION public.edit_own_community_message(
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
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_sender_email TEXT;
  v_trimmed TEXT := trim(p_content);
  v_token_hash TEXT;
BEGIN
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;
  IF length(v_trimmed) > 4000 THEN
    RAISE EXCEPTION 'Messages can''t be longer than 4000 characters.';
  END IF;

  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> v_email THEN
    RAISE EXCEPTION 'You can only edit your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be changed through the verified staff channel.';
  END IF;
  -- Closes the actual exploit: even if some participant already holds a
  -- device token bound to 'team@forge.internal' (however that happened),
  -- this is the decisive gate that stops them from rewriting an
  -- announcement's content through the "own message" self-edit path.
  IF v_sender_email = 'team@forge.internal' THEN
    RAISE EXCEPTION 'Announcements can only be changed by an organizer.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  UPDATE public.community_messages
  SET content = v_trimmed, edited_at = now()
  WHERE id = p_message_id;

  RETURN QUERY SELECT cm.content, cm.edited_at FROM public.community_messages cm WHERE cm.id = p_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_community_message(
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
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_sender_email TEXT;
  v_token_hash TEXT;
BEGIN
  SELECT sender_email INTO v_sender_email
  FROM public.community_messages WHERE id = p_message_id FOR UPDATE;

  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Message not found.';
  END IF;
  IF v_sender_email <> v_email THEN
    RAISE EXCEPTION 'You can only delete your own messages.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_staff cs WHERE cs.participant_email = v_sender_email) THEN
    RAISE EXCEPTION 'Staff messages can only be removed by an organizer.';
  END IF;
  -- Same decisive close as edit_own_community_message above, for delete.
  IF v_sender_email = 'team@forge.internal' THEN
    RAISE EXCEPTION 'Announcements can only be removed by an organizer.';
  END IF;

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RAISE EXCEPTION 'This browser isn''t verified for that email — send a message from it first.';
  END IF;

  DELETE FROM public.community_messages WHERE id = p_message_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
