-- Self-audit of the Community Favorite voting feature just shipped, found
-- real problems:
--
-- 1) toggle_project_like's rate limit counted rows in project_likes itself
--    from the last 10s -- but unliking DELETES the row, so a rapid
--    like/unlike/like/unlike loop never accumulates more than one row and
--    sails past the "30 per 10s" check entirely. Same bug class already
--    found and fixed for voice_room_participants (join/leave both mutate a
--    row that can be deleted) via a dedicated append-only action log --
--    applying the identical fix here.
-- 2) No self-like guard -- a participant could like their own project.
-- 3) get_project_like_data had no cap on its input array size; legitimate
--    calls never exceed the gallery's own 500-project limit.

CREATE TABLE public.project_like_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_like_action_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_like_action_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.project_like_action_log TO service_role;
CREATE INDEX idx_project_like_action_log_email_time ON public.project_like_action_log (participant_email, created_at);

CREATE OR REPLACE FUNCTION public.toggle_project_like(
  p_project_id UUID,
  p_participant_email TEXT,
  p_device_token TEXT
)
RETURNS TABLE (ok BOOLEAN, message TEXT, new_device_token TEXT, liked BOOLEAN, like_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_author_email TEXT;
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_now_liked BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;

  SELECT author_email INTO v_author_email FROM public.ai_projects WHERE id = p_project_id AND is_published = true;
  IF v_author_email IS NULL THEN
    RETURN QUERY SELECT false, 'This project is not available to like right now.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;
  IF v_author_email = v_email THEN
    RETURN QUERY SELECT false, 'You can''t like your own project.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;

  -- Counted against the append-only log, not project_likes itself -- see
  -- migration comment for why counting the mutable table doesn't work.
  IF (
    SELECT COUNT(*) FROM public.project_like_action_log pl
    WHERE pl.participant_email = v_email AND pl.created_at > now() - interval '10 seconds'
  ) >= 30 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before liking more projects.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;
  INSERT INTO public.project_like_action_log (participant_email) VALUES (v_email);

  SELECT token_hash INTO v_existing_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
  IF v_existing_hash IS NULL THEN
    v_minted_token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.participant_device_tokens (participant_email, token_hash)
    VALUES (v_email, crypt(v_minted_token, gen_salt('bf')));
  ELSIF p_device_token IS NULL OR v_existing_hash != crypt(p_device_token, v_existing_hash) THEN
    RETURN QUERY SELECT false, 'This name is already active on another device.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_likes WHERE project_id = p_project_id AND participant_email = v_email) THEN
    DELETE FROM public.project_likes WHERE project_id = p_project_id AND participant_email = v_email;
    v_now_liked := false;
  ELSE
    INSERT INTO public.project_likes (project_id, participant_email) VALUES (p_project_id, v_email)
    ON CONFLICT (project_id, participant_email) DO NOTHING;
    v_now_liked := true;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.project_likes WHERE project_id = p_project_id;
  RETURN QUERY SELECT true, 'ok', v_minted_token, v_now_liked, v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_project_like(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_project_like(UUID, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_project_like_data(
  p_project_ids UUID[],
  p_participant_email TEXT DEFAULT NULL,
  p_device_token TEXT DEFAULT NULL
)
RETURNS TABLE (project_id UUID, like_count INTEGER, liked_by_me BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_participant_email, '')));
  v_verified BOOLEAN := false;
  v_hash TEXT;
BEGIN
  -- Matches the Project Showcase's own 500-project cap -- legitimate calls
  -- never exceed it; this just stops an oversized array from forcing a
  -- large unnest + per-row subquery computation.
  IF p_project_ids IS NULL OR array_length(p_project_ids, 1) > 500 THEN
    RETURN;
  END IF;

  IF v_email <> '' THEN
    SELECT token_hash INTO v_hash FROM public.participant_device_tokens WHERE participant_email = v_email;
    v_verified := v_hash IS NOT NULL AND p_device_token IS NOT NULL AND v_hash = crypt(p_device_token, v_hash);
  END IF;

  RETURN QUERY
    SELECT
      pid,
      (SELECT COUNT(*)::INTEGER FROM public.project_likes pl WHERE pl.project_id = pid),
      v_verified AND EXISTS (SELECT 1 FROM public.project_likes pl WHERE pl.project_id = pid AND pl.participant_email = v_email)
    FROM unnest(p_project_ids) AS pid;
END;
$$;
REVOKE ALL ON FUNCTION public.get_project_like_data(UUID[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_like_data(UUID[], TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
