-- Gamification round 2:
--   1) hackathons.settings — a general-purpose per-event config bucket, so
--      "there should be settings for this" has one real home instead of
--      hardcoded constants scattered across the codebase. Only two fields are
--      functional today (mission_bonus_top_n feeds close_challenge_and_award_boxes);
--      voting_enabled and coins_unlock_lessons are reserved for features that
--      don't exist yet (voting, lesson CMS) but should already be toggleable
--      once they do, rather than another hardcoded default to hunt down later.
--   2) reward_boxes.box_type: "magic" renamed to "mission" ("Mission Bonus"
--      per chat — clearer than "mystery" and matches the challenge framing).
--   3) point_events gets a new privileged event type, forge_key, for the keys
--      earned by finishing a challenge (and, later, a lesson).

ALTER TABLE public.hackathons
  ADD COLUMN settings JSONB NOT NULL DEFAULT '{"mission_bonus_top_n": 5, "voting_enabled": false, "coins_unlock_lessons": true}'::jsonb;

UPDATE public.reward_boxes SET box_type = 'mission' WHERE box_type = 'magic';

ALTER TABLE public.reward_boxes DROP CONSTRAINT reward_boxes_box_type_check;
ALTER TABLE public.reward_boxes ADD CONSTRAINT reward_boxes_box_type_check CHECK (box_type IN ('issue', 'mission'));

DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key'));
