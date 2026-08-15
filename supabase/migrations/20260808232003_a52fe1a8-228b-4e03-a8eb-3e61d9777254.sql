-- ============ COLUMNS ============
ALTER TABLE public.ai_projects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS ai_projects_touch_updated_at ON public.ai_projects;
CREATE TRIGGER ai_projects_touch_updated_at BEFORE UPDATE ON public.ai_projects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by TEXT;

ALTER TABLE public.community_staff
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_redeemed_at TIMESTAMPTZ;

-- ============ NEW TABLES ============
CREATE TABLE IF NOT EXISTS public.community_muted_users (
  participant_email TEXT PRIMARY KEY,
  muted_until TIMESTAMPTZ NOT NULL,
  muted_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_muted_users TO anon, authenticated;
GRANT ALL ON public.community_muted_users TO service_role;
ALTER TABLE public.community_muted_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read mute status" ON public.community_muted_users;
CREATE POLICY "Anyone can read mute status" ON public.community_muted_users FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.gallery_judges (
  judge_name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_judges TO anon, authenticated;
GRANT ALL ON public.gallery_judges TO service_role;
ALTER TABLE public.gallery_judges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read judge roster" ON public.gallery_judges;
CREATE POLICY "Anyone can read judge roster" ON public.gallery_judges FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.admin_failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_failed_attempts TO service_role;
ALTER TABLE public.admin_failed_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_failed_attempts_ip_time ON public.admin_failed_attempts(ip, created_at DESC);

-- ============ LEADERBOARD (email never leaves the server) ============
CREATE OR REPLACE FUNCTION public.get_hackathon_leaderboard_projects(p_hackathon_id uuid)
RETURNS TABLE(id uuid, author_key text, author_name text, project_name text, description text, code text, is_published boolean, demo_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, md5(lower(trim(p.author_email))), p.author_name, p.project_name,
         p.description, p.code, p.is_published, p.demo_url, p.created_at
  FROM public.ai_projects p
  WHERE p.hackathon_id = p_hackathon_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_leaderboard_projects(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hackathon_judge_scores(p_hackathon_id uuid)
RETURNS TABLE(participant_key text, points integer, metadata jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT md5(lower(trim(e.participant_email))), e.points, e.metadata
  FROM public.point_events e
  WHERE e.event_type = 'judge_score' AND e.hackathon_id = p_hackathon_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_hackathon_judge_scores(uuid) TO anon, authenticated;

-- ============ PROJECT OWNERSHIP RPCs ============
CREATE OR REPLACE FUNCTION public.get_my_projects(p_participant_email text)
RETURNS TABLE(id uuid, project_name text, is_published boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.project_name, p.is_published, p.updated_at
  FROM public.ai_projects p
  WHERE lower(trim(p.author_email)) = lower(trim(p_participant_email));
$$;
GRANT EXECUTE ON FUNCTION public.get_my_projects(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_own_project_by_id(p_project_id uuid, p_participant_email text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  SELECT to_jsonb(x) INTO v FROM (
    SELECT p.id, p.project_name, p.description, p.code, p.template_id,
           p.author_name, p.is_published, p.demo_url, p.hackathon_id,
           p.points_earned, p.created_at, p.updated_at
    FROM public.ai_projects p
    WHERE p.id = p_project_id
      AND lower(trim(p.author_email)) = lower(trim(p_participant_email))
  ) x;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_own_project_by_id(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_own_project(
  p_project_id uuid, p_participant_email text, p_project_name text,
  p_description text, p_code text, p_template_id text, p_author_name text,
  p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner text; v_updated timestamptz; v jsonb;
BEGIN
  SELECT lower(trim(author_email)), updated_at INTO v_owner, v_updated
  FROM public.ai_projects WHERE id = p_project_id FOR UPDATE;

  IF v_owner IS NULL OR v_owner <> lower(trim(p_participant_email)) THEN
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
    author_name = COALESCE(p_author_name, author_name)
  WHERE id = p_project_id;

  SELECT to_jsonb(x) INTO v FROM (
    SELECT id, project_name, is_published, updated_at
    FROM public.ai_projects WHERE id = p_project_id
  ) x;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.save_own_project(uuid, text, text, text, text, text, text, timestamptz) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_project(p_project_id uuid, p_participant_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner text;
BEGIN
  SELECT lower(trim(author_email)) INTO v_owner FROM public.ai_projects WHERE id = p_project_id;
  IF v_owner IS NULL OR v_owner <> lower(trim(p_participant_email)) THEN
    RAISE EXCEPTION 'You can only delete a project you authored.';
  END IF;
  DELETE FROM public.ai_projects WHERE id = p_project_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_own_project(uuid, text) TO anon, authenticated;

-- ============ COMMUNITY MESSAGE OWNERSHIP ============
CREATE OR REPLACE FUNCTION public.edit_own_community_message(p_message_id uuid, p_participant_email text, p_content text)
RETURNS TABLE(content text, edited_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender text;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  SELECT lower(trim(sender_email)) INTO v_sender FROM public.community_messages WHERE id = p_message_id;
  IF v_sender IS NULL OR v_sender <> lower(trim(p_participant_email)) THEN
    RAISE EXCEPTION 'You can only edit your own message.';
  END IF;
  UPDATE public.community_messages
  SET content = trim(p_content), edited_at = now(), updated_at = now()
  WHERE id = p_message_id;
  RETURN QUERY SELECT m.content, m.edited_at FROM public.community_messages m WHERE m.id = p_message_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.edit_own_community_message(uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_community_message(p_message_id uuid, p_participant_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender text;
BEGIN
  SELECT lower(trim(sender_email)) INTO v_sender FROM public.community_messages WHERE id = p_message_id;
  IF v_sender IS NULL OR v_sender <> lower(trim(p_participant_email)) THEN
    RAISE EXCEPTION 'You can only delete your own message.';
  END IF;
  DELETE FROM public.community_messages WHERE id = p_message_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_own_community_message(uuid, text) TO anon, authenticated;

-- ============ STAFF INVITE TOKENS ============
DROP FUNCTION IF EXISTS public.upsert_community_staff(text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.upsert_community_staff(
  p_participant_email text, p_display_name text, p_role_label text, p_badge_emoji text)
RETURNS TABLE(invite_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_token text;
BEGIN
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.community_staff (participant_email, display_name, role_label, badge_emoji, invite_token_hash, token_redeemed_at)
  VALUES (lower(trim(p_participant_email)), p_display_name, p_role_label, p_badge_emoji,
          encode(extensions.digest(v_token, 'sha256'), 'hex'), NULL)
  ON CONFLICT (participant_email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role_label = EXCLUDED.role_label,
    badge_emoji = EXCLUDED.badge_emoji,
    invite_token_hash = EXCLUDED.invite_token_hash,
    token_redeemed_at = NULL;
  RETURN QUERY SELECT v_token;
END; $$;
REVOKE ALL ON FUNCTION public.upsert_community_staff(text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_community_staff(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_staff_invite(p_token text)
RETURNS TABLE(ok boolean, participant_email text, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_staff RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text; RETURN;
  END IF;
  SELECT * INTO v_staff FROM public.community_staff
  WHERE invite_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  IF v_staff IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text; RETURN;
  END IF;
  UPDATE public.community_staff SET token_redeemed_at = COALESCE(token_redeemed_at, now())
  WHERE community_staff.participant_email = v_staff.participant_email;
  RETURN QUERY SELECT true, v_staff.participant_email, v_staff.display_name;
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_staff_invite(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.send_staff_message(text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_participant_email text, p_token text, p_channel_id uuid, p_content text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_staff RECORD; v_channel_type text;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN QUERY SELECT false, 'Message cannot be empty'; RETURN;
  END IF;
  SELECT * INTO v_staff FROM public.community_staff
  WHERE community_staff.participant_email = lower(trim(p_participant_email));
  IF v_staff IS NULL OR v_staff.invite_token_hash IS NULL
     OR v_staff.invite_token_hash <> encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex') THEN
    RETURN QUERY SELECT false, 'Staff verification failed — ask your organizer for a fresh invite link'; RETURN;
  END IF;
  SELECT channel_type INTO v_channel_type FROM public.community_channels WHERE id = p_channel_id;
  IF v_channel_type = 'announcement' THEN
    RETURN QUERY SELECT false, 'Use the organizer announcement composer for this channel'; RETURN;
  END IF;
  INSERT INTO public.community_messages (channel_id, sender_name, sender_email, content, message_type)
  VALUES (p_channel_id, v_staff.display_name, v_staff.participant_email, trim(p_content), 'text');
  RETURN QUERY SELECT true, 'Sent';
END; $$;
GRANT EXECUTE ON FUNCTION public.send_staff_message(text, text, uuid, text) TO anon, authenticated;

-- ============ JUDGE SCORING ============
CREATE OR REPLACE FUNCTION public.merge_submission_score(
  p_submission_id uuid, p_hackathon_id uuid, p_challenge_id uuid, p_participant_email text,
  p_auto_score integer DEFAULT NULL, p_auto_breakdown jsonb DEFAULT NULL,
  p_judge_score integer DEFAULT NULL, p_judge_breakdown jsonb DEFAULT NULL,
  p_on_time boolean DEFAULT false)
RETURNS TABLE(auto_score integer, judge_score integer, total_sp integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.submission_scores; v_total integer; v_status text;
BEGIN
  INSERT INTO public.submission_scores (submission_id, auto_score, auto_breakdown, judge_score, judge_breakdown, status)
  VALUES (p_submission_id, p_auto_score, p_auto_breakdown, p_judge_score, p_judge_breakdown, 'pending')
  ON CONFLICT (submission_id) DO UPDATE SET
    auto_score = COALESCE(EXCLUDED.auto_score, public.submission_scores.auto_score),
    auto_breakdown = COALESCE(EXCLUDED.auto_breakdown, public.submission_scores.auto_breakdown),
    judge_score = COALESCE(EXCLUDED.judge_score, public.submission_scores.judge_score),
    judge_breakdown = COALESCE(EXCLUDED.judge_breakdown, public.submission_scores.judge_breakdown)
  RETURNING * INTO v_row;

  v_total := COALESCE(v_row.auto_score, 0) + COALESCE(v_row.judge_score, 0) + CASE WHEN p_on_time THEN 5 ELSE 0 END;
  v_status := CASE WHEN v_row.judge_score IS NOT NULL THEN 'finalized' ELSE 'pending' END;

  UPDATE public.submission_scores
  SET total_sp = v_total, status = v_status, scored_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  IF v_status = 'finalized' THEN
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (lower(trim(p_participant_email)), 'challenge_sp', v_total, p_hackathon_id,
            jsonb_build_object('challenge_id', p_challenge_id, 'submission_id', p_submission_id))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_row.auto_score, v_row.judge_score, v_row.total_sp, v_row.status;
END; $$;
REVOKE ALL ON FUNCTION public.merge_submission_score(uuid, uuid, uuid, text, integer, jsonb, integer, jsonb, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_submission_score(uuid, uuid, uuid, text, integer, jsonb, integer, jsonb, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_gallery_score(
  p_project_id uuid, p_participant_email text, p_points integer,
  p_project_name text, p_judge_name text, p_feedback text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hackathon_id uuid; v_is_judge boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.gallery_judges WHERE judge_name = p_judge_name) INTO v_is_judge;
  IF NOT v_is_judge THEN
    RAISE EXCEPTION 'Unknown judge — add this judge to the roster first.';
  END IF;
  SELECT hackathon_id INTO v_hackathon_id FROM public.ai_projects WHERE id = p_project_id;

  DELETE FROM public.point_events
  WHERE event_type = 'judge_score'
    AND participant_email = lower(trim(p_participant_email))
    AND metadata->>'project_id' = p_project_id::text
    AND metadata->>'judge_name' = p_judge_name;

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (lower(trim(p_participant_email)), 'judge_score', GREATEST(0, LEAST(p_points, 70)), v_hackathon_id,
          jsonb_build_object('project_id', p_project_id, 'project_name', p_project_name,
                             'judge_name', p_judge_name, 'feedback', p_feedback));
END; $$;
REVOKE ALL ON FUNCTION public.submit_gallery_score(uuid, text, integer, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(uuid, text, integer, text, text, text) TO service_role;

-- ============ ADMIN LOGIN RATE LIMIT ============
CREATE OR REPLACE FUNCTION public.count_recent_admin_failures(p_ip text)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.admin_failed_attempts
  WHERE ip = p_ip AND created_at > now() - interval '15 minutes';
$$;
REVOKE ALL ON FUNCTION public.count_recent_admin_failures(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_recent_admin_failures(text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_failed_admin_attempt(p_ip text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_failed_attempts (ip) VALUES (p_ip);
  DELETE FROM public.admin_failed_attempts WHERE created_at < now() - interval '1 day';
END; $$;
REVOKE ALL ON FUNCTION public.record_failed_admin_attempt(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_admin_attempt(text) TO service_role;
