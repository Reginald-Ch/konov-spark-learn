-- Security audit (broader sweep, beyond Community Chat): six SECURITY
-- DEFINER RPCs backing Build Studio (ai_projects) and reward boxes trusted
-- a bare, self-asserted p_participant_email with ZERO device-token
-- verification — the exact class of bug already fixed for
-- get_my_mute_status/get_my_quest_status. As an anonymous attacker with
-- just the anon key and a known/guessed classmate's email, this let
-- anyone read another participant's private (unpublished) project code,
-- OVERWRITE it, DELETE it outright, or open their reward boxes.
--
-- Project CREATION itself (a raw client-side `ai_projects.insert(...)` in
-- ProjectEditor.tsx, not an RPC) still self-asserts author_email with no
-- proof of identity — that is a pre-existing, accepted limitation of this
-- app's no-real-auth model (same as self-asserted display names
-- elsewhere), left alone here. This migration is about every operation on
-- an ALREADY-EXISTING resource: read-your-own-private-data, overwrite,
-- delete, open-a-box — which is exactly the boundary Community Chat's own
-- RPCs already draw (self-asserted on send, verified on edit/delete).
--
-- save_own_project mints a device token on first use (TOFU), same as
-- claim_community_quest/join_voice_room — someone who goes straight to
-- Build Studio without ever touching Community Chat/Daily Challenges/
-- Lessons first would otherwise have no token yet and get permanently
-- locked out of saving their own first project. The five others
-- (get_my_projects, get_own_project_by_id, get_my_reward_boxes,
-- open_reward_box, delete_own_project) all act on something that must
-- already exist tied to that email, so by the time they're called a
-- token should already exist from an earlier save/interaction — these
-- verify-or-deny rather than mint. forge-device-token in localStorage is
-- already a single shared identity across Community Chat, Daily
-- Challenges, Lessons, and Python Challenges (confirmed via grep — all
-- read/write the same key), so this doesn't introduce a new identity
-- system, just extends the existing one to Build Studio.
--
-- Separate, unrelated bug found while rewriting this exact function:
-- PublishModal.tsx's "republish an existing project" path calls
-- save_own_project with a p_publish parameter that doesn't exist on ANY
-- live version of this function (confirmed via live signature
-- introspection — exactly 8 parameters, no p_publish), and the function's
-- UPDATE never touched is_published regardless. Since ProjectEditor.tsx
-- creates the project row (and sets currentProjectId) on the very first
-- autosave — well before "Publish" is ever clicked — this is very likely
-- the live path for most real publish attempts, meaning "Go Live" has
-- likely been broken in production. Adding a real p_is_published
-- parameter the function actually applies, since it's already being
-- touched here.

DROP FUNCTION IF EXISTS public.get_my_reward_boxes(TEXT, UUID);

CREATE FUNCTION public.get_my_reward_boxes(p_participant_email TEXT, p_hackathon_id UUID, p_device_token TEXT DEFAULT NULL)
RETURNS SETOF public.reward_boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.reward_boxes WHERE participant_email = v_email AND hackathon_id = p_hackathon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_reward_boxes(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_reward_boxes(TEXT, UUID, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.open_reward_box(UUID, TEXT);

CREATE FUNCTION public.open_reward_box(p_box_id UUID, p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  UPDATE public.reward_boxes
  SET status = 'opened', opened_at = now()
  WHERE id = p_box_id AND status = 'unopened' AND participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.open_reward_box(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_reward_box(UUID, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_projects(TEXT);

CREATE FUNCTION public.get_my_projects(p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id uuid, project_name text, is_published boolean, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.id, p.project_name, p.is_published, p.updated_at
    FROM public.ai_projects p
    WHERE lower(trim(p.author_email)) = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_projects(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_projects(TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_own_project_by_id(UUID, TEXT);

CREATE FUNCTION public.get_own_project_by_id(p_project_id UUID, p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
  v jsonb;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(x) INTO v FROM (
    SELECT p.id, p.project_name, p.description, p.code, p.template_id,
           p.author_name, p.is_published, p.demo_url, p.hackathon_id,
           p.points_earned, p.created_at, p.updated_at
    FROM public.ai_projects p
    WHERE p.id = p_project_id
      AND lower(trim(p.author_email)) = v_email
  ) x;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_project_by_id(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_project_by_id(UUID, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.delete_own_project(UUID, TEXT);

CREATE FUNCTION public.delete_own_project(p_project_id UUID, p_participant_email TEXT, p_device_token TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_hash TEXT;
  v_owner TEXT;
BEGIN
  SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_hash IS NULL OR p_device_token IS NULL OR v_hash != crypt(p_device_token, v_hash) THEN
    RAISE EXCEPTION 'This browser is not verified for that email.';
  END IF;

  SELECT lower(trim(author_email)) INTO v_owner FROM public.ai_projects WHERE id = p_project_id;
  IF v_owner IS NULL OR v_owner <> v_email THEN
    RAISE EXCEPTION 'You can only delete a project you authored.';
  END IF;
  DELETE FROM public.ai_projects WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_project(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_project(UUID, TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.save_own_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

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
    description = p_description,
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
