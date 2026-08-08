-- Lessons content audit (round 2): 6 code_practice check_pattern regexes in
-- Module 4 (Code Fundamentals) had real correctness problems, verified
-- against both legitimate answers and exploit inputs with a Node test
-- harness before writing this migration.
--
-- Too STRICT (rejected objectively correct Python because it only accepted
-- double quotes, and Python treats ' and " as interchangeable):
--   variables-and-values, data-structures-lists-dicts,
--   f-strings-string-formatting
--
-- Too LOOSE (accepted code that doesn't do what the lesson asks, or would
-- error if actually run):
--   functions-reusable-logic — matched the literal substring "name"
--     ANYWHERE, so `return "Welcome, name!"` (a string that never
--     references the actual parameter) passed as if it were correct.
--     Now requires `name` to appear either concatenated (`+ name` /
--     `name +`) or f-string-interpolated (`{name}`).
--   loops-repeating-actions — accepted any loop variable (`for x in
--     scores:`), but the starter code's unmodifiable next line is
--     `print(s)` — any variable other than `s` would raise NameError if
--     the code were actually run. Now requires the loop variable to be `s`.
--
-- Terminology mismatch (not a security/correctness issue, but confusing):
--   conditionals-if-else — the lesson's own taught example uses
--     print("Try again"), but the practice checker required the word
--     "Retry" instead, which the lesson's own example never showed. Now
--     accepts either phrasing.
--
-- to_jsonb(...::text) is used instead of hand-writing JSON string literals
-- so Postgres handles the JSON-escaping of the regexes' own quote
-- characters, rather than risking a hand-escaped mismatch.

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('favorite_topic\s*=\s*["''][^"'']+["'']'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'variables-and-values');

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('topics\s*=\s*\[\s*["''][^"'']+["'']\s*,\s*["''][^"'']+["'']\s*,\s*["''][^"'']+["'']'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'data-structures-lists-dicts');

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('greeting2\s*=\s*f["''][^"'']*\{name\}[^"'']*["'']'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'f-strings-string-formatting');

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('else\s*:\s*print\([^)]*(retry|try\s*again)[^)]*\)'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'conditionals-if-else');

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('def\s+welcome\s*\([^)]*\)\s*:\s*return\s+.*(\+\s*name\b|\bname\s*\+|\{name\})'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'functions-reusable-logic');

UPDATE public.lesson_content
SET content = jsonb_set(content, '{code_practice,check_pattern}', to_jsonb('for\s+s\s+in\s+scores\s*:'::text))
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'loops-repeating-actions');
