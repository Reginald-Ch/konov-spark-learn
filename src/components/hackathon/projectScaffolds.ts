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
🤖 FORGE AI Chatbot — Configuration File
==========================================
Every variable you edit here DIRECTLY controls how your
chatbot behaves in the Live Preview panel (right side →)

🎯 GOAL: Complete all 6 stages to build a unique, polished AI chatbot.
Each stage unlocks new behaviour you can test immediately.

HOW IT WORKS:
  1. Edit variables below
  2. Test instantly in Live Preview →
  3. Every change you make = real chatbot behaviour change
  4. Click "Submit Project" when done!

⏱️ Suggested time: 45-60 minutes
"""

# ═══════════════════════════════════════════════
# STAGE 1: IDENTITY (5 min)
# Give your bot a name and first impression
# ═══════════════════════════════════════════════

BOT_NAME = "My AI Bot"

BOT_EMOJI = "🤖"

GREETING_MESSAGE = "Hi! I'm your AI assistant. How can I help you today?"

CREATOR_NAME = ""  # TODO: Put your name here!

# ═══════════════════════════════════════════════
# STAGE 2: PERSONALITY (10 min)
# Write a detailed system prompt — this is your
# bot's "soul". The more detail, the better!
# ═══════════════════════════════════════════════

# TODO: Replace this with at least 3-4 sentences describing:
#   - WHO your bot is (name, role, expertise)
#   - HOW it talks (formal? casual? funny? serious?)
#   - WHAT it's an expert in
#   - Any RULES it should follow
#
# Examples:
#   "You are Professor Ada, a computer science tutor who explains
#    concepts using food analogies. You are enthusiastic and always
#    encourage students. You never give direct answers to homework
#    but guide students to discover solutions themselves."
#
#   "You are DJ Beats, a music recommendation bot who speaks in
#    hip-hop slang. You know everything about Afrobeats, Hip-Hop,
#    and Highlife music. You always suggest 3 songs and explain
#    why each one fits the user's mood."

SYSTEM_PROMPT = "You are a helpful AI assistant that answers questions clearly and concisely."

# ═══════════════════════════════════════════════
# STAGE 3: KNOWLEDGE BASE (10 min)
# Add facts and info your bot should know.
# This is like giving your bot a "cheat sheet".
# ═══════════════════════════════════════════════

# TODO: Add domain-specific knowledge your bot should reference.
# The more you add, the smarter your bot becomes on this topic!
KNOWLEDGE_BASE = """

"""

# TODO: Add specific question-answer pairs.
# When someone asks a matching question, your bot
# will use YOUR answer instead of making one up.
QA_PAIRS = [
    # {"q": "What is your name?", "a": "I'm BotName, created by YourName!"},
    # {"q": "What can you do?", "a": "I can help with X, Y, and Z!"},
    # {"q": "Who created you?", "a": "I was built by [YourName] at the FORGE Hackathon!"},
]

# ═══════════════════════════════════════════════
# STAGE 4: BEHAVIOUR SETTINGS (10 min)
# Fine-tune HOW your bot responds
# ═══════════════════════════════════════════════

# Creativity level: 0.0 = very precise/factual, 1.0 = very creative/random
TEMPERATURE = 0.7

# Response style — changes how verbose/concise the bot is
# Options: "Concise", "Detailed", "Friendly", "Professional", "Balanced"
RESPONSE_STYLE = "Balanced"

# Maximum response length
# Options: "short" (1-2 sentences), "medium" (1 paragraph), "long" (detailed)
MAX_RESPONSE_LENGTH = "medium"

# TODO: Add rules your bot MUST follow.
# These are hard constraints on behaviour.
CONVERSATION_RULES = [
    # "Always greet the user warmly",
    # "Never discuss politics or religion",
    # "End every response with a follow-up question",
    # "If you don't know something, say so honestly",
    # "Always include at least one emoji in your response",
    # "Keep responses under 100 words",
]

# ═══════════════════════════════════════════════
# STAGE 5: SPECIAL FEATURES (10 min)
# Add unique touches that make your bot memorable
# ═══════════════════════════════════════════════

# Suggested conversation starters shown to users
CONVERSATION_STARTERS = [
    "Tell me about yourself",
    "What can you help me with?",
    # TODO: Add 3+ more starters relevant to your bot's topic
]

# Easter eggs — secret responses for specific keywords!
# When a user types a matching keyword, your bot responds
# with your custom message instead of the AI's response.
EASTER_EGGS = {
    # "secret": "🎉 You found a hidden feature! You're a true explorer!",
    # "magic": "✨ Abracadabra! Here's something special just for you...",
    # "hello world": "👨‍💻 A classic! Every great programmer starts here.",
}

# Catchphrases — phrases your bot randomly includes
# to give it more personality
CATCHPHRASES = [
    # "As I always say...",
    # "Fun fact!",
    # "Here's the thing...",
    # "Between you and me...",
]

# ═══════════════════════════════════════════════
# STAGE 6: ADVANCED & POLISH (5 min)
# Final touches before submission
# ═══════════════════════════════════════════════

# Should the bot suggest follow-up questions?
FOLLOW_UP_QUESTIONS = True

# Should the bot try to remember the user's name?
REMEMBER_NAME = True

# Topics your bot should REFUSE to discuss
BLOCKED_TOPICS = [
    # "homework answers",
    # "inappropriate content",
]

# Custom error message when something goes wrong
ERROR_MESSAGE = "Oops! Something went wrong. Try asking me in a different way! 🔄"

# ═══════════════════════════════════════════════
# 🏁 SUBMISSION CHECKLIST
# ═══════════════════════════════════════════════
# Before submitting, make sure you've completed:
#
# ☐ Stage 1: Bot has a unique name and greeting
# ☐ Stage 2: System prompt is 3+ sentences with clear personality
# ☐ Stage 3: Added at least 3 knowledge entries or Q&A pairs
# ☐ Stage 4: Customised at least 2 behaviour settings
# ☐ Stage 5: Added conversation starters + at least 1 easter egg
# ☐ Stage 6: Tested thoroughly in Live Preview
#
# Total variables to customise: 15+
# Estimated time: 45-60 minutes
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
  "notes": "Edit variables in main.py — every change affects your chatbot in real-time!"
}`,
    requirements: `# FORGE handles everything automatically — no installs needed!
# Your code is a configuration file that drives the AI chatbot.
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
🧠 FORGE AI Agent — Configuration File
========================================
An Agent is different from a Chatbot:
  🤖 Chatbot = Answers questions from memory
  🧠 Agent   = USES TOOLS to take actions!

Every variable you edit here controls your agent's
behaviour in the Live Preview panel →

⏱️ Suggested time: 45-60 minutes
"""

# ═══════════════════════════════════════════════
# STAGE 1: AGENT IDENTITY (5 min)
# ═══════════════════════════════════════════════

AGENT_NAME = "Research Agent"

AGENT_EMOJI = "🧠"

GREETING_MESSAGE = "I'm your AI agent. I can search the web, do calculations, and look up facts. Give me a task!"

CREATOR_NAME = ""  # TODO: Your name here!

# ═══════════════════════════════════════════════
# STAGE 2: AGENT MISSION (10 min)
# ═══════════════════════════════════════════════

# TODO: Write a detailed mission for your agent.
# Unlike a chatbot, focus on WHAT ACTIONS it should take.
#
# Examples:
#   "You are a research assistant that always verifies facts
#    using web search before answering. You cite your sources
#    and present information in bullet points."
#
#   "You are a data analyst agent. When given a question about
#    numbers, you ALWAYS use the calculator tool first. You
#    present results with clear explanations."

SYSTEM_PROMPT = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

# ═══════════════════════════════════════════════
# STAGE 3: TOOLS & CAPABILITIES (10 min)
# ═══════════════════════════════════════════════

# Which tools should your agent have access to?
# Set to True to enable, False to disable
TOOLS = {
    "web_search": True,       # 🔍 Search the internet
    "calculator": True,       # 🧮 Do math calculations
    "wikipedia": True,        # 📚 Look up facts
}

# TODO: Add custom tool descriptions so the agent
# knows WHEN to use each tool
TOOL_INSTRUCTIONS = {
    "web_search": "Use this for current events, news, or when you need up-to-date information",
    "calculator": "Use this for ANY math, statistics, or numerical analysis",
    "wikipedia": "Use this for historical facts, scientific concepts, or biographical information",
}

# ═══════════════════════════════════════════════
# STAGE 4: THINKING STYLE (10 min)
# ═══════════════════════════════════════════════

TEMPERATURE = 0.3  # Agents work best with lower creativity

# How many thinking steps the agent can take (2-10)
MAX_THINKING_STEPS = 5

# Should the agent show its reasoning process?
SHOW_REASONING = True

# Response format preference
# Options: "brief", "detailed", "structured", "conversational"
RESPONSE_FORMAT = "structured"

CONVERSATION_RULES = [
    # "Always cite your sources",
    # "Show your reasoning step by step",
    # "If a calculation is involved, always use the calculator tool",
    # "Present findings in bullet points",
]

# ═══════════════════════════════════════════════
# STAGE 5: SPECIAL FEATURES (10 min)
# ═══════════════════════════════════════════════

CONVERSATION_STARTERS = [
    "What's the latest news about AI?",
    "Calculate the area of a circle with radius 15",
    "Who invented the internet?",
    # TODO: Add starters relevant to your agent's mission
]

EASTER_EGGS = {
    # "secret mission": "🕵️ Agent mode activated! Scanning all databases...",
}

CATCHPHRASES = [
    # "Let me investigate that...",
    # "Based on my research...",
    # "The data suggests...",
]

FOLLOW_UP_QUESTIONS = True
REMEMBER_NAME = True

BLOCKED_TOPICS = []

ERROR_MESSAGE = "Mission failed! Let me try a different approach... 🔄"

# ═══════════════════════════════════════════════
# 🏁 SUBMISSION CHECKLIST
# ═══════════════════════════════════════════════
# ☐ Stage 1: Agent has a unique name and greeting
# ☐ Stage 2: Mission prompt is detailed (3+ sentences)
# ☐ Stage 3: Configured tools and added custom instructions
# ☐ Stage 4: Set thinking style and conversation rules
# ☐ Stage 5: Added starters + special features
# ☐ Stage 6: Tested with complex multi-step tasks
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
  "notes": "Edit variables in main.py — every change affects your agent in real-time!"
}`,
    requirements: `# FORGE handles everything automatically — no installs needed!
# Your code is a configuration file that drives the AI agent.
# Edit variables in main.py and test in Live Preview.
forge-sdk>=2.0
streamlit>=1.28.0`,
  },
};

export const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Summarization'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'Wikipedia'],
};
