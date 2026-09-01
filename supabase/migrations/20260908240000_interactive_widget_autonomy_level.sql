-- Closes the "zero interactive widgets in Module 6" gap flagged in the
-- visual/practical-learning rating: attaches AutonomyLevelExplorer to
-- "Degrees of Autonomy: How Much Control to Give" -- a manipulate-and-
-- observe widget (pick an action, watch all 4 autonomy levels' outcomes
-- update), matching ConfusionMatrixExplorer's proven interaction style
-- rather than a passive step-through.
--
-- COALESCE before the guard, same fix as 20260908230000 -- content->
-- 'interactive' is NULL here (no widget attached yet), and NULL @> anything
-- is NULL, not false, which would silently match zero rows otherwise.

UPDATE public.lesson_content lc
SET content = jsonb_set(lc.content, '{interactive}', COALESCE(lc.content->'interactive', '[]'::jsonb) || '[{"kind":"autonomy_level"}]'::jsonb)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 6 AND l.title = 'Degrees of Autonomy: How Much Control to Give'
  AND NOT (COALESCE(lc.content->'interactive', '[]'::jsonb) @> '[{"kind":"autonomy_level"}]'::jsonb);

NOTIFY pgrst, 'reload schema';
