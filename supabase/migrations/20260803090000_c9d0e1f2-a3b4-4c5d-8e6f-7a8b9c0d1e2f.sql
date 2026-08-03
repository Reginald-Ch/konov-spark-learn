-- Module 5 content upgrade: adds "visual" and "practice" fields, tightens explanation text.

UPDATE public.lesson_content SET content = '{
  "hook": "A chatbot talks. An agent does. That single difference changes everything about what''s possible — and what can go wrong.",
  "explanation": "A chatbot responds to messages with text — it can inform, explain, or converse, but it can''t actually take action in the world. An agent goes a step further: it can use tools to actually do things — search the web, run code, send an email, update a database — deciding for itself which tool to use and when.\n\nThis added power comes with added responsibility. A chatbot that gives a wrong answer is embarrassing. An agent that takes a wrong action — sending the wrong email, deleting the wrong file — has real consequences. That''s why agents need much tighter rules and boundaries than a plain chatbot.\n\nMost real-world AI products today are still simple chatbots; true autonomous agents are newer, more powerful, and require more careful design.",
  "visual": {
    "caption": "Talking vs. doing",
    "steps": [
      { "emoji": "💬", "label": "Chatbot", "caption": "Generates text replies" },
      { "emoji": "🧰", "label": "Agent", "caption": "Chooses & uses tools" },
      { "emoji": "⚡", "label": "Takes action", "caption": "Real-world consequences" }
    ]
  },
  "analogy": "A chatbot is like a knowledgeable friend on the phone giving you directions. An agent is like that friend actually driving the car — much more useful, but a wrong turn now actually matters.",
  "practice": {
    "prompt": "A bot that can search the web AND send emails on your behalf, deciding on its own which action to take, is best described as:",
    "options": ["A simple chatbot", "An agent", "Neither, this isn''t possible"],
    "correct_index": 1,
    "feedback": "Choosing and using tools to take real actions (searching, sending) is the defining trait of an agent, not just a chatbot."
  },
  "fun_fact": "The rise of AI agents that can browse the web and use software tools is one of the fastest-growing areas in AI right now — and also one of the most actively debated for safety, since actions are harder to undo than words.",
  "try_it": "Think of a task you do online. Would a chatbot (advice only) or an agent (does it for you) be more useful for it? Explain in one sentence."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'chatbot-vs-agent');

UPDATE public.lesson_content SET content = '{
  "hook": "An agent is only as capable as the tools you hand it. No tools, no actions — just a chatbot wearing an agent costume.",
  "explanation": "A tool is a specific capability you give an agent — like a calculator function, a web search, or an API call to check the weather. Each tool needs a clear description so the model knows exactly when and how to use it; a vague tool description leads to the agent picking the wrong tool or not using one it needed.\n\nGood tool design follows the same specificity principle as good prompts: name the tool clearly, describe exactly what it does and what inputs it needs, and be explicit about when NOT to use it.\n\nMore tools isn''t automatically better — an agent with 20 overlapping, poorly-described tools often performs worse than one with 3 clear, well-described tools, because ambiguity multiplies with every extra option.",
  "visual": {
    "caption": "What makes a tool usable by an agent",
    "steps": [
      { "emoji": "🏷️", "label": "Clear name", "caption": "What it''s called" },
      { "emoji": "📝", "label": "Clear description", "caption": "What it does & needs" },
      { "emoji": "🚦", "label": "When to use it", "caption": "And when not to" }
    ]
  },
  "analogy": "It''s like handing someone a toolbox with unlabeled tools. Even a skilled person will grab the wrong one or hesitate — clear labels (tool descriptions) are what actually make the toolbox usable.",
  "practice": {
    "prompt": "An agent has a ''get_weather'' tool with the description ''gets weather.'' A user asks about tomorrow''s weather in a specific city, but the agent doesn''t call the tool. What''s the likely cause?",
    "options": ["The agent is broken", "The vague description doesn''t clarify what input (like a city name) the tool needs", "Weather tools never work"],
    "correct_index": 1,
    "feedback": "A vague tool description leaves the model unsure what input to provide or exactly when the tool applies — specificity in the description directly affects whether the agent uses it correctly."
  },
  "fun_fact": "This pattern — giving a model a defined menu of callable tools with structured descriptions — is often called ''function calling,'' and it''s the core mechanism behind most modern AI agents.",
  "try_it": "Name one tool you''d want to give an AI agent, and write a one-sentence description clear enough that it wouldn''t be confused with any other tool."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'giving-agent-tools');

UPDATE public.lesson_content SET content = '{
  "hook": "The best AI agents don''t just blurt out an action — they think first, act, then check what happened. That loop has a name: ReAct.",
  "explanation": "The ReAct pattern (Reason + Act) breaks an agent''s process into a repeating loop: Thought (reason about what to do next and why), Action (use a specific tool to do it), and Observation (look at the result and decide the next step).\n\nThis loop can repeat multiple times for a single request — the agent might search, observe the results weren''t quite right, search again with better terms, then finally answer. Without this loop, an agent would just guess an action once and hope for the best.\n\nThis structure is also what makes agent behavior more inspectable — you can literally read the agent''s ''thoughts'' at each step to understand why it chose the action it did, which matters a lot for debugging and for trust.",
  "visual": {
    "caption": "The ReAct loop",
    "steps": [
      { "emoji": "🤔", "label": "Thought", "caption": "Reason about next step" },
      { "emoji": "⚡", "label": "Action", "caption": "Use a tool" },
      { "emoji": "👀", "label": "Observation", "caption": "Check the result" },
      { "emoji": "🔁", "label": "Repeat", "caption": "Until the task is done" }
    ]
  },
  "analogy": "It''s like a detective solving a case: think about what clue to check next, go check it (action), see what you find (observation), then think again based on that new information — repeating until the case is solved.",
  "practice": {
    "prompt": "An agent searches for a restaurant, observes that the result is permanently closed, and then searches again with different terms. What part of the ReAct loop does that second search represent?",
    "options": ["A completely separate, unrelated process", "A new Action, informed by the previous Observation", "A system error"],
    "correct_index": 1,
    "feedback": "That''s the loop working correctly — the Observation (permanently closed) informed a new Thought, which triggered a new Action (searching again)."
  },
  "fun_fact": "The ReAct pattern comes from a real 2022 AI research paper, and it''s now one of the most widely used blueprints for building reliable AI agents across the industry.",
  "try_it": "Pick a multi-step task (planning a trip, researching a topic). Write one Thought → Action → Observation cycle you''d want an agent to go through."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'thought-action-observation');

UPDATE public.lesson_content SET content = '{
  "hook": "Ask an agent to plan a birthday party, and it can''t just react to one step at a time — it needs a plan with multiple moving pieces in the right order.",
  "explanation": "Multi-step planning is when an agent breaks a big goal into an ordered sequence of smaller steps before (or while) executing them — instead of tackling everything in one giant leap. This matters because complex real-world tasks usually have dependencies: you can''t book a venue before you know the guest count, and you can''t finalize a guest count before checking a date.\n\nGood planning also means noticing when a step fails and adjusting the rest of the plan, rather than blindly continuing. An agent that plows ahead after a failed step often compounds the error.\n\nThis is one of the harder agent skills to get right — it requires balancing enough structure to stay organized with enough flexibility to adapt when reality doesn''t match the plan.",
  "visual": {
    "caption": "Breaking a goal into steps",
    "steps": [
      { "emoji": "🎯", "label": "Big goal", "caption": "e.g. plan a party" },
      { "emoji": "📋", "label": "Ordered steps", "caption": "Respecting dependencies" },
      { "emoji": "🔄", "label": "Adjust on failure", "caption": "Replan when needed" }
    ]
  },
  "analogy": "It''s like planning a road trip. You can''t book the hotel before deciding the route, and if a road is closed mid-trip, a good planner reroutes instead of driving into a wall. Planning isn''t just a list — it''s an order, plus the flexibility to adapt.",
  "practice": {
    "prompt": "An agent tries to book a venue for a party before confirming the guest count, and the venue turns out to be too small. What went wrong?",
    "options": ["Bad luck, nothing could be done", "A dependency was ignored — guest count should have been confirmed before booking a venue", "The agent should never plan anything"],
    "correct_index": 1,
    "feedback": "This is a classic planning-order mistake — some steps depend on earlier ones, and skipping that order leads to decisions made with incomplete information."
  },
  "fun_fact": "Multi-step planning is considered one of the hardest unsolved challenges in AI agents today — even very capable models can struggle to keep a long plan coherent across many steps without losing track or drifting off course.",
  "try_it": "Pick a multi-step goal (like organizing a study session). List 3 steps in the order they''d actually need to happen, and note one dependency between them."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'multi-step-planning');

UPDATE public.lesson_content SET content = '{
  "hook": "Without memory, every conversation with an agent starts from zero — like meeting a brilliant stranger who forgets you the moment you say goodbye.",
  "explanation": "Agent memory is how a system retains useful information across a conversation or across multiple sessions, beyond what fits in a single context window. Short-term memory is usually just the current conversation. Long-term memory involves deliberately saving specific facts (like a user''s preferences or past decisions) somewhere outside the model, then retrieving them when relevant.\n\nMemory isn''t automatic or free — someone has to decide what''s worth remembering, where to store it, and how to fetch the right memory at the right time without overwhelming the agent with irrelevant history.\n\nBadly designed memory can actually hurt an agent — surfacing outdated or irrelevant facts can confuse a response just as much as having no memory at all. Good memory design is selective, not exhaustive.",
  "visual": {
    "caption": "Two kinds of memory",
    "steps": [
      { "emoji": "💬", "label": "Short-term", "caption": "Current conversation only" },
      { "emoji": "🗄️", "label": "Long-term", "caption": "Saved facts, retrieved later" },
      { "emoji": "🎯", "label": "Selective recall", "caption": "Only what''s relevant now" }
    ]
  },
  "analogy": "Short-term memory is like remembering what someone said 5 minutes ago in the same conversation. Long-term memory is like a friend who took notes on your birthday and preferences months ago, and brings them up again at exactly the right moment.",
  "practice": {
    "prompt": "A study-buddy agent remembers a student struggles with fractions, even in a brand new conversation weeks later. What kind of memory is this?",
    "options": ["Short-term memory", "Long-term memory — a fact saved and retrieved across sessions", "This isn''t possible for AI"],
    "correct_index": 1,
    "feedback": "Retaining a specific fact across separate conversations, well beyond a single context window, is exactly what long-term memory systems are designed to do."
  },
  "fun_fact": "Many production AI assistants use a technique where they save short ''memory notes'' about you after a conversation, then search through those notes for relevant ones the next time you chat — rather than trying to remember everything.",
  "try_it": "Think of one fact about you that would actually be useful for an AI study assistant to remember across sessions. Write it in one sentence."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'agent-memory');
