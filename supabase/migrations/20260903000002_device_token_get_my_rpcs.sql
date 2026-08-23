-- Security audit (Judge Dashboard / Admin Panel / Challenges / Lessons
-- sweep): get_my_point_events, get_my_lesson_coin_points,
-- get_my_latest_hackathon_registration, and get_my_challenge_submissions
-- all trusted a bare, self-asserted p_participant_email with zero device-
-- token verification — the same class of gap already closed for
-- get_my_mute_status/get_my_quest_status (Community Chat) and
-- get_my_projects/get_own_project_by_id/get_my_reward_boxes (Build
-- Studio). Their own migration's comment explicitly acknowledged this at
-- the time ("routing through SECURITY DEFINER functions doesn't change
-- the trust model... still a self-asserted email") as an accepted
-- tradeoff specifically because the underlying tables' wide-open SELECT
-- policies meant these RPCs weren't making anything WORSE — a raw
-- `.select('*')` against the tables directly would have leaked the same
-- data anyway. That's no longer true: 20260903000001 (companion migration
-- restoring an earlier fix's file-tracking gap) revokes all anon/
-- authenticated table privileges on point_events, hackathon_registrations,
-- challenge_submissions, and submission_scores — these four RPCs are now
-- the ONLY read path for this data, and get_my_challenge_submissions
-- specifically returns free-text participant notes and a content_url,
-- more sensitive than the point-tally-only siblings. Adding real identity
-- verification now actually means something. All four are read-only:
-- verify-or-return-empty, no minting (matching get_my_mute_status/
-- get_my_quest_status's established pattern for reads) — an identity
-- with no token yet has nothing worth showing regardless.

DROP FUNCTION IF EXISTS public.get_my_point_events(text, uuid);

CREATE FUNCTION public.get_my_point_events(p_participant_email TEXT, p_hackathon_id UUID, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (event_type TEXT, points INTEGER, metadata JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT pe.event_type, pe.points, pe.metadata
    FROM public.point_events pe
    WHERE pe.hackathon_id = p_hackathon_id AND pe.participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_point_events(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_point_events(text, uuid, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_lesson_coin_points(text);

CREATE FUNCTION public.get_my_lesson_coin_points(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (points INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT pe.points FROM public.point_events pe
    WHERE pe.participant_email = v_email AND pe.event_type = 'lesson_coin';
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_lesson_coin_points(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_lesson_coin_points(text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_latest_hackathon_registration(text);

CREATE FUNCTION public.get_my_latest_hackathon_registration(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (hackathon_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT hr.hackathon_id FROM public.hackathon_registrations hr
    WHERE hr.participant_email = v_email
    ORDER BY hr.created_at DESC LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_latest_hackathon_registration(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_latest_hackathon_registration(text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_challenge_submissions(text, uuid[]);

CREATE FUNCTION public.get_my_challenge_submissions(p_participant_email TEXT, p_challenge_ids UUID[], p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, challenge_id UUID, content_url TEXT, notes TEXT, project_id UUID, total_sp INTEGER, score_status TEXT, auto_breakdown JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT cs.id, cs.challenge_id, cs.content_url, cs.notes, cs.project_id,
           ss.total_sp, ss.status, ss.auto_breakdown
    FROM public.challenge_submissions cs
    LEFT JOIN public.submission_scores ss ON ss.submission_id = cs.id
    WHERE cs.participant_email = v_email
      AND cs.challenge_id = ANY(p_challenge_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
