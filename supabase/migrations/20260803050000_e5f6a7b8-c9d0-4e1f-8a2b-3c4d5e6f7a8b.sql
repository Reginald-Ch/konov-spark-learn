-- Module 1 content upgrade: adds "visual" (step diagram) and "practice" (interactive self-check)
-- to every lesson's content, and tightens explanation text to short, standard-reading-level paragraphs.
-- This matches the new LessonsPanel.tsx rendering (VisualBlock + PracticeBlock).

UPDATE public.lesson_content SET content = '{
  "hook": "You already talk to AI more than you think — Siri, Spotify, Snapchat filters. But what actually IS artificial intelligence? Let''s cut through the sci-fi and find out.",
  "explanation": "AI is a broad term for computer systems that do things that normally need human intelligence — recognizing images, understanding language, spotting patterns. AI isn''t one single thing. It''s a category, like ''sports'' covers soccer, swimming, and chess.\n\nMost AI today — including everything you''ll build in FORGE — is machine learning. Instead of a programmer writing exact rules for every case, the computer learns patterns from examples.\n\nThe AI in movies that thinks and feels like a human is called AGI (Artificial General Intelligence). It doesn''t exist yet. Everything you use today is narrow AI: great at one job, not actually ''thinking'' like a person.",
  "visual": {
    "caption": "How narrow AI actually works",
    "steps": [
      { "emoji": "📊", "label": "Data", "caption": "Thousands of examples" },
      { "emoji": "🔍", "label": "Find patterns", "caption": "What usually goes together" },
      { "emoji": "🎯", "label": "Predict", "caption": "Apply pattern to new input" }
    ]
  },
  "analogy": "Think of AI like a very dedicated apprentice chef. It hasn''t ''invented'' cooking — it''s studied thousands of recipes and learned to recognize patterns. Give it a totally new situation outside its training, and it can freeze up, just like a chef trained only in Italian food might struggle if asked to cook Thai.",
  "practice": {
    "prompt": "Your phone unlocks by scanning your face. Is that AGI (human-like general intelligence) or narrow AI?",
    "options": ["AGI — it truly understands who you are", "Narrow AI — it''s really good at one job: matching a face", "Neither, it''s not AI at all"],
    "correct_index": 1,
    "feedback": "Face unlock is narrow AI — trained on tons of face data to do exactly one job really well. It has no idea what a ''person'' even means beyond that."
  },
  "fun_fact": "The term ''Artificial Intelligence'' was coined in 1956 at a summer research conference at Dartmouth College — the researchers there thought they could solve AI in about 2 months with a small team. It''s been almost 70 years and we''re still working on it!",
  "try_it": "Next time you use an app, try to spot the AI: is it recommending something? Auto-completing your text? Recognizing your face to unlock your phone? Jot down 3 examples you notice today."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'what-is-ai');

UPDATE public.lesson_content SET content = '{
  "hook": "Ever wondered how Netflix knows what show you''ll like, or how your phone recognizes your voice? It''s not magic — it''s pattern-spotting on a massive scale. Let''s open the hood.",
  "explanation": "''Learning'' for a computer doesn''t mean it studies like you do. It means a program adjusts internal numbers (called parameters) until its guesses match reality as closely as possible.\n\nHere''s the loop: the model makes a guess, compares that guess to the correct answer, measures how wrong it was, and nudges its numbers slightly to be less wrong next time. Repeat that millions of times across millions of examples, and the model gets scary good — at exactly what it was trained on.\n\nThis is why AI can ace a task it trained on and completely fail at something just outside that range. It never truly ''understood'' the subject — it found a pattern that worked.",
  "visual": {
    "caption": "The learning loop",
    "steps": [
      { "emoji": "🤔", "label": "Guess", "caption": "Model predicts an answer" },
      { "emoji": "📏", "label": "Measure error", "caption": "Compare to correct answer" },
      { "emoji": "🔧", "label": "Adjust", "caption": "Tweak internal numbers" },
      { "emoji": "🔁", "label": "Repeat", "caption": "Millions of times" }
    ]
  },
  "analogy": "Think of it like learning to shoot free throws blindfolded. You shoot, someone tells you ''two feet left,'' you adjust and shoot again. After thousands of shots, your arm ''knows'' the right motion — even though you never saw the hoop. That''s a model tuning itself with each error signal.",
  "practice": {
    "prompt": "A model trained only on photos of cats and dogs is shown a photo of a rabbit for the first time. What will it most likely do?",
    "options": ["Correctly say ''I don''t know, this isn''t a cat or dog''", "Force a guess of cat or dog — because that''s all it knows", "Automatically learn what a rabbit is on the spot"],
    "correct_index": 1,
    "feedback": "Most classifiers can only choose among the categories they were trained on. Without extra design, it''ll force-fit the rabbit into ''cat'' or ''dog'' rather than admit it doesn''t know."
  },
  "fun_fact": "The ''learning'' math behind most modern AI — adjusting numbers based on error — is called gradient descent, and its core idea comes from calculus techniques over 300 years old. The idea is ancient; the horsepower to run it billions of times a second is brand new.",
  "try_it": "Think of a skill you learned through trial and error (a sport, a video game, an instrument). Write one sentence describing your ''error signal'' — how did you know when you got it wrong?"
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'how-computers-learn');

UPDATE public.lesson_content SET content = '{
  "hook": "AI didn''t start with ChatGPT. It''s been rising, crashing, and rising again since the 1950s. Knowing the story helps you spot where we actually are today — not where the hype says we are.",
  "explanation": "Early AI (1950s–1980s) was rule-based: programmers wrote thousands of ''if-this-then-that'' rules by hand. It worked for narrow, well-defined problems like playing checkers, but it couldn''t handle the messiness of the real world — and funding dried up during what''s called an ''AI winter.''\n\nMachine learning (1990s–2010s) flipped the approach: instead of hand-written rules, feed the computer examples and let it find the patterns itself. This unlocked things like spam filters and recommendation engines.\n\nDeep learning (2012–now) scaled that idea up with neural networks, huge datasets, and powerful chips called GPUs. That''s the engine behind image recognition, voice assistants, and the large language models powering modern chatbots.",
  "visual": {
    "caption": "Three eras of AI",
    "steps": [
      { "emoji": "📏", "label": "Rules era", "caption": "''50s–''80s: hand-written if/then" },
      { "emoji": "📈", "label": "ML era", "caption": "''90s–2010s: learns from examples" },
      { "emoji": "🧠", "label": "Deep learning", "caption": "2012–now: neural nets + big data" }
    ]
  },
  "analogy": "It''s like teaching someone to cook. Rules era = handing them an exact recipe card for every dish, with no room to improvise. ML era = letting them taste hundreds of dishes and learn what ''good'' tastes like. Deep learning = giving them a professional kitchen, a huge pantry, and years of practice.",
  "practice": {
    "prompt": "Why did the ''rules era'' of AI struggle with real-world problems?",
    "options": ["Computers were too slow to run any rules", "The real world has too many exceptions to write a rule for each one", "Nobody had thought of AI yet"],
    "correct_index": 1,
    "feedback": "You can''t hand-write a rule for every possible situation — language, images, and human behavior are too messy. That brittleness is exactly what machine learning was built to solve."
  },
  "fun_fact": "The 2012 moment that kicked off the deep learning boom is nicknamed the ''ImageNet moment'' — a neural network called AlexNet suddenly crushed every other approach at recognizing photos, and the whole field pivoted almost overnight.",
  "try_it": "Pick one AI tool you use today (voice assistant, recommendation feed, chatbot). Guess which era''s technique it most likely relies on, and why."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'brief-history-ai');

UPDATE public.lesson_content SET content = '{
  "hook": "Neural networks sound intimidating, but the core idea fits on a napkin. Let''s build one in your head, one layer at a time.",
  "explanation": "A neural network is layers of simple math units called neurons, stacked on top of each other. Each neuron takes some numbers in, multiplies them by ''weights'' (how important each input is), adds them up, and passes the result forward.\n\nData enters at the input layer, flows through one or more hidden layers where patterns get combined and recombined, and comes out the other side at the output layer as a prediction — like ''92% cat, 8% dog.''\n\nTraining a network means adjusting all those weights, layer by layer, so the final prediction gets closer to correct. A ''deep'' network just means it has many hidden layers stacked up, letting it learn more complex patterns.",
  "visual": {
    "caption": "Data flowing through a network",
    "steps": [
      { "emoji": "📥", "label": "Input layer", "caption": "Raw data goes in" },
      { "emoji": "🧩", "label": "Hidden layer(s)", "caption": "Combines patterns" },
      { "emoji": "📤", "label": "Output layer", "caption": "Final prediction" }
    ]
  },
  "analogy": "Picture an assembly line of experts passing a photo down the table. The first person notices edges and colors. The next spots shapes made of those edges. The next recognizes ''ears'' and ''whiskers'' made of those shapes. The last person announces ''cat.'' Each layer builds on the one before it.",
  "practice": {
    "prompt": "What does ''deep'' in deep learning actually refer to?",
    "options": ["How smart or human-like the AI is", "How many hidden layers the neural network has", "How much money the company spent"],
    "correct_index": 1,
    "feedback": "''Deep'' just means many stacked layers — it''s an architecture term, not a measure of intelligence or consciousness."
  },
  "fun_fact": "The very first neuron-inspired model, the ''Perceptron,'' was built in 1958 — and could only learn to separate data with a single straight line. Today''s networks stack millions of these simple units to solve problems no one could hand-program.",
  "try_it": "Draw 3 boxes on paper labeled Input → Hidden → Output. Pick something you''d want an AI to recognize (a genre of music, a type of meme) and jot what each layer might be looking for."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'inside-a-neural-network');

UPDATE public.lesson_content SET content = '{
  "hook": "Count how many times AI touched your day before lunch. Alarm suggestions, playlist, autocorrect, maps traffic prediction — it adds up fast.",
  "explanation": "AI isn''t a distant, futuristic thing — it''s already woven into apps you use every day. Recommendation systems decide what shows up in your feed. Computer vision unlocks your phone and tags photos. Natural language processing powers autocorrect, translation, and chatbots. Prediction models estimate your commute time or flag a suspicious bank transaction.\n\nMost of this AI is invisible by design — it works best when you don''t notice it working. Learning to spot it is the first step to understanding how it shapes what you see, buy, and believe.",
  "visual": {
    "caption": "AI hiding in plain sight",
    "steps": [
      { "emoji": "📱", "label": "Your feed", "caption": "Recommendation AI" },
      { "emoji": "🗣️", "label": "Autocorrect", "caption": "Language AI" },
      { "emoji": "📸", "label": "Photo tagging", "caption": "Vision AI" },
      { "emoji": "🗺️", "label": "Traffic ETA", "caption": "Prediction AI" }
    ]
  },
  "analogy": "It''s like electricity in a house — you don''t think about the wiring behind every light switch, but it''s running constantly. AI has become that kind of background infrastructure in most apps.",
  "practice": {
    "prompt": "A social app decides what video to show you next based on what you''ve watched before. What kind of AI is doing that job?",
    "options": ["A recommendation system", "A rules-based checkers program", "It''s random, not AI"],
    "correct_index": 0,
    "feedback": "That''s a recommendation system — trained on huge amounts of watch-history data to predict what will keep you engaged."
  },
  "fun_fact": "Recommendation AI drives a huge share of what people watch on major streaming platforms — reportedly over 70% of viewing time on some services comes from algorithmic suggestions, not searches.",
  "try_it": "Go through one app you used today and name 3 places AI was quietly working in the background."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'ai-in-your-life');

UPDATE public.lesson_content SET content = '{
  "hook": "AI isn''t just an ''engineer'' job. It needs builders, testers, critics, and storytellers — there''s a lane in here for almost anyone.",
  "explanation": "AI/ML Engineer builds and trains models, and ships them into real products. Data Scientist digs through data to find patterns and answer questions that guide decisions. AI Ethicist studies the impact of AI on people and pushes for fair, safe design. Prompt Engineer / AI Product Designer shapes how humans and AI systems actually interact. Domain Expert (doctor, teacher, lawyer, artist) partners with technical teams to make sure AI solves the real problem, not an imagined one.\n\nYou don''t need to pick one lane forever — many people in AI move between technical and non-technical roles across their careers.",
  "visual": {
    "caption": "A few doors into AI",
    "steps": [
      { "emoji": "🛠️", "label": "Builder", "caption": "ML/AI engineer" },
      { "emoji": "📊", "label": "Analyst", "caption": "Data scientist" },
      { "emoji": "⚖️", "label": "Ethicist", "caption": "Policy & fairness" },
      { "emoji": "🎨", "label": "Designer", "caption": "Human-AI interaction" }
    ]
  },
  "analogy": "Think of an AI product like a movie. You need a director (product lead), a script (data & ethics review), actors (the model), and a film critic (the ethicist/tester) — one role can''t do it all.",
  "practice": {
    "prompt": "Someone loves writing, asking sharp questions, and thinking about how people will react to a chatbot''s replies, but doesn''t want to code all day. Which AI-adjacent role fits best?",
    "options": ["ML Engineer", "Prompt Engineer / AI Product Designer", "Hardware technician"],
    "correct_index": 1,
    "feedback": "Prompt engineering and AI product design lean heavily on language, empathy, and iteration — a great fit for someone who thinks in words and user reactions rather than raw code."
  },
  "fun_fact": "One of the fastest-growing job titles isn''t ''AI Engineer'' at all — it''s roles like ''AI Trainer'' and ''AI Red Teamer,'' people who spend their day trying to make chatbots fail so they can be fixed before real users find the cracks.",
  "try_it": "Pick the AI-career lane that sounds most interesting to you right now, and write one sentence on why."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'ai-careers');
