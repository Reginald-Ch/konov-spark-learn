-- Python Challenges track — standalone advanced-stage feature, gated behind
-- finishing all Lessons. Real code, really executed by the interpreter in
-- supabase/functions/_shared/pyInterpreter (a hand-written real-Python-
-- subset engine — see that folder's README-equivalent comments), graded
-- against hidden test cases the student never sees. Mirrors lessons/
-- lesson_quiz_questions/lesson_progress's trust shape throughout (see
-- 20260802080000_c9f3e6a2-...sql), with one deliberate difference: hidden
-- test cases get NO public SELECT policy at all, not even for the RPC layer
-- — the grading edge function is the only thing that ever reads them,
-- because hidden execution-verified tests are the entire mechanism that
-- makes this harder than the fill-in-the-blank exercise it's replacing.

CREATE TABLE public.python_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  function_name TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  -- Never selected by the client (see the column-level GRANT below) — kept
  -- so an admin authoring a new challenge can sanity-check that its hidden
  -- tests are actually satisfiable before publishing, the same check this
  -- migration itself does for the seeded challenge below.
  reference_solution TEXT,
  coin_reward INTEGER NOT NULL DEFAULT 10,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.python_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published challenges" ON public.python_challenges
FOR SELECT USING (is_published = true);

-- Column-level grant (not just the row-level policy above) is what actually
-- keeps reference_solution out of client reach — a bare "select *" from the
-- client only ever sees the columns listed here, regardless of the RLS
-- policy passing the row.
REVOKE ALL ON public.python_challenges FROM anon, authenticated;
GRANT SELECT (id, order_index, title, slug, prompt, difficulty, function_name, starter_code, coin_reward, is_published, created_at)
  ON public.python_challenges TO anon, authenticated;

CREATE TABLE public.python_challenge_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.python_challenges(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  input_args JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (challenge_id, order_index)
);

ALTER TABLE public.python_challenge_tests ENABLE ROW LEVEL SECURITY;
-- Deliberately zero policies — RLS with no policies is default-deny for
-- anon/authenticated. Only the grading edge function's service-role client
-- (which bypasses RLS entirely) ever reads this table, for both visible and
-- hidden tests alike; visible-test results reach the client only through
-- the edge function's response, never a direct SELECT.

CREATE TABLE public.python_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email TEXT NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.python_challenges(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_passed_count INTEGER NOT NULL DEFAULT 0,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  last_submitted_code TEXT,
  completed_at TIMESTAMPTZ,
  UNIQUE (participant_email, challenge_id)
);

ALTER TABLE public.python_challenge_attempts ENABLE ROW LEVEL SECURITY;
-- No public policies — reads via get_my_python_challenge_progress() below,
-- writes via the grading edge function's service-role client. Mirrors
-- lesson_progress exactly.

CREATE OR REPLACE FUNCTION public.get_my_python_challenge_progress(p_participant_email TEXT)
RETURNS SETOF public.python_challenge_attempts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.python_challenge_attempts WHERE participant_email = p_participant_email;
$$;

REVOKE ALL ON FUNCTION public.get_my_python_challenge_progress(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_python_challenge_progress(TEXT) TO anon, authenticated;

-- New coin event type — must join the existing privileged-insert blocklist
-- (see 20260813060000_...sql:631-634) or any client could forge its own
-- python_challenge_coin grants via a raw insert.
DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token', 'judge_score', 'lesson_coin', 'python_challenge_coin'));

-- ── Seed one real, published challenge ──
-- The hidden "historical events" test is deliberate: a naive
-- `"hi" in message.lower()` check (no word-boundary awareness) passes every
-- VISIBLE test here but fails this one — verified directly against the
-- interpreter before writing this migration (reference solution: 7/7:
-- naive substring shortcut: 6/7, fails exactly this case). That gap is the
-- whole point of hidden, execution-verified tests over fill-in-the-blank.
INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  1,
  'Greeting Detector',
  'greeting-detector',
  E'Write a function called is_greeting that takes a message (a string) and returns True if the message is a greeting, False otherwise.\n\nA message is a greeting if it contains one of these words, as a whole word (case-insensitive): hi, hello, hey, greetings.\n\nWatch out for punctuation, and think carefully about what "contains one of these words" really means.',
  'easy',
  'is_greeting',
  E'# is_greeting(message) -> True if message is a greeting, False otherwise.\n# A greeting contains one of these WORDS (not just substrings):\n# hi, hello, hey, greetings — case-insensitive.\n\ndef is_greeting(message):\n    pass',
  E'def is_greeting(message):\n    words = message.lower().replace(",", " ").replace("!", " ").replace("?", " ").split()\n    greetings = ["hi", "hello", "hey", "greetings"]\n    for w in words:\n        if w in greetings:\n            return True\n    return False',
  10,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '["Hello there!"]', 'true', false),
    (2, '["What''s the weather?"]', 'false', false),
    (3, '["HEY, how are you?"]', 'true', false),
    (4, '["hi"]', 'true', true),
    (5, '["historical events"]', 'false', true),
    (6, '["Greetings, friend"]', 'true', true),
    (7, '[""]', 'false', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'greeting-detector';
