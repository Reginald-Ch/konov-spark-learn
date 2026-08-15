-- Per-judge attribution + overwrite protection on grade_submission.
--
-- grade_submission previously had no idea WHICH judge sent a given
-- judge_score — every call just clobbered judge_score/judge_breakdown with
-- whatever the latest caller sent, silently, with no way to tell a
-- correction from a different judge grading the same submission over an
-- earlier judge's shoulder. With daily-challenge grading now delegated to
-- multiple judges sharing one passphrase (see the auto_grade_challenge
-- allowlist fix), that's a real collision risk, not theoretical.
--
-- Deliberately NOT mirroring gallery's gallery_judges roster +
-- multi-judge-averaging model (submit_gallery_score) — this table's design
-- is single judge_score field, not an average across judges, and building
-- a validated-roster system here would be a bigger, unrequested schema
-- change. The security boundary stays the shared judge passphrase,
-- unchanged. This fix only adds attribution (a free-text judge_name, not
-- validated against anything) and a soft confirmation gate so a second
-- judge overwriting a first judge's score is a deliberate, visible action
-- instead of a silent one.

ALTER TABLE public.submission_scores ADD COLUMN IF NOT EXISTS last_judge_name TEXT;

-- Signature is changing (two new trailing params + a new output column) —
-- CREATE OR REPLACE would create a stray overload instead of replacing the
-- existing 9-arg function, so drop the old signature explicitly first.
DROP FUNCTION IF EXISTS public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN);

CREATE FUNCTION public.merge_submission_score(
  p_submission_id UUID,
  p_hackathon_id UUID,
  p_challenge_id UUID,
  p_participant_email TEXT,
  p_auto_score INTEGER,
  p_auto_breakdown JSONB,
  p_judge_score INTEGER,
  p_judge_breakdown JSONB,
  p_on_time BOOLEAN,
  p_judge_name TEXT DEFAULT NULL,
  p_confirm_override BOOLEAN DEFAULT false
)
RETURNS TABLE (auto_score INTEGER, judge_score INTEGER, total_sp INTEGER, status TEXT, conflicting_judge_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.submission_scores;
  v_was_finalized BOOLEAN;
  v_new_auto INTEGER;
  v_new_judge INTEGER;
  v_new_auto_breakdown JSONB;
  v_new_judge_breakdown JSONB;
  v_new_judge_name TEXT;
  v_is_finalized BOOLEAN;
  v_total_sp INTEGER;
BEGIN
  INSERT INTO public.submission_scores (submission_id, status)
  VALUES (p_submission_id, 'pending')
  ON CONFLICT (submission_id) DO NOTHING;

  SELECT * INTO v_row FROM public.submission_scores WHERE submission_id = p_submission_id FOR UPDATE;

  -- Only blocks when a NAMED judge is about to overwrite a DIFFERENT
  -- named judge's existing judge_score. Unnamed callers (p_judge_name
  -- NULL — e.g. auto-grade's own auto-only calls) and re-saves by the
  -- same judge never hit this. Returns the row completely unchanged plus
  -- the conflicting name, so the caller can re-prompt for confirmation
  -- and retry with p_confirm_override instead of losing the edit.
  IF p_judge_score IS NOT NULL AND p_judge_name IS NOT NULL
     AND v_row.last_judge_name IS NOT NULL AND v_row.last_judge_name <> p_judge_name
     AND NOT p_confirm_override THEN
    RETURN QUERY SELECT v_row.auto_score, v_row.judge_score, v_row.total_sp, v_row.status, v_row.last_judge_name;
    RETURN;
  END IF;

  v_was_finalized := (v_row.status = 'finalized');
  v_new_auto := COALESCE(p_auto_score, v_row.auto_score);
  v_new_auto_breakdown := COALESCE(p_auto_breakdown, v_row.auto_breakdown);
  v_new_judge := COALESCE(p_judge_score, v_row.judge_score);
  v_new_judge_breakdown := COALESCE(p_judge_breakdown, v_row.judge_breakdown);
  v_new_judge_name := CASE WHEN p_judge_score IS NOT NULL AND p_judge_name IS NOT NULL THEN p_judge_name ELSE v_row.last_judge_name END;
  v_is_finalized := (v_new_auto IS NOT NULL AND v_new_judge IS NOT NULL);
  v_total_sp := CASE WHEN v_is_finalized THEN v_new_auto + v_new_judge ELSE NULL END;

  UPDATE public.submission_scores SET
    auto_score = v_new_auto,
    auto_breakdown = v_new_auto_breakdown,
    judge_score = v_new_judge,
    judge_breakdown = v_new_judge_breakdown,
    last_judge_name = v_new_judge_name,
    total_sp = v_total_sp,
    status = CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END,
    scored_at = now()
  WHERE submission_id = p_submission_id;

  IF v_is_finalized THEN
    DELETE FROM public.point_events
    WHERE event_type = 'daily_challenge_sp' AND metadata->>'submission_id' = p_submission_id::text;

    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'daily_challenge_sp', v_total_sp, p_hackathon_id,
      jsonb_build_object('submission_id', p_submission_id, 'challenge_id', p_challenge_id));

    IF NOT v_was_finalized THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_coin_grant', 50, p_hackathon_id,
        jsonb_build_object('reason', 'challenge_completion_bonus', 'submission_id', p_submission_id, 'challenge_id', p_challenge_id));
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_auto, v_new_judge, v_total_sp, (CASE WHEN v_is_finalized THEN 'finalized' ELSE 'pending' END), NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_submission_score(UUID, UUID, UUID, TEXT, INTEGER, JSONB, INTEGER, JSONB, BOOLEAN, TEXT, BOOLEAN) TO service_role;
