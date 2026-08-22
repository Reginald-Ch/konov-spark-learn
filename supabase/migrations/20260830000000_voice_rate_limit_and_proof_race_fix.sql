-- Community Chat security/functional audit (round 9):
--
-- 1) join_voice_room/leave_voice_room had zero rate limiting, unlike
--    send_community_message (8/10s), add_community_reaction (20/10s), and
--    claim_community_quest (5/10s). The client subscribes globally and
--    unfiltered to voice_room_participants changes — every join/leave
--    triggers a full-table refetch in EVERY connected browser tab, not
--    just the mover's. A tight join/leave loop from one already-minted
--    device token would multiply its own request rate by the number of
--    open tabs, a real (if not catastrophic) load-amplification vector at
--    hackathon scale. voice_room_participants itself can't be used to
--    count recent actions the way community_messages/quest_completions
--    are for their own rate limits — a LEAVE deletes the row, so a
--    join+leave burst leaves no trace to count. voice_room_action_log is
--    a minimal append-only log purely for this: no anon/authenticated
--    access at all (only touched from inside these SECURITY DEFINER
--    functions), one row per join/leave attempt, never read back except
--    to count recent rows.
--
-- 2) claim_community_quest's proof_upload branch: the fresh-completion
--    INSERT path (no existing row) had no ON CONFLICT handling, unlike
--    the chat_action/self_report path right below it. Two concurrent
--    calls for the same participant+quest (double-click, two tabs) that
--    both read v_existing IS NULL before either commits would race — the
--    first succeeds, the second raises a raw unique-violation that
--    bubbled up as a technical Postgres error in a toast, instead of the
--    same friendly "already submitted" message a sequential second call
--    already gets.

CREATE TABLE IF NOT EXISTS public.voice_room_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_room_action_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_room_action_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.voice_room_action_log TO service_role;
CREATE INDEX IF NOT EXISTS voice_room_action_log_email_time_idx
  ON public.voice_room_action_log (participant_email, created_at);

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
  v_current_count INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing email', NULL::TEXT;
    RETURN;
  END IF;

  IF (
    SELECT COUNT(*) FROM public.voice_room_action_log
    WHERE participant_email = v_email AND created_at > now() - interval '10 seconds'
  ) >= 8 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before joining voice again.', NULL::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.voice_room_action_log (participant_email) VALUES (v_email);

  IF EXISTS (
    SELECT 1 FROM public.community_muted_users mu
    WHERE mu.participant_email = v_email AND mu.muted_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'You are currently muted, which also applies to voice channels.', NULL::TEXT;
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

  IF NOT EXISTS (
    SELECT 1 FROM public.voice_room_participants
    WHERE channel_id = p_channel_id AND participant_email = v_email
  ) THEN
    SELECT COUNT(*) INTO v_current_count FROM public.voice_room_participants WHERE channel_id = p_channel_id;
    IF v_current_count >= 24 THEN
      RETURN QUERY SELECT false, 'This voice channel is full right now — try again in a moment or use another channel.', v_minted_token;
      RETURN;
    END IF;
  END IF;

  DELETE FROM public.voice_room_participants
  WHERE participant_email = v_email AND channel_id != p_channel_id;

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

  IF (
    SELECT COUNT(*) FROM public.voice_room_action_log
    WHERE participant_email = v_email AND created_at > now() - interval '10 seconds'
  ) >= 8 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before leaving voice again.'; RETURN;
  END IF;
  INSERT INTO public.voice_room_action_log (participant_email) VALUES (v_email);

  SELECT token_hash INTO v_token_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_token_hash IS NULL OR p_device_token IS NULL OR v_token_hash != crypt(p_device_token, v_token_hash) THEN
    RETURN QUERY SELECT false, 'This browser is not verified for that email'; RETURN;
  END IF;

  DELETE FROM public.voice_room_participants
  WHERE channel_id = p_channel_id AND participant_email = v_email;

  RETURN QUERY SELECT true, 'Left';
END;
$$;

REVOKE ALL ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_voice_room(UUID, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_community_quest(
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_quest_id UUID,
  p_device_token TEXT DEFAULT NULL,
  p_proof_image TEXT DEFAULT NULL
)
RETURNS TABLE (ok BOOLEAN, message TEXT, badge_emoji TEXT, badge_label TEXT, new_device_token TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_quest RECORD;
  v_existing RECORD;
  v_has_post BOOLEAN;
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_completion_id UUID;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  IF (
    SELECT COUNT(*) FROM public.community_quest_completions qc
    WHERE qc.participant_email = v_email AND qc.completed_at > now() - interval '10 seconds'
  ) >= 5 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before claiming another quest.', NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This browser isn''t verified for that email — send a community message first.', NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT; RETURN;
  END IF;

  SELECT * INTO v_quest FROM public.community_quests WHERE id = p_quest_id AND is_active = true;
  IF v_quest IS NULL THEN
    RETURN QUERY SELECT false, 'This quest is not available right now', NULL::TEXT, NULL::TEXT, v_minted_token, NULL::TEXT; RETURN;
  END IF;

  SELECT * INTO v_existing FROM public.community_quest_completions
    WHERE quest_id = p_quest_id AND participant_email = v_email;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'approved' THEN
      RETURN QUERY SELECT true, 'Already claimed', v_quest.badge_emoji, v_quest.badge_label, v_minted_token, 'approved'::TEXT; RETURN;
    ELSIF v_existing.status = 'pending' THEN
      RETURN QUERY SELECT true, 'Already submitted — waiting for an organizer to review it.', NULL::TEXT, NULL::TEXT, v_minted_token, 'pending'::TEXT; RETURN;
    END IF;
    -- status = 'rejected' falls through below to allow a resubmission.
  END IF;

  IF v_quest.quest_type = 'chat_action' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.community_messages cm
      JOIN public.community_channels cc ON cc.id = cm.channel_id
      WHERE cm.sender_email = v_email AND lower(cc.name) = lower(v_quest.action_channel_name)
    ) INTO v_has_post;
    IF NOT v_has_post THEN
      RETURN QUERY SELECT false, format('Post in #%s first, then come back to claim!', v_quest.action_channel_name), NULL::TEXT, NULL::TEXT, v_minted_token, NULL::TEXT; RETURN;
    END IF;
  END IF;

  IF v_quest.quest_type = 'proof_upload' THEN
    IF p_proof_image IS NULL OR length(p_proof_image) = 0 THEN
      RETURN QUERY SELECT false, 'Attach a screenshot to submit this quest.', NULL::TEXT, NULL::TEXT, v_minted_token, NULL::TEXT; RETURN;
    END IF;
    IF length(p_proof_image) > 2 * 1024 * 1024 THEN
      RETURN QUERY SELECT false, 'That screenshot is too large — try a smaller image (under ~1.5MB).', NULL::TEXT, NULL::TEXT, v_minted_token, NULL::TEXT; RETURN;
    END IF;

    IF v_existing IS NOT NULL THEN
      -- Only reachable here when v_existing.status = 'rejected' (approved/
      -- pending already returned above) — resubmission, reuse the row.
      UPDATE public.community_quest_completions
        SET status = 'pending', participant_name = p_participant_name, completed_at = now()
        WHERE id = v_existing.id;
      v_completion_id := v_existing.id;
    ELSE
      INSERT INTO public.community_quest_completions (quest_id, participant_email, participant_name, status)
      VALUES (p_quest_id, v_email, p_participant_name, 'pending')
      ON CONFLICT (quest_id, participant_email) DO NOTHING
      RETURNING id INTO v_completion_id;

      IF v_completion_id IS NULL THEN
        -- A concurrent call for the same participant+quest (double-click,
        -- two tabs) won the race and committed first — same friendly
        -- outcome a strictly-sequential second call already gets above,
        -- not a raw unique-violation surfaced to the participant.
        RETURN QUERY SELECT true, 'Already submitted — waiting for an organizer to review it.', NULL::TEXT, NULL::TEXT, v_minted_token, 'pending'::TEXT; RETURN;
      END IF;
    END IF;

    INSERT INTO public.community_quest_proof_reviews (completion_id, proof_image)
    VALUES (v_completion_id, p_proof_image)
    ON CONFLICT (completion_id) DO UPDATE
      SET proof_image = EXCLUDED.proof_image, reviewed_at = NULL, reviewed_by = NULL, rejection_reason = NULL;

    RETURN QUERY SELECT true, 'Submitted! An organizer will review your screenshot soon.', NULL::TEXT, NULL::TEXT, v_minted_token, 'pending'::TEXT; RETURN;
  END IF;

  -- chat_action / self_report: unchanged instant-approve behavior.
  INSERT INTO public.community_quest_completions (quest_id, participant_email, participant_name, status)
  VALUES (p_quest_id, v_email, p_participant_name, 'approved')
  ON CONFLICT (quest_id, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Quest complete!', v_quest.badge_emoji, v_quest.badge_label, v_minted_token, 'approved'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
