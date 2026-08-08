-- Security audit fix (batch 3, item 7): judge_name in submit_gallery_score
-- was a free-text string the client could set to anything — anyone holding
-- the single shared judge passphrase could log out and back in as "Judge A",
-- "Judge B", "Judge C" and submit independent scores for the same project,
-- since UNIQUE (project_id, judge_name) only dedupes per-name, not per-real-
-- judge. Fix: a small organizer-managed roster of valid judge names. The
-- login UI now picks from this list instead of free-typing one, and the
-- scoring RPC rejects any judge_name not on it.

CREATE TABLE public.gallery_judges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  judge_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_judges ENABLE ROW LEVEL SECURITY;

-- Names on the roster aren't sensitive (the security boundary is "is this
-- name approved," not secrecy of the list) and the login form needs to
-- read this before the judge passphrase is even entered — same public-read
-- shape as daily_challenges/hackathons. Only admin-actions (service_role)
-- can add/remove entries.
CREATE POLICY "Anyone can view the judge roster"
ON public.gallery_judges
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.submit_gallery_score(
  p_project_id UUID,
  p_participant_email TEXT,
  p_points INTEGER,
  p_project_name TEXT,
  p_judge_name TEXT,
  p_feedback TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hackathon_id UUID;
BEGIN
  IF p_judge_name IS NULL OR length(trim(p_judge_name)) = 0 THEN
    RAISE EXCEPTION 'judge_name is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gallery_judges WHERE judge_name = trim(p_judge_name)) THEN
    RAISE EXCEPTION 'Unknown judge — ask an organizer to add "%" to the judge roster first.', trim(p_judge_name);
  END IF;

  SELECT hackathon_id INTO v_hackathon_id FROM public.ai_projects WHERE id = p_project_id;

  PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text || ':' || trim(p_judge_name)));

  DELETE FROM public.point_events
  WHERE event_type = 'judge_score'
    AND participant_email = p_participant_email
    AND metadata->>'project_id' = p_project_id::text
    AND metadata->>'judge_name' = trim(p_judge_name);

  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (
    p_participant_email,
    'judge_score',
    GREATEST(0, LEAST(70, p_points)),
    v_hackathon_id,
    jsonb_build_object('project_id', p_project_id, 'project_name', p_project_name, 'judge_name', trim(p_judge_name))
  );

  INSERT INTO public.gallery_feedback (project_id, participant_email, judge_name, feedback)
  VALUES (p_project_id, p_participant_email, trim(p_judge_name), COALESCE(p_feedback, ''))
  ON CONFLICT (project_id, judge_name) DO UPDATE SET
    feedback = EXCLUDED.feedback,
    participant_email = EXCLUDED.participant_email,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_gallery_score(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- Seed the roster with whatever names already have real judge_score history
-- so existing legitimate scores don't suddenly become "unknown judge" —
-- an organizer can prune/rename from here going forward via the Judges tab.
INSERT INTO public.gallery_judges (judge_name)
SELECT DISTINCT trim(metadata->>'judge_name')
FROM public.point_events
WHERE event_type = 'judge_score' AND metadata->>'judge_name' IS NOT NULL AND trim(metadata->>'judge_name') <> ''
ON CONFLICT (judge_name) DO NOTHING;
