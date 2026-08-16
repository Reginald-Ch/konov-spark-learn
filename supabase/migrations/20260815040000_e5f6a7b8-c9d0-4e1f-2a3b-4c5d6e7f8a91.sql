-- Participant feedback on the hackathon event — star ratings + a free-text
-- comment, tied to participant identity (same trust model as everything
-- else in this app: self-asserted email, normalized .trim().toLowerCase()
-- at every call site) so a participant can revisit and edit their own
-- submission later.
--
-- Deliberately stricter than point_events (which has an open public SELECT
-- policy) — free-text comments can contain candid opinions naming specific
-- staff or issues, so this follows lesson_progress's pattern instead: NO
-- public SELECT policy at all. Participants read/write only their own row
-- via the two RPCs below; organizers read everyone's via a new
-- list_hackathon_feedback admin-actions case (service-role client, bypasses
-- RLS, organizer-only — not added to JUDGE_ALLOWED_ACTIONS).

CREATE TABLE public.hackathon_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email TEXT NOT NULL,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  lessons_rating INTEGER CHECK (lessons_rating BETWEEN 1 AND 5),
  challenges_rating INTEGER CHECK (challenges_rating BETWEEN 1 AND 5),
  organization_rating INTEGER CHECK (organization_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_email, hackathon_id)
);

ALTER TABLE public.hackathon_feedback ENABLE ROW LEVEL SECURITY;
-- No public policies — see comment above.

CREATE OR REPLACE FUNCTION public.get_my_hackathon_feedback(p_participant_email TEXT, p_hackathon_id UUID)
RETURNS SETOF public.hackathon_feedback
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.hackathon_feedback
  WHERE participant_email = p_participant_email AND hackathon_id = p_hackathon_id;
$$;

REVOKE ALL ON FUNCTION public.get_my_hackathon_feedback(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_hackathon_feedback(TEXT, UUID) TO anon, authenticated;

-- Plain RETURNS public.hackathon_feedback (a composite return type), not
-- RETURNS TABLE(...) — the latter implicitly declares OUT-parameter
-- variables in scope for the whole function body, which is exactly what
-- caused the live "column reference \"passed\" is ambiguous" bug fixed
-- earlier this session in submit_lesson_quiz. A plain composite return type
-- doesn't have that hazard, so this is the safer form, not just a
-- stylistic choice.
CREATE OR REPLACE FUNCTION public.submit_hackathon_feedback(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_overall_rating INTEGER,
  p_lessons_rating INTEGER,
  p_challenges_rating INTEGER,
  p_organization_rating INTEGER,
  p_comment TEXT
)
RETURNS public.hackathon_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hackathon_feedback;
BEGIN
  IF p_overall_rating IS NULL OR p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RAISE EXCEPTION 'overall_rating must be between 1 and 5';
  END IF;

  INSERT INTO public.hackathon_feedback (participant_email, hackathon_id, overall_rating, lessons_rating, challenges_rating, organization_rating, comment, updated_at)
  VALUES (p_participant_email, p_hackathon_id, p_overall_rating, p_lessons_rating, p_challenges_rating, p_organization_rating, NULLIF(TRIM(p_comment), ''), now())
  ON CONFLICT (participant_email, hackathon_id) DO UPDATE
  SET overall_rating = EXCLUDED.overall_rating,
      lessons_rating = EXCLUDED.lessons_rating,
      challenges_rating = EXCLUDED.challenges_rating,
      organization_rating = EXCLUDED.organization_rating,
      comment = EXCLUDED.comment,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_hackathon_feedback(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_hackathon_feedback(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO anon, authenticated;
