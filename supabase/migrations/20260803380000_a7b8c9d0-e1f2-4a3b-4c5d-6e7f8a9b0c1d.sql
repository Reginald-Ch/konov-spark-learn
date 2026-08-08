-- Build Studio bug-hunt (round 2, item 1): save_own_project had zero
-- conflict detection — two tabs/devices editing the same project silently
-- clobber each other, last write wins, with no signal to either student
-- that their sibling tab's changes just vanished. Add an updated_at column
-- and an optional expected-version check to the RPC: pass the timestamp
-- you last loaded, and a stale write raises a distinguishable CONFLICT
-- error instead of overwriting silently. NULL (the default) skips the
-- check, so brand-new inserts and any caller that hasn't adopted the
-- check yet keep working unchanged.

ALTER TABLE public.ai_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE FUNCTION public.save_own_project(
  p_project_id UUID,
  p_participant_email TEXT,
  p_project_name TEXT,
  p_description TEXT,
  p_code TEXT,
  p_template_id TEXT,
  p_author_name TEXT,
  p_publish BOOLEAN DEFAULT NULL,
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.ai_projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner TEXT;
  v_current_updated_at TIMESTAMPTZ;
  v_row public.ai_projects;
BEGIN
  SELECT author_email, updated_at INTO v_owner, v_current_updated_at
    FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;
  IF v_owner <> p_participant_email THEN
    RAISE EXCEPTION 'You can only edit your own projects.';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v_current_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'CONFLICT: This project was changed elsewhere since you last loaded it. Reload to see the latest version before saving.';
  END IF;

  UPDATE public.ai_projects SET
    project_name = p_project_name,
    description = p_description,
    code = p_code,
    template_id = p_template_id,
    author_name = p_author_name,
    is_published = COALESCE(p_publish, is_published),
    demo_url = CASE WHEN p_publish IS TRUE THEN NULL ELSE demo_url END,
    updated_at = now()
  WHERE id = p_project_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ) TO anon, authenticated;
