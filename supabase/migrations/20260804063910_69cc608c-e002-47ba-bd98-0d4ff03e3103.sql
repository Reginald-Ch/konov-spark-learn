-- Push subscription targeting
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS participant_email TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;

-- Community quests & badges
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

-- Persisted message reactions
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