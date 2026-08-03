CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number INTEGER NOT NULL,
  order_index INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content JSONB,
  coin_cost INTEGER NOT NULL DEFAULT 10,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);

CREATE TABLE public.lesson_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  UNIQUE (lesson_id, order_index)
);
GRANT SELECT ON public.lesson_quiz_questions TO anon, authenticated;
GRANT ALL ON public.lesson_quiz_questions TO service_role;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quiz questions" ON public.lesson_quiz_questions FOR SELECT USING (true);

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email TEXT NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  best_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (participant_email, lesson_id)
);
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_lesson_progress(p_participant_email TEXT)
RETURNS SETOF public.lesson_progress
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.lesson_progress WHERE participant_email = p_participant_email;
$$;
REVOKE ALL ON FUNCTION public.get_my_lesson_progress(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_lesson_progress(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.unlock_lesson(p_participant_email TEXT, p_hackathon_id UUID, p_lesson_id UUID)
RETURNS TABLE (ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
  v_published BOOLEAN;
  v_balance INTEGER;
  v_already BOOLEAN;
BEGIN
  SELECT coin_cost, is_published INTO v_cost, v_published FROM public.lessons WHERE id = p_lesson_id;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Lesson not found';
    RETURN;
  END IF;
  IF NOT v_published THEN
    RETURN QUERY SELECT false, 'This lesson is not available yet';
    RETURN;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT true, 'Already unlocked';
    RETURN;
  END IF;
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.point_events
  WHERE participant_email = p_participant_email
    AND hackathon_id = p_hackathon_id
    AND event_type IN ('forge_coin_grant', 'forge_coin_adjust');
  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, format('Not enough Forge Coins — you have %s, this costs %s', v_balance, v_cost);
    RETURN;
  END IF;
  INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
  VALUES (p_participant_email, 'forge_coin_adjust', -v_cost, p_hackathon_id, jsonb_build_object('reason', 'lesson_unlock', 'lesson_id', p_lesson_id));
  INSERT INTO public.lesson_progress (participant_email, lesson_id)
  VALUES (p_participant_email, p_lesson_id);
  RETURN QUERY SELECT true, 'Unlocked';
END;
$$;
REVOKE ALL ON FUNCTION public.unlock_lesson(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_lesson(TEXT, UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, key_awarded BOOLEAN, correct_flags BOOLEAN[])
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
  v_was_passed BOOLEAN;
  v_passed_count INTEGER;
  v_key_awarded BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;
  FOR v_question IN
    SELECT correct_index FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id ORDER BY order_index
  LOOP
    IF p_answers[v_idx] IS NOT NULL AND p_answers[v_idx] = v_question.correct_index THEN
      v_score := v_score + 1;
      v_flags := v_flags || true;
    ELSE
      v_flags := v_flags || false;
    END IF;
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
  RETURN QUERY SELECT v_score, v_total, (v_score >= 5), v_key_awarded, v_flags;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) TO anon, authenticated;

INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published, content) VALUES
(1, 1, 'What Is AI, Really?', 'what-is-ai',
 'Cut through the sci-fi hype: what AI actually is, and isn''t.', 10, true,
 '{
   "hook": "Every day you probably talk to AI without even realizing it — Siri, Spotify recommendations, Snapchat filters. But what actually IS artificial intelligence? Let''s cut through the sci-fi hype and find out.",
   "explanation": "Artificial Intelligence (AI) is a general term for computer systems that can perform tasks that normally require human intelligence — things like recognizing images, understanding language, making decisions, or spotting patterns in data. AI isn''t one single thing; it''s a whole field, kind of like ''sports'' is a category that includes soccer, swimming, and chess. Most AI you''ll build in FORGE falls under a branch called machine learning, where instead of a programmer writing exact rules for every situation, the computer learns patterns from examples. The AI you see in movies — robots that think and feel exactly like humans — is called Artificial General Intelligence (AGI), and it doesn''t exist yet. Everything you use today, from chatbots to self-driving cars, is ''narrow AI'': very good at one specific job, not actually ''thinking'' the way humans do.",
   "analogy": "Think of AI like a very dedicated apprentice chef. It hasn''t ''invented'' cooking — it''s studied thousands of recipes (data) and learned to recognize patterns (this ingredient combo usually tastes good). Give it a totally new situation outside its training, and it can struggle, just like a chef trained only in Italian food might freeze up if asked to cook Thai.",
   "fun_fact": "The term ''Artificial Intelligence'' was coined in 1956 at a summer research conference at Dartmouth College — the researchers there thought they could solve AI in about 2 months with a small team. It''s been almost 70 years and we''re still working on it!",
   "try_it": "Next time you use an app, try to spot the AI: is it recommending something? Auto-completing your text? Recognizing your face to unlock your phone? Jot down 3 examples you notice today."
 }'::jsonb),
(1, 2, 'How Computers "Learn"', 'how-computers-learn', 'Pattern recognition, not magic — how machine learning actually works.', 10, false, NULL),
(1, 3, 'A Brief History: From Rules to Neural Networks', 'brief-history-ai', 'How AI evolved from hand-written rules to learning systems.', 10, false, NULL),
(1, 4, 'Where AI Shows Up in Your Life', 'ai-in-your-life', 'Spotting AI in the apps and services you already use.', 10, false, NULL),
(1, 5, 'Meet the AI Careers', 'ai-careers', 'Engineer, researcher, ethicist, product — the many paths into AI.', 10, false, NULL),
(2, 6, 'Data: The Fuel of AI', 'data-fuel-of-ai', 'Why data quality matters more than clever code.', 10, false, NULL),
(2, 7, 'Training vs. Predicting', 'training-vs-predicting', 'How a model "practices" versus how it''s actually used.', 10, false, NULL),
(2, 8, 'Supervised Learning: Learning From Examples', 'supervised-learning', 'Teaching a model with labeled examples.', 10, false, NULL),
(2, 9, 'Unsupervised Learning: Finding Hidden Patterns', 'unsupervised-learning', 'Letting a model find structure with no labels at all.', 10, false, NULL),
(2, 10, 'When AI Gets It Wrong', 'when-ai-gets-it-wrong', 'Bias, overfitting, and garbage-in-garbage-out.', 10, false, NULL),
(3, 11, 'What Is a Large Language Model?', 'what-is-an-llm', 'The engine behind every chatbot you''ll build.', 10, false, NULL),
(3, 12, 'Tokens, Prompts & Context Windows', 'tokens-prompts-context', 'The building blocks of how an LLM reads and writes.', 10, false, NULL),
(3, 13, 'System Prompts: Giving Your Bot a Personality', 'system-prompts', 'The instructions that shape everything your bot says.', 10, false, NULL),
(3, 14, 'Temperature & Creativity Controls', 'temperature-creativity', 'Why the same bot can sound different every time.', 10, false, NULL),
(3, 15, 'Prompt Engineering 101', 'prompt-engineering-101', 'Asking better questions to get better answers.', 10, false, NULL),
(4, 16, 'Your Bot''s Identity', 'bot-identity', 'Naming, branding, and giving your bot a face.', 10, false, NULL),
(4, 17, 'Writing a Great System Message', 'great-system-message', 'Hands-on: crafting the instructions that define your bot.', 10, false, NULL),
(4, 18, 'Teaching Your Bot Facts', 'knowledge-base-qa', 'Knowledge bases and Q&A pairs, hands-on in FORGE.', 10, false, NULL),
(4, 19, 'Shaping Tone & Style', 'tone-and-style', 'Response style, mood, and language style controls.', 10, false, NULL),
(4, 20, 'Rules, Boundaries & Forbidden Topics', 'rules-and-boundaries', 'Building in safety basics from day one.', 10, false, NULL),
(4, 21, 'Testing & Debugging Your Bot', 'testing-debugging-bot', 'Finding and fixing the gaps in your bot''s behavior.', 10, false, NULL),
(5, 22, 'Chatbot vs. Agent: What''s the Difference?', 'chatbot-vs-agent', 'Where a simple chatbot ends and an agent begins.', 10, false, NULL),
(5, 23, 'Giving Your Agent Tools', 'giving-agent-tools', 'Search, calculator, Wikipedia — hands-on tool use.', 10, false, NULL),
(5, 24, 'Thought → Action → Observation', 'thought-action-observation', 'How agents actually reason step by step.', 10, false, NULL),
(5, 25, 'Multi-Step Planning', 'multi-step-planning', 'Breaking a big task into steps an agent can execute.', 10, false, NULL),
(5, 26, 'Memory: Making Your Agent Remember', 'agent-memory', 'Giving your agent context across a conversation.', 10, false, NULL),
(6, 27, 'Bias in AI', 'bias-in-ai', 'Why it happens, and how to catch it in your own projects.', 10, false, NULL),
(6, 28, 'Privacy, Safety & Guardrails', 'privacy-safety-guardrails', 'Building AI that respects its users.', 10, false, NULL),
(6, 29, 'AI''s Impact on Society', 'ai-impact-on-society', 'Jobs, creativity, and misinformation — the bigger picture.', 10, false, NULL),
(6, 30, 'Your Path Forward', 'your-path-forward', 'Capstone reflection and where to go next.', 10, false, NULL);

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is Artificial Intelligence (AI) most accurately described as?',
     '["A robot that thinks exactly like a human", "A broad field of computer systems that perform tasks requiring human-like intelligence", "A single computer program used by all tech companies", "A type of computer hardware"]',
     1, 'AI is a broad field — not one program or one robot. It covers many different techniques and applications.'),
    (2, 'What is the branch of AI where computers learn patterns from examples instead of following exact programmed rules?',
     '["Robotics", "Machine Learning", "Cloud Computing", "Cybersecurity"]',
     1, 'Machine Learning (ML) is the branch of AI focused on learning from data/examples rather than hardcoded rules.'),
    (3, 'What is Artificial General Intelligence (AGI)?',
     '["The AI that powers most chatbots today", "A hypothetical AI that can think and reason across any task like a human", "A type of computer chip", "Another name for the internet"]',
     1, 'AGI is a human-level, general-purpose AI that doesn''t exist yet — today''s AI is "narrow," good at specific tasks only.'),
    (4, 'The AI in most apps today (like recommendation systems or chatbots) is best described as:',
     '["Artificial General Intelligence (AGI)", "Narrow AI, good at one specific job", "Not real AI at all", "Human intelligence copied exactly"]',
     1, 'Nearly everything you interact with is narrow AI — specialized, not general.'),
    (5, 'In the chef analogy from this lesson, what do the "recipes" represent?',
     '["The AI''s hardware", "The training data the AI learns from", "The programmer''s salary", "The internet connection"]',
     1, 'The recipes represent training data — the examples an AI studies to find patterns.'),
    (6, 'When was the term "Artificial Intelligence" first coined?',
     '["1956", "1999", "2010", "2023"]',
     0, '1956, at the Dartmouth Conference — decades before most of today''s AI existed.'),
    (7, 'Why might an AI "chef" trained only on Italian recipes struggle with a Thai cooking request?',
     '["AI can never learn new things", "It has no training data/patterns for that new situation", "Thai food doesn''t exist in cookbooks", "AI refuses to try new things on purpose"]',
     1, 'AI performs based on patterns in its training data — outside that, it can struggle or make mistakes, since it isn''t truly "reasoning" like a human chef would.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'what-is-ai';