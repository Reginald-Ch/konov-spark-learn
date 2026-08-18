-- SPLeaderboard.tsx and LessonsLeaderboard.tsx queried point_events,
-- hackathon_registrations, and challenge_submissions directly from the
-- client — all three have a wide-open `USING (true)` SELECT policy, so
-- participant_email (a real email address, and this platform is for teen
-- participants) was fetched straight to the browser for every visitor who
-- opened either leaderboard tab, no login required. This mirrors exactly
-- the risk get_hackathon_leaderboard_projects/get_hackathon_judge_scores
-- were already built to close for the project-score Leaderboard — that
-- fix just never got applied to these two. Same pattern here: return
-- md5(lower(trim(email))) instead of the email itself, so the client can
-- still join rows together without ever seeing anyone's real address.

CREATE OR REPLACE FUNCTION public.get_hackathon_sp_events(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(participant_email))), points
  FROM public.point_events
  WHERE hackathon_id = p_hackathon_id AND event_type = 'daily_challenge_sp';
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_sp_events(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hackathon_badge_events(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, metadata jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(participant_email))), metadata
  FROM public.point_events
  WHERE hackathon_id = p_hackathon_id AND event_type = 'badge_award';
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_badge_events(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hackathon_registered_participants(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, participant_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(participant_email))), participant_name
  FROM public.hackathon_registrations
  WHERE hackathon_id = p_hackathon_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_registered_participants(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hackathon_ontime_submissions(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, timeliness integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(cs.participant_email))), (ss.auto_breakdown->>'timeliness')::integer
  FROM public.challenge_submissions cs
  JOIN public.submission_scores ss ON ss.submission_id = cs.id
  WHERE cs.hackathon_id = p_hackathon_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_ontime_submissions(uuid) TO anon, authenticated;

-- Lesson coins are a lifetime total (not per-event, see LessonsLeaderboard's
-- own comment on why), so this one intentionally takes no hackathon filter
-- — matches the query it replaces exactly.
CREATE OR REPLACE FUNCTION public.get_lesson_coin_events()
RETURNS TABLE(participant_key text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(participant_email))), points
  FROM public.point_events
  WHERE event_type = 'lesson_coin';
$$;
GRANT EXECUTE ON FUNCTION public.get_lesson_coin_events() TO anon, authenticated;
