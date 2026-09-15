-- Gallery judges (JudgeDashboardPanel) want to see each project's already-
-- earned automated marks (System Message Quality, Conversation Quality —
-- the same two the public Leaderboard already shows) next to the score
-- they're about to add, instead of a bare project card with no context.
--
-- That needs `code` client-side to compute those marks (same logic as
-- Leaderboard.tsx's scoreProject) — which get_hackathon_leaderboard_projects
-- already returns to ANY anon caller today, since the public Leaderboard
-- page computes these same marks for every visitor with no login at all.
-- So switching the Judge Dashboard to source projects from this same RPC
-- (instead of a raw ai_projects select) exposes nothing new; it just reuses
-- the one function that's already the single source of truth for both
-- "which projects count" (is_published) and "what their automated marks
-- are" (code), so the two screens can never disagree.
--
-- Adding template_id (badge icon/label) and created_at (stable ordering)
-- since the Judge Dashboard's card needs both and neither is remotely
-- sensitive.

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
  demo_url TEXT,
  template_id TEXT,
  created_at TIMESTAMPTZ
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
    demo_url,
    template_id,
    created_at
  FROM public.ai_projects
  WHERE is_published = true AND hackathon_id = p_hackathon_id
  ORDER BY created_at ASC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_hackathon_leaderboard_projects(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hackathon_leaderboard_projects(UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
