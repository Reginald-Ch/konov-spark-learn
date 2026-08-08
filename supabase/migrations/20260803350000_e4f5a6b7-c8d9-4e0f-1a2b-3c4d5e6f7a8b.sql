-- Security audit fix (batch 3, item 6): open_reward_box already matched
-- the caller's claimed email against the row (the same "spoofable only by
-- knowing the real owner's email" bar as everywhere else without real
-- auth), but it did so with a bare UPDATE ... WHERE — a non-matching
-- email or an already-opened box silently affects zero rows with no
-- error, so the client can't tell "opened" from "someone already spoiled
-- your box" from "wrong email." Explicit checks + row lock close that
-- correctness gap and make failed attempts distinguishable and audit-able,
-- which is the meaningful improvement available here without the larger
-- real-auth project already discussed separately.
CREATE OR REPLACE FUNCTION public.open_reward_box(p_box_id UUID, p_participant_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner TEXT;
  v_status TEXT;
BEGIN
  SELECT participant_email, status INTO v_owner, v_status
  FROM public.reward_boxes WHERE id = p_box_id FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Reward box not found.';
  END IF;
  IF v_owner <> p_participant_email THEN
    RAISE EXCEPTION 'This reward box does not belong to you.';
  END IF;
  IF v_status <> 'unopened' THEN
    RAISE EXCEPTION 'This reward box has already been opened.';
  END IF;

  UPDATE public.reward_boxes SET status = 'opened', opened_at = now() WHERE id = p_box_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_reward_box(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_reward_box(UUID, TEXT) TO anon, authenticated;
