export type ProjectType = 'chatbot' | 'agent';

export interface ProjectScaffold {
  main: string;
  config: string;
  requirements: string;
  name: string;
  icon: string;
  systemPrompt: string;
  capabilities: string[];
}

export const PROJECT_SCAFFOLDS: Record<ProjectType, ProjectScaffold> = {
  chatbot: {
    name: 'AI Chatbot',
    icon: '🤖',
    systemPrompt: 'You are a helpful AI assistant that answers questions clearly and concisely.',
    capabilities: ['Web Search', 'Citations', 'Memory'],
    main: `#!/usr/bin/env python3
"""
🤖 FORGE AI Chatbot — 24 Build-Up Challenges
==============================================
Every variable below DIRECTLY controls your chatbot.
Edit any value → test instantly in Live Preview →

🎯 RULES:
  - ALL variables are LIVE — every edit changes your bot
  - Test after EACH change in Live Preview (right panel)
   - Complete all 24 challenges to build a unique AI!

⏱️ Time: 50-70 minutes
"""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 1: Name Your Bot
# Change the name — it appears in Live Preview header
# ═══════════════════════════════════════════════
BOT_NAME = "Spark"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 2: Choose an Emoji Avatar
# This emoji represents your bot in the chat
# ═══════════════════════════════════════════════
BOT_EMOJI = "🤖"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 3: Write a Greeting
# First message users see — make it welcoming!
# ═══════════════════════════════════════════════
AI_MESSAGE = "Hey there! I'm Spark, your AI buddy. Ask me anything!"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 4: Claim Your Creation
# Add your name so everyone knows who built this
# ═══════════════════════════════════════════════
CREATOR_NAME = "A FORGE Builder"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 5: Define the Personality (MOST IMPORTANT!)
# This is your bot's "brain". Write 3+ sentences using
# triple-quoted strings (Python multi-line syntax):
#
#   SYSTEM_MESSAGE = """
#     You are Chef Kofi, a Ghanaian cooking expert who
#     explains recipes using fun stories. You always
#     mention local ingredients and keep things simple.
#   """
#
# TIP: Use triple quotes \\"\\"\\" for multi-line strings!
# ═══════════════════════════════════════════════
SYSTEM_MESSAGE = "You are a helpful AI assistant that answers questions clearly and concisely."

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 6: Add Knowledge (Triple-Quoted String)
# Write a multi-line string with facts your bot should know.
# Use triple quotes and format with line breaks:
#
#   KNOWLEDGE_BASE = \\"\\"\\"
#   TOPIC: Python Programming
#   - Created by Guido van Rossum in 1991
#   - Used for AI, web development, data science
#   - Key libraries: TensorFlow, Django, Pandas
#   \\"\\"\\"
# ═══════════════════════════════════════════════
KNOWLEDGE_BASE = """"""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 7: Write Q&A Pairs (List of Dictionaries)
# Type this structure yourself — each pair is a Python dict
# inside a list. You MUST use the exact keys "q" and "a":
#
#   QA_PAIRS = [
#       {"q": "What is AI?", "a": "AI is machines that learn!"},
#       {"q": "Who made you?", "a": "I was built at FORGE!"},
#   ]
#
# 🧪 TEST: Ask your exact "q" text → bot gives your "a"
# ═══════════════════════════════════════════════
QA_PAIRS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 8: Set Creativity Level (Float)
# Type a decimal number between 0.0 and 1.0
#   0.0 = very strict/factual (robot-like)
#   0.5 = balanced
#   1.0 = very creative/random
#
# 🧪 TEST: Set to 0.1, ask a question. Then set to 0.9
#          and ask the SAME question — compare the answers!
# ═══════════════════════════════════════════════
TEMPERATURE = 0.7

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Write Conversation Rules (Python List)
# Type a list of strings — each string is a rule.
# Your bot MUST follow every rule you write here!
#
#   RULES = [
#       "Always be friendly and encouraging",
#       "Use at least one emoji in every response",
#       "If you don't know something, say so honestly",
#       "Never give answers longer than 3 sentences",
#   ]
#
# Write at least 3 rules from scratch:
# ═══════════════════════════════════════════════
RULES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Write Conversation Starters (Python List)
# These appear as clickable buttons in Live Preview.
# Create a list of 3-5 strings:
#
#   CONVERSATION_STARTERS = [
#       "Tell me about yourself",
#       "What can you help me with?",
#   ]
# ═══════════════════════════════════════════════
CONVERSATION_STARTERS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Set Forbidden Words (Python List)
# Words your bot must NEVER use. The AI finds alternatives.
# This teaches CONTENT FILTERING — a real AI safety skill!
#
#   FORBIDDEN_WORDS = ["stupid", "dumb", "boring", "hate"]
#
# 🧪 TEST: Ask something that would normally use these
#          words — your bot will find smart alternatives!
# ═══════════════════════════════════════════════
FORBIDDEN_WORDS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Blocked Topics (Python List)
# Topics your bot will REFUSE to discuss entirely.
# Unlike FORBIDDEN_WORDS (which finds alternatives),
# blocked topics make the bot say "I can't discuss that."
#
#   BLOCKED_TOPICS = ["homework answers", "violence"]
# ═══════════════════════════════════════════════
BLOCKED_TOPICS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Write Few-Shot Examples (List of Dicts)
# Teach your bot HOW to answer by showing examples.
# Each example is a dict with "input" and "output" keys:
#
#   FEW_SHOT_EXAMPLES = [
#       {
#           "input": "Tell me about 1957",
#           "output": "Ayekoo! 🇬🇭 On March 6, 1957, Ghana became the first sub-Saharan African country to gain independence!"
#       },
#       {
#           "input": "What is jollof rice?",
#           "output": "Jollof rice is a beloved West African dish — and Ghana's version is the BEST! 🍚🔥"
#       },
#   ]
#
# Write at least 2 examples with nested dict syntax:
# ═══════════════════════════════════════════════
FEW_SHOT_EXAMPLES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Secret Responses (Python Dictionary)
# Hidden surprises! When a user types an EXACT trigger
# phrase, your bot instantly replies with your response.
#
# 💡 Different from Q&A Pairs:
#   - Q&A Pairs = educational answers (keyword matching)
#   - SECRET_RESPONSES = fun easter eggs (EXACT phrase only)
#
#   SECRET_RESPONSES = {
#       "secret": "🎉 You found a hidden feature!",
#       "hello world": "👨‍💻 Every great programmer starts here.",
#       "magic": "✨ Abracadabra!",
#   }
#
# 🧪 TEST: Type your exact trigger phrase → instant reply!
# ═══════════════════════════════════════════════
SECRET_RESPONSES = {}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Mood-Based Responses (Dictionary Routing!)
# Your bot changes HOW it responds based on detected mood!
# This teaches DICTIONARY LOOKUP — a key Python pattern.
#
# Each key is a mood the bot detects, and the value is
# the instruction for how to respond in that mood:
#
#   MOOD_RESPONSES = {
#       "happy": "Be enthusiastic and use lots of emojis! 🎉",
#       "confused": "Break things down step by step simply",
#       "frustrated": "Be extra patient and empathetic",
#       "curious": "Go deeper with fascinating details",
#   }
#
# 🧪 TEST: Say "I'm frustrated" → bot should be empathetic!
#          Say "I'm curious about space" → bot goes deep!
# ═══════════════════════════════════════════════
MOOD_RESPONSES = {}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Response Length (String)
# "short"  = 1-2 sentences
# "medium" = 1 paragraph
# "long"   = detailed multi-paragraph
# ═══════════════════════════════════════════════
MAX_RESPONSE_LENGTH = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set Token Limit (Integer)
# Tokens ≈ words. AI models have a "context window" —
# a max number of tokens they can read + write.
#
# Try different values and see what happens:
#   50   = very short (1-2 sentences, may cut off!)
#   200  = short paragraph
#   512  = default, good balance
#   1024 = long, detailed responses
#
# 🧪 TEST: Set to 50, ask a complex question — see how
#          the AI has to compress its answer!
# ═══════════════════════════════════════════════
MAX_TOKENS = 512

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Set the Mood (String)
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# ═══════════════════════════════════════════════
MOOD = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Smart Tone Routing (If/Elif Conditional!)
# Your bot picks a RESPONSE_TONE based on TIME_OF_DAY!
# This teaches IF/ELIF/ELSE — Python's conditional logic.
#
# Edit the values to customize how your bot greets users
# at different times:
#
#   if TIME_OF_DAY == "morning":
#       RESPONSE_TONE = "energetic and cheerful, use morning greetings"
#   elif TIME_OF_DAY == "afternoon":
#       RESPONSE_TONE = "warm and productive"
#   elif TIME_OF_DAY == "evening":
#       RESPONSE_TONE = "relaxed and reflective"
#   else:
#       RESPONSE_TONE = "friendly"
#
# 🧪 TEST: Change TIME_OF_DAY and chat — notice the tone shift!
# ═══════════════════════════════════════════════
TIME_OF_DAY = "morning"

if TIME_OF_DAY == "morning":
    RESPONSE_TONE = "energetic and cheerful"
elif TIME_OF_DAY == "afternoon":
    RESPONSE_TONE = "warm and productive"
elif TIME_OF_DAY == "evening":
    RESPONSE_TONE = "relaxed and reflective"
else:
    RESPONSE_TONE = "friendly"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add Catchphrases (Python List)
# Your bot naturally weaves these signature phrases
# into every response. Make them memorable!
#
#   CATCHPHRASES = ["Fun fact!", "Here's the thing...", "Pro tip:"]
# ═══════════════════════════════════════════════
CATCHPHRASES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 21: Enable Voice Mode (Boolean)
# Set to True to make your bot SPEAK its responses!
# This teaches Feature Flags — a real dev technique.
#
#   VOICE_ENABLED = True
#
# 🧪 TEST: Set True → send a message → hear your bot talk!
# ═══════════════════════════════════════════════
VOICE_ENABLED = False

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 22: Choose Voice Mode (String)
# How users interact with voice:
#   "push-to-talk" = click a button to speak
#   "hands-free"   = always listening (like Alexa!)
#
# 🧪 TEST: Switch between modes and feel the difference!
# ═══════════════════════════════════════════════
VOICE_MODE = "push-to-talk"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 23: Set a Wake Word (String)
# Like "Hey Siri" or "OK Google" — your bot only
# starts listening after hearing this phrase!
# Only works in hands-free mode.
#
#   WAKE_WORD = "Hey Spark"
#
# 🧪 TEST: Set hands-free + wake word → say the phrase!
# ═══════════════════════════════════════════════
WAKE_WORD = ""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 24: Choose Voice Gender (String)
# Controls the TTS voice used to speak responses.
#   "default" = browser default voice
#   "female"  = picks a female voice
#   "male"    = picks a male voice
#
# 🧪 TEST: Switch between "female" and "male" and listen!
# ═══════════════════════════════════════════════
VOICE_GENDER = "default"

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
APP_THEME = "default"

# ═══════════════════════════════════════════════
# BONUS SETTINGS (already configured!)
# ═══════════════════════════════════════════════
RESPONSE_STYLE = "Balanced"
LANGUAGE_STYLE = "casual"
SIGN_OFF = ""
FOLLOW_UP_QUESTIONS = True
MEMORY_ENABLED = True
ERROR_MESSAGE = "Oops! Something went wrong. Try asking differently! 🔄"

# ═══════════════════════════════════════════════
# 🏁 CHALLENGE CHECKLIST — Test each one!
# ═══════════════════════════════════════════════
# ☐ 1.  BOT_NAME — Change it, see it in preview header
# ☐ 2.  BOT_EMOJI — Change it, see the avatar update
# ☐ 3.  AI_MESSAGE — See it in the welcome screen
# ☐ 4.  CREATOR_NAME — Ask "who created you?" to test
# ☐ 5.  SYSTEM_MESSAGE — Triple-quoted multi-line string
# ☐ 6.  KNOWLEDGE_BASE — Triple-quoted facts block
# ☐ 7.  QA_PAIRS — Write a list of {"q": ..., "a": ...} dicts
# ☐ 8.  TEMPERATURE — Type a float between 0.0 and 1.0
# ☐ 9.  RULES — Write a list of rule strings
# ☐ 10. CONVERSATION_STARTERS — Write a list of strings
# ☐ 11. FORBIDDEN_WORDS — Write a list of words to ban
# ☐ 12. BLOCKED_TOPICS — Write a list of refused topics
# ☐ 13. FEW_SHOT_EXAMPLES — List of {"input":..., "output":...}
# ☐ 14. SECRET_RESPONSES — Dict {"trigger": "response"}
# ☐ 15. MOOD_RESPONSES — Dict mapping moods to instructions
# ☐ 16. MAX_RESPONSE_LENGTH — "short", "medium", or "long"
# ☐ 17. MAX_TOKENS — Try 50 vs 1024 to see the difference!
# ☐ 18. MOOD — Pick from options
# ☐ 19. RESPONSE_TONE — If/elif conditional logic!
# ☐ 20. CATCHPHRASES — Write signature phrases
# ☐ 21. VOICE_ENABLED — Set True to hear your bot speak!
# ☐ 22. VOICE_MODE — "push-to-talk" or "hands-free"
# ☐ 23. WAKE_WORD — Set a trigger phrase for hands-free
# ☐ 24. VOICE_GENDER — "female", "male", or "default"
# ═══════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# ⚙️ ENGINE — DO NOT EDIT BELOW THIS LINE
# FORGE reads your variables above and builds a LangChain
# pipeline automatically. Here's what happens behind the scenes:
# ═══════════════════════════════════════════════════════════════
#
# Step 1: Build the SystemMessage
#   → SYSTEM_MESSAGE + KNOWLEDGE_BASE + QA_PAIRS + RULES
#     are merged into one SystemMessage (langchain_core.messages)
#
# Step 2: Build the ChatPromptTemplate
#   → ChatPromptTemplate.from_messages([
#         SystemMessage(content=...),
#         MessagesPlaceholder("chat_history"),   ← conversation memory
#         ("human", "{input}"),                  ← user's message
#     ])
#
# Step 3: Attach ConversationBufferWindowMemory
#   → Keeps the last 20 HumanMessage / AIMessage pairs
#   → MEMORY_ENABLED controls whether this is active
#
# Step 4: Create the chain
#   → prompt | llm(temperature=TEMPERATURE, max_tokens=MAX_TOKENS)
#
# Step 5: Enforce your config at runtime
#   → SECRET_RESPONSES checked FIRST (exact phrase match)
#   → QA_PAIRS checked SECOND (keyword match)
#   → BLOCKED_TOPICS trigger a polite refusal
#   → FORBIDDEN_WORDS are filtered from output
#   → CATCHPHRASES are injected into responses
#   → SIGN_OFF is appended to every response
#   → MOOD + LANGUAGE_STYLE shape the tone
#   → FEW_SHOT_EXAMPLES teach the model your preferred format
#   → MAX_TOKENS limits how long the AI can respond
#
# FORGE handles the LLM connection, API keys, and streaming.
# Your bot is now LIVE — test it in the preview panel! →
# ═══════════════════════════════════════════════════════════════
`,
    config: `{
  "project_type": "chatbot",
  "model": "gemini-flash",
  "temperature": 0.7,
  "max_tokens": 512,
  "memory_window": 20,
  "capabilities": ["conversation_memory", "streaming", "knowledge_base", "voice"],
  "forge_version": "3.0",
  "challenges": 24,
  "notes": "Every variable in main.py is LIVE — edit and test instantly!"
}`,
    requirements: `# FORGE handles everything — no installs needed!
# Edit variables in main.py and test in Live Preview.
langchain>=0.3.0
langchain-core>=0.3.0
langchain-openai>=0.2.0
streamlit>=1.28.0`,
  },
  agent: {
    name: 'AI Agent',
    icon: '🧠',
    systemPrompt: 'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    capabilities: ['Web Search', 'Calculator', 'Code Execution'],
    main: `#!/usr/bin/env python3
"""
🧠 FORGE AI Agent — 24 Build-Up Challenges
============================================
An Agent USES TOOLS to take actions!
  🤖 Chatbot = answers from memory
  🧠 Agent   = searches, calculates, researches!

Every variable below is LIVE — edit and test instantly.

⏱️ Time: 50-70 minutes
"""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 1: Name Your Agent
# ═══════════════════════════════════════════════
BOT_NAME = "Research Agent"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 2: Choose an Emoji
# ═══════════════════════════════════════════════
BOT_EMOJI = "🧠"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 3: Write a Greeting
# ═══════════════════════════════════════════════
AI_MESSAGE = "I'm your research agent. I can search, calculate, and analyse. Give me a task!"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 4: Add Your Name
# ═══════════════════════════════════════════════
CREATOR_NAME = "A FORGE Builder"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 5: Define the Mission (MOST IMPORTANT!)
# ═══════════════════════════════════════════════
SYSTEM_MESSAGE = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 6: Add Knowledge
# ═══════════════════════════════════════════════
KNOWLEDGE_BASE = """Agents use a ReAct loop: Reason, Act, Observe.
Tools extend what an AI can do beyond just chatting.
FORGE agents can search the web, do math, and look up facts."""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 7: Add Exact Q&A Pairs
# ═══════════════════════════════════════════════
QA_PAIRS = [
    {"q": "What tools do you have?", "a": "I can search the web, do calculations, and look up facts on Wikipedia!"},
    {"q": "Who created you?", "a": "I was built by a talented FORGE developer!"},
    {"q": "How do you work?", "a": "I use a Reason-Act-Observe loop to solve problems step by step!"}
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 8: Set Creativity Level
# ═══════════════════════════════════════════════
TEMPERATURE = 0.3

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Add Agent Rules
# ═══════════════════════════════════════════════
RULES = [
    "Always show your reasoning step by step",
    "Cite sources when sharing facts",
    "Present findings in bullet points"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Task Starters
# ═══════════════════════════════════════════════
CONVERSATION_STARTERS = [
    "What's the latest news about AI?",
    "Calculate the area of a circle with radius 15",
    "Who invented the internet?",
    "Compare Python and JavaScript"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Set Forbidden Words
# Words your agent must NEVER use in responses.
# Teaches CONTENT FILTERING — a real AI safety skill!
# ═══════════════════════════════════════════════
FORBIDDEN_WORDS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Blocked Topics
# Topics your agent will REFUSE to discuss.
# ═══════════════════════════════════════════════
BLOCKED_TOPICS = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Add Few-Shot Examples
# Show your agent HOW you want it to answer.
# Write a list of {"input": ..., "output": ...} dicts.
# ═══════════════════════════════════════════════
FEW_SHOT_EXAMPLES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Secret Responses (Dictionary)
# Hidden surprises triggered by EXACT phrases only!
#
# 💡 Different from Q&A Pairs:
#   - Q&A Pairs = knowledge answers (keyword matching)
#   - SECRET_RESPONSES = fun easter eggs (EXACT match)
# ═══════════════════════════════════════════════
SECRET_RESPONSES = {
    "secret mission": "🕵️ Agent mode activated! Scanning all databases...",
    "42": "🌌 The answer to life, the universe, and everything!"
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Mood-Based Responses (Dictionary Routing!)
# Your agent adapts its style based on detected user mood!
# This teaches DICTIONARY LOOKUP — a key Python pattern.
#
#   MOOD_RESPONSES = {
#       "happy": "Match their energy with enthusiasm! 🎉",
#       "confused": "Break it down step by step",
#       "frustrated": "Be extra patient and empathetic",
#       "curious": "Go deep with fascinating analysis",
#   }
#
# 🧪 TEST: Say "I'm frustrated" → agent should be empathetic!
# ═══════════════════════════════════════════════
MOOD_RESPONSES = {
    "happy": "Be enthusiastic and celebrate with the user!",
    "frustrated": "Be extra patient, empathetic, and break things down",
    "curious": "Go deeper with thorough analysis and extra details"
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Response Length
# ═══════════════════════════════════════════════
MAX_RESPONSE_LENGTH = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set Token Limit (Integer)
# Tokens ≈ words. Controls max response size.
# Try 50 for compressed answers, 1024 for detailed!
# ═══════════════════════════════════════════════
MAX_TOKENS = 512

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Set the Mood
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# ═══════════════════════════════════════════════
MOOD = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Smart Tone Routing (If/Elif Conditional!)
# Your agent picks a RESPONSE_TONE based on TIME_OF_DAY!
# This teaches IF/ELIF/ELSE — Python's conditional logic.
#
#   if TIME_OF_DAY == "morning":
#       RESPONSE_TONE = "sharp and analytical"
#   elif TIME_OF_DAY == "afternoon":
#       RESPONSE_TONE = "efficient and focused"
#   elif TIME_OF_DAY == "evening":
#       RESPONSE_TONE = "thorough and reflective"
#   else:
#       RESPONSE_TONE = "balanced"
#
# 🧪 TEST: Change TIME_OF_DAY and chat — notice the tone shift!
# ═══════════════════════════════════════════════
TIME_OF_DAY = "morning"

if TIME_OF_DAY == "morning":
    RESPONSE_TONE = "sharp and analytical"
elif TIME_OF_DAY == "afternoon":
    RESPONSE_TONE = "efficient and focused"
elif TIME_OF_DAY == "evening":
    RESPONSE_TONE = "thorough and reflective"
else:
    RESPONSE_TONE = "balanced"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add Catchphrases (Python List)
# Signature phrases your agent weaves into responses.
# ═══════════════════════════════════════════════
CATCHPHRASES = [
    "Let me investigate that...",
    "Based on my research...",
    "The data suggests..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 21: Enable Voice Mode (Boolean)
# Set to True to make your agent SPEAK its responses!
# This teaches Feature Flags — a real dev technique.
# ═══════════════════════════════════════════════
VOICE_ENABLED = False

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 22: Choose Voice Mode (String)
# "push-to-talk" = click a button to speak
# "hands-free"   = always listening (like Alexa!)
# ═══════════════════════════════════════════════
VOICE_MODE = "push-to-talk"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 23: Set a Wake Word (String)
# Like "Hey Siri" or "OK Google" — your agent only
# starts listening after hearing this phrase!
# Only works in hands-free mode.
#
#   WAKE_WORD = "Hey Agent"
#
# 🧪 TEST: Set hands-free + wake word → say the phrase!
# ═══════════════════════════════════════════════
WAKE_WORD = ""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 24: Choose Voice Gender (String)
# Controls the TTS voice used to speak responses.
#   "default" = browser default voice
#   "female"  = picks a female voice
#   "male"    = picks a male voice
#
# 🧪 TEST: Switch between "female" and "male" and listen!
# ═══════════════════════════════════════════════
VOICE_GENDER = "default"

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
APP_THEME = "default"

# BONUS SETTINGS
RESPONSE_STYLE = "Balanced"
LANGUAGE_STYLE = "casual"
SIGN_OFF = ""
FOLLOW_UP_QUESTIONS = True
MEMORY_ENABLED = True
RESPONSE_FORMAT = "structured"
SHOW_REASONING = True
MAX_THINKING_STEPS = 5
ERROR_MESSAGE = "Mission failed! Let me try a different approach... 🔄"

TOOLS = {
    "web_search": "Use for current events and up-to-date info",
    "calculator": "Use for ANY math or numerical analysis",
    "wikipedia": "Use for historical facts and science"
}

TOOL_INSTRUCTIONS = {
    "web_search": "Search first, then summarise findings",
    "calculator": "Show the calculation steps clearly",
    "wikipedia": "Quote relevant sections"
}

# ═══════════════════════════════════════════════
# 🏁 CHALLENGE CHECKLIST
# ═══════════════════════════════════════════════
# ☐ 1.  BOT_NAME — Change it, see preview header update
# ☐ 2.  BOT_EMOJI — Change avatar emoji
# ☐ 3.  AI_MESSAGE — See welcome screen change
# ☐ 4.  CREATOR_NAME — Ask "who created you?"
# ☐ 5.  SYSTEM_MESSAGE — Changes everything about your agent
# ☐ 6.  KNOWLEDGE_BASE — Ask about facts you added
# ☐ 7.  QA_PAIRS — Ask exact questions to test
# ☐ 8.  TEMPERATURE — 0.1 vs 1.0 — see the difference
# ☐ 9.  RULES — Test rule enforcement
# ☐ 10. CONVERSATION_STARTERS — See buttons update
# ☐ 11. FORBIDDEN_WORDS — Add words, verify avoidance
# ☐ 12. BLOCKED_TOPICS — Ask about a blocked topic
# ☐ 13. FEW_SHOT_EXAMPLES — Add examples to teach format
# ☐ 14. SECRET_RESPONSES — Type exact trigger to test
# ☐ 15. MOOD_RESPONSES — Dict mapping moods to instructions
# ☐ 16. MAX_RESPONSE_LENGTH — "short" vs "long"
# ☐ 17. MAX_TOKENS — Try 50 vs 1024!
# ☐ 18. MOOD — Try "serious" or "energetic"
# ☐ 19. RESPONSE_TONE — If/elif conditional logic!
# ☐ 20. CATCHPHRASES — Chat and look for your phrases
# ☐ 21. VOICE_ENABLED — Set True to hear your agent speak!
# ☐ 22. VOICE_MODE — "push-to-talk" or "hands-free"
# ☐ 23. WAKE_WORD — Set a trigger phrase for hands-free
# ☐ 24. VOICE_GENDER — "female", "male", or "default"
# ═══════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# ⚙️ ENGINE — DO NOT EDIT BELOW THIS LINE
# FORGE reads your variables above and builds a LangChain
# ReAct agent automatically. Here's what happens:
# ═══════════════════════════════════════════════════════════════
#
# Step 1: Build the SystemMessage
#   → SYSTEM_MESSAGE + KNOWLEDGE_BASE + QA_PAIRS + RULES
#     are merged into one SystemMessage (langchain_core.messages)
#
# Step 2: Load Tools
#   → TOOLS dict maps to real LangChain tool classes:
#     "web_search"  → DuckDuckGoSearchRun
#     "calculator"  → PythonREPLTool
#     "wikipedia"   → WikipediaQueryRun
#   → TOOL_INSTRUCTIONS configures each tool's behavior
#
# Step 3: Build the ReAct Agent Prompt
#   → ChatPromptTemplate.from_messages([
#         SystemMessage(content=...),
#         MessagesPlaceholder("chat_history"),
#         ("human", "{input}"),
#         MessagesPlaceholder("agent_scratchpad"),  ← agent's thinking
#     ])
#
# Step 4: Create the AgentExecutor
#   → create_react_agent(llm, tools, prompt)
#   → AgentExecutor(agent, tools, memory, max_iterations=MAX_THINKING_STEPS)
#   → SHOW_REASONING controls whether "thoughts" are visible
#
# Step 5: Enforce your config at runtime
#   → SECRET_RESPONSES → exact phrase match, instant reply
#   → QA_PAIRS → keyword match, overrides everything
#   → BLOCKED_TOPICS → polite refusal
#   → FORBIDDEN_WORDS → filtered from output
#   → CATCHPHRASES → injected into responses
#   → SIGN_OFF → appended to every response
#   → MOOD + LANGUAGE_STYLE → shape the tone
#   → FEW_SHOT_EXAMPLES → teach preferred format
#   → MAX_TOKENS → limits response length
#
# FORGE handles the LLM, API keys, and streaming.
# Your agent is now LIVE — test it in the preview panel! →
# ═══════════════════════════════════════════════════════════════
`,
    config: `{
  "project_type": "agent",
  "model": "gemini-flash",
  "temperature": 0.3,
  "max_tokens": 512,
  "max_iterations": 5,
  "tools": ["web_search", "calculator", "wikipedia"],
  "capabilities": ["tool_calling", "step_by_step_reasoning", "web_search", "voice"],
  "forge_version": "3.0",
  "challenges": 24,
  "notes": "Every variable in main.py is LIVE — edit and test instantly!"
}`,
    requirements: `# FORGE handles everything — no installs needed!
# Edit variables in main.py and test in Live Preview.
langchain>=0.3.0
langchain-core>=0.3.0
langchain-openai>=0.2.0
langchain-community>=0.3.0
langchain-experimental>=0.3.0
streamlit>=1.28.0`,
  },
};

export const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Summarization'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'Wikipedia'],
};
