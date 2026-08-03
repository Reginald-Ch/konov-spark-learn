-- Community page hardening + Quests & Badges + push notification topics.

-- 1. Lock down #announcements: no direct client inserts into announcement-type
-- channels. Real posts go through the admin-actions edge function (service
-- role, organizer-only), same pattern as submit_gallery_score elsewhere.
DROP POLICY IF EXISTS "Anyone can send messages" ON public.community_messages;
CREATE POLICY "Anyone can send messages in non-announcement channels"
ON public.community_messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.community_channels cc
    WHERE cc.id = channel_id AND cc.channel_type = 'announcement'
  )
);

-- 2. push_subscriptions: add participant/topic targeting, and stop exposing
-- every subscriber's push keys to any anon caller (nothing in the frontend
-- reads this table directly — sends go through the service-role edge function).
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS participant_email TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';

-- 3. Community Quests & Badges — lightweight, non-currency engagement rewards,
-- deliberately decoupled from the hackathon-scoped coin/key economy so they
-- work the same for alumni as for active participants.
CREATE TABLE public.community_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('chat_action', 'self_report')),
  action_channel_name TEXT, -- for chat_action: which community_channels.name to check for a post
  action_url TEXT,          -- for self_report: link to click first (social follow, etc.)
  badge_emoji TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_quest_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.community_quests(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, participant_email)
);

ALTER TABLE public.community_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quests are viewable by everyone" ON public.community_quests FOR SELECT USING (true);
-- Badges are shown next to names in chat, so completions are public-read too.
-- No public INSERT policy on either table — claiming only happens through the
-- claim_community_quest RPC below, which actually verifies chat_action quests.
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

INSERT INTO public.community_quests (title, description, quest_type, action_channel_name, action_url, badge_emoji, badge_label, order_index) VALUES
('Say Hello', 'Post an introduction in #introductions to earn this badge.', 'chat_action', 'introductions', NULL, '👋', 'Newcomer', 1),
('Tool Tip', 'Share an AI tool you have discovered in #general.', 'chat_action', 'general', NULL, '🛠️', 'Tool Sharer', 2),
('Follow on Instagram', 'Follow FORGE on Instagram, then come back and claim your badge.', 'self_report', NULL, 'https://instagram.com/', '📸', 'Insta Squad', 3),
('Spread the Word', 'Invite a friend to join FORGE, then claim your badge.', 'self_report', NULL, NULL, '📣', 'Ambassador', 4);
