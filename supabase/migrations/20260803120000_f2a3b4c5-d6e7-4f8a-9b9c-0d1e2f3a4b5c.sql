-- Add a 6th Module 4 lesson: F-Strings & String Formatting.
-- Appended at the end of Module 4 (after Loops), shifting Modules 5-7 up by 1 order_index.
-- order_index is UNIQUE, so shift via the safe +1000/-999 offset trick (net +1) before inserting.

UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= 25;
UPDATE public.lessons SET order_index = order_index - 999 WHERE order_index >= 1025;

INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published) VALUES
(4, 25, 'F-Strings & String Formatting', 'f-strings-string-formatting', 'The shortcut for combining variables and text — used everywhere in the real FORGE IDE.', 10, true);

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "You have been gluing strings together with +. There is a faster, cleaner way — and it is the exact syntax used everywhere in the real FORGE IDE.",
  "explanation": "An f-string lets you drop a variable directly inside a string, instead of stitching pieces together with +. Put an f right before the opening quote, and wrap any variable in curly braces {}.\n\nCompare the two lines in the code box below — they produce the exact same result, but the f-string version is shorter and easier to read, especially once you are combining several variables at once.\n\nYou will see f-strings constantly in FORGE''s real Build Studio IDE — the FALLBACK_MESSAGE function you write for your chatbot uses exactly this syntax.",
  "code": "name = \"Ava\"\ngreeting1 = \"Hey \" + name + \", welcome!\"\ngreeting2 = f\"Hey {name}, welcome!\"\n\nprint(greeting1)   # Hey Ava, welcome!\nprint(greeting2)   # Hey Ava, welcome! (same result)",
  "visual": {
    "caption": "Two ways to build the same string",
    "steps": [
      { "emoji": "🧵", "label": "Concatenation", "caption": "\"Hey \" + name + \"!\"" },
      { "emoji": "⚡", "label": "f-string", "caption": "f\"Hey {name}!\"" },
      { "emoji": "✅", "label": "Same result", "caption": "Shorter to write & read" }
    ]
  },
  "analogy": "Concatenation is like taping separate strips of paper together to form a sentence. An f-string is like a fill-in-the-blank form — you write the sentence once with blanks, and Python fills them in for you.",
  "practice": {
    "prompt": "age = 17\nWhich f-string correctly prints: I am 17 years old",
    "options": ["f\"I am age years old\"", "f\"I am {age} years old\"", "\"I am {age} years old\""],
    "correct_index": 1,
    "feedback": "Curly braces {} are what tell Python to substitute the variable value — without them (option 1) or without the f prefix (option 3), it just prints the literal text."
  },
  "code_practice": {
    "instructions": "Rewrite the greeting using an f-string instead of concatenation.",
    "starter": "name = \"Sam\"\ngreeting = \"Hey \" + name + \", ready to build?\"\nprint(greeting)\n\n# Now write the same greeting using an f-string:\ngreeting2 = ___\nprint(greeting2)",
    "check_pattern": "greeting2\\s*=\\s*f\"[^\"]*\\{name\\}[^\"]*\"",
    "success_message": "That is a real f-string — {name} gets swapped in automatically!",
    "hint": "Try: greeting2 = f\"Hey {name}, ready to build?\"  — remember the f right before the quote."
  },
  "fun_fact": "F-strings were added to Python in version 3.6 (2016) — before that, developers used older, clunkier methods like %-formatting or .format(). F-strings became so popular they are now the standard way experienced Python developers format strings.",
  "try_it": "Take one print statement you wrote using + in an earlier lesson (or write a new one) and rewrite it as an f-string."
}'::jsonb
FROM public.lessons WHERE slug = 'f-strings-string-formatting';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does the f right before a string do in Python?',
     '["Nothing, it is optional and has no effect", "Tells Python to substitute variables written inside curly braces", "Makes the string uppercase", "Marks the string as a comment"]',
     1, 'The f prefix turns a normal string into an f-string, which substitutes any {variable} inside it.'),
    (2, 'name = "Sam"; print(f"Hi {name}") — what does this print?',
     '["Hi {name}", "Hi Sam", "Hi name", "Error"]',
     1, 'The f-string replaces {name} with the current value of the name variable, "Sam".'),
    (3, 'Which of these produces the exact same output as f"Hey {name}!"?',
     '["\"Hey \" + name + \"!\"", "\"Hey {name}!\"", "f + \"Hey name!\""]',
     0, 'String concatenation with + and an f-string can build the identical final text — the f-string is just a shorter way to write it.'),
    (4, 'What symbol wraps a variable name inside an f-string?',
     '["[] square brackets", "{} curly braces", "() parentheses", "<> angle brackets"]',
     1, 'Curly braces mark the spot where a variable value gets substituted in.'),
    (5, 'Why might a developer prefer an f-string over string concatenation with +?',
     '["f-strings are required by Python, concatenation is not allowed", "f-strings are usually shorter and easier to read, especially with multiple variables", "There is no real difference"]',
     1, 'Both work, but f-strings scale much better once you are combining several variables into one string.'),
    (6, 'age = 17; f"I am age years old" (no curly braces around age) — what happens?',
     '["It prints: I am 17 years old", "It prints the literal text: I am age years old", "It throws an error"]',
     1, 'Without curly braces, "age" is treated as plain text, not a variable reference — Python has no way to know you meant the variable.'),
    (7, 'In what year were f-strings added to Python?',
     '["1991", "2016", "2020"]',
     1, 'F-strings were introduced in Python 3.6, released in 2016.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'f-strings-string-formatting';
