UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= 4;
UPDATE public.lessons SET order_index = order_index - 999 WHERE order_index >= 1004;
INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published, content) VALUES
(1, 4, 'Inside a Neural Network', 'inside-a-neural-network',
 'A hands-on peek at neurons, weights, and layers — the structure behind modern AI.', 10, true,
 '{
   "hook": "You''ve heard ''neural network'' a hundred times. Let''s actually open one up and see what''s inside — no scary math required, just a clear mental model you''ll use for the rest of this course.",
   "explanation": "A neural network is a stack of simple decision-makers called ''neurons,'' organized into layers. Each neuron takes in some numbers, multiplies them by ''weights'' (how important each input is), adds them up, and passes the result through a simple rule that decides how strongly to ''fire'' — similar to a light dimmer switch, not an on/off light switch. A network usually has an input layer (raw data goes in — like pixels of an image, or words of a sentence), one or more ''hidden'' layers (where the real pattern-finding happens), and an output layer (the final answer — ''cat'' or ''dog,'' or the next word in a sentence). Training is simply the process of tuning every weight in every neuron, across potentially billions of neurons, until the whole network''s outputs get closer to correct. A ''deep'' neural network just means one with many hidden layers stacked on top of each other — ''deep learning'' is literally named after that depth. Large Language Models like the ones powering your FORGE chatbots are enormous neural networks — trained on huge amounts of text to predict the next word extremely well.",
   "analogy": "Picture a factory assembly line with many stations. Raw material enters at one end (input layer). At each station, a worker (neuron) looks at what arrives, decides how much attention to pay to each part based on experience (weights), and passes an adjusted product to the next station. By the time it reaches the end of the line (output layer), the raw material has been transformed into a finished decision — like ''this is spam'' or ''this word comes next.'' No single worker understands the whole picture; the intelligence emerges from the whole line working together.",
   "fun_fact": "The idea for neural networks is loosely inspired by how neurons connect in a human brain — but real brains are wildly more efficient. Your brain runs on about 20 watts of power (less than a lightbulb), while training one large AI model can use enough electricity to power thousands of homes.",
   "try_it": "Draw 3 boxes in a row on paper: label them Input, Hidden, Output. Pick a simple task like ''decide if a photo is of a cat.'' Under Input, write what goes in (pixels). Under Output, write the final decision. You just sketched the shape of a real neural network."
 }'::jsonb);
UPDATE public.lessons SET is_published = true, content = '{
   "hook": "You''ve heard that AI ''learns'' — but computers don''t have brains, feelings, or eyes closed in deep thought. So what does ''learning'' actually mean for a machine?",
   "explanation": "When we say a computer ''learns,'' we mean it adjusts its own internal numbers (called parameters) based on examples, until it gets better at a specific task. Here''s the loop: 1) The computer makes a guess. 2) It checks how wrong the guess was, using a ''loss function'' — basically a wrongness score. 3) It nudges its internal numbers slightly to reduce that wrongness. 4) It repeats this thousands or millions of times on new examples. This process is called training. Nothing ''clicks'' or ''understands'' the way a human does — the model is just getting mathematically better at matching patterns it''s seen before. That''s why AI can be shockingly good at tasks similar to its training data, and surprisingly bad at anything unfamiliar.",
   "analogy": "Imagine learning to shoot basketball free throws blindfolded, but after every shot someone tells you ''too far left'' or ''too far right'' — no explanation why, just the direction to adjust. After thousands of shots, your arm ''learns'' the right motion through pure trial and correction, not because you understood physics. That''s exactly how a model trains: adjust, check, adjust again.",
   "fun_fact": "Training a large modern AI model can involve adjusting billions of these internal numbers — and it can take thousands of powerful computers running for weeks, using enough electricity to power a small town.",
   "try_it": "Think of a skill you learned through repetition (riding a bike, a video game combo, a dance move). Notice how you got better through trial-and-error, not by memorizing a rulebook first. That''s the same core idea driving machine learning."
 }'::jsonb
WHERE slug = 'how-computers-learn';
UPDATE public.lessons SET is_published = true, content = '{
   "hook": "AI didn''t appear overnight with ChatGPT. It''s had boom-and-bust cycles for 70 years — including two infamous ''AI Winters'' where the whole field nearly gave up. Understanding this history helps you see AI clearly, past the hype.",
   "explanation": "Early AI (1950s-1980s) was ''rule-based'': programmers hand-wrote thousands of if-this-then-that rules trying to capture human expertise (called ''expert systems''). This worked for narrow, well-defined problems but collapsed the moment reality got messy or ambiguous — rules can''t cover every case. Funding dried up twice (the ''AI Winters'' of the 1970s and late 1980s/90s) when the hype outran the results. The real shift came from machine learning: instead of hand-writing rules, let the computer learn patterns from data. This took off seriously in the 2010s once two things lined up: massive datasets (thanks to the internet) and massive computing power (thanks to GPUs — chips originally built for video game graphics, which turned out to be perfect for neural network math). The 2017 invention of the ''Transformer'' architecture — the T in GPT — was the breakthrough that made today''s chatbots possible, by letting models process entire sentences at once and understand context far better than before.",
   "analogy": "Think of the difference between memorizing a phrasebook for a foreign trip (rule-based AI — works only for exact phrases you memorized) versus actually living in a country for a year and picking the language up naturally from exposure (machine learning — flexible, generalizes to situations you never explicitly studied).",
   "fun_fact": "GPUs — the chips that made the modern AI boom possible — were originally designed in the 1990s to make video game graphics look better, not for AI at all. It took over a decade before researchers realized the same math was perfect for training neural networks.",
   "try_it": "Ask an adult you know if they remember hearing about ''AI'' before 2020. Compare what they remember AI being used for then versus what you see it doing today — that gap is the history you just read about, playing out in real time."
 }'::jsonb
WHERE slug = 'brief-history-ai';
UPDATE public.lessons SET is_published = true, content = '{
   "hook": "You probably used AI at least 10 times today already — before breakfast, even. Let''s make the invisible visible.",
   "explanation": "AI is quietly embedded in far more of daily life than most people realize, usually working behind the scenes rather than announcing itself. Recommendation systems (Spotify, YouTube, TikTok, Netflix) use ML to predict what you''ll want to watch or hear next, based on patterns from your behavior and millions of other users. Your phone''s camera uses AI for face detection, portrait blur, and auto-enhancing photos in real time. Spam filters use classification models to sort junk email before you ever see it. Voice assistants (Siri, Alexa, Google Assistant) combine speech recognition AI with language-understanding AI to answer you. Maps apps predict traffic and routes using ML trained on historical and live location data. Even autocorrect and predictive text on your keyboard is a small language model guessing your next word — a tiny cousin of the chatbots you''re building in FORGE. The pattern across all of these: none of them are ''general'' intelligence — each is a narrow AI, extremely good at exactly one job, invisible until you know to look for it.",
   "analogy": "AI today is a lot like electricity in the early 1900s — at first a novelty people marveled at, but within a generation it became so embedded in everyday infrastructure that nobody thinks twice about flipping a light switch. Most AI you use daily has become ''invisible'' the same way.",
   "fun_fact": "Netflix has estimated that its AI-driven recommendation system saves the company over $1 billion a year — simply by keeping people watching instead of canceling their subscription out of boredom.",
   "try_it": "Go through your phone''s home screen and, for each app, guess whether AI is working behind the scenes. Check yourself: photos, maps, messaging autocorrect, social media feeds, and music apps are all strong bets."
 }'::jsonb
WHERE slug = 'ai-in-your-life';
UPDATE public.lessons SET is_published = true, content = '{
   "hook": "''AI Engineer'' isn''t the only job in this field — not even close. If you''re building bots in FORGE and enjoying it, there''s probably a whole career path here that fits exactly how your brain works.",
   "explanation": "The AI field needs way more than just people who train models. Machine Learning Engineers build and deploy the models themselves — strong coders who also understand the math of training. Data Scientists dig through data to find insights and prepare it for models — equal parts detective and statistician. Prompt Engineers (a newer role) specialize in crafting the instructions that get the best results out of language models — exactly what you practice every time you write a FORGE system prompt. AI Product Managers decide what to build and why, translating between engineers and real user needs. AI Ethicists and Responsible AI specialists focus on fairness, safety, and making sure AI doesn''t cause harm — a growing, urgently needed field. AI Researchers push the boundaries of what''s possible, usually with advanced degrees. And AI-adjacent roles — UX designers for AI products, AI policy analysts, AI educators — are all growing fast too. You don''t need to pick one path right now. What matters is noticing which part of building your FORGE bot you enjoyed most: was it writing the personality (prompt engineering)? Debugging logic (engineering)? Thinking about what could go wrong (ethics)? That''s a real clue.",
   "analogy": "The AI field is like a movie production, not a one-person show. There''s a director (product manager), writers (prompt engineers), a technical crew (ML engineers), safety inspectors (ethicists), and researchers inventing new camera technology (AI researchers). Nobody does it alone, and every role matters.",
   "fun_fact": "''Prompt Engineer'' didn''t really exist as a job title before 2022 — it emerged almost overnight once large language models became mainstream, and some of the highest early salaries in tech went to people skilled at simply writing good instructions for AI, no traditional coding required.",
   "try_it": "Think back to the FORGE challenges you''ve done so far. Which part did you enjoy most — writing the personality, fixing bugs, or thinking about safety rules? Write down which AI career from this lesson matches that feeling."
 }'::jsonb
WHERE slug = 'ai-careers';
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'In machine learning, what does "training" mean?', '["Physically building the computer hardware", "The computer repeatedly adjusting its internal numbers to reduce errors", "Installing new software updates", "A human manually programming every possible answer"]', 1, 'Training is the repeated adjust-check-adjust loop that improves a model''s internal numbers (parameters).'),
    (2, 'What is a "loss function" used for?', '["Deleting old data", "Measuring how wrong the model''s guess was", "Speeding up the internet connection", "Choosing the model''s name"]', 1, 'A loss function scores how far off a prediction is, so the model knows which direction to adjust.'),
    (3, 'Why might an AI be great at familiar tasks but bad at totally new situations?', '["It''s broken", "It only learned patterns from its training examples, not true understanding", "It gets tired like a human", "It refuses new tasks on purpose"]', 1, 'A model''s skill comes from patterns in its training data — outside that, performance can drop sharply.'),
    (4, 'In the free-throw analogy, what does "too far left" or "too far right" represent?', '["The final grade", "Feedback used to adjust the next attempt", "The name of the basketball", "A random insult"]', 1, 'That feedback mirrors the loss signal a model uses to correct itself on the next attempt.'),
    (5, 'What are the adjustable internal numbers inside a model called?', '["Parameters", "Pixels", "Passwords", "Processors"]', 0, 'Parameters are the internal values a model tunes during training.'),
    (6, 'Training large modern AI models typically requires:', '["A single laptop overnight", "Significant computing power and energy, sometimes for weeks", "No computer at all", "Exactly one example to learn from"]', 1, 'Large-scale training is resource-intensive — many powerful machines running for extended periods.'),
    (7, 'Does a trained AI model "understand" the way a human does?', '["Yes, exactly the same way", "No — it''s optimizing patterns mathematically, not understanding meaning like a human", "AI understanding is even deeper than human understanding", "There''s no difference at all"]', 1, 'Models optimize statistical patterns; this differs from human comprehension, even when results look impressively human-like.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'how-computers-learn';
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What was the main approach of early (1950s-1980s) AI systems?', '["Learning from massive datasets", "Hand-written rules created by programmers", "Neural networks with billions of parameters", "Voice recognition only"]', 1, 'Early AI relied on manually programmed rules ("expert systems"), not learned patterns.'),
    (2, 'What was an "AI Winter"?', '["A season when AI conferences are held", "A period when AI funding and interest collapsed after hype outpaced results", "A cold-weather AI feature", "A type of neural network"]', 1, 'AI Winters were periods of reduced funding/interest after early AI failed to live up to overhyped promises.'),
    (3, 'What two things had to come together for the 2010s machine learning boom?', '["Faster typing and better keyboards", "Massive datasets and massive computing power (GPUs)", "Cheaper phones and social media apps", "New programming languages only"]', 1, 'Big data (from the internet) plus GPU computing power together enabled the modern ML boom.'),
    (4, 'What were GPUs originally designed for?', '["Training AI models", "Video game graphics", "Sending emails", "Storing files"]', 1, 'GPUs were built for gaming graphics; researchers later found the same parallel math worked great for neural networks.'),
    (5, 'What breakthrough architecture from 2017 made today''s chatbots possible?', '["The Transformer", "The Calculator", "The Spreadsheet", "The Compiler"]', 0, 'The Transformer architecture (the "T" in GPT) enabled models to understand context far better, powering modern chatbots.'),
    (6, 'In the phrasebook analogy, what does "living in a country for a year" represent?', '["Rule-based AI", "Machine learning that generalizes from exposure/experience", "A vacation", "A translation app"]', 1, 'Living and absorbing language naturally mirrors how ML models generalize from broad exposure to data.'),
    (7, 'Why did early rule-based AI systems struggle in the real world?', '["They were too fast", "Hand-written rules couldn''t cover every messy, ambiguous real-world case", "They used too much electricity", "They had too much training data"]', 1, 'Rules are rigid — real-world situations are too varied for any finite rule set to fully capture.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'brief-history-ai';
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does a neural network "weight" represent?', '["The physical weight of the computer", "How important a particular input is to a neuron''s decision", "The file size of the training data", "The number of layers in the network"]', 1, 'Weights control how much influence each input has on a neuron''s output.'),
    (2, 'What is a "deep" neural network?', '["A network that thinks very deeply about ethics", "A network with many hidden layers stacked together", "A network with a large hard drive", "Any network larger than 1 megabyte"]', 1, '"Deep" refers to having multiple stacked hidden layers — that''s where "deep learning" gets its name.'),
    (3, 'In the assembly line analogy, what does each "worker" (station) represent?', '["A separate computer", "A neuron", "A customer", "A training example"]', 1, 'Each worker/station stands in for a single neuron adjusting the data as it passes through.'),
    (4, 'Which layer receives the raw data first?', '["The output layer", "The hidden layer", "The input layer", "The training layer"]', 2, 'Raw data always enters through the input layer first.'),
    (5, 'What are Large Language Models, structurally speaking?', '["A type of database", "Enormous neural networks trained to predict text", "A category of computer hardware", "A programming language"]', 1, 'LLMs are, at their core, very large neural networks trained heavily on text.'),
    (6, 'Roughly how much power does a human brain use, compared to training a large AI model?', '["The brain uses far more power", "About the same amount", "The brain uses dramatically less power (~20 watts, like a lightbulb)", "Brains don''t use power at all"]', 2, 'Human brains are remarkably energy-efficient compared to the massive power needed to train large AI models.'),
    (7, 'What actually happens during training, in terms of the network''s structure?', '["Every weight in every neuron gets tuned to make outputs more accurate", "The number of layers changes randomly every time", "The input layer gets deleted", "Nothing in the network changes"]', 0, 'Training tunes the weights throughout the network so its outputs get progressively more accurate.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'inside-a-neural-network';
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What do recommendation systems (Spotify, Netflix, etc.) primarily do?', '["Physically repair your device", "Predict what you''ll want to watch/hear next based on behavior patterns", "Translate languages", "Block spam emails"]', 1, 'Recommendation systems use ML to predict preferences from behavioral patterns.'),
    (2, 'What kind of AI task is a spam filter performing?', '["Image generation", "Classification (junk vs. not junk)", "Voice synthesis", "Route planning"]', 1, 'Spam filters classify incoming email into categories like spam/not-spam.'),
    (3, 'Predictive text/autocorrect on your keyboard is best described as:', '["A completely random guesser", "A small language model predicting your likely next word", "A human typing on your behalf remotely", "Unrelated to AI"]', 1, 'Predictive text is a lightweight language model — a small cousin of the chatbots built in FORGE.'),
    (4, 'According to this lesson, is most everyday AI "general" intelligence?', '["Yes, all of it is general intelligence", "No — it''s narrow AI, each very good at one specific task", "AI in daily apps doesn''t exist", "Only Netflix uses general intelligence"]', 1, 'Everyday AI is narrow — specialized for one task, not broadly intelligent like a human.'),
    (5, 'In the electricity analogy, what does "AI becoming invisible" compare to?', '["Electricity being banned", "Electricity becoming so embedded in daily life that no one thinks about it", "Electricity being too expensive to use", "Electricity only being used once a year"]', 1, 'Like electricity, AI has become embedded infrastructure that fades into the background of daily life.'),
    (6, 'Roughly how much does Netflix estimate its AI recommendation system saves the company yearly?', '["About $100", "Over $1 billion", "Exactly $0", "About $50,000"]', 1, 'Netflix has cited over $1 billion in estimated annual savings from reduced subscriber churn.'),
    (7, 'Which of these is the LEAST likely to involve AI, based on this lesson?', '["A music app''s ''Discover Weekly'' playlist", "A maps app predicting traffic", "A basic physical light switch with no smart features", "A phone camera''s auto-enhance feature"]', 2, 'A plain, non-smart light switch has no AI involved — everything else listed relies on it.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'ai-in-your-life';
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does a Machine Learning Engineer typically focus on?', '["Only marketing AI products", "Building and deploying models, combining coding with training know-how", "Writing news articles", "Repairing computer hardware"]', 1, 'ML Engineers build and ship models, blending strong coding skills with training/math knowledge.'),
    (2, 'What does a Prompt Engineer specialize in?', '["Building physical robots", "Crafting instructions that get the best results from language models", "Manufacturing computer chips", "Selling AI subscriptions"]', 1, 'Prompt Engineers focus on writing effective instructions/prompts for AI models — the same skill practiced writing FORGE system prompts.'),
    (3, 'What is the main focus of an AI Ethicist / Responsible AI specialist?', '["Making models run faster", "Fairness, safety, and preventing AI from causing harm", "Designing app logos", "Writing marketing copy"]', 1, 'AI Ethicists focus on fairness and safety — a growing, urgently needed specialty.'),
    (4, 'In the movie production analogy, who does the "director" role represent?', '["The AI Product Manager", "The audience", "The camera equipment", "The popcorn vendor"]', 0, 'The Product Manager, like a director, decides what gets built and why, coordinating the whole team.'),
    (5, 'When did "Prompt Engineer" become a widely recognized job title?', '["In the 1960s", "Almost overnight around 2022, once large language models went mainstream", "It has always existed since computers were invented", "It still doesn''t exist as a job"]', 1, 'Prompt Engineering emerged rapidly as a distinct role once LLMs became mainstream around 2022.'),
    (6, 'What does a Data Scientist typically do?', '["Only writes prompts", "Digs through data for insights and prepares it for models", "Designs company logos", "Manages social media accounts"]', 1, 'Data Scientists analyze and prepare data, combining detective work with statistics.'),
    (7, 'According to the lesson, what''s a good way to identify which AI career might fit you?', '["Randomly guess", "Notice which part of building your FORGE bot you enjoyed most", "Only consider salary", "Wait until you finish college to think about it"]', 1, 'Reflecting on which part of the hands-on building process you enjoyed most is a genuine clue toward fitting career paths.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'ai-careers';

CREATE TABLE public.lesson_content (
  lesson_id UUID PRIMARY KEY REFERENCES public.lessons(id) ON DELETE CASCADE,
  content JSONB NOT NULL
);
GRANT ALL ON public.lesson_content TO service_role;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, content FROM public.lessons WHERE content IS NOT NULL;
ALTER TABLE public.lessons DROP COLUMN content;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.lesson_quiz_questions;
REVOKE SELECT ON public.lesson_quiz_questions FROM anon, authenticated;

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

DROP FUNCTION IF EXISTS public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]);
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
REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) TO anon, authenticated;