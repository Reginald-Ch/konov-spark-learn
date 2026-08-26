-- Found during a dedicated audit of ProjectEditor.tsx (Build Studio's core
-- editor): save_own_project has been silently wiping every published
-- project's description back to NULL on every autosave since
-- 20260902000000_project_reward_device_token.sql.
--
-- 20260818030000_fix_save_own_project.sql fixed this exact bug once
-- already — description = COALESCE(p_description, description), so a
-- regular checkpoint save (which always sends p_description: null,
-- per ProjectEditor.tsx's own comment — description is PublishModal's
-- dedicated public-blurb field, not something Save Checkpoint touches)
-- leaves whatever blurb was set at publish time alone. 20260902000000
-- then did a DROP FUNCTION + CREATE FUNCTION to add device-token
-- verification and p_is_published, and rebuilt the UPDATE from scratch —
-- reverting that one line back to a plain, unconditional
-- `description = p_description` in the process. No migration since has
-- touched save_own_project (confirmed by grep), so this has been live
-- ever since: PublishModal.tsx sets a real description on publish, then
-- the next autosave (every 2 minutes whenever there are unsaved changes)
-- or manual "Save Checkpoint" click erases it back to NULL.
--
-- Re-applies just that one line on top of the current (device-token,
-- p_is_published-aware) definition — everything else in this function is
-- otherwise correct and left unchanged.

DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, BOOLEAN);

CREATE FUNCTION public.save_own_project(
  p_project_id UUID,
  p_participant_email TEXT,
  p_project_name TEXT,
  p_description TEXT,
  p_code TEXT,
  p_template_id TEXT,
  p_author_name TEXT,
  p_expected_updated_at TIMESTAMPTZ,
  p_device_token TEXT DEFAULT NULL,
  p_is_published BOOLEAN DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
  v_minted_token TEXT;
  v_owner TEXT;
  v_updated TIMESTAMPTZ;
  v jsonb;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RAISE EXCEPTION 'This browser is not verified for that email.';
  END IF;

  SELECT lower(trim(author_email)), updated_at INTO v_owner, v_updated
  FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;

  IF v_owner IS NULL OR v_owner <> v_email THEN
    RAISE EXCEPTION 'You can only save a project you authored.';
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND date_trunc('milliseconds', v_updated) > date_trunc('milliseconds', p_expected_updated_at) THEN
    RAISE EXCEPTION 'CONFLICT: this project was saved elsewhere since you loaded it.';
  END IF;

  UPDATE public.ai_projects SET
    project_name = COALESCE(p_project_name, project_name),
    description = COALESCE(p_description, description),
    code = COALESCE(p_code, code),
    template_id = COALESCE(p_template_id, template_id),
    author_name = COALESCE(p_author_name, author_name),
    is_published = COALESCE(p_is_published, is_published)
  WHERE id = p_project_id;

  SELECT to_jsonb(x) || jsonb_strip_nulls(jsonb_build_object('new_device_token', v_minted_token))
  INTO v FROM (
    SELECT id, project_name, is_published, updated_at
    FROM public.ai_projects WHERE id = p_project_id
  ) x;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
