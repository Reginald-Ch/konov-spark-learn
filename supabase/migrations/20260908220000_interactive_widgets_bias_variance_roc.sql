-- Attaches the two interactive widgets flagged as a real gap in the Module 2
-- visual-quality review: the bias-variance tradeoff and the ROC curve are
-- both, by definition, GRAPHS -- and until now both were only taught via a
-- printed table/threshold loop, never an actual plotted curve.
--
-- LessonsPanel.tsx's `interactive` field just changed shape from a single
-- object to an ARRAY, specifically so "How Do We Know a Model Is Good?" can
-- carry both confusion_matrix (already attached) AND roc_curve without one
-- silently replacing the other through the enrichment migrations' jsonb `||`
-- merge (which replaces on a shared key, but CONCATENATES on two arrays).
--
-- Step 1 below converts every EXISTING single-object `interactive` value
-- (tokenizer, embedding_space, gradient_descent, confusion_matrix -- all
-- written as bare objects by earlier migrations, before this array shape
-- existed) into a 1-element array first. Without this, those 4 lessons'
-- dialogs would throw a runtime error the next time anyone opened them
-- (`.map is not a function` on a plain object) the moment the frontend
-- change ships. Step 2 then appends the two new widgets onto whatever
-- array is now there (fresh empty array if none existed).

-- Step 1: normalize existing single-object interactive fields to arrays.
UPDATE public.lesson_content
SET content = jsonb_set(content, '{interactive}', jsonb_build_array(content->'interactive'))
WHERE jsonb_typeof(content->'interactive') = 'object';

-- Step 2: append the two new widgets (array || array concatenates in jsonb).
UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{interactive}', COALESCE(lc.content->'interactive', '[]'::jsonb) || '[{"kind":"bias_variance"}]'::jsonb)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'When AI Gets It Wrong';

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{interactive}', COALESCE(lc.content->'interactive', '[]'::jsonb) || '[{"kind":"roc_curve"}]'::jsonb)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?';

NOTIFY pgrst, 'reload schema';
