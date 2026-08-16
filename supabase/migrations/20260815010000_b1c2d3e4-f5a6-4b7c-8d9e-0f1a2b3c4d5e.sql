-- Guards against a lesson ever being published with zero quiz questions.
-- Progression through Lessons is strictly sequential (each lesson only
-- unlocks the next one on passing its quiz), and the frontend already
-- refuses to enter the quiz phase for a lesson with no authored questions
-- ("This lesson's quiz isn't ready yet") — but that only prevents a broken
-- *experience*, not a broken *state*: nothing stops such a lesson from
-- being published today, which would permanently dead-end every student's
-- progression the moment they reach it, since there'd be no way to ever
-- pass it and unlock the next lesson.
--
-- This is a CONSTRAINT TRIGGER, deferred to COMMIT time rather than firing
-- immediately per-statement, specifically because the established pattern
-- in this codebase is to INSERT a lesson row and its lesson_quiz_questions
-- rows in the same migration script/transaction (lesson row first, then
-- its questions) — an immediate (non-deferred) trigger would reject that
-- lesson insert before its questions ever got a chance to land a few
-- statements later in the same script.
--
-- Only fires on INSERT or on an UPDATE that touches is_published, so the
-- module-reordering UPDATEs elsewhere in this codebase (order_index /
-- module_number only) are entirely unaffected.

CREATE OR REPLACE FUNCTION public.check_lesson_has_quiz_questions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_published AND NOT EXISTS (
    SELECT 1 FROM public.lesson_quiz_questions WHERE lesson_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Cannot publish lesson "%" (%) with zero quiz questions — every published lesson gates the next one in sequence, so publishing it without a quiz would permanently block everyone''s progression at that point.', NEW.title, NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lessons_require_quiz_before_publish ON public.lessons;

CREATE CONSTRAINT TRIGGER lessons_require_quiz_before_publish
AFTER INSERT OR UPDATE OF is_published ON public.lessons
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_lesson_has_quiz_questions();
