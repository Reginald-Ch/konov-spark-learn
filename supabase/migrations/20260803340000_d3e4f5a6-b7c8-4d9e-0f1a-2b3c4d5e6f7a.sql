-- Security audit fix (batch 2, item 4): ai_projects RLS was SELECT/UPDATE/
-- DELETE `USING (true)` — every migration comment on this table candidly
-- admits it was "scoped by author_email check in app code for MVP." That
-- means, with the public anon key alone: `select=*` on this table dumps
-- every participant's unpublished draft code + real email in one request,
-- and any row can be updated or deleted by id with zero ownership check —
-- worse than every impersonation-class finding in this audit, since it
-- doesn't even need a victim's email, just nothing at all.
--
-- SELECT reverts to its original, correct scope (published-only) — a later
-- migration loosened this "for hackathon MVP" and that's the actual root
-- cause. Private/own-project access (drafts, autosave, publish, delete)
-- moves to SECURITY DEFINER RPCs that check the caller's claimed email
-- against the row's real author_email before touching it — same bar as
-- the community_messages fix earlier in this pass: spoofable only by
-- knowing the real owner's email, not the zero-bar this table had.

DROP POLICY IF EXISTS "Anyone can view projects" ON public.ai_projects;
DROP POLICY IF EXISTS "Authors can update own projects" ON public.ai_projects;
DROP POLICY IF EXISTS "Authors can delete own projects" ON public.ai_projects;

CREATE POLICY "Anyone can view published projects"
ON public.ai_projects
FOR SELECT
USING (is_published = true);

-- Powers "my projects" listings (the challenge-submission project linker,
-- the editor's own-project state) that need to see the caller's own
-- projects regardless of publish status.
CREATE OR REPLACE FUNCTION public.get_my_projects(p_participant_email TEXT)
RETURNS SETOF public.ai_projects
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.ai_projects
  WHERE author_email = p_participant_email
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_projects(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_projects(TEXT) TO anon, authenticated;

-- Powers the editor re-loading its own in-progress (possibly unpublished)
-- draft by id — the one read the public SELECT policy can no longer cover.
CREATE OR REPLACE FUNCTION public.get_own_project_by_id(p_project_id UUID, p_participant_email TEXT)
RETURNS public.ai_projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_row public.ai_projects;
BEGIN
  SELECT * INTO v_row FROM public.ai_projects WHERE id = p_project_id;
  IF v_row.id IS NULL OR v_row.author_email <> p_participant_email THEN
    RETURN NULL;
  END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_project_by_id(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_project_by_id(UUID, TEXT) TO anon, authenticated;

-- Covers both autosave (ProjectEditor) and the "Go Live" publish step
-- (PublishModal) — p_publish left NULL leaves is_published unchanged
-- (autosave), true flips it on and clears demo_url per existing publish
-- behavior. author_email/hackathon_id/points_earned are separately frozen
-- by the existing lock_ai_project_identity_fields trigger regardless of
-- what this does, so this function doesn't need to special-case them.
CREATE OR REPLACE FUNCTION public.save_own_project(
  p_project_id UUID,
  p_participant_email TEXT,
  p_project_name TEXT,
  p_description TEXT,
  p_code TEXT,
  p_template_id TEXT,
  p_author_name TEXT,
  p_publish BOOLEAN DEFAULT NULL
)
RETURNS public.ai_projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner TEXT;
  v_row public.ai_projects;
BEGIN
  SELECT author_email INTO v_owner FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;
  IF v_owner <> p_participant_email THEN
    RAISE EXCEPTION 'You can only edit your own projects.';
  END IF;

  UPDATE public.ai_projects SET
    project_name = p_project_name,
    description = p_description,
    code = p_code,
    template_id = p_template_id,
    author_name = p_author_name,
    is_published = COALESCE(p_publish, is_published),
    demo_url = CASE WHEN p_publish IS TRUE THEN NULL ELSE demo_url END
  WHERE id = p_project_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;

-- Powers ProjectGallery's existing "Delete" button (already UI-gated to
-- currentEmail === project.author_email — this is what actually enforces
-- that ownership check now, instead of the open DELETE policy that used to
-- let anyone remove that check by skipping the UI entirely).
CREATE OR REPLACE FUNCTION public.delete_own_project(p_project_id UUID, p_participant_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner TEXT;
BEGIN
  SELECT author_email INTO v_owner FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;
  IF v_owner <> p_participant_email THEN
    RAISE EXCEPTION 'You can only delete your own projects.';
  END IF;

  DELETE FROM public.ai_projects WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_project(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_project(UUID, TEXT) TO anon, authenticated;
