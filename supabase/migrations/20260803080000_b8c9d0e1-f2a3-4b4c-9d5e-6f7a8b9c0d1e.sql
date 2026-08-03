-- Module 4 content upgrade: adds "visual" and "practice" fields, tightens explanation text.

UPDATE public.lesson_content SET content = '{
  "hook": "Before your chatbot says a single word, it needs to know who it is. Skip this step, and you get a bland, inconsistent bot that feels like nobody.",
  "explanation": "A bot''s identity is the foundation everything else is built on: its name, its role (tutor, assistant, guide), its personality traits, and the audience it''s built for. This identity should show up in the system prompt as concrete, specific language — not vague adjectives.\n\nA strong identity answers three questions: who is this bot for? what is its one core job? and what personality makes it feel consistent and trustworthy while doing that job?\n\nSkipping this and jumping straight to ''answer questions'' produces a bot that feels random from message to message, because there''s no consistent character underneath the responses.",
  "visual": {
    "caption": "Three questions that define a bot",
    "steps": [
      { "emoji": "👥", "label": "Who is it for?", "caption": "Your audience" },
      { "emoji": "🎯", "label": "What''s its job?", "caption": "One core purpose" },
      { "emoji": "🎭", "label": "What''s its personality?", "caption": "Consistent character" }
    ]
  },
  "analogy": "It''s like casting a character for a play before writing their lines. Once you know who they are — patient, funny, no-nonsense — writing consistent dialogue for them becomes easy. Skip casting, and every line feels like it''s from a different character.",
  "practice": {
    "prompt": "Which is a stronger foundation for a chatbot identity?",
    "options": ["''A bot that answers questions''", "''Kip, a patient homework helper for 6th graders who always asks a guiding question before giving a direct answer''", "''An AI assistant''"],
    "correct_index": 1,
    "feedback": "Kip has a name, an audience (6th graders), a job (homework help), and a specific behavioral trait (asks guiding questions) — that specificity is what makes responses feel consistent."
  },
  "fun_fact": "Many well-known consumer chatbots are given actual names and backstories internally, even when users never see that backstory directly — it helps keep the tone consistent across thousands of different conversations.",
  "try_it": "In one sentence, define your own FORGE chatbot''s name, audience, and one core job."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'bot-identity');

UPDATE public.lesson_content SET content = '{
  "hook": "Two teams can use the exact same AI model and get wildly different results — the difference is almost always in how well they wrote the system message.",
  "explanation": "A great system message is specific, structured, and unambiguous. Instead of one long paragraph, break it into clear parts: role (who the bot is), tone (how it should sound), rules (what it must or must not do), and format (how responses should be structured).\n\nBe concrete about edge cases too — what should the bot do if it doesn''t know an answer, or if a user asks something off-topic? Leaving that undefined means the model will guess, and its guess won''t always match what you want.\n\nGood system messages are also tested and revised — write a draft, try several real questions against it, and tighten any wording that produced an off-target response.",
  "visual": {
    "caption": "Anatomy of a system message",
    "steps": [
      { "emoji": "🎭", "label": "Role", "caption": "Who the bot is" },
      { "emoji": "🎨", "label": "Tone", "caption": "How it sounds" },
      { "emoji": "🚧", "label": "Rules", "caption": "What it must/must not do" },
      { "emoji": "📐", "label": "Format", "caption": "How answers look" }
    ]
  },
  "analogy": "It''s like writing a job description before hiring someone. A vague posting (''do good work'') attracts inconsistent results. A clear one (role, responsibilities, boundaries) sets expectations that are easy to actually meet.",
  "practice": {
    "prompt": "A system message doesn''t say what the bot should do when it doesn''t know an answer. What''s the risk?",
    "options": ["No risk, the model will always say ''I don''t know''", "The model may guess or make something up rather than admit uncertainty", "The bot will crash"],
    "correct_index": 1,
    "feedback": "Without explicit instructions for the ''I don''t know'' case, models tend to guess confidently rather than default to admitting uncertainty — that gap needs to be closed deliberately."
  },
  "fun_fact": "Adding a single explicit line like ''if you''re not sure, say so instead of guessing'' measurably reduces confident-but-wrong answers in many real chatbot systems — it''s one of the highest-leverage sentences you can write.",
  "try_it": "Add one ''edge case'' rule to a system message you''re building — what should your bot do if it gets a question totally outside its topic?"
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'great-system-message');

UPDATE public.lesson_content SET content = '{
  "hook": "A chatbot''s brain isn''t just the AI model — it''s also the specific facts you feed it. Without a good knowledge base, even the smartest model is just guessing.",
  "explanation": "A knowledge base is the specific, curated information your chatbot should draw on — FAQs, product details, policies, or lesson content — beyond what the general AI model already knows. This keeps answers accurate and on-topic instead of relying purely on the model''s general training.\n\nGood knowledge base entries are concise, current, and written in plain language — a bloated or outdated knowledge base can actually confuse a bot rather than help it.\n\nThis connects directly to a real technique called RAG (Retrieval-Augmented Generation): the system looks up relevant knowledge base entries for a given question, then hands them to the model alongside the user''s question so it can answer using the correct, specific facts.",
  "visual": {
    "caption": "How a bot uses its knowledge base",
    "steps": [
      { "emoji": "❓", "label": "Question comes in", "caption": "User asks something" },
      { "emoji": "📚", "label": "Look up facts", "caption": "Search the knowledge base" },
      { "emoji": "🤖", "label": "Answer using facts", "caption": "Grounded, not guessed" }
    ]
  },
  "analogy": "It''s like an open-book exam vs. a closed-book one. A model with a solid knowledge base gets to check its notes before answering — more accurate than relying purely on memory (its general training), especially for specific details.",
  "practice": {
    "prompt": "Why would a customer-support bot need a knowledge base instead of relying purely on the general AI model?",
    "options": ["The general model already knows every company''s exact return policy", "The general model has no idea about this specific company''s exact, current policies unless it''s told", "Knowledge bases slow the bot down for no benefit"],
    "correct_index": 1,
    "feedback": "General AI models are trained on broad public data — they have no built-in knowledge of your specific company''s current, exact policies unless you explicitly provide it."
  },
  "fun_fact": "RAG (Retrieval-Augmented Generation) is one of the most widely used real-world techniques for enterprise chatbots specifically because it lets a company keep facts accurate and updatable without retraining the entire model.",
  "try_it": "List 3 pieces of specific information your FORGE chatbot would need in its knowledge base to answer questions accurately."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'knowledge-base-qa');

UPDATE public.lesson_content SET content = '{
  "hook": "The exact same correct answer can feel warm and helpful, or cold and robotic — tone is doing more work than most people realize.",
  "explanation": "Tone is how a bot sounds emotionally (friendly, formal, playful, calm), while style covers structural choices (short vs. long answers, emoji use, sentence complexity). Both should match your audience and purpose — a bot helping stressed students needs a very different tone than a bot processing legal claims.\n\nConsistency matters more than any single ''best'' tone. A bot that''s playful in one message and stiff and formal in the next feels untrustworthy, even if every individual answer is correct.\n\nTone should be specified explicitly in the system message with concrete examples, not just an adjective — ''friendly'' means different things to different people; showing 1-2 example responses in the desired tone removes that ambiguity.",
  "visual": {
    "caption": "Tone vs. style",
    "steps": [
      { "emoji": "😊", "label": "Tone", "caption": "Emotional feel" },
      { "emoji": "📏", "label": "Style", "caption": "Structure & format" },
      { "emoji": "🎯", "label": "Consistency", "caption": "Same voice every time" }
    ]
  },
  "analogy": "It''s like a radio DJ vs. a news anchor reading the exact same fact. Same information, completely different feel — because tone shapes how a message lands, not just what it says.",
  "practice": {
    "prompt": "A chatbot for anxious students switches between casual jokes and stiff formal language message to message. What''s the main problem?",
    "options": ["Nothing, variety keeps it interesting", "Inconsistent tone makes the bot feel unpredictable and less trustworthy", "The bot is broken and needs to be rebuilt"],
    "correct_index": 1,
    "feedback": "Consistency builds trust — an inconsistent tone, even with correct answers, makes a bot feel unreliable and harder to predict, which matters even more for an anxious audience."
  },
  "fun_fact": "Voice and tone guidelines are such a big deal in real products that many companies write entire style guides — sometimes 20+ pages — just to define how their brand''s chatbot should ''sound'' in every situation.",
  "try_it": "Write the same short answer (like ''your order will arrive in 3 days'') in two different tones — one casual, one formal. Notice how differently they feel."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'tone-and-style');

UPDATE public.lesson_content SET content = '{
  "hook": "A chatbot without boundaries will eventually get asked to do something it shouldn''t — the question isn''t if, it''s when, and how ready you are.",
  "explanation": "Rules define what a bot will and won''t do: topics it should avoid, requests it should refuse, and how it should handle attempts to push past its intended purpose. Clear boundaries protect both users and whoever built the bot.\n\nGood boundary-setting isn''t just a blunt ''refuse everything sensitive'' — it''s specific: what exactly should the bot decline, and what should it say instead? A vague refusal frustrates users; a clear, polite redirect keeps the interaction useful.\n\nBoundaries should also cover ''off-topic drift'' — what happens when a homework-help bot gets asked something completely unrelated? Deciding that in advance keeps the bot focused on its actual job.",
  "visual": {
    "caption": "Setting a boundary well",
    "steps": [
      { "emoji": "🚫", "label": "What to decline", "caption": "Be specific, not vague" },
      { "emoji": "💬", "label": "What to say instead", "caption": "A clear, polite redirect" },
      { "emoji": "🎯", "label": "Stay on-topic", "caption": "Redirect off-topic drift" }
    ]
  },
  "analogy": "It''s like a good babysitter setting rules before the parents leave. Vague rules (''be safe'') lead to confusion in the moment. Specific rules (''no screens after 8pm, here''s what to say if asked'') mean everyone knows exactly what to expect.",
  "practice": {
    "prompt": "A homework-help bot gets asked an unrelated, off-topic question. What''s the best boundary response?",
    "options": ["Silently ignore the user", "Politely note it''s outside the bot''s purpose and redirect back to homework help", "Answer anything asked, no matter the topic"],
    "correct_index": 1,
    "feedback": "A clear, polite redirect keeps the bot useful and predictable — it acknowledges the user without pretending the bot can or should answer everything."
  },
  "fun_fact": "Real production chatbots often have entire categories of pre-written ''refusal'' responses tested against thousands of edge cases, specifically so refusals feel consistent rather than jarring or robotic.",
  "try_it": "Write one boundary rule and its exact polite redirect message for your FORGE chatbot."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'rules-and-boundaries');

UPDATE public.lesson_content SET content = '{
  "hook": "Your chatbot will work perfectly on the first question you try — and then someone will ask it something you never imagined. That gap is exactly what testing is for.",
  "explanation": "Testing a chatbot means deliberately trying a range of inputs: normal questions, edge cases, off-topic questions, and even attempts to break its rules — before real users do it for you. This reveals gaps between what you intended and what the bot actually does.\n\nWhen something goes wrong, debugging usually traces back to one of three places: the system message is ambiguous, the knowledge base is missing or wrong information, or the temperature/settings don''t fit the task. Fixing the root cause, not just the symptom, prevents the same issue from popping back up elsewhere.\n\nTreat this like an ongoing loop, not a one-time step: test, find a weak spot, tighten the instructions, test again. The best chatbots are the ones that got tested the most, not the ones written most cleverly on the first try.",
  "visual": {
    "caption": "The test-and-fix loop",
    "steps": [
      { "emoji": "🧪", "label": "Try inputs", "caption": "Normal, edge, off-topic" },
      { "emoji": "🔍", "label": "Spot the gap", "caption": "What went wrong?" },
      { "emoji": "🛠️", "label": "Fix root cause", "caption": "System message, KB, or settings" },
      { "emoji": "🔁", "label": "Test again", "caption": "Confirm it''s actually fixed" }
    ]
  },
  "analogy": "It''s like stress-testing a new recipe by cooking it for picky friends before serving it at a big dinner. Better to find out it needs more salt in a small test than in front of everyone.",
  "practice": {
    "prompt": "Your chatbot gives a wrong answer about a policy that IS in its knowledge base. Where should you look first?",
    "options": ["Assume the AI model is broken and unfixable", "Check whether the system message is actually telling the bot to use the knowledge base for that kind of question", "Give up on knowledge bases entirely"],
    "correct_index": 1,
    "feedback": "If correct info exists in the knowledge base but isn''t showing up in answers, the most common cause is the system message not clearly instructing the bot to prioritize and cite that knowledge base content."
  },
  "fun_fact": "Teams that build production AI chatbots often maintain a running library of hundreds of real test questions — including deliberately tricky ones — that they re-run every time they change the system message, just like a code test suite.",
  "try_it": "Write 3 test questions for your chatbot: one normal, one edge case, and one that tries to push it off-topic."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'testing-debugging-bot');
