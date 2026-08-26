-- Lessons content-accuracy fix: the "Build Your Own Chatbot" module (6
-- lessons: bot-identity, great-system-message, knowledge-base-qa,
-- tone-and-style, rules-and-boundaries, testing-debugging-bot) was written
-- once, in the migration that first published it
-- (20260803020000_b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e.sql), and that
-- migration's own header comment says it was "tied directly to the real
-- FORGE variables from the existing 24-challenge builder." No migration
-- since has touched this module's lesson_content — every later migration
-- that mentions these six slugs only shifts module_number/order_index
-- (renumbering churn, see 20260803110000 / 20260803410000 / 20260813060000),
-- never the actual teaching content.
--
-- Build Studio (src/components/hackathon/ProjectEditor.tsx) has since grown
-- to 34 challenges — confirmed against the live scanner checklist in
-- ProjectEditor.tsx (`Scanning 34 challenges...`) and independently
-- cross-checked against supabase/functions/python-ai-assist/index.ts's
-- idea-to-code prompt ("Challenges 25-34, which teach real Python syntax
-- rather than config editing"). Both agree on the same canonical order:
--   1 BOT_NAME, 2 BOT_EMOJI, 3 AI_MESSAGE, 4 CREATOR_NAME, 5 SYSTEM_MESSAGE,
--   6 KNOWLEDGE_BASE, 7 QA_PAIRS, 8 TEMPERATURE, 9 RULES,
--   10 CONVERSATION_STARTERS, 11 FORBIDDEN_WORDS, 12 BLOCKED_TOPICS,
--   13 FEW_SHOT_EXAMPLES, 14 SECRET_RESPONSES, 15 MOOD_RESPONSES,
--   16 MAX_RESPONSE_LENGTH, 17 MAX_TOKENS, 18 MOOD, 19 RESPONSE_TONE,
--   20 CATCHPHRASES, 21 VOICE_ENABLED, 22 VOICE_MODE, 23 WAKE_WORD,
--   24 VOICE_GENDER, 25 FALLBACK_MESSAGE (a function), 26 TOPIC_KEYWORDS
--   (accumulator loop), 27 PHRASE_IDEAS (list comprehension),
--   28 PERSONALIZED_INTRO (parameterized function), 29 MOOD_INSTRUCTION
--   (dict.get() fallback), 30 RULE_COUNT (accumulator loop), 31 PRINT_UPPER
--   (.upper()), 32 IS_EXPRESSIVE (boolean expression), 33 WHILE_LOOP_PRINT,
--   34 MAX_TOKENS_LINE (str() cast).
--
-- Comparing that against the six lessons' actual content: the variable
-- names it teaches (BOT_NAME/BOT_EMOJI/AI_MESSAGE/CREATOR_NAME,
-- SYSTEM_MESSAGE, KNOWLEDGE_BASE/QA_PAIRS, RESPONSE_STYLE/MOOD/
-- LANGUAGE_STYLE/CATCHPHRASES/MAX_RESPONSE_LENGTH, RULES/FORBIDDEN_WORDS/
-- BLOCKED_TOPICS) are all still accurate — those variables are real and
-- unchanged in the current scaffold. That part is NOT stale and is left
-- alone here.
--
-- What IS stale: the module never once frames itself around FORGE's "34
-- challenges" or names "Build Studio," despite claiming to teach exactly
-- that interface, and it stops completely short of Challenges 25-34 — the
-- entire later tier where Build Studio requires writing actual functions,
-- accumulator loops, a list comprehension, and a dict.get() fallback, not
-- just setting a variable. A student who finishes this module and then
-- opens Build Studio hits ten challenges (nearly a third of the total) that
-- this module never mentioned, using syntax this module never connected to
-- the bot they were just taught to build. This migration:
--   1. Lightly updates 'bot-identity' (the module's first lesson) to name
--      "FORGE's Build Studio" and its "34 challenges" explicitly, so the
--      framing is established from the start — everything else in that
--      lesson's content is left untouched.
--   2. Adds one new capstone lesson, 'leveling-up-real-python', covering
--      Challenges 25-34, reusing the exact function/loop/comprehension
--      patterns already taught in the Code Fundamentals module (variables,
--      lists/dicts, conditionals, functions, loops) but now aimed at the
--      bot variables this module already introduced (BOT_NAME, QA_PAIRS,
--      RULES, CATCHPHRASES, MOOD_RESPONSES) — the same synthesis Build
--      Studio itself expects.
--
-- Matched by slug throughout, per this session's standing guidance not to
-- trust module_number (this exact area has drifted before — see
-- 20260813060000's header comment). The new lesson's module_number and
-- order_index are read from the live 'testing-debugging-bot' row at
-- migration time, not hardcoded, so this is correct regardless of which
-- renumbering has actually landed on the live database. Idempotent:
-- UPDATE-by-slug for the existing lesson, guarded INSERT-if-missing for the
-- new one, using the same safe +1000/-999 order_index offset trick already
-- established in this migration history.

-- ── 1. Frame the module around FORGE's actual 34-challenge structure ──
UPDATE public.lesson_content SET content = '{
  "hook": "Before your bot says a single smart thing, it needs a name, a face, and a reason to exist. This is the fastest lesson in the whole course — and skipping it is the #1 reason FORGE bots feel generic.",
  "explanation": "FORGE''s Build Studio breaks building a chatbot into 34 challenges, and BOT_NAME, BOT_EMOJI, AI_MESSAGE, and CREATOR_NAME are Challenges 1-4 — the very first ones you''ll see when you open your project there. Every FORGE bot starts with these four identity variables: BOT_NAME (shown in the chat header), BOT_EMOJI (its visual avatar next to every message), AI_MESSAGE (the very first thing users see), and CREATOR_NAME (crediting you as the builder). These might look like small cosmetic details, but they do real work: a bot named ''Assistant'' with a generic robot emoji signals ''generic tool,'' while a bot with a specific name, emoji, and punchy opening line signals ''someone made a real character here.'' Users form an opinion about whether your bot is worth taking seriously within the first message, often before asking it anything real. A weak default AI_MESSAGE works for literally any bot ever built, which is exactly the problem — it says nothing specific about THIS bot.",
  "analogy": "Think of BOT_NAME, BOT_EMOJI, and AI_MESSAGE as a business''s storefront sign, logo, and the greeting a shopkeeper gives you walking in. You could build the same quality product behind two different storefronts — but a forgettable sign and a mumbled greeting make people assume the product inside is forgettable too, before they''ve seen it.",
  "fun_fact": "In UX research, this is sometimes called the ''first 3 seconds'' effect — users form snap judgments about digital products within just a few seconds of first contact, and that impression measurably colors how they interpret everything that follows.",
  "try_it": "Open FORGE''s Build Studio and read your BOT_NAME, BOT_EMOJI, and AI_MESSAGE out loud, back to back, as a brand-new user would. Does it sound like a specific character, or could it swap into any other bot with zero changes?"
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'bot-identity');

-- ── 2. Add the missing capstone lesson covering Challenges 25-34 ──
DO $newlesson$
DECLARE
  v_anchor_order INTEGER;
  v_anchor_module INTEGER;
  v_new_order INTEGER;
  v_new_lesson_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE slug = 'leveling-up-real-python') THEN
    SELECT order_index, module_number INTO v_anchor_order, v_anchor_module
    FROM public.lessons WHERE slug = 'testing-debugging-bot';

    -- If the anchor lesson itself can't be found live (shouldn't happen per
    -- the reconstructed history above, but this repo's migration history has
    -- already proven unreliable once in this exact area), skip cleanly
    -- rather than guessing at a module/order value.
    IF v_anchor_order IS NOT NULL THEN
      v_new_order := v_anchor_order + 1;

      -- Safe +1000/-999 offset shift (net +1) for every lesson at or after
      -- the new slot — same pattern already used by the migrations that
      -- inserted Module 2's and Module 4's lessons — so the UNIQUE
      -- order_index constraint is never hit mid-update, regardless of what
      -- the live order_index values actually are.
      UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= v_new_order;
      UPDATE public.lessons SET order_index = order_index - 999 WHERE order_index >= 1000 + v_new_order;

      INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published)
      VALUES (
        v_anchor_module, v_new_order,
        'Leveling Up: The Real-Python Challenges',
        'leveling-up-real-python',
        'Functions, accumulator loops, list comprehensions, and dict.get() fallbacks — the real Python syntax behind Build Studio''s last 10 challenges.',
        10, true
      )
      RETURNING id INTO v_new_lesson_id;

      INSERT INTO public.lesson_content (lesson_id, content) VALUES (v_new_lesson_id, '{
        "hook": "Every challenge so far has been about setting a variable to a value. This last stretch flips that — you write a function, a loop, or a list comprehension that PRODUCES the value, using the exact real Python you already practiced back in the Code Fundamentals module.",
        "explanation": "FORGE''s Build Studio is built around 34 challenges, and Challenges 25-34 are where two threads of this course finally meet: the functions, loops, and list comprehensions from Code Fundamentals, and the bot variables you already set up in this module (BOT_NAME, QA_PAIRS, RULES, CATCHPHRASES, MOOD_RESPONSES) get combined into real, working logic.\n\nFALLBACK_MESSAGE is written by a function, not typed directly: def build_fallback_message(bot_name): returns an f-string, then FALLBACK_MESSAGE = build_fallback_message(BOT_NAME) calls it. TOPIC_KEYWORDS and RULE_COUNT are both accumulator loops — start with an empty list (or 0), loop over QA_PAIRS (or RULES), and .append() (or += 1) on every pass through. PHRASE_IDEAS is a list comprehension, the compact one-line cousin of a for loop: PHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES] builds an entire new list without a separate loop block. PERSONALIZED_INTRO is a parameterized function whose f-string actually uses its argument, not a hardcoded string. MOOD_INSTRUCTION uses a safe dictionary lookup — MOOD_RESPONSES.get(MOOD, \"Be friendly and helpful.\") — so an unrecognized MOOD falls back to a default instead of crashing with a KeyError. IS_EXPRESSIVE combines two comparisons into one boolean expression with and. WHILE_LOOP_PRINT and MAX_TOKENS_LINE round things out with a while loop and a str() type cast inside a print().\n\nNone of this is new syntax showing up out of nowhere — it''s the exact functions, loops, dictionaries, and list comprehensions from Code Fundamentals, just finally pointed at the bot you''ve been building the whole time instead of a practice example.",
        "code": "def build_fallback_message(bot_name):\n    return f\"Sorry, I didn''t catch that — try asking {bot_name} something else!\"\n\nFALLBACK_MESSAGE = build_fallback_message(BOT_NAME)\n\nPHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES]\n\nMOOD_INSTRUCTION = MOOD_RESPONSES.get(MOOD, \"Be friendly and helpful.\")\n\nRULE_COUNT = 0\nfor rule in RULES:\n    RULE_COUNT += 1",
        "visual": {
          "caption": "Four ways Challenges 25-34 level up a variable",
          "steps": [
            { "emoji": "🧩", "label": "Function", "caption": "def ...(): return ..." },
            { "emoji": "🔁", "label": "Accumulator loop", "caption": "Builds a list or count" },
            { "emoji": "⚡", "label": "List comprehension", "caption": "A loop in one line" },
            { "emoji": "🛟", "label": ".get() fallback", "caption": "Never crashes on a missing key" }
          ]
        },
        "analogy": "Challenges 1-24 are like filling out a form — one blank, one answer, done. Challenges 25-34 are more like writing a small recipe: take ingredients you already have (BOT_NAME, QA_PAIRS, RULES, CATCHPHRASES), run them through a process (a function, a loop, a comprehension), and get a new result out the other end.",
        "practice": {
          "prompt": "MOOD_INSTRUCTION = MOOD_RESPONSES.get(MOOD, \"Be friendly and helpful.\")\nIf MOOD is set to \"grumpy\" and MOOD_RESPONSES has no \"grumpy\" key, what does MOOD_INSTRUCTION become?",
          "options": ["The program crashes with an error", "\"Be friendly and helpful.\" — the fallback default", "None", "\"grumpy\""],
          "correct_index": 1,
          "feedback": ".get(key, default) never crashes on a missing key — if MOOD isn''t found in MOOD_RESPONSES, it safely returns the fallback value you provided instead of raising a KeyError."
        },
        "code_practice": {
          "instructions": "Complete the list comprehension so PHRASE_IDEAS holds an uppercase version of every phrase in CATCHPHRASES.",
          "starter": "CATCHPHRASES = [\"let''s go\", \"nice one\"]\n\n# Build PHRASE_IDEAS using a list comprehension\nPHRASE_IDEAS = [___ for phrase in CATCHPHRASES]\nprint(PHRASE_IDEAS)",
          "check_pattern": "PHRASE_IDEAS\\s*=\\s*\\[\\s*phrase\\.upper\\(\\)\\s+for\\s+phrase\\s+in\\s+CATCHPHRASES\\s*\\]",
          "success_message": "That''s a real list comprehension — PHRASE_IDEAS now holds every phrase, uppercased, built in one line!",
          "hint": "Fill the blank with phrase.upper() — the full line should read PHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES]"
        },
        "fun_fact": "List comprehensions exist purely for convenience — PHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES] does exactly the same thing as a 3-line for loop with .append(), just compressed onto one line. Experienced Python developers reach for them constantly once a loop starts to feel repetitive.",
        "try_it": "Open your own FORGE project and find FALLBACK_MESSAGE in main.py. Is it still built by calling build_fallback_message(BOT_NAME), or did an earlier edit accidentally replace it with a plain hardcoded string? If it''s hardcoded, rewrite it as a real function call — that''s Challenge 25, for real this time."
      }'::jsonb);

      INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
      SELECT v_new_lesson_id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
      FROM (
        VALUES
          (1, 'In FORGE''s Build Studio, what do Challenges 25-34 ask you to do differently than Challenges 1-24?', '["Nothing, they''re identical", "Write real Python logic (functions, loops, comprehensions) instead of just setting a variable to a value", "Delete all your previous variables", "They only apply to voice-enabled bots"]', 1, 'Challenges 25-34 shift from simple variable assignment to writing functions, accumulator loops, and a list comprehension.'),
          (2, 'How is FALLBACK_MESSAGE actually set in Build Studio?', '["FALLBACK_MESSAGE = \"Sorry, try again\"", "By calling a function you write, like FALLBACK_MESSAGE = build_fallback_message(BOT_NAME)", "It''s automatically generated with no code required", "It can only ever be a number"]', 1, 'Challenge 25 requires a function that returns the message, then calling that function to set FALLBACK_MESSAGE.'),
          (3, 'What does MOOD_RESPONSES.get(MOOD, "Be friendly and helpful.") do if MOOD isn''t a key in MOOD_RESPONSES?', '["Crashes the program with a KeyError", "Returns \"Be friendly and helpful.\" instead of crashing", "Deletes MOOD_RESPONSES entirely", "Always returns None no matter what"]', 1, '.get(key, default) safely falls back to the provided default instead of raising an error on a missing key.'),
          (4, 'PHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES] is an example of:', '["A while loop", "A list comprehension", "A dictionary", "A boolean expression"]', 1, 'This is a list comprehension — a for loop condensed into a single line that builds a new list.'),
          (5, 'What''s the relationship between TOPIC_KEYWORDS (an accumulator loop) and PHRASE_IDEAS (a list comprehension)?', '["They''re unrelated concepts with nothing in common", "Both build a new list from an existing one, but a list comprehension does it in one line instead of a multi-line loop", "Accumulator loops can only count numbers, never build lists", "List comprehensions can''t reference other variables"]', 1, 'Both patterns build a new list by processing an existing one — a comprehension is just the compact, one-line version.'),
          (6, 'What makes PERSONALIZED_INTRO''s function different from a function like def greet(): return "Hi!"?', '["It takes a parameter, and its f-string actually uses that argument", "It never returns anything", "It can only be called once, ever", "It doesn''t use f-strings at all"]', 0, 'PERSONALIZED_INTRO''s function is parameterized — it takes an input and uses it inside the returned f-string, unlike a hardcoded return.'),
          (7, 'Why does this lesson connect Challenges 25-34 back to the Code Fundamentals module?', '["They don''t actually connect at all", "Because the functions, loops, and list comprehensions taught there are the exact tools these later challenges require", "Code Fundamentals is unrelated to Build Studio", "Because Challenges 25-34 replace everything taught earlier"]', 1, 'Challenges 25-34 apply Code Fundamentals'' functions, loops, and comprehensions directly to the bot variables built in this module.')
      ) AS q(order_index, question, options, correct_index, explanation);
    END IF;
  END IF;
END $newlesson$;
