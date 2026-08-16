-- Community Chat + Daily Challenges corrective migration — same situation
-- as the Lessons fix (20260813060000): confirmed via direct live queries
-- that this repo's migration files have NOT been reliably reaching the live
-- database. The drift here goes back further than "today's" work — it
-- appears to predate even the original chat message-sender-spoofing fix
-- from earlier this session.
--
-- What was actually confirmed live, by running diagnostic queries directly:
--   - participant_device_tokens: table does not exist at all.
--   - send_community_message: function does not exist at all — meaning
--     regular participants cannot send ANY chat message right now (the
--     current CommunityChat.tsx frontend only calls this RPC, no fallback).
--   - community_messages: still has its original open INSERT policies
--     ("Anyone can send messages", "Anyone can send messages as themselves,
--     non-staff, non-announcement") — the raw-insert spoofing hole was
--     never closed.
--   - community_staff: still has staff_pin_hash (old PIN system), not
--     staff_token_hash — the bearer-token migration never applied.
--   - send_staff_message: already renamed its parameter to p_token, but
--     the underlying table is still PIN-shaped — an inconsistent partial
--     state, not matching any single migration file in this repo.
--   - edit_own_community_message / delete_own_community_message: live with
--     3-arg / 2-arg signatures — no device-token parameter at all.
--   - community_message_reactions / voice_room_participants: still have
--     their original USING(true)/WITH CHECK(true) policies.
--   - challenge_submissions: still has "Participants can submit their own
--     entry" / "Participants can update their own entry" — anyone can
--     submit-as or overwrite any registered participant's daily-challenge
--     entry.
--   - daily_challenges.boxes_awarded_at / submission_scores.last_judge_name:
--     neither column exists.
--   - merge_submission_score: live with the original 9-arg signature (no
--     judge_name/confirm_override params), confirmed via
--     pg_get_function_arguments before writing the DROP below, specifically
--     to avoid creating a stray overload by guessing the signature wrong.
--
-- Every statement below is idempotent and forces the database directly to
-- the state the CURRENT frontend code (CommunityChat.tsx, DailyChallengePanel.tsx,
-- SubmissionsTab.tsx) actually requires — verified against live queries,
-- not assumed from migration-file history.

-- ══════════════════════════════════════════════════════════════
-- PART 1: Community Chat
-- ══════════════════════════════════════════════════════════════

-- ── 1a. community_staff: PIN → bearer token ──
ALTER TABLE public.community_staff DROP COLUMN IF EXISTS staff_pin_hash;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS staff_token_hash TEXT;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ;

-- Drop both plausible prior signatures (5-arg PIN-era, 4-arg token-era with
-- possibly a different return shape) — CREATE OR REPLACE only works when the
-- return type already matches exactly, and nothing here has been verified
-- against the live return type, only arguments.
DROP FUNCTION IF EXISTS public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.upsert_community_staff(
  p_participant_email TEXT,
  p_display_name TEXT,
  p_role_label TEXT,
  p_badge_emoji TEXT
)
RETURNS TABLE (invite_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, staff_token_hash, token_issued_at)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji, crypt(v_token, gen_salt('bf')), now())
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    staff_token_hash = EXCLUDED.staff_token_hash,
    token_issued_at = EXCLUDED.token_issued_at;

  RETURN QUERY SELECT v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.redeem_staff_invite(TEXT);

CREATE FUNCTION public.redeem_staff_invite(p_token TEXT)
RETURNS TABLE (ok BOOLEAN, participant_email TEXT, display_name TEXT, role_label TEXT, badge_emoji TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff
  WHERE staff_token_hash IS NOT NULL AND staff_token_hash = crypt(p_token, staff_token_hash)
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_staff.participant_email, v_staff.display_name, v_staff.role_label, v_staff.badge_emoji;
END;
$$;

DROP FUNCTION IF EXISTS public.send_staff_message(TEXT, TEXT, UUID, TEXT);

CREATE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_token TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff RECORD;
  v_channel_type TEXT;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty';
    RETURN;
  END IF;

  SELECT * INTO v_staff FROM public.community_staff WHERE participant_email = lower(trim(p_participant_email));
  IF v_staff IS NULL OR v_staff.staff_token_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Not a recognized staff account';
    RETURN;
  END IF;

  IF v_staff.staff_token_hash != crypt(p_token, v_staff.staff_token_hash) THEN
    RETURN QUERY SELECT false, 'Staff verification expired or invalid — reopen your invite link';
    RETURN;
  END IF;

  SELECT channel_type INTO v_channel_type FROM public.community_channels WHERE id = p_channel_id;
  IF v_channel_type = 'announcement' THEN
    RETURN QUERY SELECT false, 'Use the organizer announcement composer for this channel';
    RETURN;
  END IF;

  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_staff.display_name, v_staff.participant_email, trim(p_content), 'text');

  RETURN QUERY SELECT true, 'Sent';
END;
$$;

-- ── 1b. participant_device_tokens + send_community_message — the piece
-- that's the difference between "regular chat is insecure" and "regular
-- chat doesn't work at all" (confirmed live: it's currently the latter) ──
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

-- Drop every historical raw-insert policy name this table has ever had —
-- confirmed live names were "Anyone can send messages" and "Anyone can
-- send messages as themselves, non-staff, non-announcement" (truncated in
-- the diagnostic export, but this is the exact historical name); the rest
-- are defensive no-ops for names that were never actually live.
DROP POLICY IF EXISTS "Anyone can send messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages in non-announcement channels" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can send messages as themselves, non-staff, non-announcement, non-muted" ON public.community_messages;

-- ── 1c. edit/delete own message — add the device-token check ──
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

-- ── 1d. Reactions + voice presence — RPC-only, same device-token bar ──
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

-- ══════════════════════════════════════════════════════════════
-- PART 2: Daily Challenges
-- ══════════════════════════════════════════════════════════════

-- ── 2a. Submission spoofing fix ──
DROP POLICY IF EXISTS "Participants can submit their own entry" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Participants can update their own entry" ON public.challenge_submissions;

CREATE OR REPLACE FUNCTION public.submit_challenge_entry(
  p_challenge_id UUID,
  p_hackathon_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT,
  p_project_id UUID,
  p_content_url TEXT,
  p_notes TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, submission_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_submission_id UUID;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;

  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This email is already active on another device — submit from there, or use a different email.', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.challenge_submissions (challenge_id, hackathon_id, participant_email, project_id, content_url, notes)
  VALUES (p_challenge_id, p_hackathon_id, v_email, p_project_id, p_content_url, p_notes)
  ON CONFLICT (challenge_id, participant_email) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    content_url = EXCLUDED.content_url,
    notes = EXCLUDED.notes
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT true, 'Submitted', v_minted_token, v_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_challenge_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_challenge_entry(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- ── 2b. Judge attribution + overwrite protection ──
ALTER TABLE public.submission_scores ADD COLUMN IF NOT EXISTS last_judge_name TEXT;

-- Confirmed live signature via pg_get_function_arguments before writing
-- this DROP, specifically to avoid guessing wrong and leaving a stray
-- overload behind after the CREATE below.
DROP FUNCTION IF EXISTS public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN);

CREATE FUNCTION public.merge_submission_score(
  p_submission_id UUID,
  p_hackathon_id UUID,
  p_challenge_id UUID,
  p_participant_email TEXT,
  p_auto_score INTEGER,
  p_auto_breakdown JSONB,
  p_judge_score INTEGER,
  p_judge_breakdown JSONB,
  p_on_time BOOLEAN,
  p_judge_name TEXT DEFAULT NULL,
  p_confirm_override BOOLEAN DEFAULT false
)
RETURNS TABLE (auto_score INTEGER, judge_score INTEGER, total_sp INTEGER, status TEXT, conflicting_judge_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.submission_scores;
  v_was_finalized BOOLEAN;
  v_new_auto INTEGER;
  v_new_judge INTEGER;
  v_new_auto_breakdown JSONB;
  v_new_judge_breakdown JSONB;
  v_new_judge_name TEXT;
  v_is_finalized BOOLEAN;
  v_total_sp INTEGER;
BEGIN
  INSERT INTO public.submission_scores (submission_id, status)
  VALUES (p_submission_id, 'pending')
  ON CONFLICT (submission_id) DO NOTHING;

  SELECT * INTO v_row FROM public.submission_scores WHERE submission_id = p_submission_id FOR UPDATE;

  IF p_judge_score IS NOT NULL AND p_judge_name IS NOT NULL
     AND v_row.last_judge_name IS NOT NULL AND v_row.last_judge_name <> p_judge_name
     AND NOT p_confirm_override THEN
    RETURN QUERY SELECT v_row.auto_score, v_row.judge_score, v_row.total_sp, v_row.status, v_row.last_judge_name;
    RETURN;
  END IF;

  v_was_finalized := (v_row.status = 'finalized');
  v_new_auto := COALESCE(p_auto_score, v_row.auto_score);
  v_new_auto_breakdown := COALESCE(p_auto_breakdown, v_row.auto_breakdown);
  v_new_judge := COALESCE(p_judge_score, v_row.judge_score);
  v_new_judge_breakdown := COALESCE(p_judge_breakdown, v_row.judge_breakdown);
  v_new_judge_name := CASE WHEN p_judge_score IS NOT NULL AND p_judge_name IS NOT NULL THEN p_judge_name ELSE v_row.last_judge_name END;
  v_is_finalized := (v_new_auto IS NOT NULL AND v_new_judge IS NOT NULL);
  v_total_sp := CASE WHEN v_is_finalized THEN v_new_auto + v_new_judge ELSE NULL END;

  UPDATE public.submission_scores SET
    auto_score = v_new_auto,
    auto_breakdown = v_new_auto_breakdown,
    judge_score = v_new_judge,
    judge_breakdown = v_new_judge_breakdown,
    last_judge_name = v_new_judge_name,
    total_sp = v_total_sp,
    status = CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END,
    scored_at = now()
  WHERE submission_id = p_submission_id;

  IF v_is_finalized THEN
    DELETE FROM public.point_events
    WHERE event_type = 'daily_challenge_sp' AND metadata->>'submission_id' = p_submission_id::text;

    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'daily_challenge_sp', v_total_sp, p_hackathon_id,
      jsonb_build_object('submission_id', p_submission_id, 'challenge_id', p_challenge_id));

    IF NOT v_was_finalized THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_coin_grant', 50, p_hackathon_id,
        jsonb_build_object('reason', 'challenge_completion_bonus', 'submission_id', p_submission_id, 'challenge_id', p_challenge_id));
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_auto, v_new_judge, v_total_sp, (CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END), NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN, TEXT, BOOLEAN) TO service_role;

-- ── 2c. boxes_awarded_at — the two-close-paths trap fix. Note: this only
-- covers the SQL/column side. close_challenge_and_award_boxes itself lives
-- in the admin-actions EDGE FUNCTION (supabase/functions/admin-actions),
-- a separate deployment path this migration cannot verify or fix — see the
-- note at the end of this file. ──
ALTER TABLE public.daily_challenges ADD COLUMN IF NOT EXISTS boxes_awarded_at TIMESTAMPTZ;

-- ── 2d. Self-heal any challenge that was created/edited with a non-standard
-- point value before the "fixed 70/30 rubric, not editable" fix ──
UPDATE public.daily_challenges SET auto_max_points = 70 WHERE auto_max_points <> 70;
UPDATE public.daily_challenges SET judge_max_points = 30 WHERE judge_max_points <> 30;

-- ══════════════════════════════════════════════════════════════
-- IMPORTANT CAVEAT — not fixable by this or any SQL migration:
--
-- supabase/functions/admin-actions/index.ts (the edge function powering
-- grade_submission, close_challenge_and_award_boxes, auto_grade_challenge,
-- mute_community_user, and every other admin/judge action) deploys through
-- a COMPLETELY SEPARATE path from SQL migrations — typically
-- `supabase functions deploy` or Lovable's own function sync. Nothing here
-- can verify whether the CODE currently deployed for that edge function
-- matches what's in this repo. Given how much has turned out to be stale,
-- treat that as an open, unverified risk — worth checking directly (e.g.
-- the "Edge functions" panel in Lovable) or simply redeploying it.
-- ══════════════════════════════════════════════════════════════
