-- Community voting / "Community Favorite" — the feature discussed and
-- scoped in chat: participants can like published projects in the (cross-
-- event, unscoped) Project Showcase; an organizer can award a "Community
-- Favorite" recognition per hackathon based on like counts. Deliberately
-- awards Forge Coins + a badge, ZERO SP — the competitive leaderboard stays
-- vote-proof, since a like is trivially gameable (ask your friends) in a way
-- judge/auto scoring isn't, and this is billed as a technical competition,
-- not a popularity contest.
--
-- project_likes mirrors community_message_reactions' shape exactly (same
-- established pattern: id PK, a UNIQUE(subject, participant) pair, RLS on,
-- no public policies — reachable only through the SECURITY DEFINER RPCs
-- below).

CREATE TABLE public.project_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, participant_email)
);
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_likes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.project_likes TO service_role;
CREATE INDEX idx_project_likes_project ON public.project_likes (project_id);

-- reward_boxes.box_type was hardcoded to ('issue', 'mission') — adding the
-- third value this feature needs. challenge_id stays NULL for this box_type
-- (Community Favorite is a hackathon-wide gallery award, not tied to one
-- day's challenge — ai_projects.hackathon_id is what scopes it instead),
-- which the column already allows (it's nullable, ON DELETE SET NULL).
ALTER TABLE public.reward_boxes DROP CONSTRAINT reward_boxes_box_type_check;
ALTER TABLE public.reward_boxes ADD CONSTRAINT reward_boxes_box_type_check CHECK (box_type IN ('issue', 'mission', 'community_favorite'));

-- Toggles this participant's like on a project — mint-or-verify device
-- token, same TOFU pattern as every other mutating community/build RPC.
-- Toggling (not separate like/unlike actions) keeps this a single button
-- with no extra state for the client to track beyond "am I currently
-- liking this."
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
  v_existing_hash TEXT;
  v_minted_token TEXT;
  v_now_liked BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, 'Missing participant email', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ai_projects WHERE id = p_project_id AND is_published = true) THEN
    RETURN QUERY SELECT false, 'This project is not available to like right now.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;

  -- Rate limit: max 30 like-toggles per rolling 10-second window per
  -- participant — generous for legitimate rapid browsing/un-liking, but
  -- not unlimited. Matches the "every mutating RPC gets a real limit"
  -- posture established everywhere else in this schema.
  IF (
    SELECT COUNT(*) FROM public.project_likes pl
    WHERE pl.participant_email = v_email AND pl.created_at > now() - interval '10 seconds'
  ) >= 30 THEN
    RETURN QUERY SELECT false, 'Slow down a moment before liking more projects.', NULL::TEXT, NULL::BOOLEAN, NULL::INTEGER; RETURN;
  END IF;

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

-- Batch read of like counts (+ this caller's own liked state, when a valid
-- identity is provided) for a set of project ids — same "public counts,
-- optional identity for the personal bit" shape as
-- get_project_like_counts' sibling RPCs elsewhere in this schema (e.g.
-- community reactions being publicly viewable while only the mutation is
-- gated). No device-token requirement to READ counts: they're not
-- sensitive, and requiring verification just to see a number visible to
-- anyone Browse the public gallery would be pure friction. liked_by_me
-- silently stays false for an unverified/anonymous caller, matching this
-- schema's established verify-or-return-default pattern for reads.
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
