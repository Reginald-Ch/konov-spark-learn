-- Attaches the second pair of interactive widgets: the gradient descent
-- animator (reuses the exact same dataset and update rule already taught in
-- this lesson's code -- watch it happen instead of only reading printed
-- numbers) and the precision/recall threshold explorer (drag a threshold,
-- watch the real tradeoff the lesson's explanation describes). Additive only
-- (jsonb ||) -- existing fields on both lessons are untouched.
--
-- Matched by title, not order_index, per this session's established pattern.

UPDATE public.lesson_content lc
SET content = lc.content || '{"interactive":{"kind":"gradient_descent"}}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Training vs. Predicting';

UPDATE public.lesson_content lc
SET content = lc.content || '{"interactive":{"kind":"confusion_matrix"}}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?';
