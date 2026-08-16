-- Lessons feature corrective migration — confirmed against the LIVE database
-- via direct query (not migration-file history, which turned out to be
-- unreliable here — see below), same discipline as the community_staff
-- Tier-0 fix earlier this session, but the drift here goes much further.
--
-- What was actually confirmed live, by running diagnostic queries directly:
--   - lessons: only 31 of the intended 40 rows exist. Missing: 3 Module-2
--     lessons (classification-vs-regression, ml-workflow-step-by-step,
--     how-do-we-know-a-model-is-good) and the entire 6-lesson "Code
--     Fundamentals" module. Modules 4/5/6 still hold their ORIGINAL
--     pre-renumber content (Build Your Own Chatbot / AI Agents / Responsible
--     AI) — the "insert Code Fundamentals as module 4, shift the rest to
--     5/6/7" migrations never reached the live database.
--   - lesson_content: exactly 31 rows — every EXISTING lesson has full
--     content, nothing is a half-written stub. Only the 9 missing lessons
--     need content backfilled.
--   - get_lesson_content / get_quiz_questions (live, via pg_get_functiondef):
--     the OLD versions — no "lazily bootstrap the first lesson" logic at
--     all. Both RAISE EXCEPTION 'This lesson has not been unlocked yet' for
--     ANY lesson with no pre-existing lesson_progress row.
--   - submit_lesson_quiz (live, via pg_get_functiondef): a version that
--     doesn't match ANY single migration file in this repo — a hybrid that
--     grants lesson_coin (10) AND a forge_coin_grant bonus (15/25) AND a
--     forge_key every 3rd lesson simultaneously, uses a hardcoded score>=5
--     threshold, has no advisory lock, always returns every explanation
--     regardless of pass/fail, and — critically — never inserts a
--     lesson_progress row for the next lesson.
--   - unlock_lesson: still exists live, dead code (current LessonsPanel.tsx
--     never calls it).
--   - lesson_progress: 0 rows. Nobody has ever successfully unlocked a
--     lesson, of any kind, ever — confirmed, not assumed.
--
-- Net effect: with no bootstrap path for the first lesson and no auto-unlock
-- of any lesson after it, the Lessons feature is 0% functional on live —
-- every participant hits "This lesson has not been unlocked yet" the
-- instant they click the one lesson that's supposed to be open by default.
--
-- The migration-file history in this repo does NOT reliably describe how
-- the live database got here — the live submit_lesson_quiz body doesn't
-- match any file, meaning at least one direct/out-of-band change happened
-- outside this migrations folder. So this migration doesn't try to replay
-- history; it forces the database directly to the state the CURRENT
-- LessonsPanel.tsx frontend code actually needs, verified against live
-- queries. Every DDL/DML statement is idempotent — safe to run again even
-- if some of this partially lands on a future retry.

-- ── 1. Add the 3 missing Module 2 lessons ──
-- Guarded on a slug that would already exist if this block previously ran —
-- the order_index shifts below are NOT independently safe to re-run, so the
-- whole block must be skip-or-run-once together.
DO $mod2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE slug = 'classification-vs-regression') THEN
    -- Make room at order_index 11-13 (safe +1000/-997 offset trick, avoids
    -- colliding with the UNIQUE order_index constraint mid-update).
    UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= 11;
    UPDATE public.lessons SET order_index = order_index - 997 WHERE order_index >= 1011;

    INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published) VALUES
    (2, 11, 'Classification vs. Regression', 'classification-vs-regression', 'Spam-or-not vs. predicting a price — two fundamentally different kinds of problems.', 10, true),
    (2, 12, 'The ML Workflow, Step by Step', 'ml-workflow-step-by-step', 'Collect, clean, split, train, evaluate, deploy — walked through on one real example.', 10, true),
    (2, 13, 'How Do We Know a Model Is Good?', 'how-do-we-know-a-model-is-good', 'Why 99% accuracy can still mean a useless model.', 10, true);

    INSERT INTO public.lesson_content (lesson_id, content)
    SELECT id, '{
      "hook": "Ask a model ''is this spam?'' and ask a model ''what will this house sell for?'' — these sound similar, but they''re fundamentally different types of problems, and mixing them up is a classic beginner mistake.",
      "explanation": "Within supervised learning, almost every problem falls into one of two categories. Classification predicts a category — a label from a fixed, limited set of options: spam or not spam, cat or dog or bird, positive or negative review. The output is discrete — one of a small number of possible ''buckets.'' Regression predicts a continuous number — a value that could be almost anything within a range: a house price, tomorrow''s temperature, how many minutes until your delivery arrives. Why does this distinction matter practically? Because it changes how you build and evaluate the model. Classification models are typically judged by accuracy (what percent of predictions were exactly right?) — you''re either right or wrong. Regression models are judged by how CLOSE the prediction was to the true number (being off by $500 on a house price is a lot better than being off by $500,000, even though both are technically ''wrong''). One of the first practical questions to ask when building any AI system is: ''am I trying to sort things into categories, or predict a number?''",
      "analogy": "Classification is like a bouncer at a club checking IDs and sorting people into ''let in'' or ''turn away'' — a small, fixed set of outcomes. Regression is like a fortune teller estimating exactly how many minutes you''ll wait in line — a specific number that could be 3 minutes, 47 minutes, or anything in between.",
      "fun_fact": "Some real-world systems combine both: a self-driving car''s AI might use classification to decide ''is that a pedestrian, a car, or a traffic cone?'' while simultaneously using regression to predict the exact distance and speed needed to react safely.",
      "try_it": "Pick 3 things you might want an AI to predict (test scores, whether a photo has a cat, tomorrow''s weather). For each, decide: classification (a category) or regression (a number)? You just practiced the exact judgment call ML engineers make constantly."
    }'::jsonb
    FROM public.lessons WHERE slug = 'classification-vs-regression';

    INSERT INTO public.lesson_content (lesson_id, content)
    SELECT id, '{
      "hook": "You now know what training, labels, classification, and regression are — but how do these actually fit together into one real project, start to finish? Let''s walk the entire pipeline, using one concrete example.",
      "explanation": "Here''s the real workflow, using ''predict if a movie review is positive or negative'' as our example. Step 1 — Define the problem: decide exactly what you''re predicting and why. Step 2 — Collect data: gather thousands of labeled reviews. Step 3 — Clean and prepare data: remove duplicates, fix broken entries, convert text into numbers the model can process. Step 4 — Split the data: divide labeled data into a training set (~80%) and a held-back test set (~20%) NEVER shown during training — this is a crucial, often-skipped step. Step 5 — Train the model: run the guess-check-adjust loop from earlier lessons. Step 6 — Evaluate on the held-back test set to see how it performs on examples it has genuinely never seen — the only fair way to check it learned general patterns instead of just memorizing (''overfitting,'' next lesson). Step 7 — Deploy the trained model into a real product. Step 8 — Monitor and retrain periodically, since real-world data changes over time. Skipping the train/test split (Step 4) is one of the most common beginner mistakes — testing only on memorized data always looks impressively accurate while proving nothing about real-world performance.",
      "analogy": "This pipeline is like preparing for a driving test. You study the rulebook (collect/clean data) and practice on familiar roads with an instructor correcting you (train) — but the ACTUAL test happens on a route you''ve never driven before (the held-out test set), because acing only memorized roads proves nothing.",
      "fun_fact": "Many real ML teams report spending as little as 10-20% of total project time actually ''training models'' — the rest goes to defining, collecting, cleaning, splitting, deploying, and monitoring, which rarely get talked about outside the industry.",
      "try_it": "Pick any FORGE bot idea. Walk through steps 1-3 out loud: what would you predict, what data would you need, and what cleaning would that data likely require? You just planned the first third of a real ML project."
    }'::jsonb
    FROM public.lessons WHERE slug = 'ml-workflow-step-by-step';

    INSERT INTO public.lesson_content (lesson_id, content)
    SELECT id, '{
      "hook": "A model that''s ''99% accurate'' sounds amazing — until you find out it''s diagnosing a disease that only 1% of patients actually have, and it ''achieved'' that accuracy by just guessing ''healthy'' every single time. Accuracy alone can lie to you.",
      "explanation": "Accuracy (percent of predictions exactly correct) is the most intuitive way to judge a model, but it can be dangerously misleading with ''imbalanced'' data — when one outcome is much more common than another. A model that lazily predicts ''no disease'' for EVERY patient, when only 1 in 100 actually has it, would still be 99% accurate while being completely useless at its actual job. This is why data scientists use more careful measures: Precision answers ''of everything flagged as positive, how much was actually correct?'' — important when false alarms are costly. Recall answers ''of everything actually positive, how much did the model correctly catch?'' — important when missing a real case is costly. These trade off: catching nearly everything (high recall) often means more false alarms (lower precision), and vice versa — which matters more depends on the real-world consequences of each mistake. A confusion matrix lays out all four outcomes in one table, giving a full picture a single accuracy number hides. The practical lesson: always ask what a model is actually being measured against, not just whether the headline number sounds impressive.",
      "analogy": "Imagine a smoke detector that NEVER goes off, ever — not even during a real fire. Since real fires are rare, that broken detector would be ''accurate'' (correctly silent) the overwhelming majority of the time — but catastrophically useless at the one thing that matters: catching real fires.",
      "fun_fact": "In medical AI research, some early diagnostic models reported headline-grabbing ''95%+ accuracy'' that turned out to be nearly worthless in practice, because the disease being tested for was rare — almost identical to a model that just always guesses ''healthy.''",
      "try_it": "Think of a FORGE bot task where being wrong in one direction (falsely saying yes) is way worse than being wrong the other way (falsely saying no). Notice how ''just be accurate'' doesn''t fully capture what you''d actually want."
    }'::jsonb
    FROM public.lessons WHERE slug = 'how-do-we-know-a-model-is-good';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What does a classification model predict?', '["A continuous number with infinite possible values", "A category from a fixed, limited set of options", "Nothing — classification models don''t make predictions", "The exact training data used"]', 1, 'Classification predicts discrete categories, like spam/not-spam or cat/dog/bird.'),
        (2, 'What does a regression model predict?', '["A fixed category only", "A continuous number that can take many possible values", "A yes/no answer only", "The name of the training dataset"]', 1, 'Regression predicts continuous numeric values, like a price or temperature.'),
        (3, 'Predicting whether an email is "spam" or "not spam" is an example of:', '["Regression", "Classification", "Neither supervised nor unsupervised learning", "Dimensionality reduction"]', 1, 'Spam/not-spam is a fixed category choice — a classic classification task.'),
        (4, 'Predicting the exact price a house will sell for is an example of:', '["Classification", "Regression", "Clustering", "Unsupervised learning only"]', 1, 'A house price is a continuous number, making this a regression task.'),
        (5, 'How are classification models typically evaluated?', '["By how many gigabytes they use", "By accuracy — the percentage of predictions that were exactly correct", "They cannot be evaluated at all", "By how fast the computer''s fan spins"]', 1, 'Classification accuracy measures the percentage of exactly-correct category predictions.'),
        (6, 'Why does regression evaluation care about "how close" a prediction was, not just right/wrong?', '["Because regression outputs are numbers, and being off by a little is very different from being off by a lot", "Because regression models are never wrong", "Closeness doesn''t matter in regression at all", "Regression only ever predicts exactly two possible values"]', 0, 'Since regression predicts continuous numbers, the size of the error matters, not just an exact match.'),
        (7, 'In the bouncer/fortune-teller analogy, what does the fortune teller estimating wait time represent?', '["Classification", "Regression", "Unsupervised clustering", "Data cleaning"]', 1, 'Estimating a specific number (minutes of wait) mirrors a regression task.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'classification-vs-regression';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What is the purpose of splitting data into a training set and a separate test set?', '["To make the dataset file smaller for storage", "To fairly evaluate the model on examples it has never seen during training", "Test sets are not actually necessary", "To speed up training time only"]', 1, 'A held-out test set lets you check if the model generalizes, not just memorizes training examples.'),
        (2, 'What is a common beginner mistake related to the train/test split?', '["Splitting data at all", "Testing a model only on data it already saw during training, making results look artificially good", "Using too much test data", "Skipping data collection entirely"]', 1, 'Testing on already-seen training data inflates apparent accuracy and hides real-world performance.'),
        (3, 'In the movie review example, what would Step 1 ("define the problem") establish?', '["The exact server hardware to use", "That this is a classification task predicting positive/negative sentiment", "The company''s marketing budget", "Nothing important"]', 1, 'Step 1 clarifies exactly what''s being predicted and why.'),
        (4, 'Why does a deployed model need ongoing monitoring and occasional retraining?', '["It never actually needs this", "Real-world data changes over time, so models can become less accurate if never updated", "Monitoring is purely for legal reasons only", "Retraining is illegal after deployment"]', 1, 'Language, trends, and behavior shift over time, so models benefit from periodic retraining.'),
        (5, 'Roughly what share of an ML project''s total time is often spent on the "training" step itself?', '["Almost 100%", "As little as 10-20%", "Exactly 50%", "0%, training is instant"]', 1, 'Most real project time goes to data work and deployment/monitoring, not training itself.'),
        (6, 'In the driving test analogy, what does "practicing on familiar roads with an instructor" represent?', '["The test set", "The training phase", "Deployment", "Data collection only"]', 1, 'Guided practice with correction mirrors the training phase.'),
        (7, 'What is typically the last step in the ML workflow described in this lesson?', '["Collecting data", "Monitor and retrain the deployed model over time", "Defining the problem", "Cleaning the data"]', 1, 'Monitoring and retraining after deployment is the final, ongoing step.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'ml-workflow-step-by-step';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'Why can accuracy alone be a misleading measure of model quality?', '["Accuracy is always a perfect measure with no flaws", "With imbalanced data, a model can score high accuracy by always guessing the common outcome", "Accuracy cannot be calculated mathematically", "Accuracy only applies to regression, never classification"]', 1, 'When one outcome is rare, always guessing the common outcome can produce misleadingly high accuracy.'),
        (2, 'What does "precision" measure?', '["How fast the model runs", "Of everything flagged as positive, how much was actually correct", "The total size of the training dataset", "How many layers are in the neural network"]', 1, 'Precision measures the correctness of positive predictions specifically.'),
        (3, 'What does "recall" measure?', '["Of everything that was actually positive, how much did the model correctly catch", "The model''s memory storage capacity", "How many times the model was retrained", "The average response length"]', 0, 'Recall measures how many of the real positive cases the model actually caught.'),
        (4, 'In the smoke detector analogy, what does a detector that "never goes off" represent?', '["A model with perfect recall", "A model with high accuracy but useless recall on the rare, important case (real fires)", "The ideal model design", "A model with perfect precision and recall"]', 1, 'It would score high on raw accuracy while completely failing at catching real fires.'),
        (5, 'What is a "confusion matrix" used for?', '["Confusing the model on purpose", "Laying out correctly/incorrectly flagged positives and negatives in one clear table", "Deleting incorrect predictions", "Training the model faster"]', 1, 'A confusion matrix shows the full breakdown of outcomes.'),
        (6, 'Why might precision and recall trade off against each other?', '["They never actually trade off", "Flagging more aggressively can raise recall but lower precision, and vice versa", "Precision and recall measure the exact same thing", "Only regression models have this tradeoff"]', 1, 'Being more aggressive about flagging positives tends to raise recall while lowering precision.'),
        (7, 'What is the main practical takeaway of this lesson?', '["Always trust the single accuracy number without question", "Always ask what a model''s measurement actually reflects about real-world consequences", "Accuracy is the only metric that ever matters", "Rare events don''t need careful measurement"]', 1, 'The lesson''s core point is to critically examine what a metric actually captures.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'how-do-we-know-a-model-is-good';
  END IF;
END $mod2$;

-- ── 2. Renumber modules 4/5/6 → 5/6/7, insert the 6 missing Code
-- Fundamentals lessons as the new module 4 ──
DO $mod4$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE slug = 'variables-and-values') THEN
    -- Make room at order_index 20-25 for the 6 new lessons.
    UPDATE public.lessons SET order_index = order_index + 1000 WHERE order_index >= 20;
    UPDATE public.lessons SET order_index = order_index - 994 WHERE order_index >= 1020;
    -- Shift the existing chatbot/agent/ethics modules up to make room for
    -- the new "Code Fundamentals" module 4.
    UPDATE public.lessons SET module_number = module_number + 1 WHERE module_number IN (4, 5, 6);

    INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published) VALUES
    (4, 20, 'Variables & Values', 'variables-and-values', 'Storing information with named containers — the first building block of any program.', 10, true),
    (4, 21, 'Data Structures: Lists & Dictionaries', 'data-structures-lists-dicts', 'Organizing more than one value at a time, the way real code (and your chatbot''s knowledge base) does.', 10, true),
    (4, 22, 'Conditionals: Teaching Code to Decide', 'conditionals-if-else', 'if / elif / else — how code makes different decisions in different situations.', 10, true),
    (4, 23, 'Functions: Reusable Logic', 'functions-reusable-logic', 'Writing logic once and reusing it everywhere, instead of copy-pasting.', 10, true),
    (4, 24, 'Loops: Doing Things Automatically', 'loops-repeating-actions', 'Repeating an action across every item in a list, automatically.', 10, true),
    (4, 25, 'F-Strings & String Formatting', 'f-strings-string-formatting', 'The shortcut for combining variables and text — used everywhere in the real FORGE IDE.', 10, true);

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
        "check_pattern": "favorite_topic\\s*=\\s*[\"''][^\"'']+[\"'']",
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
        "check_pattern": "else\\s*:\\s*print\\([^)]*(retry|try\\s*again)[^)]*\\)",
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
        "check_pattern": "def\\s+welcome\\s*\\([^)]*\\)\\s*:\\s*return\\s+.*(\\+\\s*name\\b|\\bname\\s*\\+|\\{name\\})",
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
        "check_pattern": "for\\s+s\\s+in\\s+scores\\s*:",
        "success_message": "Your loop will now run once for every score in the list!",
        "hint": "Write: for s in scores:  (do not forget the colon at the end!)"
      },
      "fun_fact": "Every time FORGE''s leaderboard re-ranks every participant, or a quiz checks all 7 answers against the correct ones, that''s a loop running behind the scenes — one pass, applied to every item, automatically.",
      "try_it": "Describe one repetitive task in FORGE (checking submissions, scoring quizzes, listing lessons) that a loop would make way faster than doing it by hand."
    }'::jsonb
    FROM public.lessons WHERE slug = 'loops-repeating-actions';

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
        "check_pattern": "greeting2\\s*=\\s*f[\"''][^\"'']*\\{name\\}[^\"'']*[\"'']",
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
        (1, 'What does the "=" sign do in a line like age = 17?', '["Checks if two things are equal", "Stores the value 17 under the name age", "Prints the number 17", "Deletes the variable age"]', 1, 'In Python, "=" is assignment, not equality — it stores the value on the right under the name on the left.'),
        (2, 'Which of these is a valid Python variable assignment?', '["17 = age", "age == 17", "age = 17", "age -> 17"]', 2, 'The variable name goes on the left, "=" in the middle, and the value on the right.'),
        (3, 'What type of value is "Ava" (with quotes) in Python?', '["Integer", "Boolean", "String", "Float"]', 2, 'Text wrapped in quotes is a string — Python''s type for words and sentences.'),
        (4, 'What will print(is_registered) output if is_registered = True?', '["True", "1", "\"True\" (with quotes)", "Error"]', 0, 'Booleans print as True or False, without quotes.'),
        (5, 'What happens when you run: score = 10, then score = score + 5?', '["score becomes 15", "score stays 10", "This causes an error", "score becomes 5"]', 0, 'Python reads the current value of score (10), adds 5, and stores the new result (15) back under the same name.'),
        (6, 'Why might a program crash if you try to add a string and an integer directly, like "5" + 3?', '["Python doesn''t support addition", "The two values have different types, and Python won''t automatically combine them", "3 is too large a number"]', 1, 'Python is strict about mixing types like this — you''d need to convert one of them first.'),
        (7, 'What''s a good reason to use a variable instead of typing a value repeatedly?', '["It makes the code run faster on every computer", "You can update the value in one place and reuse the name everywhere else", "Python requires all values to be stored in variables"]', 1, 'Variables centralize a value so changing it once updates everywhere it''s used.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'variables-and-values';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What symbol is used to create a list in Python?', '["{} curly braces", "[] square brackets", "() parentheses", "<> angle brackets"]', 1, 'Square brackets define a list, like ["AI", "ML", "agents"].'),
        (2, 'What does list indexing start at in Python?', '["0", "1", "-1", "It depends on the list"]', 0, 'Python lists are zero-indexed — the first item is at position 0.'),
        (3, 'topics = ["AI", "ML", "agents"] — what does topics[2] return?', '["AI", "ML", "agents", "Error"]', 2, 'Position 0 is "AI", position 1 is "ML", position 2 is "agents".'),
        (4, 'What data structure uses key-value pairs instead of positions?', '["List", "Dictionary", "Variable", "Boolean"]', 1, 'A dictionary looks up values by a named key, not a numeric position.'),
        (5, 'bot = {"name": "Kip"} — how do you get the value "Kip"?', '["bot[0]", "bot.name", "bot[\"name\"]", "bot(\"name\")"]', 2, 'Dictionary values are accessed with square brackets and the key in quotes.'),
        (6, 'What does len(topics) return for topics = ["AI", "ML", "agents"]?', '["The first item", "The last item", "The number of items in the list (3)", "An error"]', 2, 'len() returns the count of items in a list.'),
        (7, 'Why would you choose a dictionary over a list to represent a chatbot''s settings (name, tone, coin_cost)?', '["Dictionaries are always faster", "Named keys make it clear what each value represents, instead of relying on remembering positions", "Lists can''t store text"]', 1, 'Named keys are self-documenting — bot["name"] is clearer than remembering that position 0 means the name.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'data-structures-lists-dicts';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What does "elif" stand for in Python?', '["''Else if'' — check another condition if the first was False", "''End if'' — closes the if block", "''Equal if'' — checks for equality only", "It''s not a real keyword"]', 0, 'elif lets you check an additional condition only if the earlier ones were False.'),
        (2, 'In an if/elif/else chain, how many blocks can actually run?', '["All of them, every time", "Exactly one — the first condition that matches", "None unless explicitly called", "It depends on the operating system"]', 1, 'Python stops at the first True condition and skips the rest of the chain.'),
        (3, 'score = 6. if score >= 7: print("A") / elif score >= 5: print("B") / else: print("C") — what prints?', '["A", "B", "C", "A and B"]', 1, '6 fails the first check (>=7) but passes the second (>=5), so "B" prints.'),
        (4, 'What happens if none of the if/elif conditions are True and there''s an else block?', '["Nothing happens", "Python throws an error", "The else block runs", "All blocks run"]', 2, 'else is the fallback that runs only when every prior condition was False.'),
        (5, 'Why use elif instead of writing several separate if statements?', '["elif is required by Python syntax", "elif ensures only one matching block runs instead of checking every condition independently", "There''s no real difference"]', 1, 'Separate if statements are each checked independently and could all run; elif chains stop after the first match.'),
        (6, 'Which condition would be True for a variable temp = 72?', '["temp > 100", "temp >= 70", "temp == 0", "temp < 0"]', 1, '72 is greater than or equal to 70, so that condition evaluates to True.'),
        (7, 'A chatbot needs to reply differently to greetings, pricing questions, and everything else. Which structure fits best?', '["A single variable", "An if/elif/else chain checking the type of question", "A list with no logic"]', 1, 'Multiple distinct outcomes based on a condition is exactly what if/elif/else is designed for.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'conditionals-if-else';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What keyword defines a function in Python?', '["func", "define", "def", "function"]', 2, 'Functions are defined with the def keyword, followed by a name and parentheses.'),
        (2, 'What is a parameter in a function?', '["A fixed value that never changes", "A placeholder input the function receives when called", "The function''s name", "An error message"]', 1, 'Parameters are named placeholders that get filled in with real values at call time.'),
        (3, 'def greet(name): return "Hey " + name + "!" — what does greet("Sam") return?', '["Hey name!", "Hey Sam!", "Error", "Nothing"]', 1, 'The name parameter is filled with "Sam", producing "Hey Sam!".'),
        (4, 'What''s the main difference between return and print inside a function?', '["There''s no difference", "return sends a value back for use elsewhere in the program; print only displays it on screen", "print is faster than return"]', 1, 'return hands a usable value back to whatever called the function; print just shows text and gives nothing back.'),
        (5, 'Why write a function instead of repeating the same code in multiple places?', '["Python requires it", "One reusable, testable place for the logic instead of duplicated code that has to be fixed everywhere if it changes", "Functions make code run on any device"]', 1, 'Centralizing logic in one function means a fix or change only needs to happen once.'),
        (6, 'def add(a, b): return a + b — what does add(3, 4) return?', '["34", "7", "\"3 + 4\"", "Error"]', 1, 'a becomes 3 and b becomes 4, so a + b returns 7.'),
        (7, 'Can the same function be called multiple times with different inputs?', '["No, each function can only be called once", "Yes — that''s the whole point, one definition, many different calls", "Only if the inputs are identical each time"]', 1, 'Reusability with different inputs is exactly what makes functions useful.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'functions-reusable-logic';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What does a for loop do?', '["Runs a block of code once for every item in a collection", "Deletes items from a list", "Only runs if a condition is False", "Creates a new function"]', 0, 'A for loop repeats its indented code once per item in whatever it''s looping over.'),
        (2, 'scores = [8, 5, 3, 7]; for s in scores: print(s) — how many times does print run?', '["1", "3", "4", "It depends on the values"]', 2, 'The loop runs once per item in the list, and there are 4 items.'),
        (3, 'What''s the main use case for a while loop instead of a for loop?', '["When you know exactly how many items are in a list", "When you want to repeat something as long as a condition stays True, and don''t know the exact count in advance", "while loops are always faster"]', 1, 'while loops are ideal when the number of repetitions isn''t known ahead of time.'),
        (4, 'In "for s in scores:", what does s represent?', '["The whole list", "The current item in the loop, one at a time", "A fixed number", "The loop''s name"]', 1, 's is reassigned to the next item in scores on each pass through the loop.'),
        (5, 'scores=[8,5,3,7]; for s in scores: if s>=5: print("Pass") else: print("Retry") — how many times does "Retry" print?', '["0", "1", "2", "4"]', 1, 'Only 3 is less than 5 among [8, 5, 3, 7], so "Retry" prints exactly once.'),
        (6, 'Why is a loop better than writing the same if/else check 4 separate times for 4 values?', '["It isn''t better, they''re identical", "One block of logic automatically applies to every item, so adding a 5th item needs no new code", "Loops only work with numbers"]', 1, 'A loop scales automatically — the list can grow without the code needing to change.'),
        (7, 'What would happen if you forgot to indent the code inside a for loop in Python?', '["Nothing, indentation doesn''t matter in Python", "Python would raise an error, since indentation defines what''s inside the loop", "It would just run faster"]', 1, 'Python uses indentation (not braces) to define code blocks, so incorrect indentation causes a syntax error.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'loops-repeating-actions';

    INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
    SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
    FROM public.lessons, LATERAL (
      VALUES
        (1, 'What does the f right before a string do in Python?', '["Nothing, it is optional and has no effect", "Tells Python to substitute variables written inside curly braces", "Makes the string uppercase", "Marks the string as a comment"]', 1, 'The f prefix turns a normal string into an f-string, which substitutes any {variable} inside it.'),
        (2, 'name = "Sam"; print(f"Hi {name}") — what does this print?', '["Hi {name}", "Hi Sam", "Hi name", "Error"]', 1, 'The f-string replaces {name} with the current value of the name variable, "Sam".'),
        (3, 'Which of these produces the exact same output as f"Hey {name}!"?', '["\"Hey \" + name + \"!\"", "\"Hey {name}!\"", "f + \"Hey name!\""]', 0, 'String concatenation with + and an f-string can build the identical final text — the f-string is just a shorter way to write it.'),
        (4, 'What symbol wraps a variable name inside an f-string?', '["[] square brackets", "{} curly braces", "() parentheses", "<> angle brackets"]', 1, 'Curly braces mark the spot where a variable value gets substituted in.'),
        (5, 'Why might a developer prefer an f-string over string concatenation with +?', '["f-strings are required by Python, concatenation is not allowed", "f-strings are usually shorter and easier to read, especially with multiple variables", "There is no real difference"]', 1, 'Both work, but f-strings scale much better once you are combining several variables into one string.'),
        (6, 'age = 17; f"I am age years old" (no curly braces around age) — what happens?', '["It prints: I am 17 years old", "It prints the literal text: I am age years old", "It throws an error"]', 1, 'Without curly braces, "age" is treated as plain text, not a variable reference — Python has no way to know you meant the variable.'),
        (7, 'In what year were f-strings added to Python?', '["1991", "2016", "2020"]', 1, 'F-strings were introduced in Python 3.6, released in 2016.')
    ) AS q(order_index, question, options, correct_index, explanation)
    WHERE lessons.slug = 'f-strings-string-formatting';
  END IF;
END $mod4$;

-- ── 3. Replace get_lesson_content / get_quiz_questions with the version
-- that lazily bootstraps the first lesson — this is the missing piece that
-- made the ENTIRE feature unreachable (0 rows in lesson_progress, live) ──
CREATE OR REPLACE FUNCTION public.get_lesson_content(p_participant_email TEXT, p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
  v_content JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT id FROM public.lessons WHERE is_published = true ORDER BY order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  SELECT content INTO v_content FROM public.lesson_content WHERE lesson_id = p_lesson_id;
  RETURN v_content;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_content(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_content(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_participant_email TEXT, p_lesson_id UUID)
RETURNS TABLE (id UUID, order_index INTEGER, question TEXT, options JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id
  ) INTO v_unlocked;

  IF NOT v_unlocked THEN
    SELECT (p_lesson_id = (SELECT id FROM public.lessons WHERE is_published = true ORDER BY order_index ASC LIMIT 1))
      INTO v_is_first;
    IF v_is_first THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, p_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
      v_unlocked := true;
    END IF;
  END IF;

  IF NOT v_unlocked THEN
    RAISE EXCEPTION 'This lesson has not been unlocked yet';
  END IF;

  RETURN QUERY
  SELECT q.id, q.order_index, q.question, q.options
  FROM public.lesson_quiz_questions q
  WHERE q.lesson_id = p_lesson_id
  ORDER BY q.order_index;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(TEXT, UUID) TO anon, authenticated;

-- ── 4. Replace submit_lesson_quiz with the real final design — the live
-- version's return type (7 columns, including a leftover key_awarded) can't
-- be reached via CREATE OR REPLACE since it's removing/reordering columns,
-- not just appending — DROP + CREATE like every other signature change ──
DROP FUNCTION IF EXISTS public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]);

CREATE FUNCTION public.submit_lesson_quiz(
  p_participant_email TEXT,
  p_hackathon_id UUID,
  p_lesson_id UUID,
  p_answers INTEGER[]
)
RETURNS TABLE (score INTEGER, total INTEGER, passed BOOLEAN, bonus_coins_awarded INTEGER, correct_flags BOOLEAN[], explanations TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_idx INTEGER := 1;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_pass_threshold INTEGER;
  v_passed_now BOOLEAN;
  v_flags BOOLEAN[] := ARRAY[]::BOOLEAN[];
  v_explanations TEXT[] := ARRAY[]::TEXT[];
  v_was_passed BOOLEAN;
  v_lesson_coins INTEGER := 0;
  v_current_order INTEGER;
  v_next_lesson_id UUID;
BEGIN
  -- Race-condition guard: two concurrent submissions for the same
  -- participant (double-click, two tabs) now queue instead of both reading
  -- stale pre-commit state.
  PERFORM pg_advisory_xact_lock(hashtext(p_participant_email));

  SELECT COUNT(*) INTO v_total FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id;
  v_pass_threshold := CEIL(v_total * 5.0 / 7);

  FOR v_question IN
    SELECT correct_index, explanation FROM public.lesson_quiz_questions WHERE lesson_id = p_lesson_id ORDER BY order_index
  LOOP
    IF p_answers[v_idx] IS NOT NULL AND p_answers[v_idx] = v_question.correct_index THEN
      v_score := v_score + 1;
      v_flags := v_flags || true;
    ELSE
      v_flags := v_flags || false;
    END IF;
    v_explanations := v_explanations || COALESCE(v_question.explanation, '');
    v_idx := v_idx + 1;
  END LOOP;

  v_passed_now := (v_score >= v_pass_threshold);

  -- Answer-leak guard: on a failing attempt, withhold the explanation for
  -- any question answered wrong (retakes are free/unlimited by design, so a
  -- throwaway attempt otherwise doubles as a way to read the answer key).
  IF NOT v_passed_now THEN
    FOR v_idx IN 1..array_length(v_explanations, 1) LOOP
      IF NOT v_flags[v_idx] THEN
        v_explanations[v_idx] := '';
      END IF;
    END LOOP;
  END IF;

  SELECT passed INTO v_was_passed FROM public.lesson_progress WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;
  IF v_was_passed IS NULL THEN
    RAISE EXCEPTION 'Lesson has not been unlocked yet';
  END IF;

  UPDATE public.lesson_progress
  SET attempts = attempts + 1,
      best_score = GREATEST(best_score, v_score),
      passed = passed OR v_passed_now,
      completed_at = CASE WHEN passed OR v_passed_now THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE participant_email = p_participant_email AND lesson_id = p_lesson_id;

  IF NOT v_was_passed AND v_passed_now THEN
    -- Flat reward, first pass only — a lesson that's already passed can't
    -- retrigger this via retakes, so there's no grinding it.
    v_lesson_coins := 10;
    INSERT INTO public.point_events (participant_email, event_type, points, hackathon_id, metadata)
    VALUES (p_participant_email, 'lesson_coin', v_lesson_coins, p_hackathon_id, jsonb_build_object('reason', 'lesson_complete', 'lesson_id', p_lesson_id));

    -- Auto-unlock the next lesson in sequence — the actual mechanism behind
    -- "only the first lesson starts open, passing unlocks the next one".
    -- This was the specific piece missing from the live database that made
    -- it impossible for anyone to ever progress past lesson 1.
    SELECT order_index INTO v_current_order FROM public.lessons WHERE id = p_lesson_id;
    SELECT id INTO v_next_lesson_id FROM public.lessons
      WHERE is_published = true AND order_index > v_current_order
      ORDER BY order_index ASC LIMIT 1;
    IF v_next_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_progress (participant_email, lesson_id)
      VALUES (p_participant_email, v_next_lesson_id)
      ON CONFLICT (participant_email, lesson_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_score, v_total, v_passed_now, v_lesson_coins, v_flags, v_explanations;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(TEXT, UUID, UUID, INTEGER[]) TO anon, authenticated;

-- ── 5. unlock_lesson is fully superseded — nothing costs coins anymore,
-- confirmed unreachable from the current LessonsPanel.tsx — drop it so it
-- can't be called directly against the API as a leftover coin-spend path ──
DROP FUNCTION IF EXISTS public.unlock_lesson(TEXT, UUID, UUID);

-- ── 6. Re-assert the point_events insert blocklist (defensive — the live
-- policy's exact current state is unverified given everything else that
-- drifted, and this is a cheap, safe no-op if already correct) ──
DROP POLICY IF EXISTS "Public can insert engagement point events" ON public.point_events;
CREATE POLICY "Public can insert engagement point events"
ON public.point_events
FOR INSERT
WITH CHECK (event_type NOT IN ('forge_coin_grant', 'forge_coin_adjust', 'daily_challenge_sp', 'forge_key', 'badge_award', 'boost_token', 'judge_score', 'lesson_coin'));

-- ── 7. Re-assert the quiz-answer-key lockdown (confirmed already correct
-- live via has_table_privilege(), re-asserted here anyway for the same
-- "don't trust file history, make the end state explicit" reason as
-- everything else in this migration) ──
REVOKE SELECT ON public.lesson_quiz_questions FROM anon, authenticated;
