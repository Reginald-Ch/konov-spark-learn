-- Insert a new Module 4 "Code Fundamentals" (5 lessons) between "How Chatbots & LLMs Think"
-- and "Build Your Own Chatbot". Existing modules 4,5,6 shift up to 5,6,7.
-- order_index is UNIQUE, so shift via the safe +1000/-995 offset trick (net +5) before inserting.

UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= 20;
UPDATE public.lessons SET order_index = order_index - 995 WHERE order_index >= 1020;
UPDATE public.lessons SET module_number = module_number + 1 WHERE module_number IN (4, 5, 6);

INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published) VALUES
(4, 20, 'Variables & Values', 'variables-and-values', 'Storing information with named containers — the first building block of any program.', 10, true),
(4, 21, 'Data Structures: Lists & Dictionaries', 'data-structures-lists-dicts', 'Organizing more than one value at a time, the way real code (and your chatbot''s knowledge base) does.', 10, true),
(4, 22, 'Conditionals: Teaching Code to Decide', 'conditionals-if-else', 'if / elif / else — how code makes different decisions in different situations.', 10, true),
(4, 23, 'Functions: Reusable Logic', 'functions-reusable-logic', 'Writing logic once and reusing it everywhere, instead of copy-pasting.', 10, true),
(4, 24, 'Loops: Doing Things Automatically', 'loops-repeating-actions', 'Repeating an action across every item in a list, automatically.', 10, true);

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Every program — including the chatbot logic running behind your FORGE bot — starts with the same basic move: giving a piece of information a name so you can use it later. That''s a variable.",
  "explanation": "A variable is a labeled container that holds a value — a number, a word, true/false, or something more complex. In Python, you create one just by writing a name, an equals sign, and a value.\n\nThe ''='' here doesn''t mean ''equals'' like in math — it means ''store this value under this name.'' Once stored, you can reuse that name anywhere instead of retyping the value, and update it later by assigning a new value to the same name.\n\nValues have types: strings (text, in quotes), integers (whole numbers), floats (decimals), and booleans (True/False). Python figures out the type automatically based on what you write — this is why you''ll sometimes see errors when a program expects one type and gets another.",
  "code": "name = \"Ava\"\nage = 17\nis_registered = True\n\nprint(name)            # Ava\nprint(age + 1)         # 18\nprint(is_registered)   # True",
  "visual": {
    "caption": "Naming a value",
    "steps": [
      { "emoji": "🏷️", "label": "Name it", "caption": "name = ..." },
      { "emoji": "📦", "label": "Store the value", "caption": "\"Ava\", 17, True" },
      { "emoji": "♻️", "label": "Reuse it", "caption": "Use the name anywhere" }
    ]
  },
  "analogy": "A variable is like a labeled locker. You don''t need to remember exactly what''s inside — you just remember the locker number (the variable name) and can grab or swap what''s inside anytime.",
  "practice": {
    "prompt": "score = 10\nscore = score + 5\nprint(score)\nWhat does this print?",
    "options": ["10", "15", "score + 5"],
    "correct_index": 1,
    "feedback": "score starts at 10, then gets reassigned to score + 5 (10+5=15). Variables can be updated by referencing their own current value."
  },
  "code_practice": {
    "instructions": "Fill in the blank so favorite_topic holds a string with your favorite AI topic, then hit Check My Code.",
    "starter": "# Create a variable called favorite_topic\n# and set it to your favorite AI topic (a string)\n\nfavorite_topic = ___\nprint(\"I want to learn about:\", favorite_topic)",
    "check_pattern": "favorite_topic\\s*=\\s*\"[^\"]+\"",
    "success_message": "favorite_topic now holds a real string — that is a working variable!",
    "hint": "Replace the underscores with a string in quotes, like \"chatbots\" — do not forget the quote marks!"
  },
  "fun_fact": "Python variable names can''t start with a number or contain spaces — this is exactly why programmers use underscores, like is_registered instead of ''is registered.''",
  "try_it": "Write 3 variables for something you''re tracking in real life (like a GPA, a savings goal, or a project deadline) using name = value syntax."
}'::jsonb
FROM public.lessons WHERE slug = 'variables-and-values';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "One variable holds one value. Real programs need to hold a lot more — like every question in the FAQ your chatbot answers from. That''s what data structures are for.",
  "explanation": "A list stores an ordered collection of values in one variable, written with square brackets. Each item has a position (index), starting at 0 — so the first item is topics[0], not topics[1]. You can add, remove, or loop over items in a list.\n\nA dictionary stores key-value pairs — each value is looked up by a name (key) instead of a position, written with curly braces. You access a value with its key, like bot[\"name\"].\n\nDictionaries are perfect for representing something with named properties — exactly like a FORGE lesson object with a title, slug, and coin_cost.",
  "code": "topics = [\"AI\", \"ML\", \"agents\"]\nprint(topics[0])    # AI\nprint(len(topics))  # 3\n\nbot = {\"name\": \"Kip\", \"coin_cost\": 10}\nprint(bot[\"name\"])  # Kip",
  "visual": {
    "caption": "Two ways to organize values",
    "steps": [
      { "emoji": "📋", "label": "List", "caption": "Ordered, by position [0,1,2]" },
      { "emoji": "🗝️", "label": "Dictionary", "caption": "Named, by key" }
    ]
  },
  "analogy": "A list is like a numbered locker row — locker 0, locker 1, locker 2. A dictionary is like a labeled filing cabinet — you grab the folder by its label (''name''), not by its position.",
  "practice": {
    "prompt": "topics = [\"AI\", \"ML\", \"agents\"]\nWhat does topics[1] return?",
    "options": ["AI", "ML", "agents", "1"],
    "correct_index": 1,
    "feedback": "Indexing starts at 0, so topics[0] is ''AI'' and topics[1] is ''ML.''"
  },
  "code_practice": {
    "instructions": "Add 2 more topics to the list so it has 3 items total, then hit Check My Code.",
    "starter": "# Add 2 more topics to this list\n\ntopics = [\"AI\", ___]\nprint(len(topics))",
    "check_pattern": "topics\\s*=\\s*\\[\\s*\"[^\"]+\"\\s*,\\s*\"[^\"]+\"\\s*,\\s*\"[^\"]+\"",
    "success_message": "topics now has 3+ items — nice work building a list!",
    "hint": "Inside the brackets, add two more items separated by commas, like \"ML\", \"agents\"."
  },
  "fun_fact": "Almost every real chatbot''s knowledge base — including the kind you''d build in FORGE — is really just a big list of dictionaries under the hood: one dictionary per FAQ entry, each with a question and answer key.",
  "try_it": "Write a dictionary representing yourself with 3 keys (like name, grade_level, favorite_subject)."
}'::jsonb
FROM public.lessons WHERE slug = 'data-structures-lists-dicts';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "A chatbot that always says the same thing regardless of what you ask isn''t very smart. Conditionals are how code makes different decisions based on different situations.",
  "explanation": "A conditional runs different code depending on whether something is True or False. In Python, that''s if, elif (short for ''else if''), and else.\n\nPython checks the if condition first. If it''s True, that block runs and the rest is skipped. If it''s False, Python checks the next elif (if there is one), and finally falls back to else if nothing matched.\n\nYou can chain multiple conditions with elif to handle more than two outcomes — like sorting a quiz score into ''Excellent,'' ''Passed,'' or ''Needs review'' instead of just pass/fail.",
  "code": "score = 6\nif score >= 7:\n    print(\"Excellent!\")\nelif score >= 5:\n    print(\"Passed!\")\nelse:\n    print(\"Try again\")\n# Output: Passed!",
  "visual": {
    "caption": "How Python checks conditions",
    "steps": [
      { "emoji": "❓", "label": "if condition", "caption": "Check first" },
      { "emoji": "🔀", "label": "elif condition", "caption": "Check next, if needed" },
      { "emoji": "🛟", "label": "else", "caption": "Fallback, if nothing matched" }
    ]
  },
  "analogy": "It''s like a bouncer checking a line of conditions: ''Are you on the VIP list? If not, do you have a ticket? If not, sorry, general line only.'' Only one path gets taken, checked top to bottom.",
  "practice": {
    "prompt": "score = 6\nif score >= 7: print(\"Excellent!\")\nelif score >= 5: print(\"Passed!\")\nelse: print(\"Try again\")\nWhat gets printed?",
    "options": ["Excellent!", "Passed!", "Try again", "Nothing"],
    "correct_index": 1,
    "feedback": "6 is not >= 7, so Python skips the if. 6 IS >= 5, so the elif block runs and prints ''Passed!'' — the else is never reached."
  },
  "code_practice": {
    "instructions": "Complete the else branch so scores below 5 print the right message.",
    "starter": "score = 3\n\nif score >= 5:\n    print(\"Pass\")\nelse:\n    ___",
    "check_pattern": "else\\s*:\\s*print\\([^)]*retry[^)]*\\)",
    "success_message": "Your else branch now handles the low-score case correctly!",
    "hint": "Under else:, write print(\"Retry\") on its own indented line."
  },
  "fun_fact": "This exact if/elif/else pattern is how a chatbot''s system message logic can be described in plain English too — ''if the question is about pricing, do X, otherwise if it''s a greeting, do Y, otherwise say Z'' is a conditional, even without code.",
  "try_it": "Write an if/elif/else in plain English (no code needed) for how you''d want your FORGE chatbot to respond differently to 3 different types of questions."
}'::jsonb
FROM public.lessons WHERE slug = 'conditionals-if-else';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Copy-pasting the same 5 lines of logic in ten different places is how bugs multiply. Functions let you write logic once and reuse it everywhere.",
  "explanation": "A function is a named, reusable block of code that can take inputs (called parameters) and give back an output (called a return value). You define one with def, and run it by calling its name with parentheses.\n\nThe parameter (name) is a placeholder that gets filled in with whatever you pass when you call the function — greet(\"Ava\") fills name with \"Ava,\" and greet(\"Sam\") would fill it with \"Sam\" instead, reusing the exact same logic.\n\nreturn sends a value back out of the function so it can be used elsewhere — it''s different from print, which just displays something on screen but doesn''t hand a value back to the rest of the program.",
  "code": "def greet(name):\n    return \"Hey \" + name + \", welcome!\"\n\nprint(greet(\"Ava\"))   # Hey Ava, welcome!\nprint(greet(\"Sam\"))   # Hey Sam, welcome!",
  "visual": {
    "caption": "Anatomy of a function",
    "steps": [
      { "emoji": "🏷️", "label": "def name(...)", "caption": "Define it once" },
      { "emoji": "📥", "label": "Parameters", "caption": "Inputs it accepts" },
      { "emoji": "📤", "label": "return", "caption": "Value sent back" }
    ]
  },
  "analogy": "A function is like a vending machine. You put in a specific input (a code, like B4), and it reliably gives back a specific output (a snack) — you don''t need to know exactly how the machine works inside, just that B4 always gives the same result.",
  "practice": {
    "prompt": "def greet(name):\n    return \"Hey \" + name + \"!\"\nprint(greet(\"Sam\"))\nWhat does this print?",
    "options": ["Hey name!", "Hey Sam!", "greet(Sam)", "Nothing, this causes an error"],
    "correct_index": 1,
    "feedback": "Calling greet(\"Sam\") fills the name parameter with \"Sam,\" so the function returns \"Hey Sam!\" — the same logic works for any name you pass in."
  },
  "code_practice": {
    "instructions": "Complete the return line so welcome() builds a personalized greeting using the name parameter.",
    "starter": "# Complete this function so it returns a personalized welcome\n\ndef welcome(name):\n    return ___\n\nprint(welcome(\"Ava\"))",
    "check_pattern": "def\\s+welcome\\s*\\([^)]*\\)\\s*:\\s*return\\s+.*name",
    "success_message": "Your function now returns a personalized message — that is reusable logic!",
    "hint": "Try: return \"Welcome, \" + name + \"!\" — the return line needs to use the name parameter."
  },
  "fun_fact": "In FORGE''s chatbot system, your bot''s whole reply-generation process is really one big function under the hood: it takes your message as input, and returns a reply as output — everything you''ve learned about system prompts and tone is basically shaping what happens inside that one function.",
  "try_it": "Describe a function you''d want for your chatbot in plain English — what input would it take, and what would it return?"
}'::jsonb
FROM public.lessons WHERE slug = 'functions-reusable-logic';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Checking 500 quiz submissions by hand would take hours. A loop does it in a fraction of a second — repeating the same action across every item automatically.",
  "explanation": "A loop repeats a block of code, once per item in a collection (or until a condition is no longer true). The most common type is a for loop, which runs once for every item in a list.\n\nEach time through the loop, the loop variable takes on the next value in the list — first one item, then the next — and the indented code underneath runs again with that new value.\n\nA while loop instead repeats as long as a condition stays True, which is useful when you don''t know in advance how many times you''ll need to repeat something — like waiting for a user to type a valid answer.",
  "code": "scores = [8, 5, 3, 7]\nfor s in scores:\n    if s >= 5:\n        print(\"Pass\")\n    else:\n        print(\"Retry\")\n# Output: Pass, Pass, Retry, Pass",
  "visual": {
    "caption": "What a for loop does",
    "steps": [
      { "emoji": "📋", "label": "A list of items", "caption": "[8, 5, 3, 7]" },
      { "emoji": "🔁", "label": "Run once per item", "caption": "Same code, each value" },
      { "emoji": "✅", "label": "Collect results", "caption": "One outcome per item" }
    ]
  },
  "analogy": "A loop is like a teacher grading a stack of papers one at a time — same grading rule applied to each paper, in order, without needing separate instructions written out for every single one.",
  "practice": {
    "prompt": "scores = [8, 5, 3, 7]\nfor s in scores:\n    if s >= 5: print(\"Pass\")\n    else: print(\"Retry\")\nHow many times does ''Pass'' get printed?",
    "options": ["1", "2", "3", "4"],
    "correct_index": 2,
    "feedback": "8, 5, and 7 are all >= 5 (3 values), so ''Pass'' prints 3 times; only 3 is < 5, so it prints ''Retry'' once."
  },
  "code_practice": {
    "instructions": "Write a for loop that goes through every score in the list.",
    "starter": "# Use a loop to print every score in the list\n\nscores = [8, 5, 9, 3]\n\n___\n    print(s)",
    "check_pattern": "for\\s+\\w+\\s+in\\s+scores\\s*:",
    "success_message": "Your loop will now run once for every score in the list!",
    "hint": "Write: for s in scores:  (do not forget the colon at the end!)"
  },
  "fun_fact": "Every time FORGE''s leaderboard re-ranks every participant, or a quiz checks all 7 answers against the correct ones, that''s a loop running behind the scenes — one pass, applied to every item, automatically.",
  "try_it": "Describe one repetitive task in FORGE (checking submissions, scoring quizzes, listing lessons) that a loop would make way faster than doing it by hand."
}'::jsonb
FROM public.lessons WHERE slug = 'loops-repeating-actions';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does the "=" sign do in a line like age = 17?',
     '["Checks if two things are equal", "Stores the value 17 under the name age", "Prints the number 17", "Deletes the variable age"]',
     1, 'In Python, "=" is assignment, not equality — it stores the value on the right under the name on the left.'),
    (2, 'Which of these is a valid Python variable assignment?',
     '["17 = age", "age == 17", "age = 17", "age -> 17"]',
     2, 'The variable name goes on the left, "=" in the middle, and the value on the right.'),
    (3, 'What type of value is "Ava" (with quotes) in Python?',
     '["Integer", "Boolean", "String", "Float"]',
     2, 'Text wrapped in quotes is a string — Python''s type for words and sentences.'),
    (4, 'What will print(is_registered) output if is_registered = True?',
     '["True", "1", "\"True\" (with quotes)", "Error"]',
     0, 'Booleans print as True or False, without quotes.'),
    (5, 'What happens when you run: score = 10, then score = score + 5?',
     '["score becomes 15", "score stays 10", "This causes an error", "score becomes 5"]',
     0, 'Python reads the current value of score (10), adds 5, and stores the new result (15) back under the same name.'),
    (6, 'Why might a program crash if you try to add a string and an integer directly, like "5" + 3?',
     '["Python doesn''t support addition", "The two values have different types, and Python won''t automatically combine them", "3 is too large a number"]',
     1, 'Python is strict about mixing types like this — you''d need to convert one of them first.'),
    (7, 'What''s a good reason to use a variable instead of typing a value repeatedly?',
     '["It makes the code run faster on every computer", "You can update the value in one place and reuse the name everywhere else", "Python requires all values to be stored in variables"]',
     1, 'Variables centralize a value so changing it once updates everywhere it''s used.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'variables-and-values';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What symbol is used to create a list in Python?',
     '["{} curly braces", "[] square brackets", "() parentheses", "<> angle brackets"]',
     1, 'Square brackets define a list, like ["AI", "ML", "agents"].'),
    (2, 'What does list indexing start at in Python?',
     '["0", "1", "-1", "It depends on the list"]',
     0, 'Python lists are zero-indexed — the first item is at position 0.'),
    (3, 'topics = ["AI", "ML", "agents"] — what does topics[2] return?',
     '["AI", "ML", "agents", "Error"]',
     2, 'Position 0 is "AI", position 1 is "ML", position 2 is "agents".'),
    (4, 'What data structure uses key-value pairs instead of positions?',
     '["List", "Dictionary", "Variable", "Boolean"]',
     1, 'A dictionary looks up values by a named key, not a numeric position.'),
    (5, 'bot = {"name": "Kip"} — how do you get the value "Kip"?',
     '["bot[0]", "bot.name", "bot[\"name\"]", "bot(\"name\")"]',
     2, 'Dictionary values are accessed with square brackets and the key in quotes.'),
    (6, 'What does len(topics) return for topics = ["AI", "ML", "agents"]?',
     '["The first item", "The last item", "The number of items in the list (3)", "An error"]',
     2, 'len() returns the count of items in a list.'),
    (7, 'Why would you choose a dictionary over a list to represent a chatbot''s settings (name, tone, coin_cost)?',
     '["Dictionaries are always faster", "Named keys make it clear what each value represents, instead of relying on remembering positions", "Lists can''t store text"]',
     1, 'Named keys are self-documenting — bot["name"] is clearer than remembering that position 0 means the name.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'data-structures-lists-dicts';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does "elif" stand for in Python?',
     '["''Else if'' — check another condition if the first was False", "''End if'' — closes the if block", "''Equal if'' — checks for equality only", "It''s not a real keyword"]',
     0, 'elif lets you check an additional condition only if the earlier ones were False.'),
    (2, 'In an if/elif/else chain, how many blocks can actually run?',
     '["All of them, every time", "Exactly one — the first condition that matches", "None unless explicitly called", "It depends on the operating system"]',
     1, 'Python stops at the first True condition and skips the rest of the chain.'),
    (3, 'score = 6. if score >= 7: print("A") / elif score >= 5: print("B") / else: print("C") — what prints?',
     '["A", "B", "C", "A and B"]',
     1, '6 fails the first check (>=7) but passes the second (>=5), so "B" prints.'),
    (4, 'What happens if none of the if/elif conditions are True and there''s an else block?',
     '["Nothing happens", "Python throws an error", "The else block runs", "All blocks run"]',
     2, 'else is the fallback that runs only when every prior condition was False.'),
    (5, 'Why use elif instead of writing several separate if statements?',
     '["elif is required by Python syntax", "elif ensures only one matching block runs instead of checking every condition independently", "There''s no real difference"]',
     1, 'Separate if statements are each checked independently and could all run; elif chains stop after the first match.'),
    (6, 'Which condition would be True for a variable temp = 72?',
     '["temp > 100", "temp >= 70", "temp == 0", "temp < 0"]',
     1, '72 is greater than or equal to 70, so that condition evaluates to True.'),
    (7, 'A chatbot needs to reply differently to greetings, pricing questions, and everything else. Which structure fits best?',
     '["A single variable", "An if/elif/else chain checking the type of question", "A list with no logic"]',
     1, 'Multiple distinct outcomes based on a condition is exactly what if/elif/else is designed for.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'conditionals-if-else';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What keyword defines a function in Python?',
     '["func", "define", "def", "function"]',
     2, 'Functions are defined with the def keyword, followed by a name and parentheses.'),
    (2, 'What is a parameter in a function?',
     '["A fixed value that never changes", "A placeholder input the function receives when called", "The function''s name", "An error message"]',
     1, 'Parameters are named placeholders that get filled in with real values at call time.'),
    (3, 'def greet(name): return "Hey " + name + "!" — what does greet("Sam") return?',
     '["Hey name!", "Hey Sam!", "Error", "Nothing"]',
     1, 'The name parameter is filled with "Sam", producing "Hey Sam!".'),
    (4, 'What''s the main difference between return and print inside a function?',
     '["There''s no difference", "return sends a value back for use elsewhere in the program; print only displays it on screen", "print is faster than return"]',
     1, 'return hands a usable value back to whatever called the function; print just shows text and gives nothing back.'),
    (5, 'Why write a function instead of repeating the same code in multiple places?',
     '["Python requires it", "One reusable, testable place for the logic instead of duplicated code that has to be fixed everywhere if it changes", "Functions make code run on any device"]',
     1, 'Centralizing logic in one function means a fix or change only needs to happen once.'),
    (6, 'def add(a, b): return a + b — what does add(3, 4) return?',
     '["34", "7", "\"3 + 4\"", "Error"]',
     1, 'a becomes 3 and b becomes 4, so a + b returns 7.'),
    (7, 'Can the same function be called multiple times with different inputs?',
     '["No, each function can only be called once", "Yes — that''s the whole point, one definition, many different calls", "Only if the inputs are identical each time"]',
     1, 'Reusability with different inputs is exactly what makes functions useful.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'functions-reusable-logic';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does a for loop do?',
     '["Runs a block of code once for every item in a collection", "Deletes items from a list", "Only runs if a condition is False", "Creates a new function"]',
     0, 'A for loop repeats its indented code once per item in whatever it''s looping over.'),
    (2, 'scores = [8, 5, 3, 7]; for s in scores: print(s) — how many times does print run?',
     '["1", "3", "4", "It depends on the values"]',
     2, 'The loop runs once per item in the list, and there are 4 items.'),
    (3, 'What''s the main use case for a while loop instead of a for loop?',
     '["When you know exactly how many items are in a list", "When you want to repeat something as long as a condition stays True, and don''t know the exact count in advance", "while loops are always faster"]',
     1, 'while loops are ideal when the number of repetitions isn''t known ahead of time.'),
    (4, 'In "for s in scores:", what does s represent?',
     '["The whole list", "The current item in the loop, one at a time", "A fixed number", "The loop''s name"]',
     1, 's is reassigned to the next item in scores on each pass through the loop.'),
    (5, 'scores=[8,5,3,7]; for s in scores: if s>=5: print("Pass") else: print("Retry") — how many times does "Retry" print?',
     '["0", "1", "2", "4"]',
     1, 'Only 3 is less than 5 among [8, 5, 3, 7], so "Retry" prints exactly once.'),
    (6, 'Why is a loop better than writing the same if/else check 4 separate times for 4 values?',
     '["It isn''t better, they''re identical", "One block of logic automatically applies to every item, so adding a 5th item needs no new code", "Loops only work with numbers"]',
     1, 'A loop scales automatically — the list can grow without the code needing to change.'),
    (7, 'What would happen if you forgot to indent the code inside a for loop in Python?',
     '["Nothing, indentation doesn''t matter in Python", "Python would raise an error, since indentation defines what''s inside the loop", "It would just run faster"]',
     1, 'Python uses indentation (not braces) to define code blocks, so incorrect indentation causes a syntax error.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'loops-repeating-actions';
