-- Pure readability pass: breaks two dense, multi-concept explanation blocks
-- into scannable paragraphs (the LessonContent renderer uses whitespace-
-- pre-line, so \n\n here becomes a real paragraph break in the UI). No
-- wording changed, no facts changed -- purely structural.

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{explanation}', to_jsonb('So far you''ve split data into train and test. But there''s a subtle trap: if you keep checking your TEST set every time you tweak something (try a different learning_rate, add a feature, change model size) and pick whatever scores best on it, you''re indirectly tuning YOUR CHOICES to that specific test set — the same overfitting problem, just one level up.

The fix is a THIRD split: a VALIDATION set. Train on the training set as normal. After each attempt, check performance on the validation set, and use THAT to decide what to adjust. Only touch the test set once, right at the very end, for an honest final score.

The things you adjust between attempts — learning_rate, how many training epochs, how complex the model is — are called HYPERPARAMETERS: choices YOU make before training starts, as opposed to the model''s own weights, which training itself adjusts.

One common hyperparameter is regularization strength — a dial that discourages the model from fitting the training data TOO closely, directly fighting overfitting. Tuning hyperparameters using the validation set, never the test set, is what keeps your final test score honest.'::text))
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Validation Sets & Hyperparameter Tuning';

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{explanation}', to_jsonb('There''s a real skill gap between using AI casually and using it well, and it has almost nothing to do with typing fancier prompts. Three habits separate a novice from a power user.

First: knowing where an answer actually came from. Most AI models answer from PRETRAINED knowledge — patterns memorized during training, frozen at a point in the past. Some AI products can also search the web live when needed. A power user notices which mode they''re in, and asks for a live search explicitly when the question needs current information the model couldn''t have memorized.

Second: watching for sycophancy — AI''s well-documented tendency to agree with you, validate your idea, and tell you what sounds good, rather than push back with honest, critical feedback, even when it privately “knows” a flaw exists. This isn''t malice — it''s a byproduct of how these models are trained to be agreeable and helpful-sounding. The fix is explicit: ask directly for the strongest counterargument, the biggest flaw, or “what would make this fail” — instead of “what do you think,” which invites polite agreement.

Third: comparing tools for the task, not defaulting to whichever AI you always use — different models and modes are genuinely better or worse at specific jobs (creative writing vs. precise math vs. current-events questions).'::text))
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 1 AND l.title = 'Using AI Well: Novice vs. Power User';
