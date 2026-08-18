-- Third piece of closing the point_events/hackathon_registrations/
-- challenge_submissions exposure: the three ADMIN-GATED reads (judge-score
-- lookup in the Judge Dashboard, Daily Submissions review, Forge Coins
-- balances). Unlike the participant-facing RPCs in the previous migration,
-- these genuinely need participant_email (an organizer/judge has to know
-- who they're grading or adjusting coins for) — so the fix isn't "hide the
-- email", it's "only reachable with the service-role key, not the public
-- anon key". These are called from admin-actions/index.ts, which already
-- gates every action behind the organizer/judge passphrase — REVOKE FROM
-- anon, authenticated means the passphrase gate is actually enforced at
-- the database too, not just in the app's UI.
--
-- list_gallery_judge_scores also fixes a real latent bug in the process:
-- the code it replaces (JudgeDashboardPanel.tsx) fetched ALL judge_score
-- events site-wide with event_type = 'judge_score' LIMIT 500 and no
-- hackathon filter, relying on project IDs simply not matching to exclude
-- other events' scores. At enough cumulative volume across every hackathon
-- ever run, the newest 500 rows could stop including enough of THIS
-- hackathon's scores. This version joins to ai_projects and filters by
-- hackathon_id directly, with no arbitrary cap.

CREATE OR REPLACE FUNCTION public.list_gallery_judge_scores(p_hackathon_id uuid)
RETURNS TABLE(points integer, metadata jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.points, pe.metadata
  FROM public.point_events pe
  JOIN public.ai_projects p ON p.id = (pe.metadata->>'project_id')::uuid
  WHERE pe.event_type = 'judge_score' AND p.hackathon_id = p_hackathon_id;
$$;
REVOKE ALL ON FUNCTION public.list_gallery_judge_scores(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_gallery_judge_scores(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.list_challenge_submissions(p_challenge_id uuid)
RETURNS TABLE(id uuid, participant_email text, content_url text, notes text, submitted_at timestamptz,
              total_sp integer, score_status text, auto_score integer, judge_score integer,
              auto_breakdown jsonb, judge_breakdown jsonb, last_judge_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cs.id, cs.participant_email, cs.content_url, cs.notes, cs.submitted_at,
         ss.total_sp, ss.status, ss.auto_score, ss.judge_score, ss.auto_breakdown, ss.judge_breakdown, ss.last_judge_name
  FROM public.challenge_submissions cs
  LEFT JOIN public.submission_scores ss ON ss.submission_id = cs.id
  WHERE cs.challenge_id = p_challenge_id
  ORDER BY cs.submitted_at ASC;
$$;
REVOKE ALL ON FUNCTION public.list_challenge_submissions(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_challenge_submissions(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.list_hackathon_registrants(p_hackathon_id uuid)
RETURNS TABLE(participant_email text, participant_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT participant_email, participant_name
  FROM public.hackathon_registrations
  WHERE hackathon_id = p_hackathon_id;
$$;
REVOKE ALL ON FUNCTION public.list_hackathon_registrants(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_hackathon_registrants(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.list_coin_events(p_hackathon_id uuid)
RETURNS TABLE(participant_email text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT participant_email, points
  FROM public.point_events
  WHERE hackathon_id = p_hackathon_id AND event_type IN ('forge_coin_grant', 'forge_coin_adjust');
$$;
REVOKE ALL ON FUNCTION public.list_coin_events(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_coin_events(uuid) TO service_role;
