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
🤖 FORGE AI Chatbot — 20 Build-Up Challenges
==============================================
Every variable below DIRECTLY controls your chatbot.
Edit any value → test instantly in Live Preview →

🎯 RULES:
  - ALL variables are LIVE — every edit changes your bot
  - Test after EACH change in Live Preview (right panel)
  - Complete all 20 challenges to build a unique AI!

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
# This is your bot's "brain". Write 3+ sentences:
#   - WHO is your bot? (name, role, expertise)
#   - HOW does it talk? (formal? funny? casual?)
#   - WHAT is it an expert in?
#   - Any special RULES?
#
# Example:
#   SYSTEM_MESSAGE = """
#     You are Chef Kofi, a Ghanaian cooking expert who
#     explains recipes using fun stories. You always
#     mention local ingredients and keep things simple.
#   """
# ═══════════════════════════════════════════════
SYSTEM_MESSAGE = "You are a helpful AI assistant that answers questions clearly and concisely."

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 6: Add Knowledge
# Give your bot facts it should know. The more you
# add, the smarter it gets on this topic!
# ═══════════════════════════════════════════════
KNOWLEDGE_BASE = """Python was created by Guido van Rossum in 1991.
AI stands for Artificial Intelligence.
FORGE is a platform where students build AI projects."""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 7: Add Exact Q&A Pairs
# When someone asks these questions, your bot MUST
# give YOUR answer — not make one up!
# ═══════════════════════════════════════════════
QA_PAIRS = [
    {"q": "What is your name?", "a": "I'm Spark, built at the FORGE Hackathon!"},
    {"q": "Who created you?", "a": "I was created by a talented FORGE builder!"},
    {"q": "What can you do?", "a": "I can chat, answer questions, and share knowledge!"}
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 8: Set Creativity Level
# 0.0 = very strict/factual (robot-like)
# 0.5 = balanced
# 1.0 = very creative/random (wild answers!)
# ═══════════════════════════════════════════════
TEMPERATURE = 0.7

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Choose Response Style
# Options: "Concise", "Detailed", "Friendly",
#          "Professional", "Balanced"
# ═══════════════════════════════════════════════
RESPONSE_STYLE = "Friendly"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Response Length
# "short"  = 1-2 sentences (quick answers)
# "medium" = 1 paragraph (balanced)
# "long"   = detailed multi-paragraph answers
# ═══════════════════════════════════════════════
MAX_RESPONSE_LENGTH = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Add Conversation Rules
# These are STRICT rules your bot MUST follow.
# Add at least 3 rules!
# ═══════════════════════════════════════════════
RULES = [
    "Always be friendly and encouraging",
    "Use at least one emoji in every response",
    "If you don't know something, say so honestly"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Conversation Starters
# These appear as clickable buttons in Live Preview.
# ═══════════════════════════════════════════════
CONVERSATION_STARTERS = [
    "Tell me about yourself",
    "What can you help me with?",
    "Share a fun fact",
    "Give me a tip"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Add Easter Eggs!
# Secret responses triggered by keywords.
# ═══════════════════════════════════════════════
EASTER_EGGS = {
    "secret": "🎉 You found a hidden feature! You're a true explorer!",
    "magic": "✨ Abracadabra! Here's something special just for you...",
    "hello world": "👨‍💻 A classic! Every great programmer starts here."
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Catchphrases
# Your bot will naturally include these phrases
# ═══════════════════════════════════════════════
CATCHPHRASES = [
    "Fun fact!",
    "Here's the thing...",
    "Between you and me..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Set Blocked Topics
# Topics your bot will REFUSE to discuss.
# ═══════════════════════════════════════════════
BLOCKED_TOPICS = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Forbidden Words
# Words your bot must NEVER use in any response.
# The AI will find alternative words instead.
# ═══════════════════════════════════════════════
FORBIDDEN_WORDS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set the Mood
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# This changes the overall vibe of responses!
# ═══════════════════════════════════════════════
MOOD = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Add Few-Shot Examples
# Show your bot HOW you want it to answer.
# Each example teaches the AI your preferred format!
# ═══════════════════════════════════════════════
FEW_SHOT_EXAMPLES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Set Language Style
# Options: "casual", "formal", "academic",
#          "slang", "poetic", "storyteller"
# Changes HOW your bot constructs sentences!
# ═══════════════════════════════════════════════
LANGUAGE_STYLE = "casual"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add a Sign-Off
# A closing phrase your bot adds to every response.
# Example: "Stay curious! 🌟" or "— Chef Kofi 👨‍🍳"
# ═══════════════════════════════════════════════
SIGN_OFF = ""

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
APP_THEME = "default"

# ═══════════════════════════════════════════════
# BONUS SETTINGS (already configured!)
# ═══════════════════════════════════════════════
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
# ☐ 5.  SYSTEM_MESSAGE — This changes EVERYTHING about your bot
# ☐ 6.  KNOWLEDGE_BASE — Ask about facts you added
# ☐ 7.  QA_PAIRS — Ask exact questions to test answers
# ☐ 8.  TEMPERATURE — Set to 0.1 vs 1.0 and compare
# ☐ 9.  RESPONSE_STYLE — Try "Concise" vs "Detailed"
# ☐ 10. MAX_RESPONSE_LENGTH — "short" vs "long"
# ☐ 11. RULES — Ask something to test rules
# ☐ 12. CONVERSATION_STARTERS — See buttons update
# ☐ 13. EASTER_EGGS — Type "secret" or "magic" to test
# ☐ 14. CATCHPHRASES — Chat and look for your phrases
# ☐ 15. BLOCKED_TOPICS — Ask about a blocked topic
# ☐ 16. FORBIDDEN_WORDS — Add words, verify bot avoids them
# ☐ 17. MOOD — Try "sarcastic" or "mysterious"
# ☐ 18. FEW_SHOT_EXAMPLES — Add example Q&As to teach format
# ☐ 19. LANGUAGE_STYLE — Try "poetic" or "formal"
# ☐ 20. SIGN_OFF — Add a closing phrase, see it appear
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
#   → prompt | llm(temperature=TEMPERATURE) | output_parser
#
# Step 5: Enforce your config at runtime
#   → EASTER_EGGS are checked FIRST (instant match)
#   → QA_PAIRS are checked SECOND (exact match)
#   → BLOCKED_TOPICS trigger a polite refusal
#   → FORBIDDEN_WORDS are filtered from output
#   → CATCHPHRASES are injected into responses
#   → SIGN_OFF is appended to every response
#   → MOOD + LANGUAGE_STYLE shape the tone
#   → FEW_SHOT_EXAMPLES teach the model your preferred format
#
# FORGE handles the LLM connection, API keys, and streaming.
# Your bot is now LIVE — test it in the preview panel! →
# ═══════════════════════════════════════════════════════════════
`,
    config: `{
  "project_type": "chatbot",
  "model": "gemini-flash",
  "temperature": 0.7,
  "max_tokens": 1024,
  "memory_window": 20,
  "capabilities": ["conversation_memory", "streaming", "knowledge_base"],
  "forge_version": "3.0",
  "challenges": 20,
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
🧠 FORGE AI Agent — 20 Build-Up Challenges
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
# 🏆 CHALLENGE 9: Choose Response Style
# ═══════════════════════════════════════════════
RESPONSE_STYLE = "Professional"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Response Length
# ═══════════════════════════════════════════════
MAX_RESPONSE_LENGTH = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Add Agent Rules
# ═══════════════════════════════════════════════
RULES = [
    "Always show your reasoning step by step",
    "Cite sources when sharing facts",
    "Present findings in bullet points"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Task Starters
# ═══════════════════════════════════════════════
CONVERSATION_STARTERS = [
    "What's the latest news about AI?",
    "Calculate the area of a circle with radius 15",
    "Who invented the internet?",
    "Compare Python and JavaScript"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Add Easter Eggs
# ═══════════════════════════════════════════════
EASTER_EGGS = {
    "secret mission": "🕵️ Agent mode activated! Scanning all databases...",
    "42": "🌌 The answer to life, the universe, and everything!"
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Catchphrases
# ═══════════════════════════════════════════════
CATCHPHRASES = [
    "Let me investigate that...",
    "Based on my research...",
    "The data suggests..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Set Blocked Topics
# ═══════════════════════════════════════════════
BLOCKED_TOPICS = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Forbidden Words
# Words your agent must NEVER use in responses.
# ═══════════════════════════════════════════════
FORBIDDEN_WORDS = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set the Mood
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# ═══════════════════════════════════════════════
MOOD = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Add Few-Shot Examples
# Show your agent HOW you want it to answer.
# ═══════════════════════════════════════════════
FEW_SHOT_EXAMPLES = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Set Language Style
# Options: "casual", "formal", "academic",
#          "slang", "poetic", "storyteller"
# ═══════════════════════════════════════════════
LANGUAGE_STYLE = "casual"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add a Sign-Off
# A closing phrase for every response.
# ═══════════════════════════════════════════════
SIGN_OFF = ""

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
APP_THEME = "default"

# BONUS SETTINGS
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
# ☐ 9.  RESPONSE_STYLE — Try "Concise" vs "Detailed"
# ☐ 10. MAX_RESPONSE_LENGTH — "short" vs "long"
# ☐ 11. RULES — Test rule enforcement
# ☐ 12. CONVERSATION_STARTERS — See buttons update
# ☐ 13. EASTER_EGGS — Type "secret mission" to test
# ☐ 14. CATCHPHRASES — Chat and look for your phrases
# ☐ 15. BLOCKED_TOPICS — Ask about a blocked topic
# ☐ 16. FORBIDDEN_WORDS — Add words, verify avoidance
# ☐ 17. MOOD — Try "serious" or "energetic"
# ☐ 18. FEW_SHOT_EXAMPLES — Add examples to teach format
# ☐ 19. LANGUAGE_STYLE — Try "academic" or "formal"
# ☐ 20. SIGN_OFF — Add a closing phrase
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
#   → EASTER_EGGS → instant match, no tool use needed
#   → QA_PAIRS → exact match, overrides everything
#   → BLOCKED_TOPICS → polite refusal
#   → FORBIDDEN_WORDS → filtered from output
#   → CATCHPHRASES → injected into responses
#   → SIGN_OFF → appended to every response
#   → MOOD + LANGUAGE_STYLE → shape the tone
#   → FEW_SHOT_EXAMPLES → teach preferred format
#
# FORGE handles the LLM, API keys, and streaming.
# Your agent is now LIVE — test it in the preview panel! →
# ═══════════════════════════════════════════════════════════════
`,
    config: `{
  "project_type": "agent",
  "model": "gemini-flash",
  "temperature": 0.3,
  "max_iterations": 5,
  "tools": ["web_search", "calculator", "wikipedia"],
  "capabilities": ["tool_calling", "step_by_step_reasoning", "web_search"],
  "forge_version": "3.0",
  "challenges": 20,
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
