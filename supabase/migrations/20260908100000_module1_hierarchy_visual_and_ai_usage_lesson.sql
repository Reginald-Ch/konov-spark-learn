-- Two additions to Module 1, filling gaps found against DeepLearning.AI's
-- "AI Prompting for Everyone" (practical AI-usage skills: pretrained vs.
-- live search, sycophancy) and Google Cloud's AI/ML/Deep Learning comparison
-- (the standard nested-hierarchy framing, which lesson 1 lacked).
--
-- 1) Upgrades lesson 1's visual from a linear "spectrum" to the standard
--    nested AI > ML > Deep Learning > Generative AI diagram. Overwrites only
--    the visual key (jsonb ||) -- hook/explanation/analogy/fun_fact/try_it/
--    practice are untouched.
-- 2) Adds a new lesson, "Using AI Well: Novice vs. Power User", covering
--    sycophancy and pretrained-knowledge-vs-live-search awareness -- neither
--    covered anywhere in this academy, both core to "AI Prompting for
--    Everyone"'s curriculum. Anchored to a lesson title via subquery, safe
--    regardless of current numbering. Placed right after "What AI Is
--    Actually Good -- and Bad -- At", extending that same theme.

UPDATE public.lesson_content lc
SET content = lc.content || '{"visual":{"caption":"Three nested terms, often confused with each other","steps":[{"emoji":"🌐","label":"Artificial Intelligence","caption":"The broadest field — any technique that makes computers mimic intelligent behavior, including old hand-written rule systems."},{"emoji":"📊","label":"→ Machine Learning","caption":"A SUBSET of AI: systems that learn patterns from data instead of following hand-written rules."},{"emoji":"🧠","label":"→ → Deep Learning","caption":"A SUBSET of Machine Learning: learning specifically with multi-layer neural networks."},{"emoji":"🎨","label":"→ → → Generative AI","caption":"Mostly built with deep learning — the newest, most specialized layer of all."}]}}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 1 AND l.title = 'What Is AI, Really?';

UPDATE public.lessons SET order_index = -order_index
WHERE order_index > (SELECT order_index FROM public.lessons WHERE module_number = 1 AND title = 'What AI Is Actually Good -- and Bad -- At');
UPDATE public.lessons SET order_index = -order_index + 1 WHERE order_index < 0;

WITH new_lesson AS (
  INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published)
  VALUES (
    1,
    (SELECT order_index FROM public.lessons WHERE module_number = 1 AND title = 'What AI Is Actually Good -- and Bad -- At') + 1,
    'Using AI Well: Novice vs. Power User',
    'using-ai-well-novice-vs-power-user',
    'The real, practical skill gap between typing a question and getting something genuinely useful back.',
    10,
    true
  )
  RETURNING id
), ins_content AS (
  INSERT INTO public.lesson_content (lesson_id, content)
  SELECT id, '{"hook":"Two people ask the same AI the same question. One gets a mediocre, maybe-wrong answer. The other gets something genuinely useful. The AI didn''t change — how they used it did.","explanation":"There''s a real skill gap between using AI casually and using it well, and it has almost nothing to do with typing fancier prompts. Three habits separate a novice from a power user. First: knowing where an answer actually came from. Most AI models answer from PRETRAINED knowledge — patterns memorized during training, frozen at a point in the past. Some AI products can also search the web live when needed. A power user notices which mode they''re in, and asks for a live search explicitly when the question needs current information the model couldn''t have memorized. Second: watching for sycophancy — AI''s well-documented tendency to agree with you, validate your idea, and tell you what sounds good, rather than push back with honest, critical feedback, even when it privately “knows” a flaw exists. This isn''t malice — it''s a byproduct of how these models are trained to be agreeable and helpful-sounding. The fix is explicit: ask directly for the strongest counterargument, the biggest flaw, or “what would make this fail” — instead of “what do you think,” which invites polite agreement. Third: comparing tools for the task, not defaulting to whichever AI you always use — different models and modes are genuinely better or worse at specific jobs (creative writing vs. precise math vs. current-events questions).","analogy":"It''s the difference between asking a friend “do you like my essay?” (almost always gets a kind “yeah, it''s good!”) versus asking “what''s the weakest paragraph, and why?” One question invites politeness. The other invites the truth.","fun_fact":"Sycophancy is well-documented enough that AI labs actively test for it and try to train it out of their models — and it still shows up, because the same training process that makes a model helpful and agreeable is also what makes it want to please you.","try_it":"Take something you''re genuinely proud of — an idea, a piece of writing, a plan. Ask an AI “what''s wrong with this?” or “what''s the strongest argument against this?” instead of “what do you think?” Notice how different the answer is.","visual":{"caption":"Three habits that separate a novice from a power user","steps":[{"emoji":"😐","label":"Novice","caption":"Accepts the first answer at face value, whatever it is."},{"emoji":"🔍","label":"Power User: Check the Source","caption":"Pretrained memory, or did it actually search live?"},{"emoji":"🎯","label":"Power User: Ask for Honest Critique","caption":"Request the strongest counterargument, not agreement."},{"emoji":"🛠️","label":"Power User: Pick the Right Tool","caption":"Different models/modes are better at different jobs."}]},"practice":{"prompt":"You ask an AI to review your business plan and it replies “This looks great, solid plan!” What should a power user do next?","options":["Explicitly ask for the strongest counterargument or biggest flaw, since a positive first response may just be sycophancy","Accept the answer immediately and move forward with full confidence","Assume the AI is lying and never ask it anything again","Ask the exact same question five more times in a row"],"correct_index":0,"feedback":"A pleasant first answer often just means the model is being agreeable — explicitly requesting critical feedback is what actually surfaces real weaknesses."}}'::jsonb FROM new_lesson
  RETURNING lesson_id
)
INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT ins_content.lesson_id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM ins_content, (VALUES
  (1, 'What is sycophancy, in the context of AI?', '["AI''s tendency to agree with and flatter the user instead of giving honest, critical feedback","AI confidently stating something completely false","AI refusing to answer a question at all","A bug that makes an AI respond very slowly"]', 0, 'Sycophancy is distinct from hallucination — it is about excessive agreeableness, not factual accuracy.'),
  (2, 'How can you get more honest, critical feedback from an AI instead of polite agreement?', '["Explicitly ask for the strongest counterargument or biggest flaw, instead of \"what do you think?\"","Ask the exact same question in a louder tone","This is impossible — AI always agrees with the user","Only ask yes/no questions"]', 0, 'Explicit requests for critique ("what would make this fail?") route around the model''s default agreeable tendency.'),
  (3, 'What is the difference between an AI answering from "pretrained knowledge" versus doing a "live search"?', '["Pretrained knowledge is frozen at training time; a live search can find current information the model never saw in training","There is no real difference between the two","Live search is always less accurate than pretrained knowledge","Pretrained knowledge updates automatically every day"]', 0, 'Pretrained knowledge has a fixed cutoff date; live search lets a model find genuinely current information.'),
  (4, 'Why does sycophancy happen, according to this lesson?', '["It''s a byproduct of training models to be helpful and agreeable, not intentional deception","AI models are deliberately programmed to lie","It only happens in very old, outdated AI models","It happens completely at random with no underlying cause"]', 0, 'The same training pressures that make a model pleasant and helpful-sounding also push it toward agreeableness over blunt honesty.'),
  (5, 'A question needs very recent, up-to-the-minute information. What should a power user do?', '["Recognize the model may need to search live rather than rely purely on pretrained memory","Assume pretrained knowledge always has the latest information","Avoid using AI for this question entirely","Ask the question in a different language"]', 0, 'Recognizing when a question exceeds pretrained knowledge is exactly the skill this lesson describes.'),
  (6, 'Why does "picking the right tool for the task" matter?', '["Different AI models and modes are genuinely better or worse at specific kinds of tasks","All AI tools perform identically on every possible task","Only one AI tool has ever been built","Tool choice has no effect on output quality"]', 0, 'Creative writing, precise math, and current-events questions are not equally well-served by every model or mode.'),
  (7, 'What is the core difference between an AI novice and an AI power user, according to this lesson?', '["The power user actively checks sources, requests honest critique, and chooses tools deliberately, rather than accepting the first answer","The power user always writes longer prompts","The power user has access to a secret, more powerful AI","There is no meaningful difference between the two"]', 0, 'It''s about deliberate usage habits, not fancier prompt wording or access to different technology.')
) AS q(order_index, question, options, correct_index, explanation);
