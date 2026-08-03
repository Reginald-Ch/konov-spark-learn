-- reward_boxes was fully publicly readable ("Anyone can view reward boxes"),
-- which meant any anon caller could list every participant's box IDs,
-- statuses, and emails in one query — including boxes that weren't theirs —
-- then call open_reward_box on someone else's. Locking this down properly:
--   - No public SELECT on the table at all anymore.
--   - get_my_reward_boxes(email, hackathon_id): the only way a participant
--     can read box data, scoped to the email they claim to be (still
--     trust-based since there's no real login — see the sybil-registration
--     discussion — but it stops blanket enumeration of everyone's boxes).
--   - open_reward_box now requires the caller's claimed email to match the
--     box's owner, not just the box_id.
-- The Admin Panel's Rewards tab loses its direct read too; it now goes
-- through a new admin-actions action (list_reward_boxes, organizer-only,
-- service-role bypasses RLS same as everything else there).

DROP POLICY IF EXISTS "Anyone can view reward boxes" ON public.reward_boxes;

CREATE OR REPLACE FUNCTION public.get_my_reward_boxes(p_participant_email TEXT, p_hackathon_id UUID)
RETURNS SETOF public.reward_boxes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reward_boxes
  WHERE participant_email = p_participant_email AND hackathon_id = p_hackathon_id;
$$;

REVOKE ALL ON FUNCTION public.get_my_reward_boxes(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_reward_boxes(TEXT, UUID) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.open_reward_box(UUID);

CREATE OR REPLACE FUNCTION public.open_reward_box(p_box_id UUID, p_participant_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reward_boxes
  SET status = 'opened', opened_at = now()
  WHERE id = p_box_id AND status = 'unopened' AND participant_email = p_participant_email;
END;
$$;

REVOKE ALL ON FUNCTION public.open_reward_box(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_reward_box(UUID, TEXT) TO anon, authenticated;
