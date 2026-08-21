-- Round 11 Community Chat audit: organizers type a reason into the mute
-- dialog (community_muted_users.reason, set via mute_community_user) but
-- get_my_mute_status only ever returned muted_until — the reason was
-- captured and then discarded before it ever reached the person it was
-- about. A moderated teen saw a countdown timer with zero explanation of
-- why. Column list changed, so DROP is required (same pattern as every
-- other RETURNS TABLE column change this session).

DROP FUNCTION IF EXISTS public.get_my_mute_status(TEXT);

CREATE FUNCTION public.get_my_mute_status(p_participant_email TEXT)
RETURNS TABLE (muted_until TIMESTAMPTZ, reason TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mu.muted_until, mu.reason FROM public.community_muted_users mu
  WHERE mu.participant_email = lower(trim(p_participant_email)) AND mu.muted_until > now();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_mute_status(TEXT) TO anon, authenticated;
