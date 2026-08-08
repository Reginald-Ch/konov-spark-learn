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