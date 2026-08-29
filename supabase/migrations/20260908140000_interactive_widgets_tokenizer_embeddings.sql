-- Attaches the two new interactive widgets (TokenizerExplorer,
-- EmbeddingSpaceExplorer) to the two lessons whose concepts are inherently
-- spatial/dynamic and were genuinely under-served by a static diagram: real
-- tokenization is something you watch happen to your own text, and real
-- embeddings are fundamentally about position in space, not something a
-- paragraph can fully convey. Additive only (jsonb ||) -- existing fields on
-- both lessons are untouched, this only adds the new "interactive" key.
--
-- Matched by title, not order_index, per this session's established pattern
-- for anything that isn't itself a renumbering migration.

UPDATE public.lesson_content lc
SET content = lc.content || '{"interactive":{"kind":"tokenizer"}}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 3 AND l.title = 'Tokens, Prompts & Context Windows';

UPDATE public.lesson_content lc
SET content = lc.content || '{"interactive":{"kind":"embedding_space"}}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 3 AND l.title = 'Embeddings & Semantic Search';
