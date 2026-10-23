-- Provisional (auto-score-only) standings, shown separately from the real
-- leaderboard while judges are still working through daily-challenge
-- submissions. The real leaderboard only ever counts a submission once
-- BOTH auto and judge scores exist (merge_submission_score's finalization
-- rule) — that's still correct and unchanged. This just gives visibility
-- into where things currently stand for everyone who ISN'T finalized yet,
-- clearly separated so it's never confused with final results. Same
-- privacy-safe shape as get_hackathon_sp_events (md5 key instead of a raw
-- email) for the same reason.
CREATE OR REPLACE FUNCTION public.get_hackathon_provisional_sp(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(cs.participant_email))), ss.auto_score
  FROM public.challenge_submissions cs
  JOIN public.submission_scores ss ON ss.submission_id = cs.id
  WHERE cs.hackathon_id = p_hackathon_id
    AND ss.auto_score IS NOT NULL
    AND ss.status IS DISTINCT FROM 'finalized';
$$;

REVOKE ALL ON FUNCTION public.get_hackathon_provisional_sp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hackathon_provisional_sp(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
