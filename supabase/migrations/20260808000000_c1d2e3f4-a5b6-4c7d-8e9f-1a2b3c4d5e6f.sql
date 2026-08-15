-- Corrective migration: the merge that brought in community staff/quests,
-- push targeting, perf indexes, and idempotency dedup also brought in
-- 20260804063820, which is an OLDER PIN-based version of community_staff
-- from a teammate's branch history — timestamped AFTER main's real
-- bearer-token migration (20260803240000) even though it logically
-- predates it. Its upsert_community_staff/send_staff_message bodies
-- reference community_staff.staff_pin_hash, a column 20260803240000
-- already dropped. Postgres validates plpgsql function bodies' static SQL
-- at CREATE FUNCTION time, so those CREATE OR REPLACE statements should
-- raise "column staff_pin_hash does not exist" — and since each migration
-- file runs as one transaction, that failure would abort the whole file
-- and, if the runner stops on first failure (the normal behavior), block
-- every migration timestamped after it: 20260804063910 (push targeting,
-- community quests, message reactions), 20260807230815, and 20260807231009
-- (perf indexes + idempotency dedup) — all real, wanted changes.
--
-- There's no way to inspect the live project's actual applied-migration
-- state from here, so instead of guessing, this migration is written to
-- bring the database to the CORRECT end state regardless of which of the
-- above already landed. Every statement below is copied verbatim from the
-- original files (already written idempotently — IF NOT EXISTS, DROP
-- POLICY/INDEX IF EXISTS, ON CONFLICT DO NOTHING, dedup DELETEs that are
-- no-ops once already deduped) EXCEPT the community_staff section, which
-- is rewritten to defensively force the bearer-token schema even if the
-- broken file partially applied before failing.

-- ── 1. Force community_staff back to the correct bearer-token shape ──
-- Safe no-ops if 20260803240000 already succeeded; corrective if the
-- broken file's earlier ALTER TABLE/DROP COLUMN ran before its later
-- CREATE FUNCTION statements failed.
ALTER TABLE public.community_staff DROP COLUMN IF EXISTS staff_pin_hash;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS staff_token_hash TEXT;
ALTER TABLE public.community_staff ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ;

-- Explicitly drop the old 5-arg PIN overload by signature, in case it
-- ever got created — CREATE OR REPLACE can't remove an overload with a
-- different argument count, only DROP can.
DROP FUNCTION IF EXISTS public.upsert_community_staff(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_community_staff(
  p_participant_email TEXT,
  p_display_name TEXT,
  p_role_label TEXT,
  p_badge_emoji TEXT
)
RETURNS TABLE (invite_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.redeem_staff_invite(p_token TEXT)
RETURNS TABLE (ok BOOLEAN, participant_email TEXT, display_name TEXT, role_label TEXT, badge_emoji TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email TEXT,
  p_token TEXT,
  p_channel_id UUID,
  p_content TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ── 2. Re-assert 20260804063910 verbatim (push targeting, community
-- quests, message reactions) — already fully idempotent, safe either way ──
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS participant_email TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;

CREATE TABLE IF NOT EXISTS public.community_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('chat_action', 'self_report')),
  action_channel_name TEXT,
  action_url TEXT,
  badge_emoji TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_quests TO anon;
GRANT SELECT ON public.community_quests TO authenticated;
GRANT ALL ON public.community_quests TO service_role;
ALTER TABLE public.community_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quests are viewable by everyone" ON public.community_quests;
CREATE POLICY "Quests are viewable by everyone" ON public.community_quests FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.community_quest_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.community_quests(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, participant_email)
);

GRANT SELECT ON public.community_quest_completions TO anon;
GRANT SELECT ON public.community_quest_completions TO authenticated;
GRANT ALL ON public.community_quest_completions TO service_role;
ALTER TABLE public.community_quest_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quest completions are viewable by everyone" ON public.community_quest_completions;
CREATE POLICY "Quest completions are viewable by everyone" ON public.community_quest_completions FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.claim_community_quest(
  p_participant_email TEXT,
  p_participant_name TEXT,
  p_quest_id UUID
)
RETURNS TABLE (ok BOOLEAN, message TEXT, badge_emoji TEXT, badge_label TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest RECORD;
  v_already BOOLEAN;
  v_has_post BOOLEAN;
BEGIN
  SELECT * INTO v_quest FROM public.community_quests WHERE id = p_quest_id AND is_active = true;
  IF v_quest IS NULL THEN
    RETURN QUERY SELECT false, 'This quest is not available right now', NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.community_quest_completions
    WHERE quest_id = p_quest_id AND participant_email = p_participant_email
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already claimed', v_quest.badge_emoji, v_quest.badge_label;
    RETURN;
  END IF;

  IF v_quest.quest_type = 'chat_action' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.community_messages cm
      JOIN public.community_channels cc ON cc.id = cm.channel_id
      WHERE cm.sender_email = p_participant_email AND cc.name = v_quest.action_channel_name
    ) INTO v_has_post;
    IF NOT v_has_post THEN
      RETURN QUERY SELECT false, format('Post in #%s first, then come back to claim!', v_quest.action_channel_name), NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.community_quest_completions (quest_id, participant_email, participant_name)
  VALUES (p_quest_id, p_participant_email, p_participant_name)
  ON CONFLICT (quest_id, participant_email) DO NOTHING;

  RETURN QUERY SELECT true, 'Quest complete!', v_quest.badge_emoji, v_quest.badge_label;
END;
$$;

INSERT INTO public.community_quests (title, description, quest_type, action_channel_name, action_url, badge_emoji, badge_label, order_index)
SELECT * FROM (VALUES
  ('Say Hello', 'Post an introduction in #introductions to earn this badge.', 'chat_action', 'introductions', NULL::TEXT, '👋', 'Newcomer', 1),
  ('Tool Tip', 'Share an AI tool you have discovered in #general.', 'chat_action', 'general', NULL::TEXT, '🛠️', 'Tool Sharer', 2),
  ('Follow on Instagram', 'Follow FORGE on Instagram, then come back and claim your badge.', 'self_report', NULL::TEXT, 'https://instagram.com/', '📸', 'Insta Squad', 3),
  ('Spread the Word', 'Invite a friend to join FORGE, then claim your badge.', 'self_report', NULL::TEXT, NULL::TEXT, '📣', 'Ambassador', 4)
) AS v(title, description, quest_type, action_channel_name, action_url, badge_emoji, badge_label, order_index)
WHERE NOT EXISTS (SELECT 1 FROM public.community_quests);

CREATE TABLE IF NOT EXISTS public.community_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, emoji, participant_email)
);

GRANT SELECT, INSERT, DELETE ON public.community_message_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.community_message_reactions TO authenticated;
GRANT ALL ON public.community_message_reactions TO service_role;
ALTER TABLE public.community_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.community_message_reactions;
CREATE POLICY "Reactions are viewable by everyone"
ON public.community_message_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add a reaction" ON public.community_message_reactions;
CREATE POLICY "Anyone can add a reaction"
ON public.community_message_reactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can remove their own reaction" ON public.community_message_reactions;
CREATE POLICY "Participants can remove their own reaction"
ON public.community_message_reactions FOR DELETE USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Re-assert 20260807230815 verbatim (perf indexes + first dedup pass) ──
CREATE INDEX IF NOT EXISTS idx_point_events_hackathon_type ON public.point_events (hackathon_id, event_type);
CREATE INDEX IF NOT EXISTS idx_point_events_participant ON public.point_events (participant_email);
CREATE INDEX IF NOT EXISTS idx_point_events_participant_hackathon ON public.point_events (participant_email, hackathon_id, event_type);
CREATE INDEX IF NOT EXISTS idx_point_events_created_at ON public.point_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_projects_hackathon_published ON public.ai_projects (hackathon_id, is_published);
CREATE INDEX IF NOT EXISTS idx_ai_projects_author ON public.ai_projects (author_email);
CREATE INDEX IF NOT EXISTS idx_ai_projects_created_at ON public.ai_projects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_hackathon ON public.challenge_submissions (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_participant ON public.challenge_submissions (participant_email);
CREATE INDEX IF NOT EXISTS idx_submission_scores_submission ON public.submission_scores (submission_id);
CREATE INDEX IF NOT EXISTS idx_reward_boxes_hackathon_status ON public.reward_boxes (hackathon_id, status);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_hackathon ON public.hackathon_registrations (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_participant ON public.community_quest_completions (participant_email);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_participant ON public.lesson_progress (participant_email);

DELETE FROM public.point_events pe
USING public.point_events dup
WHERE pe.event_type = 'forge_coin_grant'
  AND dup.event_type = 'forge_coin_grant'
  AND pe.participant_email = dup.participant_email
  AND pe.hackathon_id IS NOT DISTINCT FROM dup.hackathon_id
  AND pe.metadata->>'reason' = 'registration_bonus'
  AND dup.metadata->>'reason' = 'registration_bonus'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_registration_bonus
  ON public.point_events (participant_email, hackathon_id)
  WHERE event_type = 'forge_coin_grant' AND metadata->>'reason' = 'registration_bonus';

DELETE FROM public.point_events pe
USING public.point_events dup
WHERE pe.event_type = 'badge_award'
  AND dup.event_type = 'badge_award'
  AND pe.participant_email = dup.participant_email
  AND pe.hackathon_id IS NOT DISTINCT FROM dup.hackathon_id
  AND pe.metadata->>'badge' = dup.metadata->>'badge'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_badge_award
  ON public.point_events (participant_email, hackathon_id, (metadata->>'badge'))
  WHERE event_type = 'badge_award';

-- ── 4. Re-assert 20260807231009 verbatim (second dedup pass + indexes) ──
DROP INDEX IF EXISTS public.uniq_badge_award;

DELETE FROM public.point_events pe USING public.point_events dup
WHERE pe.event_type = 'badge_award' AND dup.event_type = 'badge_award'
  AND pe.participant_email = dup.participant_email
  AND pe.metadata->>'challenge_id' IS NOT DISTINCT FROM dup.metadata->>'challenge_id'
  AND pe.metadata->>'tier' IS NOT DISTINCT FROM dup.metadata->>'tier'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_badge_award_per_challenge
  ON public.point_events (participant_email, (metadata->>'challenge_id'), (metadata->>'tier'))
  WHERE event_type = 'badge_award';

DELETE FROM public.point_events pe USING public.point_events dup
WHERE pe.event_type = 'forge_coin_grant' AND dup.event_type = 'forge_coin_grant'
  AND pe.metadata->>'reason' = 'mission_bonus' AND dup.metadata->>'reason' = 'mission_bonus'
  AND pe.participant_email = dup.participant_email
  AND pe.metadata->>'challenge_id' IS NOT DISTINCT FROM dup.metadata->>'challenge_id'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_mission_bonus_coins
  ON public.point_events (participant_email, (metadata->>'challenge_id'))
  WHERE event_type = 'forge_coin_grant' AND metadata->>'reason' = 'mission_bonus';

DELETE FROM public.point_events pe USING public.point_events dup
WHERE pe.event_type = 'daily_challenge_sp' AND dup.event_type = 'daily_challenge_sp'
  AND pe.participant_email = dup.participant_email
  AND pe.metadata->>'challenge_id' IS NOT DISTINCT FROM dup.metadata->>'challenge_id'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_challenge_sp_per_participant
  ON public.point_events (participant_email, (metadata->>'challenge_id'))
  WHERE event_type = 'daily_challenge_sp';

DELETE FROM public.reward_boxes rb USING public.reward_boxes dup
WHERE rb.participant_email = dup.participant_email
  AND rb.challenge_id IS NOT DISTINCT FROM dup.challenge_id
  AND rb.box_type = dup.box_type
  AND rb.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_reward_box_per_challenge
  ON public.reward_boxes (participant_email, challenge_id, box_type);
