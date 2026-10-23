-- Transparent AI-use penalty for daily challenge submissions. This is a
-- deliberate, manual judge decision (there is no reliable automated way to
-- detect "this was AI-written" from text alone, and FORGE itself has a
-- built-in AI-assist feature) — a judge who has personally reviewed a
-- submission and decided real AI-use disqualifies part of the score calls
-- this to record the deduction with a reason the participant can actually
-- see, rather than a silent score change with no explanation.
CREATE OR REPLACE FUNCTION public.apply_ai_penalty(
  p_submission_id UUID,
  p_judge_name TEXT,
  p_points INTEGER DEFAULT 5
)
RETURNS TABLE (judge_score INTEGER, total_sp INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.submission_scores;
  v_new_judge INTEGER;
  v_breakdown JSONB;
BEGIN
  SELECT * INTO v_row FROM public.submission_scores WHERE submission_id = p_submission_id FOR UPDATE;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'No score row exists yet for this submission — enter a base judge score first.';
  END IF;

  v_new_judge := GREATEST(0, COALESCE(v_row.judge_score, 0) - p_points);
  v_breakdown := COALESCE(v_row.judge_breakdown, '{}'::jsonb) || jsonb_build_object(
    'ai_penalty_points', p_points,
    'ai_penalty_reason', format('-%s points: AI-generated content detected in this submission', p_points),
    'ai_penalty_by', p_judge_name,
    'ai_penalty_at', now()
  );

  UPDATE public.submission_scores
  SET judge_score = v_new_judge,
      judge_breakdown = v_breakdown,
      total_sp = CASE WHEN auto_score IS NOT NULL THEN auto_score + v_new_judge ELSE total_sp END,
      last_judge_name = p_judge_name,
      scored_at = now()
  WHERE submission_id = p_submission_id;

  RETURN QUERY SELECT v_new_judge, (SELECT total_sp FROM public.submission_scores WHERE submission_id = p_submission_id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_ai_penalty(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_ai_penalty(UUID, TEXT, INTEGER) TO service_role;

-- get_my_challenge_submissions now also returns judge_breakdown, so the
-- frontend can actually show a participant WHY their score is what it is
-- (an AI penalty, or any other judge note) instead of a bare number.
DROP FUNCTION IF EXISTS public.get_my_challenge_submissions(text, uuid[], text);
CREATE FUNCTION public.get_my_challenge_submissions(p_participant_email TEXT, p_challenge_ids UUID[], p_device_token TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, challenge_id UUID, content_url TEXT, notes TEXT, project_id UUID, total_sp INTEGER, score_status TEXT, auto_breakdown JSONB, judge_breakdown JSONB, started_at TIMESTAMPTZ)
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
    SELECT cs.id, cs.challenge_id, cs.content_url, cs.notes, cs.project_id,
           ss.total_sp, ss.status, ss.auto_breakdown, ss.judge_breakdown, cs.started_at
    FROM public.challenge_submissions cs
    LEFT JOIN public.submission_scores ss ON ss.submission_id = cs.id
    WHERE cs.participant_email = v_email
      AND cs.challenge_id = ANY(p_challenge_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_challenge_submissions(text, uuid[], text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
