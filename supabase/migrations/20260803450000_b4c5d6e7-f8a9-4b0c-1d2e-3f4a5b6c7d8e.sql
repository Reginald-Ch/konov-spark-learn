-- Lessons economy redesign, per product discussion: pay-to-unlock is
-- replaced with free, strictly-sequential progression — only the very
-- first published lesson starts reachable; passing a lesson auto-unlocks
-- the next one by order_index. Coins are no longer spent on anything; they
-- become a flat, per-lesson reward (10, once per lesson, on first pass)
-- feeding a dedicated Lessons Leaderboard rather than gating access.
--
-- This directly closes a real gap the previous economy had: unlock_lesson
-- had no prerequisite check at all, so a student could unlock lessons out
-- of order and burn through their starting balance before passing enough
-- quizzes to earn anything back, with no way forward except an organizer
-- manually granting more. Sequential-free access makes that failure mode
-- structurally impossible — there's nothing left to overspend.

-- 1. get_lesson_content / get_quiz_questions: the "unlocked" check is
-- unchanged (still gated on a lesson_progress row existing), but the very
-- first lesson has no prior lesson to trigger auto-unlock via a passed
-- quiz. Lazily bootstrap it here — the first participant to actually open
-- it gets a fresh row created on the spot — instead of needing every
-- participant to somehow have one seeded in advance.
CREATE OR REPLACE FUNCTION public.get_lesson_content(p_participant_email TEXT, p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
  v_content JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT id FROM public.lessons WHERE is_published = true ORDER BY order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  SELECT content INTO v_content FROM public.lesson_content WHERE lesson_id = p_lesson_id;
  RETURN v_content;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_participant_email TEXT, p_lesson_id UUID)
RETURNS TABLE (id UUID, order_index INTEGER, question TEXT, options JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT id FROM public.lessons WHERE is_published = true ORDER BY order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

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

-- 2. submit_lesson_quiz: replace the "every 3rd lesson passed" milestone
-- bonus with a flat 10-coin reward on every lesson's first pass, and
-- auto-unlock the next lesson in sequence (the mechanism that used to live
-- in unlock_lesson, now triggered by passing instead of by spending).
-- Return signature is unchanged (bonus_coins_awarded now just means
-- "lesson_coin earned this submission" — 10 or 0), so this stays a plain
-- CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, bonus_coins_awarded INTEGER, correct_flags BOOLEAN[], explanations TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_idx INTEGER := 1;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_pass_threshold INTEGER;
  v_passed_now BOOLEAN;
  v_flags BOOLEAN[] := ARRAY[]::BOOLEAN[];
  v_explanations TEXT[] := ARRAY[]::TEXT[];
  v_was_passed BOOLEAN;
  v_lesson_coins INTEGER := 0;
  v_current_order INTEGER;
  v_next_lesson_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;
  v_pass_threshold := CEIL(v_total * 5.0 / 7);

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

  v_passed_now := (v_score >= v_pass_threshold);

  IF NOT v_passed_now THEN
    FOR v_idx IN 1..array_length(v_explanations, 1) LOOP
      IF NOT v_flags[v_idx] THEN
        v_explanations[v_idx] := '';
      END IF;
    END LOOP;
  END IF;

  SELECT passed INTO v_was_passed FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress
  SET attempts = attempts + 1,
      best_score = GREATEST(best_score, v_score),
      passed = passed OR v_passed_now,
      completed_at = CASE WHEN passed OR v_passed_now THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_passed_now THEN
    -- Flat reward, first pass only — an already-passed lesson can't
    -- retrigger this via retakes, so there's no grinding it.
    v_lesson_coins := 10;
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'lesson_coin', v_lesson_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_complete', 'lesson_id', p_lesson_id));

    SELECT order_index INTO v_current_order FROM public.lessons WHERE id = p_lesson_id;
    SELECT id INTO v_next_lesson_id FROM public.lessons
      WHERE is_published = true AND order_index > v_current_order
      ORDER BY order_index ASC LIMIT 1;
    IF v_next_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, v_next_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, v_passed_now, v_lesson_coins, v_flags, v_explanations;
END;
$$;

-- 3. unlock_lesson is fully superseded — nothing costs coins anymore, and
-- progression is driven by submit_lesson_quiz (plus the first-lesson
-- bootstrap above), so there's no "spend to unlock" action left to gate.
-- Confirmed only called from LessonsPanel.tsx, which is updated alongside
-- this migration to stop calling it.
DROP FUNCTION IF EXISTS public.unlock_lesson(TEXT, UUID, UUID);

-- 4. lesson_coin joins the list of event types only a SECURITY DEFINER
-- RPC may insert — same treatment as forge_coin_grant/daily_challenge_sp/
-- etc., so a client can't fabricate lesson-completion rewards directly.
DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token', 'judge_score', 'lesson_coin'));
