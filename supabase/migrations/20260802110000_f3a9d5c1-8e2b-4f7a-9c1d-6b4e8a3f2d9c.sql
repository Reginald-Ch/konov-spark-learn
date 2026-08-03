-- Module 2 (Machine Learning Fundamentals) depth pass: same treatment as
-- Module 1 — adds 3 practical lessons (Classification vs. Regression, The ML
-- Workflow Step by Step, How Do We Know a Model Is Good?) and writes full
-- content + 7-question quizzes for the 5 existing stubs. Curriculum is now
-- 37 lessons. Content goes into lesson_content (not lessons.content, which
-- was dropped in the previous migration when we locked down unpublished
-- content from being publicly readable).

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

UPDATE public.lessons SET is_published = true WHERE slug IN ('data-fuel-of-ai', 'training-vs-predicting', 'supervised-learning', 'unsupervised-learning', 'when-ai-gets-it-wrong');

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Every AI model is only as good as what it learned from. Feed it bad data, and even the smartest algorithm produces garbage — this is the single most important lesson in this whole module.",
  "explanation": "Data is the raw material machine learning is built from. Good training data needs to be: Relevant — actually related to the task. Sufficient — enough examples to reveal real patterns, not flukes. Representative — covering the full range of real situations it will face, not just the easy or common ones; a face-recognition model trained mostly on one skin tone performs worse on others, a genuine, well-documented cause of AI bias you''ll explore more in Module 6. Clean — free of errors, duplicates, and mislabeled examples, since a model can''t tell ''wrong label'' from ''true pattern'' — it just learns whatever it''s shown. The industry saying is ''garbage in, garbage out'' (GIGO). Data scientists often spend 60-80% of their actual working time collecting and cleaning data — not the glamorous ''training the AI'' part — because everything downstream depends on getting this right first.",
  "analogy": "Imagine studying for a history exam using only 5 flashcards, all about ancient Rome, with 2 containing typos with wrong dates. No matter how good a studier you are, you''ll walk in under-prepared and confidently wrong on parts you never saw. A model is in exactly that position with bad data.",
  "fun_fact": "ImageNet, one of the most famous datasets in AI history, contains over 14 million hand-labeled images and took years of human effort to build — it became the training ground that helped launch the modern deep learning boom in 2012.",
  "try_it": "Think about a FORGE bot you''ve built. List 3 topics it would probably answer badly on, simply because you never gave it knowledge base info about them. That gap is ''data'' determining what an AI can and can''t do."
}'::jsonb
FROM public.lessons WHERE slug = 'data-fuel-of-ai';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "''Training'' and ''using'' an AI model are two completely different phases, running at completely different times. Mixing these up is one of the most common beginner misconceptions.",
  "explanation": "Training is the (often slow, expensive) process of showing a model many examples so it adjusts its parameters — this can take minutes for a tiny model or months for a massive one. Inference (''predicting'') is the (usually fast, cheap) process of using an already-trained model on new input — this is what happens every time you message your FORGE chatbot: it isn''t learning in that moment, it''s applying everything it already learned during training. Once training finishes, the model''s parameters are frozen unless someone deliberately retrains it. This is why a chatbot can ''forget'' something from a previous conversation — unless a system saves that context and feeds it back in, the model itself hasn''t learned anything new; it''s just reading whatever history got included in this particular prompt.",
  "analogy": "Training is like a student studying for years to become a doctor. Inference is that doctor diagnosing a patient in a 15-minute appointment, using everything they learned, without re-attending medical school each time. The appointment doesn''t make them a better doctor going forward — it''s just applying already-built knowledge.",
  "fun_fact": "Training GPT-3 was estimated to cost several million dollars in computing costs alone — but once trained, answering a single question (inference) costs a tiny fraction of a cent.",
  "try_it": "Next time you chat with a FORGE bot, notice: does it remember something from 10 messages ago in the SAME conversation, but forget it entirely in a brand new one? That''s inference using conversation context, not the model ''learning'' permanently."
}'::jsonb
FROM public.lessons WHERE slug = 'training-vs-predicting';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "If you''ve ever studied using flashcards with the answer on the back, you''ve already done supervised learning yourself — it''s the same core idea.",
  "explanation": "Supervised learning trains a model on labeled data — examples that already come with the correct answer attached. Each training example pairs an input (''feature'') with a correct output (''label''). To train a spam filter, you''d feed it thousands of emails labeled ''spam'' or ''not spam.'' The model studies these pairs and learns the pattern connecting input to output, so later it can predict the label for a brand-new, unlabeled email. ''Supervised'' refers to this human-provided correct-answer guidance during training, like a teacher checking your work. Supervised learning powers spam filters, medical diagnosis assistance, credit approval predictions, and classification/regression tasks. Its main limitation: it needs lots of accurately labeled data, and labeling by hand is slow and expensive — exactly why unsupervised learning (next lesson) exists as an alternative.",
  "analogy": "Supervised learning is like learning dog breeds using a picture book where every photo has the breed name printed underneath. After flipping through thousands of labeled photos, you recognize patterns well enough to correctly guess the breed of a dog you''ve never seen, with no caption to help.",
  "fun_fact": "The famous ''Turing Test,'' proposed in 1950 by Alan Turing, is philosophically almost the opposite of supervised learning: it involves NO labeled correct answers, just a human judge deciding, unsupervised, whether they''re talking to a human or a machine.",
  "try_it": "Think of your FORGE bot''s QA_PAIRS — each one is literally a labeled example: a question (input) paired with the exact correct answer (label). You''ve already been doing a simplified form of supervised learning."
}'::jsonb
FROM public.lessons WHERE slug = 'supervised-learning';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "What if you don''t have labels at all — no answer key, nobody to tell the model what''s ''right''? That''s exactly the situation unsupervised learning is built for.",
  "explanation": "Unsupervised learning trains on data with NO labels — just raw examples. Instead of matching inputs to known outputs, the model finds hidden structure on its own. The most common technique is clustering: grouping similar examples together based on shared characteristics, without being told what the groups ''mean.'' An e-commerce company might feed unlabeled purchase histories into a clustering algorithm and discover natural groupings on its own — like ''weekend bargain shoppers'' versus ''weekday premium shoppers'' — patterns a human might never have thought to look for. Another major technique, dimensionality reduction, simplifies very complex data down to just the most important patterns. Unsupervised learning is powerful because unlabeled data is everywhere and cheap, while labeled data is scarce and expensive. The tradeoff: with no correct answer to check against, it''s harder to objectively measure how ''good'' the results are.",
  "analogy": "Imagine being handed a huge box of assorted, unlabeled puzzle pieces from 5 different puzzles mixed together, with no box art. You''d naturally sort pieces into piles by color and shape, without anyone telling you what each final picture is. That sorting-by-similarity with zero answer key is exactly what unsupervised clustering does.",
  "fun_fact": "Streaming services often use unsupervised clustering to discover surprising ''taste clusters'' among users that don''t match obvious categories like age — sometimes grouping teenagers and grandparents together because they share unexpectedly similar viewing patterns.",
  "try_it": "Think of your music or video app''s recommendations. Do any group things together in ways that surprised you, but made sense once you saw them together? That''s unsupervised pattern-finding at work."
}'::jsonb
FROM public.lessons WHERE slug = 'unsupervised-learning';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "AI can be shockingly confident and completely wrong at the same time. Understanding exactly HOW it fails is what separates someone who builds with AI responsibly from someone who gets blindsided by it.",
  "explanation": "Two of the most common ways AI goes wrong: Overfitting happens when a model memorizes its training data so closely that it fails on new, real-world examples — like a student who memorized exact practice test answers instead of understanding the underlying concept, and then bombs the real exam because the questions are phrased differently. You can catch overfitting exactly the way the ML Workflow lesson described: a model that scores 99% on training data but only 60% on the held-out test set is very likely overfit. Bias happens when training data doesn''t fairly represent everyone it will be used on — as covered in the Data lesson, a model trained mostly on one group performs worse on others, sometimes with serious real-world consequences (unfair loan approvals, inaccurate medical predictions for underrepresented groups). Bias isn''t usually intentional — it creeps in silently through whatever data happened to be convenient to collect. Both problems share a root cause: the model is only ever as good as, and only ever as fair as, the examples it was shown — it has no independent common sense to fall back on when it encounters something outside that experience.",
  "analogy": "Overfitting is like memorizing the answers to last year''s exact exam questions instead of learning the subject — you''ll ace a repeat of last year''s test and fail this year''s, which asks the same concepts in different words. Bias is like learning geography only from maps of your own city — you''d be an expert on your neighborhood and lost everywhere else, not because you''re a bad learner, but because your ''training data'' never covered anywhere else.",
  "fun_fact": "One widely-cited real example: an early hiring-screening AI trained mostly on resumes from a company''s past (mostly male) hires learned to downgrade resumes that included the word ''women''s'' (as in ''women''s chess club captain'') — not because anyone programmed that rule, but because the biased training data taught it that pattern anyway.",
  "try_it": "Think of a FORGE bot you''ve built and tested a lot. Has it ever given a strangely confident, wrong answer to something slightly different from what you tested? That''s a small, safe glimpse of overfitting/bias in action."
}'::jsonb
FROM public.lessons WHERE slug = 'when-ai-gets-it-wrong';

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

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does the phrase "garbage in, garbage out" (GIGO) mean?', '["AI can fix any bad data automatically", "Poor quality training data leads to poor quality model results", "Data doesn''t matter as much as the algorithm", "Garbage collection is unrelated to AI"]', 1, 'GIGO means flawed input data reliably produces flawed output, no matter the algorithm.'),
    (2, 'Why does training data need to be "representative"?', '["To make the dataset file smaller", "So the model performs well across the full range of real situations, not just common ones", "Representative data trains faster", "It''s not actually important"]', 1, 'If training data only covers some situations, the model may perform poorly on the rest — a cause of AI bias.'),
    (3, 'Roughly how much time do data scientists typically spend on collecting/cleaning data?', '["About 5%", "60-80%", "0%, it''s fully automatic", "Exactly 50%"]', 1, 'Data collection and cleaning is usually the majority of real-world ML work.'),
    (4, 'In the flashcards analogy, what does "5 flashcards about only ancient Rome" represent?', '["A perfectly sufficient, representative dataset", "Insufficient and unrepresentative training data", "A type of neural network", "An error message"]', 1, 'Too few examples covering too narrow a range mirrors weak training data.'),
    (5, 'What made ImageNet significant in AI history?', '["It was the first computer ever built", "A massive, carefully labeled dataset that helped launch the modern deep learning boom", "A chatbot released in 2012", "A programming language for AI"]', 1, 'ImageNet''s scale and quality was a major catalyst for deep learning progress.'),
    (6, 'Which of these is NOT one of the four data quality traits described?', '["Relevant", "Sufficient", "Expensive", "Clean"]', 2, 'The four traits are relevant, sufficient, representative, and clean.'),
    (7, 'Why can''t a model tell "true pattern" from "mislabeled example" in its data?', '["It can always tell the difference perfectly", "It simply learns whatever patterns it''s shown, trusting the data as given", "Models refuse to learn from labeled data", "Mislabeled data is automatically deleted"]', 1, 'A model has no independent way to verify labels — it learns exactly what the data shows it.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'data-fuel-of-ai';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is "training" in machine learning?', '["Using an already-built model to answer a question", "The process of a model adjusting its parameters based on many examples", "Turning a computer on", "Deleting old data"]', 1, 'Training is the process where the model''s internal parameters get adjusted based on examples.'),
    (2, 'What is "inference" (predicting)?', '["Another word for training", "Using an already-trained model to generate output on new input", "Erasing a model''s memory", "Writing the training data"]', 1, 'Inference is applying an already-trained model to new input — no learning happens.'),
    (3, 'Why might a chatbot seem to "forget" something from a separate conversation?', '["The model retrains itself and forgets on purpose", "The underlying model isn''t learning permanently — it only sees context in the current prompt", "Chatbots have no memory capability, ever", "This never actually happens"]', 1, 'Without conversation history fed back in, the model has no permanent memory of prior conversations.'),
    (4, 'In the doctor analogy, what does "years of medical school" represent?', '["Inference", "Training", "A single patient visit", "A diagnosis"]', 1, 'Years of school/practice mirror the training phase.'),
    (5, 'Which phase generally costs more computing resources upfront?', '["Inference", "Training", "They cost exactly the same always", "Neither requires resources"]', 1, 'Training is typically far more resource-intensive upfront.'),
    (6, 'What happens to a model''s parameters after training, without further retraining?', '["They change randomly every day", "They stay frozen/fixed until deliberately retrained or fine-tuned", "They reset to zero automatically", "They delete themselves"]', 1, 'Trained parameters remain fixed unless deliberately retrained.'),
    (7, 'How does training cost compare to a single inference call?', '["Training is far cheaper than one inference", "Training (often millions of dollars) vastly exceeds the tiny cost of one inference", "They cost exactly the same", "Inference has no cost at all"]', 1, 'Training is a massive upfront investment; each inference call is comparatively very cheap.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'training-vs-predicting';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What defines supervised learning?', '["Training with absolutely no data at all", "Training on labeled data — inputs paired with correct answers", "A model that requires no human involvement ever", "Training only on images"]', 1, 'Supervised learning uses labeled examples (input + correct output pairs) to train.'),
    (2, 'In a spam filter example, what would the "label" be?', '["The email''s file size", "''Spam'' or ''not spam''", "The sender''s IP address", "The color of the email client"]', 1, 'The label is the correct-answer tag attached to each training example.'),
    (3, 'What is the main practical limitation of supervised learning?', '["It requires no data", "It needs large amounts of accurately labeled data, which is slow/expensive to produce", "It only works on weekends", "It cannot be used for spam filtering"]', 1, 'Labeling data by hand at scale is a significant cost and bottleneck.'),
    (4, 'Why is it called "supervised" learning?', '["Because a human watches the computer screen the whole time", "Because human-provided correct-answer labels guide the training process", "Because it requires a manager''s approval", "There is no specific reason for the name"]', 1, 'The labels act like a supervisor, showing the correct answer at every example.'),
    (5, 'In the dog breed analogy, what does the caption under each photo represent?', '["The input feature", "The label", "Random noise", "The model''s final guess"]', 1, 'The caption is the correct answer (label) paired with the input photo.'),
    (6, 'How does a FORGE bot''s QA_PAIRS relate to supervised learning?', '["They are completely unrelated concepts", "Each QA pair is a simplified labeled example — a question paired with its correct answer", "QA_PAIRS train the entire underlying language model from scratch", "QA_PAIRS are only used for unsupervised learning"]', 1, 'QA_PAIRS mirror the input-label structure of supervised learning examples.'),
    (7, 'Which of these is a real-world example of supervised learning mentioned in the lesson?', '["A random number generator", "Medical scan analysis trained on labeled ''tumor''/''no tumor'' images", "A basic calculator app", "A plain text file"]', 1, 'Labeled medical scans are a classic supervised learning application.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'supervised-learning';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is the key difference between unsupervised and supervised learning?', '["Unsupervised learning uses no data at all", "Unsupervised learning trains on data with no labels/correct answers attached", "Unsupervised learning is always more accurate", "There is no real difference"]', 1, 'Unsupervised learning specifically works with unlabeled data.'),
    (2, 'What is "clustering"?', '["Deleting duplicate data", "Grouping similar examples together based on shared characteristics, without predefined labels", "A type of neural network layer", "A method for labeling data by hand"]', 1, 'Clustering groups similar data points without being told the groups in advance.'),
    (3, 'Why is unsupervised learning often more practical to apply at scale?', '["Unlabeled data is far more abundant and cheaper to obtain than labeled data", "Unsupervised learning requires no computer at all", "It''s actually less practical in every case", "It only works on very small datasets"]', 0, 'Since unlabeled data doesn''t require costly human labeling, it''s much more abundant.'),
    (4, 'What is a key challenge of unsupervised learning?', '["It''s harder to objectively measure how good results are, with no correct-answer key", "It cannot run on computers", "It requires more labeled data than supervised learning", "It always produces perfect results automatically"]', 0, 'Without labels, there''s no ground truth to directly measure accuracy against.'),
    (5, 'In the puzzle piece analogy, what does sorting by color/shape without box art represent?', '["Supervised learning", "Unsupervised clustering", "Data cleaning only", "Model training failure"]', 1, 'Sorting by shared characteristics with no answer key mirrors unsupervised clustering.'),
    (6, 'What is "dimensionality reduction" used for?', '["Making a dataset file corrupted", "Simplifying complex data with many features down to the most important patterns", "Deleting all the data", "Labeling unlabeled data automatically"]', 1, 'Dimensionality reduction condenses complex data into simpler, key patterns.'),
    (7, 'What might streaming services discover using unsupervised clustering?', '["Nothing useful, ever", "Surprising ''taste clusters'' of users that don''t match obvious categories like age", "The exact age of every user", "Only genre-based groupings and nothing else"]', 1, 'Unsupervised clustering can reveal non-obvious groupings across different demographics.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'unsupervised-learning';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is "overfitting"?', '["A model that runs too fast", "A model memorizing training data so closely it fails on new, real-world examples", "A model with too little training data", "A model that costs too much money"]', 1, 'Overfitting is memorizing training examples instead of learning generalizable patterns.'),
    (2, 'How can you detect overfitting, based on the ML Workflow lesson?', '["A model scores well on training data but much worse on the held-out test set", "A model that never makes mistakes", "A model trained for less than a minute", "There is no way to detect it"]', 0, 'A large gap between training and test performance is a classic overfitting signal.'),
    (3, 'What is AI "bias," as described in this lesson?', '["A model being too slow", "Training data not fairly representing everyone the model will be used on, causing unfair results for some groups", "A model that costs too much to train", "A type of neural network layer"]', 1, 'Bias arises when training data underrepresents some groups, leading to unfair real-world outcomes.'),
    (4, 'According to the lesson, is AI bias usually intentional?', '["Yes, always deliberately programmed in", "No — it usually creeps in silently through whatever data happened to be convenient to collect", "Bias never actually happens in real systems", "Only unsupervised models can be biased"]', 1, 'Bias typically emerges unintentionally from unrepresentative data, not deliberate programming.'),
    (5, 'In the exam analogy, what does "memorizing last year''s exact exam questions" represent?', '["Good generalization", "Overfitting", "Unsupervised learning", "Data cleaning"]', 1, 'Memorizing exact past answers instead of understanding concepts mirrors overfitting.'),
    (6, 'What real example did the lesson give of AI bias in hiring?', '["An AI that only worked on weekends", "A hiring AI that downgraded resumes containing ''women''s'' due to biased historical hiring data", "An AI that could not read resumes at all", "An AI that only considered graduation dates"]', 1, 'This is a widely-cited real example of bias emerging from historically skewed training data.'),
    (7, 'What root cause do overfitting and bias share, according to this lesson?', '["Both are caused by using too much computing power", "A model is only ever as good and as fair as the examples it was shown, with no independent common sense", "Neither has any real cause", "Both only affect unsupervised learning models"]', 1, 'Both problems trace back to the model''s dependence entirely on the data it was trained on.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'when-ai-gets-it-wrong';
