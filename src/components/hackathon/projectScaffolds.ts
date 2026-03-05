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
🤖 FORGE AI Chatbot — 15 Build-Up Challenges
==============================================
Every variable below DIRECTLY controls your chatbot.
Edit any value → test instantly in Live Preview →

🎯 RULES:
  - ALL variables are LIVE — every edit changes your bot
  - Test after EACH change in Live Preview (right panel)
  - Complete all 15 challenges to build a unique AI!

⏱️ Time: 45-60 minutes
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
GREETING_MESSAGE = "Hey there! I'm Spark, your AI buddy. Ask me anything!"

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
# Example: "You are Chef Kofi, a Ghanaian cooking expert
# who explains recipes using fun stories. You always
# suggest local ingredients and end with a cooking tip."
# ═══════════════════════════════════════════════
SYSTEM_PROMPT = "You are a helpful AI assistant that answers questions clearly and concisely."

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
# Try different values and test the difference!
# ═══════════════════════════════════════════════
TEMPERATURE = 0.7

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Choose Response Style
# Options: "Concise", "Detailed", "Friendly",
#          "Professional", "Balanced"
# Each one changes HOW your bot writes responses
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
CONVERSATION_RULES = [
    "Always be friendly and encouraging",
    "Use at least one emoji in every response",
    "If you don't know something, say so honestly"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Conversation Starters
# These appear as clickable buttons in Live Preview.
# Make them relevant to your bot's topic!
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
# When a user types the keyword, your bot gives
# YOUR custom response instead of the AI's!
# ═══════════════════════════════════════════════
EASTER_EGGS = {
    "secret": "🎉 You found a hidden feature! You're a true explorer!",
    "magic": "✨ Abracadabra! Here's something special just for you...",
    "hello world": "👨‍💻 A classic! Every great programmer starts here."
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Catchphrases
# Your bot will naturally include these phrases
# in its responses to give it personality!
# ═══════════════════════════════════════════════
CATCHPHRASES = [
    "Fun fact!",
    "Here's the thing...",
    "Between you and me..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Set Blocked Topics
# Topics your bot will REFUSE to discuss.
# It will politely redirect instead.
# ═══════════════════════════════════════════════
BLOCKED_TOPICS = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# BONUS SETTINGS (already configured!)
# ═══════════════════════════════════════════════
FOLLOW_UP_QUESTIONS = True
REMEMBER_NAME = True
ERROR_MESSAGE = "Oops! Something went wrong. Try asking differently! 🔄"

# ═══════════════════════════════════════════════
# 🏁 CHALLENGE CHECKLIST — Test each one!
# ═══════════════════════════════════════════════
# ☐ 1.  BOT_NAME — Change it, see it in preview header
# ☐ 2.  BOT_EMOJI — Change it, see the avatar update
# ☐ 3.  GREETING_MESSAGE — See it in the welcome screen
# ☐ 4.  CREATOR_NAME — Ask "who created you?" to test
# ☐ 5.  SYSTEM_PROMPT — This changes EVERYTHING about your bot
# ☐ 6.  KNOWLEDGE_BASE — Ask about facts you added
# ☐ 7.  QA_PAIRS — Ask exact questions to test answers
# ☐ 8.  TEMPERATURE — Set to 0.1 vs 1.0 and compare
# ☐ 9.  RESPONSE_STYLE — Try "Concise" vs "Detailed"
# ☐ 10. MAX_RESPONSE_LENGTH — "short" vs "long"
# ☐ 11. CONVERSATION_RULES — Ask something to test rules
# ☐ 12. CONVERSATION_STARTERS — See buttons update
# ☐ 13. EASTER_EGGS — Type "secret" or "magic" to test
# ☐ 14. CATCHPHRASES — Chat and look for your phrases
# ☐ 15. BLOCKED_TOPICS — Ask about a blocked topic
# ═══════════════════════════════════════════════
`,
    config: `{
  "project_type": "chatbot",
  "model": "gemini-flash",
  "temperature": 0.7,
  "max_tokens": 1024,
  "memory_window": 20,
  "capabilities": ["conversation_memory", "streaming", "knowledge_base"],
  "forge_version": "2.0",
  "challenges": 15,
  "notes": "Every variable in main.py is LIVE — edit and test instantly!"
}`,
    requirements: `# FORGE handles everything — no installs needed!
# Edit variables in main.py and test in Live Preview.
forge-sdk>=2.0
streamlit>=1.28.0`,
  },
  agent: {
    name: 'AI Agent',
    icon: '🧠',
    systemPrompt: 'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    capabilities: ['Web Search', 'Calculator', 'Code Execution'],
    main: `#!/usr/bin/env python3
"""
🧠 FORGE AI Agent — 15 Build-Up Challenges
============================================
An Agent USES TOOLS to take actions!
  🤖 Chatbot = answers from memory
  🧠 Agent   = searches, calculates, researches!

Every variable below is LIVE — edit and test instantly.

⏱️ Time: 45-60 minutes
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
GREETING_MESSAGE = "I'm your research agent. I can search, calculate, and analyse. Give me a task!"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 4: Add Your Name
# ═══════════════════════════════════════════════
CREATOR_NAME = "A FORGE Builder"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 5: Define the Mission (MOST IMPORTANT!)
# Write what your agent DOES and HOW it thinks.
# Focus on ACTIONS, not just chatting.
# ═══════════════════════════════════════════════
SYSTEM_PROMPT = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

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
# Agents usually work best with lower values (0.2-0.5)
# ═══════════════════════════════════════════════
TEMPERATURE = 0.3

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Choose Response Style
# Options: "Concise", "Detailed", "Friendly",
#          "Professional", "Balanced"
# ═══════════════════════════════════════════════
RESPONSE_STYLE = "Professional"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Response Length
# ═══════════════════════════════════════════════
MAX_RESPONSE_LENGTH = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Add Agent Rules
# ═══════════════════════════════════════════════
CONVERSATION_RULES = [
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

# BONUS SETTINGS
FOLLOW_UP_QUESTIONS = True
REMEMBER_NAME = True
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
# ☐ 3.  GREETING_MESSAGE — See welcome screen change
# ☐ 4.  CREATOR_NAME — Ask "who created you?"
# ☐ 5.  SYSTEM_PROMPT — Changes everything about your agent
# ☐ 6.  KNOWLEDGE_BASE — Ask about facts you added
# ☐ 7.  QA_PAIRS — Ask exact questions to test
# ☐ 8.  TEMPERATURE — 0.1 vs 1.0 — see the difference
# ☐ 9.  RESPONSE_STYLE — Try "Concise" vs "Detailed"
# ☐ 10. MAX_RESPONSE_LENGTH — "short" vs "long"
# ☐ 11. CONVERSATION_RULES — Test rule enforcement
# ☐ 12. CONVERSATION_STARTERS — See buttons update
# ☐ 13. EASTER_EGGS — Type "secret mission" to test
# ☐ 14. CATCHPHRASES — Chat and look for your phrases
# ☐ 15. BLOCKED_TOPICS — Ask about a blocked topic
# ═══════════════════════════════════════════════
`,
    config: `{
  "project_type": "agent",
  "model": "gemini-flash",
  "temperature": 0.3,
  "max_iterations": 5,
  "tools": ["web_search", "calculator", "wikipedia"],
  "capabilities": ["tool_calling", "step_by_step_reasoning", "web_search"],
  "forge_version": "2.0",
  "challenges": 15,
  "notes": "Every variable in main.py is LIVE — edit and test instantly!"
}`,
    requirements: `# FORGE handles everything — no installs needed!
# Edit variables in main.py and test in Live Preview.
forge-sdk>=2.0
streamlit>=1.28.0`,
  },
};

export const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Summarization'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'Wikipedia'],
};
