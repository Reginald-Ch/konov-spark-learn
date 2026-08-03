-- Gamification round 3: Boost Tokens + badges + participant-facing box opening.
--
-- Two new privileged point_events types, same ledger pattern as everything
-- else (coins, SP, keys) — no new tables, one consistent audit trail:
--   badge_award  — gold/silver/bronze for the top 3 of each day's top-N
--                  finishers (metadata.tier). Deliberately scarce: exactly
--                  3 possible per challenge, by construction.
--   boost_token  — awarded only when a submission finalizes AND was
--                  submitted before the challenge's closes_at. Stricter than
--                  the Forge Key (which fires on completion alone) — on
--                  purpose, so tokens stay meaningfully harder to earn than
--                  keys, per "not easy to gain boosters."
--
-- Also adds open_reward_box: the one participant-facing write this system
-- needs (marking their own Mission Bonus/Issue box as opened for the reveal
-- animation). Narrow by construction — it can only ever flip
-- unopened -> opened on a single row, nothing else, so it's safe to expose
-- to anon directly rather than routing through admin-actions.

DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token'));

CREATE OR REPLACE FUNCTION public.open_reward_box(p_box_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reward_boxes
  SET status = 'opened', opened_at = now()
  WHERE id = p_box_id AND status = 'unopened';
END;
$$;

REVOKE ALL ON FUNCTION public.open_reward_box(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_reward_box(uuid) TO anon, authenticated;
