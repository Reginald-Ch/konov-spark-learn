-- Security audit fix (batch 2, item 2): the existing UPDATE/DELETE policies
-- on community_messages are named "own messages" but their USING/WITH CHECK
-- clauses only ever verify the row's sender_email doesn't belong to staff —
-- they never check the caller against sender_email at all. Since there's no
-- real per-user auth in this app, RLS has no session identity to compare a
-- row against anyway, so the fix isn't a stronger RLS predicate (there's
-- nothing to bind it to) — it's routing edit/delete through a
-- SECURITY DEFINER RPC that at least checks the caller's *claimed* email
-- against the row's actual sender_email before touching it. That's
-- spoofable only by knowing the real sender's email, the same bar every
-- other per-participant action in this app already sits at — instead of
-- today's bar of zero: any non-staff message id, no claim required.

CREATE OR REPLACE FUNCTION public.edit_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT,
  p_content TEXT
)
RETURNS TABLE (content TEXT, edited_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_email TEXT;
  v_trimmed TEXT := trim(p_content);
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

  UPDATE public.community_messages
  SET content = v_trimmed, edited_at = now()
  WHERE id = p_message_id;

  RETURN QUERY SELECT cm.content, cm.edited_at FROM public.community_messages cm WHERE cm.id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_own_community_message(UUID, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_community_message(
  p_message_id UUID,
  p_participant_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_email TEXT;
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

  DELETE FROM public.community_messages WHERE id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_community_message(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_community_message(UUID, TEXT) TO anon, authenticated;

-- The whole reason this bug existed: these two policies let raw table
-- UPDATE/DELETE through with no ownership check at all. Drop them — the
-- RPCs above are now the only path for a participant to edit/delete their
-- own message. Organizer moderation (delete_community_message in
-- admin-actions.ts) is unaffected — it's service_role, not gated by these.
DROP POLICY IF EXISTS "Anyone can edit their own non-staff messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can delete their own non-staff messages" ON public.community_messages;
