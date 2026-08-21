-- Community Quests: adds a third quest_type, "proof_upload", for quests
-- that need real evidence (e.g. "Follow us on Instagram") instead of an
-- honor-system click. A participant attaches a screenshot when claiming;
-- the completion row goes in as 'pending' (no badge yet) until an
-- organizer approves or rejects it from the admin panel. chat_action and
-- self_report both keep their existing instant-approve behavior exactly
-- as before — this only adds a new path, nothing about the old two paths
-- changes.
--
-- No Supabase Storage bucket here — this app has never used Storage, and
-- the anonymous-participant model (no auth.uid()) has no clean RLS story
-- for one. The one existing file-upload precedent in this codebase
-- (ProjectEditor's base64-in-a-TEXT-column logo field) is reused instead:
-- the client reads the image as a base64 data URL and passes it straight
-- to the RPC as text, capped at ~2MB (roughly a 1.5MB source image) —
-- fine at this app's stated hackathon scale.
--
-- The proof image and organizer review fields (reviewed_at/by,
-- rejection_reason) live in a SEPARATE table, community_quest_proof_reviews,
-- rather than as extra columns on community_quest_completions. Reason:
-- community_quest_completions is publicly SELECT-able (status quo, and
-- status/participant_name/email were always public) AND has a live
-- Realtime subscription — Realtime's postgres_changes broadcasts the
-- FULL row to any client whose row-level RLS policy passes, regardless of
-- any column-level GRANT/REVOKE (column privileges only govern PostgREST's
-- REST API, not the replication-based realtime stream). A screenshot can
-- contain a participant's real handle/profile photo/other people's
-- content, and rejection_reason is organizer feedback — neither belongs
-- broadcast to every connected anon client the instant a row changes.
-- Putting them in their own table with NO anon/authenticated policy at
-- all (RLS enabled, zero permissive policies = always-deny, same
-- mechanism already used for community_muted_users) closes that off
-- completely rather than leaving a realtime-shaped side door open.

-- Widen the quest_type CHECK. The exact auto-generated constraint name
-- isn't hardcoded — found dynamically so this can't silently leave the
-- OLD (narrower) constraint active alongside a new one under a different
-- guessed name, which would keep rejecting 'proof_upload' inserts anyway.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT con.conname INTO con_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'community_quests' AND con.contype = 'c' AND att.attname = 'quest_type';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.community_quests DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.community_quests
  ADD CONSTRAINT community_quests_quest_type_check
  CHECK (quest_type IN ('chat_action', 'self_report', 'proof_upload'));

-- status is the only new column on the existing, already-public table —
-- not sensitive on its own (same privacy level as participant_name always
-- was), and every EXISTING row defaults to 'approved' so nothing already
-- earned silently disappears.
ALTER TABLE public.community_quest_completions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.community_quest_proof_reviews (
  completion_id UUID NOT NULL PRIMARY KEY REFERENCES public.community_quest_completions(id) ON DELETE CASCADE,
  proof_image TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

ALTER TABLE public.community_quest_proof_reviews ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policy for anon/authenticated — RLS enabled with zero
-- permissive policies denies all access by default for those roles. Only
-- service_role (this table's writes/reads all go through admin-actions or
-- claim_community_quest, both SECURITY DEFINER/service-role paths) can
-- touch it. A participant reads their OWN rejection_reason through
-- get_my_quest_status below (SECURITY DEFINER, bypasses RLS as table
-- owner, scoped to the caller's own email) — never a direct table read.
REVOKE ALL ON public.community_quest_proof_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.community_quest_proof_reviews TO service_role;

-- Lets a participant see their OWN rejection_reason (to know what to fix
-- before resubmitting) without reading anyone else's — same shape as the
-- pre-existing get_my_mute_status, which solved the identical problem for
-- community_muted_users when ITS public SELECT policy got locked down.
CREATE OR REPLACE FUNCTION public.get_my_quest_status(p_participant_email TEXT)
RETURNS TABLE (quest_id UUID, status TEXT, rejection_reason TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT qc.quest_id, qc.status, pr.rejection_reason
  FROM public.community_quest_completions qc
  LEFT JOIN public.community_quest_proof_reviews pr ON pr.completion_id = qc.id
  WHERE qc.participant_email = lower(trim(coalesce(p_participant_email, '')));
$$;

REVOKE ALL ON FUNCTION public.get_my_quest_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_quest_status(TEXT) TO anon, authenticated;

-- claim_community_quest gains p_proof_image and a new `status` return
-- column (so the client can tell "submitted, pending review" apart from
-- "done") — a return-column change, so DROP+CREATE per this session's
-- established convention for that (CREATE OR REPLACE can't change a
-- function's OUT-parameter/return-column set).
DROP FUNCTION IF EXISTS public.claim_community_quest(TEXT, TEXT, UUID, TEXT);

CREATE FUNCTION public.claim_community_quest(
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
      RETURNING id INTO v_completion_id;
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
