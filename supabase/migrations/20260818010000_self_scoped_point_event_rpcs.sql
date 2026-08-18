-- Second half of closing the point_events/hackathon_registrations/
-- challenge_submissions exposure. The leaderboard fix (previous migration)
-- covered the "any anonymous visitor sees everyone's email" case. These
-- three RPCs cover the remaining PARTICIPANT-facing direct table reads
-- (ParticipantStatsPanel, LessonsPanel, DailyChallengePanel) — each was
-- already scoped to the caller's OWN self-asserted email via .eq(), so
-- there was never a cross-participant leak here, but the underlying table
-- SELECT policies are still wide open (`USING (true)`), so nothing stops
-- the app's own anon key from being used directly (outside this app) to
-- bulk-read every row instead of the caller's own. Routing through
-- SECURITY DEFINER functions doesn't change the trust model (still a
-- self-asserted email, same as get_my_projects/get_my_lesson_progress
-- elsewhere in this schema) but at least stops a raw `.select('*')`
-- against these tables from working with just the public anon key.
--
-- Admin-gated reads (SubmissionsTab, CoinsTab, JudgeDashboardPanel's judge-
-- score fetch) are NOT covered here — those need to move into
-- admin-actions (an edge function change requiring a redeploy) rather than
-- a plain RPC grant, since "anyone with the anon key" and "an authenticated
-- organizer/judge" need different access levels. Left as a follow-up; the
-- wide-open table policies can't be revoked until that migration lands too
-- (revoking now would break those three surfaces immediately).

CREATE OR REPLACE FUNCTION public.get_my_point_events(p_participant_email text, p_hackathon_id uuid)
RETURNS TABLE(event_type text, points integer, metadata jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_type, points, metadata
  FROM public.point_events
  WHERE hackathon_id = p_hackathon_id AND participant_email = p_participant_email;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_point_events(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_lesson_coin_points(p_participant_email text)
RETURNS TABLE(points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT points FROM public.point_events
  WHERE participant_email = p_participant_email AND event_type = 'lesson_coin';
$$;
GRANT EXECUTE ON FUNCTION public.get_my_lesson_coin_points(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_latest_hackathon_registration(p_participant_email text)
RETURNS TABLE(hackathon_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hackathon_id FROM public.hackathon_registrations
  WHERE participant_email = p_participant_email
  ORDER BY created_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_latest_hackathon_registration(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_challenge_submissions(p_participant_email text, p_challenge_ids uuid[])
RETURNS TABLE(id uuid, challenge_id uuid, content_url text, notes text, project_id uuid, total_sp integer, score_status text, auto_breakdown jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cs.id, cs.challenge_id, cs.content_url, cs.notes, cs.project_id,
         ss.total_sp, ss.status, ss.auto_breakdown
  FROM public.challenge_submissions cs
  LEFT JOIN public.submission_scores ss ON ss.submission_id = cs.id
  WHERE cs.participant_email = p_participant_email
    AND cs.challenge_id = ANY(p_challenge_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_my_challenge_submissions(text, uuid[]) TO anon, authenticated;
