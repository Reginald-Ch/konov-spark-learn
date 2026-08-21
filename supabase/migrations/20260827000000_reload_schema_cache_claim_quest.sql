-- Community Chat: claim_community_quest hit the exact same PostgREST
-- "could not find function in schema cache" error a second time, after an
-- earlier NOTIFY pgrst, 'reload schema' had already fixed it once. The
-- SQL editor's connection likely runs through a pooler (pgbouncer/
-- Supavisor in transaction mode), which doesn't reliably propagate a bare
-- LISTEN/NOTIFY to PostgREST's own listening connection — so the NOTIFY
-- can silently no-op depending on which connection happens to run it.
-- Re-issuing the function's own CREATE OR REPLACE is a second, independent
-- path to the same fix: Supabase wires a DDL event trigger that fires
-- NOTIFY pgrst, 'reload schema' automatically whenever a function
-- definition actually changes, which doesn't depend on the SQL editor's
-- connection reaching PostgREST directly. Running both together maximizes
-- the chance this actually takes effect this time. Body is identical to
-- 20260825000000 — nothing about the function's logic is changing here.

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
      WHERE cm.sender_email = v_email AND lower(cc.name) = lower(v_quest.action_channel_name)
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

REVOKE ALL ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_community_quest(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
