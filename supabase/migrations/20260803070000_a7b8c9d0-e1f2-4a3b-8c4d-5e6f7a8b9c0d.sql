-- Module 3 content upgrade: adds "visual" and "practice" fields, tightens explanation text.

UPDATE public.lesson_content SET content = '{
  "hook": "ChatGPT feels like it ''understands'' you. It doesn''t — not the way you do. It''s predicting the next word, over and over, at a scale that makes the illusion incredibly convincing.",
  "explanation": "A Large Language Model (LLM) is trained on huge amounts of text — books, websites, conversations — to predict the next most likely word (technically, ''token'') given everything that came before it. Do that one word at a time, fast enough, and you get fluent, coherent paragraphs.\n\nIt has no memory of you between separate conversations, no beliefs, no goals — it''s pattern-completing text based on probability. That''s why it can sound extremely confident while being completely wrong; nothing in its process checks facts, it just predicts what text usually looks like.\n\nThis is also why LLMs power chatbots, writing assistants, code helpers, and translation tools — anything that''s fundamentally about generating fluent language.",
  "visual": {
    "caption": "How an LLM answers you",
    "steps": [
      { "emoji": "⌨️", "label": "Your prompt", "caption": "Text goes in" },
      { "emoji": "🎲", "label": "Predict next word", "caption": "One token at a time" },
      { "emoji": "🔁", "label": "Repeat", "caption": "Builds the full reply" }
    ]
  },
  "analogy": "It''s like an extremely well-read improv performer who''s memorized the ''feel'' of nearly every genre of writing. Ask a question, and they instantly generate a fluent-sounding answer in that style — even if they''re making up facts, because their real skill is sounding right, not being right.",
  "practice": {
    "prompt": "An LLM confidently states an incorrect historical date. Why did that happen?",
    "options": ["It''s deliberately lying to you", "It''s predicting plausible-sounding text, and nothing in that process guarantees factual accuracy", "LLMs never make mistakes"],
    "correct_index": 1,
    "feedback": "LLMs generate the most statistically likely next words — that''s often correct, but nothing forces it to be factually verified, which is why confident wrong answers (''hallucinations'') happen."
  },
  "fun_fact": "The word ''token'' isn''t always a full word — common words are often one token, but longer or rarer words get split into pieces, like ''unbelievable'' becoming ''un'' + ''believable.''",
  "try_it": "Ask an AI chatbot a question about something you know well. See if you can catch even one small inaccuracy — it''s a great way to build a healthy skepticism."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'what-is-an-llm');

UPDATE public.lesson_content SET content = '{
  "hook": "Ever wonder why a chatbot ''forgets'' something you said way earlier in a long conversation? The answer is a hard limit called the context window.",
  "explanation": "A token is the small chunk of text a model actually processes — roughly ¾ of a word on average in English. Every prompt you type and every reply you get is broken down into tokens.\n\nThe context window is the maximum number of tokens a model can ''see'' at once — your entire conversation history, plus the current message, has to fit inside it. Once a conversation grows past that limit, the oldest parts get dropped or summarized, which is why long chats can seem to ''forget'' earlier details.\n\nThis matters practically: longer, cluttered prompts eat into your context budget and can push out useful earlier context, so being clear and concise isn''t just nice — it''s functionally efficient.",
  "visual": {
    "caption": "Where your words go",
    "steps": [
      { "emoji": "✍️", "label": "Prompt", "caption": "Your typed text" },
      { "emoji": "🔢", "label": "Tokens", "caption": "Broken into chunks" },
      { "emoji": "🪟", "label": "Context window", "caption": "Limited space the model can see" }
    ]
  },
  "analogy": "Think of the context window like a whiteboard of fixed size. As you keep writing, eventually you run out of room — to add something new, you have to erase something old, usually starting from what you wrote first.",
  "practice": {
    "prompt": "In a very long chatbot conversation, the bot suddenly seems to forget something you mentioned 200 messages ago. What''s the most likely reason?",
    "options": ["The bot is being lazy", "That message likely fell outside the model''s context window and got dropped", "Chatbots have unlimited memory of every conversation"],
    "correct_index": 1,
    "feedback": "Context windows are limited — once a conversation exceeds that token limit, the earliest content is typically dropped or summarized to make room."
  },
  "fun_fact": "Early chatbot context windows held only a few thousand tokens (a few pages of text); modern large models can hold context windows equivalent to hundreds of pages in a single conversation.",
  "try_it": "Count roughly how many words are in your last message to a chatbot. Multiply by about 1.3 to estimate the token count — that''s how the model actually ''sees'' your text."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'tokens-prompts-context');

UPDATE public.lesson_content SET content = '{
  "hook": "Every chatbot you''ve ever used has a secret instruction sheet running behind the scenes before you type a single word — the system prompt.",
  "explanation": "A system prompt is a set of instructions given to the model before the conversation starts, invisible to the end user, that shapes how it should behave: its personality, its rules, what it should refuse to do, and how it should format answers.\n\nThink of the conversation as having layers: the system prompt sets the ground rules, then the user''s messages are layered on top. A well-written system prompt is specific and concrete — ''you are a friendly, patient math tutor for 8th graders who never gives the final answer directly'' works far better than ''be helpful.''\n\nThis is exactly the mechanism FORGE participants use to build a chatbot''s personality and rules in the Build Your Own Chatbot module — the system prompt is the real ''programming'' of a chatbot''s behavior.",
  "visual": {
    "caption": "How instructions stack",
    "steps": [
      { "emoji": "🔒", "label": "System prompt", "caption": "Hidden rules, set first" },
      { "emoji": "💬", "label": "User message", "caption": "What you actually type" },
      { "emoji": "🤖", "label": "Response", "caption": "Shaped by both layers" }
    ]
  },
  "analogy": "It''s like an actor getting a character brief before walking onstage. The audience only sees the performance (the reply), but the character brief (system prompt) is quietly steering every choice the actor makes.",
  "practice": {
    "prompt": "Which system prompt is more likely to produce consistent, useful chatbot behavior?",
    "options": ["''Be helpful.''", "''You are a calm study-buddy for 10th grade biology. Always explain with a real-world example, and never give a direct test answer.''", "No system prompt at all"],
    "correct_index": 1,
    "feedback": "Specific, concrete instructions with a clear role, tone, and boundary produce far more consistent behavior than vague guidance like ''be helpful.''"
  },
  "fun_fact": "Some companies'' full system prompts for their production chatbots have leaked online and run for thousands of words — covering tone, banned topics, formatting rules, and edge-case handling in extreme detail.",
  "try_it": "Write one sentence of a system prompt for a chatbot persona you''d want to build — include a role, a tone, and one clear rule."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'system-prompts');

UPDATE public.lesson_content SET content = '{
  "hook": "Ask the same chatbot the same question twice and sometimes get two different answers. That''s not a bug — it''s a dial called temperature, and you can control it.",
  "explanation": "Temperature is a setting that controls how random or predictable a model''s word choices are. At low temperature, the model almost always picks the single most likely next word — answers are focused, consistent, and repeatable. At high temperature, it''s more willing to pick less-likely words — answers get more varied, creative, and occasionally weirder or less accurate.\n\nThere''s no universally ''correct'' setting — it depends on the task. Low temperature suits factual Q&A, code generation, or anything needing consistency. Higher temperature suits brainstorming, creative writing, or generating varied options.\n\nCranking temperature too high can push a model into incoherent or nonsensical territory — creativity and reliability sit on opposite ends of the same dial.",
  "visual": {
    "caption": "One dial, two tradeoffs",
    "steps": [
      { "emoji": "🧊", "label": "Low temp", "caption": "Focused, predictable" },
      { "emoji": "🌡️", "label": "Mid temp", "caption": "Balanced" },
      { "emoji": "🔥", "label": "High temp", "caption": "Creative, more random" }
    ]
  },
  "analogy": "Low temperature is like a chess grandmaster always playing the statistically best move. High temperature is like a jazz musician improvising — more surprising, sometimes brilliant, sometimes a wrong note.",
  "practice": {
    "prompt": "You''re building a chatbot that answers exact FAQ questions about a product''s return policy. What temperature setting fits best?",
    "options": ["Low — you want consistent, focused, accurate answers", "High — creativity matters most here", "Temperature doesn''t matter for this use case"],
    "correct_index": 0,
    "feedback": "Factual, consistency-critical tasks like an FAQ bot benefit from low temperature — you want the same correct answer every time, not creative variation."
  },
  "fun_fact": "The term ''temperature'' in AI is borrowed directly from physics and statistics (the Boltzmann distribution), where a higher ''temperature'' similarly means more randomness in a system.",
  "try_it": "Think of two different chatbot use cases — one that should always give the same precise answer, and one where variety would actually be good. Name both in one sentence each."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'temperature-creativity');

UPDATE public.lesson_content SET content = '{
  "hook": "The exact same question can get you a brilliant answer or a useless one — depending entirely on how you ask it. That''s the whole game of prompt engineering.",
  "explanation": "Prompt engineering is the practice of writing inputs that reliably get useful, accurate output from an AI model. A few core techniques: be specific (vague prompts get vague answers), give context (background info narrows down what the model should assume), show examples (''few-shot'' prompting — giving 1-2 sample answers dramatically improves consistency), and ask for a format (''respond in 3 bullet points'' beats hoping it guesses the format you want).\n\nIt''s iterative — the first version of a prompt is rarely the best one. Professional prompt engineers test, tweak wording, and refine based on the actual outputs they get back, the same way you''d debug code.\n\nGood prompting isn''t about ''tricking'' the AI — it''s about removing ambiguity so the model has less room to guess wrong.",
  "visual": {
    "caption": "Ingredients of a strong prompt",
    "steps": [
      { "emoji": "🎯", "label": "Be specific", "caption": "Cut the vagueness" },
      { "emoji": "📚", "label": "Give context", "caption": "Set the scene" },
      { "emoji": "💡", "label": "Show examples", "caption": "Demonstrate the pattern" },
      { "emoji": "📐", "label": "Ask for format", "caption": "Say how you want it back" }
    ]
  },
  "analogy": "It''s like ordering coffee. ''Give me a coffee'' might get you anything. ''A medium oat-milk latte, extra hot, no foam'' gets you exactly what you wanted — same barista, same menu, wildly different result based on how you asked.",
  "practice": {
    "prompt": "Which prompt is most likely to get a consistently useful answer?",
    "options": ["''Tell me about dogs''", "''List 5 beginner-friendly dog breeds for a first-time owner in an apartment, as a numbered list with one sentence each''", "''Dogs?''"],
    "correct_index": 1,
    "feedback": "Specificity, context (first-time owner, apartment), and a requested format (numbered list) all narrow down the model''s guesswork and produce a far more useful answer."
  },
  "fun_fact": "''Few-shot prompting'' — giving a model 2-3 examples of the input/output pattern you want — can sometimes improve accuracy on a task more than switching to an entirely bigger, more expensive model.",
  "try_it": "Take a vague question you might ask a chatbot and rewrite it using at least 2 of the 4 techniques above (specific, context, examples, format)."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'prompt-engineering-101');
