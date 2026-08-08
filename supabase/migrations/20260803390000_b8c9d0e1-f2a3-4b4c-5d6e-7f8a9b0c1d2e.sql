-- Build Studio bug-hunt (round 3): Leaderboard.tsx read author_email
-- straight off ai_projects (and participant_email off point_events) to
-- group a student's projects/judge scores together. Both tables' SELECT
-- policies are broad ("published projects" / "anyone can view point
-- events"), so those columns went out to every visitor's network
-- response even though nothing in the UI ever renders them — and
-- author_email specifically is the bearer credential every ownership
-- RPC in this app checks (save_own_project, delete_own_project, ...),
-- so leaking it is a direct path to hijacking another student's project.
--
-- These two RPCs give Leaderboard the exact same shape of data it already
-- consumes, with email replaced by a SHA-256 hash computed server-side —
-- the client still groups/joins by that key exactly as before (same hash
-- input on both sides), it just never receives the plaintext. This isn't
-- a secrecy boundary (a guessed email can still be confirmed by hashing
-- and comparing), just removing the free, no-effort broadcast of it.

CREATE OR REPLACE FUNCTION public.get_hackathon_leaderboard_projects(p_hackathon_id UUID)
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

CREATE OR REPLACE FUNCTION public.get_hackathon_judge_scores(p_hackathon_id UUID)
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
