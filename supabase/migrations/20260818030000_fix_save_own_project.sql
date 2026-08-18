-- save_own_project has accumulated three different signatures across its
-- migration history (with p_publish, without it, with/without timestamptz),
-- and only one survives as whatever's actually live — confirmed via
-- src/integrations/supabase/types.ts, which shows the 8-arg version with
-- NO p_publish at all. PublishModal.tsx always calls it WITH p_publish for
-- an existing project's Go Live — so re-publishing any project that was
-- ever Save-Checkpointed first (the majority path, given autosave) fails
-- with a "function not found" error every single time, no matter how many
-- times the student retries.
--
-- This also fixes a second, separate bug in the same function: description
-- was unconditionally overwritten on every save. ProjectEditor's regular
-- Save Checkpoint sends the system prompt as p_description (see the
-- accompanying ProjectEditor.tsx fix, which now sends NULL there instead)
-- — so the very next autosave after publishing silently replaced whatever
-- description the student typed into PublishModal with their raw system
-- prompt. COALESCE means only an explicit non-NULL description (i.e. an
-- actual publish) ever touches this column now.

DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

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
  SELECT lower(trim(author_email)), updated_at INTO v_owner, v_current_updated_at
    FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;
  IF v_owner <> lower(trim(p_participant_email)) THEN
    RAISE EXCEPTION 'You can only edit your own projects.';
  END IF;
  -- Millisecond-truncated comparison — a raw timestamptz compare can
  -- false-positive a conflict on sub-millisecond precision lost in transit
  -- (e.g. JS Date serialization) even when nothing actually changed.
  IF p_expected_updated_at IS NOT NULL
     AND date_trunc('milliseconds', v_current_updated_at) > date_trunc('milliseconds', p_expected_updated_at) THEN
    RAISE EXCEPTION 'CONFLICT: This project was changed elsewhere since you last loaded it. Reload to see the latest version before saving.';
  END IF;

  UPDATE public.ai_projects SET
    project_name = COALESCE(p_project_name, project_name),
    description = COALESCE(p_description, description),
    code = COALESCE(p_code, code),
    template_id = COALESCE(p_template_id, template_id),
    author_name = COALESCE(p_author_name, author_name),
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
