-- Module 2 content upgrade: adds "visual" and "practice" fields, tightens explanation text.

UPDATE public.lesson_content SET content = '{
  "hook": "You can have the smartest algorithm on Earth — feed it bad data, and it''ll confidently make bad decisions. Data quality is the real bottleneck in AI, not clever code.",
  "explanation": "A model learns entirely from the examples it''s shown. If those examples are messy, incomplete, or biased, the model bakes those same flaws into every prediction it makes — often summed up as ''garbage in, garbage out.''\n\nGood training data needs to be: relevant (actually related to the task), representative (covers the range of real situations, not just the easy ones), and correctly labeled (the ''right answers'' need to actually be right).\n\nThis is why data collection and cleaning often takes far more time than building the model itself — some teams spend 80% of a project just preparing data.",
  "visual": {
    "caption": "What makes data ''good''",
    "steps": [
      { "emoji": "🎯", "label": "Relevant", "caption": "Matches the task" },
      { "emoji": "🌍", "label": "Representative", "caption": "Covers real-world range" },
      { "emoji": "✅", "label": "Correctly labeled", "caption": "Right answers are right" }
    ]
  },
  "analogy": "Training a model on bad data is like teaching someone to cook using recipes with typos in the measurements. Follow the process perfectly, and you''ll still get a bad dish — because the input was wrong, not the technique.",
  "practice": {
    "prompt": "A company trains a resume-screening AI only on resumes of people who got hired in the past. What''s the biggest risk?",
    "options": ["The AI will run slowly", "The AI will repeat any past hiring bias baked into that data", "There''s no risk, more data is always better"],
    "correct_index": 1,
    "feedback": "If the historical hiring data reflects bias (favoring certain schools, backgrounds, etc.), the model learns and repeats that pattern — it can''t tell ''this is what we did'' from ''this is what we should do.''"
  },
  "fun_fact": "It''s often estimated that data scientists spend around 80% of their time cleaning and preparing data, and only about 20% actually building or tuning models.",
  "try_it": "Think of a survey or quiz you''ve taken. What would make its data ''bad''? Think of 2 ways it could be unrepresentative or mislabeled."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'data-fuel-of-ai');

UPDATE public.lesson_content SET content = '{
  "hook": "A model has two totally different lives: the exhausting ''practice'' phase, and the fast ''game day'' phase. Mixing these up is one of the most common beginner confusions in ML.",
  "explanation": "Training is when a model looks at labeled examples over and over, adjusting its internal weights to get better at the task. This phase is slow and computationally expensive — it can take minutes, hours, or even weeks depending on the model''s size.\n\nInference (predicting) is when the already-trained model is given brand-new input and produces an answer. This phase is fast — it has to be, since it''s what happens every time you ask a chatbot a question or unlock your phone with your face.\n\nOnce training is done, the model''s weights are frozen (unless it''s retrained later). Every prediction after that reuses those same learned weights — it doesn''t relearn from your input in real time.",
  "visual": {
    "caption": "Two very different phases",
    "steps": [
      { "emoji": "🏋️", "label": "Training", "caption": "Slow, learns from labeled data" },
      { "emoji": "🧊", "label": "Weights frozen", "caption": "Model is ''locked in''" },
      { "emoji": "⚡", "label": "Predicting", "caption": "Fast, uses what it learned" }
    ]
  },
  "analogy": "Training is like a student cramming all semester for an exam. Predicting is walking into the exam room — you don''t get to keep studying mid-test, you just apply what you already learned.",
  "practice": {
    "prompt": "When you ask a chatbot a question and it answers instantly, is it training on your question right then?",
    "options": ["Yes, it learns from every message you send", "No, it''s using weights that were already trained earlier — this is the fast prediction phase", "It depends on the time of day"],
    "correct_index": 1,
    "feedback": "Most deployed models don''t retrain live on your input — they run inference using weights finalized during training, which is why responses come back so fast."
  },
  "fun_fact": "Training a large modern AI model can cost millions of dollars in computing power, while running a single prediction from that same trained model can cost a fraction of a cent.",
  "try_it": "Name one AI product you use. Guess roughly how it splits its time: mostly training (rare, occasional big updates) or mostly predicting (constant, every time you use it)?"
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'training-vs-predicting');

UPDATE public.lesson_content SET content = '{
  "hook": "Most of the AI you interact with daily learned the exact same way a flashcard-quizzed student does: question, answer, check, repeat.",
  "explanation": "Supervised learning trains a model on labeled data — pairs of input and correct output, like a photo labeled ''cat'' or an email labeled ''spam.'' The model makes a guess, compares it to the true label, and adjusts to reduce the gap.\n\nThe two big flavors are classification (picking a category, like spam vs. not spam) and regression (predicting a number, like a house price) — you''ll cover the difference in more depth soon.\n\nThe catch: supervised learning needs a lot of correctly labeled examples, and labeling data by hand is slow and expensive — which is exactly why good datasets are so valuable.",
  "visual": {
    "caption": "Supervised learning loop",
    "steps": [
      { "emoji": "🏷️", "label": "Labeled data", "caption": "Input + correct answer" },
      { "emoji": "🤖", "label": "Model guesses", "caption": "Predicts a label" },
      { "emoji": "📐", "label": "Compare & adjust", "caption": "Learn from the gap" }
    ]
  },
  "analogy": "It''s like studying with flashcards someone already answered for you. Front: a question. Back: the correct answer. You quiz yourself, check the back, and adjust what you remember — over and over until you rarely miss.",
  "practice": {
    "prompt": "You want a model to sort emails into ''spam'' or ''not spam.'' What does it need for supervised learning to work?",
    "options": ["Just a huge pile of random emails, no labels needed", "Emails that are each labeled ''spam'' or ''not spam'' by a human first", "A dictionary of spam words"],
    "correct_index": 1,
    "feedback": "Supervised learning specifically needs labeled examples — the model can''t learn ''spam'' as a concept without being shown examples humans already tagged."
  },
  "fun_fact": "The famous MNIST dataset of handwritten digits — used to teach almost every ML student for decades — was hand-labeled from real forms filled out by U.S. Census Bureau employees and high schoolers.",
  "try_it": "Pick a task you could imagine ''teaching'' with flashcards (correct pairs of input/output). Describe the input and the label in one sentence each."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'supervised-learning');

UPDATE public.lesson_content SET content = '{
  "hook": "What if you handed a model a giant pile of data with zero labels and said ''figure something out''? That''s unsupervised learning — and it''s how AI finds patterns nobody told it to look for.",
  "explanation": "Unsupervised learning works on unlabeled data — there''s no ''correct answer'' given. Instead, the model looks for structure on its own: which items are similar to each other, which are outliers, what natural groupings exist.\n\nA common technique is clustering — grouping similar data points together (like grouping customers by shopping habits, without anyone defining the groups in advance). Another is anomaly detection — flagging data points that don''t fit any pattern, which is often how fraud detection starts.\n\nBecause there''s no ''right answer'' to check against, evaluating unsupervised learning is trickier — you''re often judging whether the groups it finds are actually useful to humans.",
  "visual": {
    "caption": "Finding hidden structure",
    "steps": [
      { "emoji": "🗂️", "label": "Unlabeled data", "caption": "No correct answers given" },
      { "emoji": "🔎", "label": "Model explores", "caption": "Looks for structure" },
      { "emoji": "🧬", "label": "Clusters emerge", "caption": "Patterns humans review" }
    ]
  },
  "analogy": "It''s like handing someone a mixed box of Lego bricks with no instructions and asking them to sort it however makes sense. They might group by color, size, or shape — nobody told them the ''right'' grouping, they just found one that fits.",
  "practice": {
    "prompt": "A streaming service groups its users into clusters based on watch history, without anyone defining the group names in advance. What kind of learning is this?",
    "options": ["Supervised learning — there are correct labels", "Unsupervised learning — the model finds structure with no labels", "Not machine learning at all"],
    "correct_index": 1,
    "feedback": "No one told the model the ''correct'' user groups ahead of time — it discovered clusters from raw behavior patterns, which is the hallmark of unsupervised learning."
  },
  "fun_fact": "Unsupervised clustering is part of how some streaming and shopping platforms first discover new audience segments — humans give the resulting clusters names afterward, like ''weekend binge-watchers.''",
  "try_it": "Imagine grouping your own music library with no genre labels. What 2–3 natural groupings do you think would emerge?"
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'unsupervised-learning');

UPDATE public.lesson_content SET content = '{
  "hook": "Every AI system fails sometimes — the real skill isn''t avoiding failure, it''s knowing which kind of failure you''re looking at.",
  "explanation": "Bias happens when a model''s training data over- or under-represents certain groups or situations, so its predictions are systematically skewed. Overfitting happens when a model memorizes its training data too closely — including noise and quirks — so it performs great on data it''s seen, but poorly on new data. Underfitting is the opposite: the model is too simple to capture the real pattern at all.\n\nAll three trace back to the same root idea: a model is only as good as the fit between its data and the real problem. ''Garbage in, garbage out'' isn''t just about bad data — it''s also about the wrong amount of fitting to that data.",
  "visual": {
    "caption": "Three common failure modes",
    "steps": [
      { "emoji": "⚖️", "label": "Bias", "caption": "Skewed by unbalanced data" },
      { "emoji": "🪤", "label": "Overfitting", "caption": "Memorized, doesn''t generalize" },
      { "emoji": "📉", "label": "Underfitting", "caption": "Too simple to learn the pattern" }
    ]
  },
  "analogy": "Overfitting is like memorizing the exact answers to last year''s practice test instead of learning the topic — ace that specific test, bomb the real exam with different questions. Underfitting is like barely studying at all and missing the pattern entirely.",
  "practice": {
    "prompt": "A model scores 99% on its training data but only 60% on new, real-world data. What''s most likely happening?",
    "options": ["The model is underfitting", "The model is overfitting — it memorized the training set instead of learning general patterns", "The model is working perfectly"],
    "correct_index": 1,
    "feedback": "A huge gap between training performance and real-world performance is the classic signature of overfitting."
  },
  "fun_fact": "One well-known real-world bias case: early facial analysis systems from several major tech companies were found to have significantly higher error rates on darker-skinned faces than lighter-skinned ones, because training datasets skewed heavily toward lighter-skinned faces.",
  "try_it": "Think of a time you ''overfit'' to a specific test or situation in real life (crammed for an exact quiz format) and it didn''t transfer elsewhere. Write one sentence about it."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'when-ai-gets-it-wrong');

UPDATE public.lesson_content SET content = '{
  "hook": "Ask an ML model any prediction question, and it''s really answering one of two very different question types. Knowing which one you''re asking changes everything about how you build it.",
  "explanation": "Classification predicts a category from a fixed set of options — spam or not spam, cat or dog or bird, pass or fail. The output is a label.\n\nRegression predicts a continuous number — a house price, tomorrow''s temperature, how many minutes until your delivery arrives. The output is a value on a scale, not a label.\n\nThe question you''re asking decides which one you need: ''which category does this belong to?'' is classification. ''What number should this be?'' is regression. Picking the wrong one leads to a model that technically runs but never gives you a useful answer.",
  "visual": {
    "caption": "Two kinds of predictions",
    "steps": [
      { "emoji": "🏷️", "label": "Classification", "caption": "Picks a category" },
      { "emoji": "📈", "label": "Regression", "caption": "Predicts a number" }
    ]
  },
  "analogy": "Classification is like a bouncer sorting people into lines: VIP, general, staff. Regression is like a scale telling you exactly how much something weighs — not which ''category'' of weight it''s in, but the precise number.",
  "practice": {
    "prompt": "You want a model to predict tomorrow''s high temperature in degrees. Is that classification or regression?",
    "options": ["Classification — hot or cold", "Regression — it''s predicting a continuous number", "Neither, this isn''t a machine learning task"],
    "correct_index": 1,
    "feedback": "A specific temperature value (like 74°F) is a continuous number, not a fixed category — that makes it a regression problem."
  },
  "fun_fact": "The same underlying neural network architecture can often be used for both classification and regression — the only real difference is what happens at the final output layer: a category label, or a raw number.",
  "try_it": "Name 2 predictions you''d want an AI to make in everyday life — one that''s a category (classification) and one that''s a number (regression)."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'classification-vs-regression');

UPDATE public.lesson_content SET content = '{
  "hook": "Building a machine learning model isn''t just ''write code, get magic.'' It''s a repeatable pipeline — and knowing the steps means you can debug when something goes wrong.",
  "explanation": "A typical ML workflow: define the problem (what exactly are you predicting, and why?), collect & clean data (gather relevant examples and fix errors, gaps, duplicates), split the data (into a training set to learn from and a test set the model has never seen), train the model, evaluate it on the unseen test set, then deploy & monitor it in a real product.\n\nSkipping the test-set split is one of the most common beginner mistakes — without it, you have no honest way to know if your model actually learned the pattern or just memorized the training data.",
  "visual": {
    "caption": "The ML pipeline",
    "steps": [
      { "emoji": "❓", "label": "Define", "caption": "What & why" },
      { "emoji": "🧹", "label": "Collect & clean", "caption": "Gather good data" },
      { "emoji": "✂️", "label": "Split", "caption": "Train vs. test sets" },
      { "emoji": "🏋️", "label": "Train", "caption": "Learn patterns" },
      { "emoji": "📋", "label": "Evaluate", "caption": "Test on unseen data" },
      { "emoji": "🚀", "label": "Deploy", "caption": "Ship & monitor" }
    ]
  },
  "analogy": "It''s like preparing for a real exam using practice tests. You study (train) using one set of practice questions, then take a different, never-seen practice test (evaluate) to honestly check if you actually learned the material — not just memorized one specific test.",
  "practice": {
    "prompt": "Why do ML teams split their data into a training set AND a separate test set, instead of just training on everything?",
    "options": ["To save computer memory", "To honestly check if the model generalizes to data it hasn''t memorized", "Test sets aren''t actually necessary"],
    "correct_index": 1,
    "feedback": "Testing on data the model has already seen during training would hide overfitting — a held-out test set is the only honest way to measure real-world performance."
  },
  "fun_fact": "In many real ML teams, ''deploy & monitor'' never really ends — models are re-evaluated on fresh data on a schedule, because the real world keeps changing (sometimes called ''data drift'').",
  "try_it": "Pick any prediction idea (even something silly, like ''will my plant need water tomorrow''). Write one sentence for what step 1 (define the problem) would look like."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'ml-workflow-step-by-step');

UPDATE public.lesson_content SET content = '{
  "hook": "''99% accurate!'' sounds impressive — until you learn the model is just guessing the most common answer every time. Numbers alone can lie. Here''s how to actually judge a model.",
  "explanation": "Accuracy is the percent of predictions the model got right — simple, but misleading when categories are imbalanced. If 95% of emails aren''t spam, a model that always guesses ''not spam'' scores 95% accuracy while catching zero actual spam.\n\nPrecision asks: of everything the model flagged as positive, how much was actually correct? Recall asks: of everything that was actually positive, how much did the model catch? There''s often a tradeoff — being stricter improves precision but can hurt recall, and vice versa.\n\nWhich metric matters most depends on the cost of each mistake. A spam filter that wrongly blocks an important email (low precision) can be worse than letting a few spam messages through (lower recall) — the right balance depends on the real-world stakes.",
  "visual": {
    "caption": "Beyond just ''accuracy''",
    "steps": [
      { "emoji": "🎯", "label": "Accuracy", "caption": "% correct overall" },
      { "emoji": "🔍", "label": "Precision", "caption": "Of flagged, how many right?" },
      { "emoji": "🕸️", "label": "Recall", "caption": "Of real positives, how many caught?" }
    ]
  },
  "analogy": "Imagine a smoke detector. High recall means it catches almost every real fire (good!) but might also blare over burnt toast (low precision). High precision means it only alarms for real fires, but might miss a small one starting slowly. The ''right'' balance depends on what''s more dangerous to get wrong.",
  "practice": {
    "prompt": "A disease-detection model is 95% accurate, but the disease itself only occurs in 5% of patients. What''s the problem with celebrating that 95% number alone?",
    "options": ["There''s no problem, 95% is great", "A model that always predicts ''no disease'' would also score 95% accuracy while missing every real case", "Accuracy isn''t a real metric"],
    "correct_index": 1,
    "feedback": "With an imbalanced dataset like this, accuracy alone can hide a model that''s medically useless — you''d want to check recall (did it catch the actual sick patients?) too."
  },
  "fun_fact": "This exact accuracy trap has a name — the ''accuracy paradox'' — and it''s one of the first things taught in most applied ML courses because it''s so easy to be fooled by a single headline number.",
  "try_it": "Think of a real decision where a false alarm (low precision) is worse than a missed case (low recall), or vice versa. Write one sentence explaining which matters more and why."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'how-do-we-know-a-model-is-good');
