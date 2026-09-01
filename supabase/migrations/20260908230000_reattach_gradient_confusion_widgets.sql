-- Diagnostic (SELECT l.title, lc.content->'interactive' FROM lesson_content
-- lc JOIN lessons l ON l.id = lc.lesson_id WHERE l.module_number = 2 AND
-- lc.content->'interactive' IS NOT NULL) came back with only bias_variance
-- and roc_curve -- confirming gradient_descent ("Training vs. Predicting")
-- and confusion_matrix ("How Do We Know a Model Is Good?") were written in
-- 20260908150000 but never actually applied to the live database, the same
-- "migration authored, never actually run" gap this session has hit before
-- for other tables.
--
-- FIRST ATTEMPT AT THIS MIGRATION silently updated zero rows. Root cause:
-- the idempotency guard read `lc.content->'interactive'` directly, which is
-- NULL for both these rows right now -- and in SQL, `NULL @> anything` is
-- NULL, so `NOT (NULL @> ...)` is also NULL, not true. A NULL WHERE clause
-- excludes the row exactly like `false` would, so the UPDATE matched
-- nothing. Fixed by wrapping in COALESCE before the guard, the same way the
-- SET clause already did -- `[] @> X` correctly evaluates to false (not
-- NULL), so the guard now actually passes when there's nothing there yet.

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{interactive}', COALESCE(lc.content->'interactive', '[]'::jsonb) || '[{"kind":"gradient_descent"}]'::jsonb)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Training vs. Predicting'
  AND NOT (COALESCE(lc.content->'interactive', '[]'::jsonb) @> '[{"kind":"gradient_descent"}]'::jsonb);

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{interactive}', COALESCE(lc.content->'interactive', '[]'::jsonb) || '[{"kind":"confusion_matrix"}]'::jsonb)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?'
  AND NOT (COALESCE(lc.content->'interactive', '[]'::jsonb) @> '[{"kind":"confusion_matrix"}]'::jsonb);

NOTIFY pgrst, 'reload schema';
