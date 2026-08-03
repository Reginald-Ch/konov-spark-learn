-- Closes a real loophole in the lessons system: lessons.content was publicly
-- readable regardless of whether a participant had actually unlocked (paid
-- coins for) that lesson, and lesson_quiz_questions exposed correct_index —
-- meaning anyone could read every lesson for free and answer every quiz
-- perfectly without unlocking or learning anything. That defeats both the
-- coin economy and the actual point of the quiz. Locking both down:
--   - content moves to its own table, readable only via get_lesson_content()
--     after verifying the caller has actually unlocked that lesson.
--   - lesson_quiz_questions loses its public SELECT policy; participants
--     fetch questions (without answers) via get_quiz_questions(), and
--     submit_lesson_quiz() now also returns per-question explanations, so
--     the results screen can show "why" without ever exposing the answer
--     key directly.

CREATE TABLE public.lesson_content (
  lesson_id UUID PRIMARY KEY REFERENCES public.lessons(id) ON DELETE CASCADE,
  content JSONB NOT NULL
);

ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
-- No public policies — only reachable via get_lesson_content() below.

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, content FROM public.lessons WHERE content IS NOT NULL;

ALTER TABLE public.lessons DROP COLUMN content;

DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.lesson_quiz_questions;
-- lessons keeps its public SELECT policy — title/summary/module/coin_cost are
-- meant to be browsable for the roadmap view even before unlocking.

CREATE OR REPLACE FUNCTION public.get_lesson_content(p_participant_email TEXT, p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_content JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;
  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  SELECT content INTO v_content FROM public.lesson_content WHERE lesson_id = p_lesson_id;
  RETURN v_content;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_content(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_content(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_participant_email TEXT, p_lesson_id UUID)
RETURNS TABLE (id UUID, order_index INTEGER, question TEXT, options JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;
  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  RETURN QUERY
  SELECT q.id, q.order_index, q.question, q.options
  FROM public.lesson_quiz_questions q
  WHERE q.lesson_id = p_lesson_id
  ORDER BY q.order_index;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(TEXT, UUID) TO anon, authenticated;

-- Extend submit_lesson_quiz to also return each question's explanation, so
-- the results screen can teach "why" without the answer key ever being
-- publicly selectable.
CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, key_awarded BOOLEAN, correct_flags BOOLEAN[], explanations TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_idx INTEGER := 1;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_flags BOOLEAN[] := ARRAY[]::BOOLEAN[];
  v_explanations TEXT[] := ARRAY[]::TEXT[];
  v_was_passed BOOLEAN;
  v_passed_count INTEGER;
  v_key_awarded BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;

  FOR v_question IN
    SELECT correct_index, explanation FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id ORDER BY order_index
  LOOP
    IF p_answers[v_idx] IS NOT NULL AND p_answers[v_idx] = v_question.correct_index THEN
      v_score := v_score + 1;
      v_flags := v_flags || true;
    ELSE
      v_flags := v_flags || false;
    END IF;
    v_explanations := v_explanations || COALESCE(v_question.explanation, '');
    v_idx := v_idx + 1;
  END LOOP;

  SELECT passed INTO v_was_passed FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress
  SET attempts = attempts + 1,
      best_score = GREATEST(best_score, v_score),
      passed = passed OR (v_score >= 5),
      completed_at = CASE WHEN passed OR v_score >= 5 THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_score >= 5 THEN
    SELECT COUNT(*) INTO v_passed_count FROM public.lesson_progress WHERE participant_email = p_participant_email AND passed = true;
    IF v_passed_count % 3 = 0 THEN
      INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
      VALUES (p_participant_email, 'forge_key', 1, p_hackathon_id, jsonb_build_object('source', 'lessons', 'lesson_id', p_lesson_id, 'lessons_passed', v_passed_count));
      v_key_awarded := true;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, (v_score >= 5), v_key_awarded, v_flags, v_explanations;
END;
$$;
