-- Retroactive migration file — this exact fix was already found, written,
-- and confirmed applied LIVE earlier this session (the user ran it
-- directly from a chat-provided SQL block and confirmed "Query
-- succeeded"), but no corresponding migration file was ever committed to
-- the repo, breaking this session's own established convention. A later
-- audit round, which only reads migration files (no live DB access),
-- understandably still flagged this as vulnerable since the file history
-- never reflected the fix. Writing it now purely to close that
-- repo-tracking gap — this is not a new live change, just documentation
-- catching up to what should already be true in the database. If the
-- live database somehow reverted or the earlier fix didn't actually
-- stick, running this now re-applies it safely either way.
--
-- The bug this restores the fix for: get_hackathon_leaderboard_projects/
-- get_hackathon_judge_scores were originally built (20260803390000) with
-- a real is_published filter and a SHA-256 email hash. A later migration
-- (20260808232003, no explanatory comment) silently dropped the
-- is_published filter entirely and downgraded the hash to MD5 (trivially
-- reversible against a guessed/known email — this app's own later
-- migrations call that exact downgrade out as "security theater").
-- Net effect of the regression: any anonymous caller with just a public
-- hackathon_id — no email needed at all — could read every participant's
-- full private, unpublished project code and every judge's raw feedback
-- text for that event.

DROP FUNCTION IF EXISTS public.get_hackathon_leaderboard_projects(UUID);

CREATE FUNCTION public.get_hackathon_leaderboard_projects(p_hackathon_id UUID)
RETURNS TABLE (
  id UUID,
  author_key TEXT,
  author_name TEXT,
  project_name TEXT,
  code TEXT,
  description TEXT,
  is_published BOOLEAN,
  demo_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
STABLE
AS $$
  SELECT
    id,
    encode(digest(lower(trim(author_email)), 'sha256'), 'hex') AS author_key,
    author_name,
    project_name,
    code,
    description,
    is_published,
    demo_url
  FROM public.ai_projects
  WHERE is_published = true AND hackathon_id = p_hackathon_id
  ORDER BY created_at ASC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_hackathon_leaderboard_projects(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hackathon_leaderboard_projects(UUID) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_hackathon_judge_scores(UUID);

CREATE FUNCTION public.get_hackathon_judge_scores(p_hackathon_id UUID)
RETURNS TABLE (
  participant_key TEXT,
  points INTEGER,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
STABLE
AS $$
  SELECT
    encode(digest(lower(trim(participant_email)), 'sha256'), 'hex') AS participant_key,
    points,
    metadata
  FROM public.point_events
  WHERE event_type = 'judge_score' AND hackathon_id = p_hackathon_id
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_hackathon_judge_scores(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hackathon_judge_scores(UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
