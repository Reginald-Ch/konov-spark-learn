-- Award-run timestamp used by the admin panel
ALTER TABLE public.daily_challenges ADD COLUMN IF NOT EXISTS boxes_awarded_at timestamptz;

-- Participant feedback per event
CREATE TABLE IF NOT EXISTS public.hackathon_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  participant_email text NOT NULL,
  participant_name text,
  overall_rating integer NOT NULL,
  lessons_rating integer,
  challenges_rating integer,
  organization_rating integer,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hackathon_feedback_unique UNIQUE (hackathon_id, participant_email),
  CONSTRAINT overall_rating_range CHECK (overall_rating BETWEEN 1 AND 5),
  CONSTRAINT lessons_rating_range CHECK (lessons_rating IS NULL OR lessons_rating BETWEEN 1 AND 5),
  CONSTRAINT challenges_rating_range CHECK (challenges_rating IS NULL OR challenges_rating BETWEEN 1 AND 5),
  CONSTRAINT organization_rating_range CHECK (organization_rating IS NULL OR organization_rating BETWEEN 1 AND 5)
);

GRANT ALL ON public.hackathon_feedback TO service_role;
ALTER TABLE public.hackathon_feedback ENABLE ROW LEVEL SECURITY;
-- No client policies: all access goes through the security-definer RPCs below
-- and the organizer-only admin edge function (service_role).

CREATE TRIGGER hackathon_feedback_touch_updated_at
  BEFORE UPDATE ON public.hackathon_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_hackathon_feedback_hackathon ON public.hackathon_feedback (hackathon_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_my_hackathon_feedback(p_participant_email text, p_hackathon_id uuid)
RETURNS TABLE(overall_rating integer, lessons_rating integer, challenges_rating integer, organization_rating integer, comment text, updated_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.overall_rating, f.lessons_rating, f.challenges_rating, f.organization_rating, f.comment, f.updated_at
  FROM public.hackathon_feedback f
  WHERE f.hackathon_id = p_hackathon_id
    AND lower(trim(f.participant_email)) = lower(trim(p_participant_email));
$$;

CREATE OR REPLACE FUNCTION public.submit_hackathon_feedback(
  p_participant_email text,
  p_hackathon_id uuid,
  p_overall_rating integer,
  p_lessons_rating integer DEFAULT NULL,
  p_challenges_rating integer DEFAULT NULL,
  p_organization_rating integer DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_participant_name text DEFAULT NULL
)
RETURNS TABLE(overall_rating integer, lessons_rating integer, challenges_rating integer, organization_rating integer, comment text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_email text := lower(trim(coalesce(p_participant_email, '')));
BEGIN
  IF v_email = '' THEN RAISE EXCEPTION 'Missing participant email'; END IF;
  IF p_overall_rating IS NULL OR p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RAISE EXCEPTION 'Overall rating must be between 1 and 5';
  END IF;
  IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN
    RAISE EXCEPTION 'Comment is too long';
  END IF;

  INSERT INTO public.hackathon_feedback AS f (
    hackathon_id, participant_email, participant_name, overall_rating,
    lessons_rating, challenges_rating, organization_rating, comment
  ) VALUES (
    p_hackathon_id, v_email, nullif(trim(coalesce(p_participant_name, '')), ''), p_overall_rating,
    p_lessons_rating, p_challenges_rating, p_organization_rating, nullif(trim(coalesce(p_comment, '')), '')
  )
  ON CONFLICT (hackathon_id, participant_email) DO UPDATE SET
    participant_name = COALESCE(EXCLUDED.participant_name, f.participant_name),
    overall_rating = EXCLUDED.overall_rating,
    lessons_rating = EXCLUDED.lessons_rating,
    challenges_rating = EXCLUDED.challenges_rating,
    organization_rating = EXCLUDED.organization_rating,
    comment = EXCLUDED.comment,
    updated_at = now();

  RETURN QUERY
  SELECT f2.overall_rating, f2.lessons_rating, f2.challenges_rating, f2.organization_rating, f2.comment, f2.updated_at
  FROM public.hackathon_feedback f2
  WHERE f2.hackathon_id = p_hackathon_id AND f2.participant_email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_hackathon_feedback(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_hackathon_feedback(text, uuid, integer, integer, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_hackathon_feedback(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_hackathon_feedback(text, uuid, integer, integer, integer, integer, text, text) TO anon, authenticated, service_role;