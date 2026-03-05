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
bot_name = "Spark"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 2: Choose an Emoji Avatar
# This emoji represents your bot in the chat
# ═══════════════════════════════════════════════
bot_emoji = "🤖"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 3: Write a Greeting
# First message users see — make it welcoming!
# ═══════════════════════════════════════════════
greeting = "Hey there! I'm Spark, your AI buddy. Ask me anything!"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 4: Claim Your Creation
# Add your name so everyone knows who built this
# ═══════════════════════════════════════════════
creator = "A FORGE Builder"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 5: Define the Personality (MOST IMPORTANT!)
# This is your bot's "brain". Write 3+ sentences:
#   - WHO is your bot? (name, role, expertise)
#   - HOW does it talk? (formal? funny? casual?)
#   - WHAT is it an expert in?
#   - Any special RULES?
# ═══════════════════════════════════════════════
system_message = "You are a helpful AI assistant that answers questions clearly and concisely."

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 6: Add Knowledge
# Give your bot facts it should know. The more you
# add, the smarter it gets on this topic!
# ═══════════════════════════════════════════════
knowledge_base = """Python was created by Guido van Rossum in 1991.
AI stands for Artificial Intelligence.
FORGE is a platform where students build AI projects."""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 7: Add Exact Q&A Pairs
# When someone asks these questions, your bot MUST
# give YOUR answer — not make one up!
# ═══════════════════════════════════════════════
qa_pairs = [
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
temperature = 0.7

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Choose Response Style
# Options: "Concise", "Detailed", "Friendly",
#          "Professional", "Balanced"
# ═══════════════════════════════════════════════
response_style = "Friendly"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Response Length
# "short"  = 1-2 sentences (quick answers)
# "medium" = 1 paragraph (balanced)
# "long"   = detailed multi-paragraph answers
# ═══════════════════════════════════════════════
max_response_length = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Add Conversation Rules
# These are STRICT rules your bot MUST follow.
# Add at least 3 rules!
# ═══════════════════════════════════════════════
rules = [
    "Always be friendly and encouraging",
    "Use at least one emoji in every response",
    "If you don't know something, say so honestly"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Conversation Starters
# These appear as clickable buttons in Live Preview.
# ═══════════════════════════════════════════════
conversation_starters = [
    "Tell me about yourself",
    "What can you help me with?",
    "Share a fun fact",
    "Give me a tip"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Add Easter Eggs!
# Secret responses triggered by keywords.
# ═══════════════════════════════════════════════
easter_eggs = {
    "secret": "🎉 You found a hidden feature! You're a true explorer!",
    "magic": "✨ Abracadabra! Here's something special just for you...",
    "hello world": "👨‍💻 A classic! Every great programmer starts here."
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Catchphrases
# Your bot will naturally include these phrases
# ═══════════════════════════════════════════════
catchphrases = [
    "Fun fact!",
    "Here's the thing...",
    "Between you and me..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Set Blocked Topics
# Topics your bot will REFUSE to discuss.
# ═══════════════════════════════════════════════
blocked_topics = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Forbidden Words
# Words your bot must NEVER use in any response.
# The AI will find alternative words instead.
# ═══════════════════════════════════════════════
forbidden_words = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set the Mood
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# This changes the overall vibe of responses!
# ═══════════════════════════════════════════════
mood = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Add Few-Shot Examples
# Show your bot HOW you want it to answer.
# Each example teaches the AI your preferred format!
# ═══════════════════════════════════════════════
few_shot_examples = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Set Language Style
# Options: "casual", "formal", "academic",
#          "slang", "poetic", "storyteller"
# Changes HOW your bot constructs sentences!
# ═══════════════════════════════════════════════
language_style = "casual"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add a Sign-Off
# A closing phrase your bot adds to every response.
# Example: "Stay curious! 🌟" or "— Chef Kofi 👨‍🍳"
# ═══════════════════════════════════════════════
sign_off = ""

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
app_theme = "default"

# ═══════════════════════════════════════════════
# BONUS SETTINGS (already configured!)
# ═══════════════════════════════════════════════
follow_up_questions = True
memory_enabled = True
error_message = "Oops! Something went wrong. Try asking differently! 🔄"

# ═══════════════════════════════════════════════
# 🏁 CHALLENGE CHECKLIST — Test each one!
# ═══════════════════════════════════════════════
# ☐ 1.  bot_name — Change it, see it in preview header
# ☐ 2.  bot_emoji — Change it, see the avatar update
# ☐ 3.  greeting — See it in the welcome screen
# ☐ 4.  creator — Ask "who created you?" to test
# ☐ 5.  system_message — This changes EVERYTHING about your bot
# ☐ 6.  knowledge_base — Ask about facts you added
# ☐ 7.  qa_pairs — Ask exact questions to test answers
# ☐ 8.  temperature — Set to 0.1 vs 1.0 and compare
# ☐ 9.  response_style — Try "Concise" vs "Detailed"
# ☐ 10. max_response_length — "short" vs "long"
# ☐ 11. rules — Ask something to test rules
# ☐ 12. conversation_starters — See buttons update
# ☐ 13. easter_eggs — Type "secret" or "magic" to test
# ☐ 14. catchphrases — Chat and look for your phrases
# ☐ 15. blocked_topics — Ask about a blocked topic
# ☐ 16. forbidden_words — Add words, verify bot avoids them
# ☐ 17. mood — Try "sarcastic" or "mysterious"
# ☐ 18. few_shot_examples — Add example Q&As to teach format
# ☐ 19. language_style — Try "poetic" or "formal"
# ☐ 20. sign_off — Add a closing phrase, see it appear
# ═══════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# ⚙️ ENGINE — DO NOT EDIT BELOW THIS LINE
# This is the LangChain engine that reads your variables above
# and runs your chatbot. FORGE handles this automatically.
# ═══════════════════════════════════════════════════════════════

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory

# Assemble the system prompt from all your config
_system_parts = [system_message]
if knowledge_base.strip():
    _system_parts.append(f"KNOWLEDGE BASE:\\n{knowledge_base}")
if qa_pairs:
    _qa_text = "\\n".join([f'Q: "{p["q"]}" → A: "{p["a"]}"' for p in qa_pairs])
    _system_parts.append(f"MANDATORY Q&A PAIRS (use these exact answers):\\n{_qa_text}")
if rules:
    _system_parts.append("RULES:\\n" + "\\n".join(f"- {r}" for r in rules))
if blocked_topics:
    _system_parts.append("BLOCKED TOPICS (refuse these):\\n" + "\\n".join(f"- {t}" for t in blocked_topics))
if forbidden_words:
    _system_parts.append("FORBIDDEN WORDS (never use):\\n" + "\\n".join(f"- {w}" for w in forbidden_words))
if catchphrases:
    _system_parts.append("CATCHPHRASES (include one per response):\\n" + "\\n".join(f"- {c}" for c in catchphrases))
if mood != "neutral":
    _system_parts.append(f"MOOD: {mood}")
if language_style != "casual":
    _system_parts.append(f"LANGUAGE STYLE: {language_style}")
if sign_off:
    _system_parts.append(f"SIGN-OFF: End every response with: {sign_off}")

_full_system = "\\n\\n".join(_system_parts)

# Build the LangChain prompt template
prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content=_full_system),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# Memory keeps the last 20 messages
memory = ConversationBufferWindowMemory(
    k=20,
    memory_key="chat_history",
    return_messages=True,
)

# FORGE connects the model, temperature, and streaming automatically.
# Your bot is now LIVE — test it in the preview panel! →
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
bot_name = "Research Agent"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 2: Choose an Emoji
# ═══════════════════════════════════════════════
bot_emoji = "🧠"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 3: Write a Greeting
# ═══════════════════════════════════════════════
greeting = "I'm your research agent. I can search, calculate, and analyse. Give me a task!"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 4: Add Your Name
# ═══════════════════════════════════════════════
creator = "A FORGE Builder"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 5: Define the Mission (MOST IMPORTANT!)
# ═══════════════════════════════════════════════
system_message = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 6: Add Knowledge
# ═══════════════════════════════════════════════
knowledge_base = """Agents use a ReAct loop: Reason, Act, Observe.
Tools extend what an AI can do beyond just chatting.
FORGE agents can search the web, do math, and look up facts."""

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 7: Add Exact Q&A Pairs
# ═══════════════════════════════════════════════
qa_pairs = [
    {"q": "What tools do you have?", "a": "I can search the web, do calculations, and look up facts on Wikipedia!"},
    {"q": "Who created you?", "a": "I was built by a talented FORGE developer!"},
    {"q": "How do you work?", "a": "I use a Reason-Act-Observe loop to solve problems step by step!"}
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 8: Set Creativity Level
# ═══════════════════════════════════════════════
temperature = 0.3

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 9: Choose Response Style
# ═══════════════════════════════════════════════
response_style = "Professional"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 10: Set Response Length
# ═══════════════════════════════════════════════
max_response_length = "medium"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 11: Add Agent Rules
# ═══════════════════════════════════════════════
rules = [
    "Always show your reasoning step by step",
    "Cite sources when sharing facts",
    "Present findings in bullet points"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 12: Set Task Starters
# ═══════════════════════════════════════════════
conversation_starters = [
    "What's the latest news about AI?",
    "Calculate the area of a circle with radius 15",
    "Who invented the internet?",
    "Compare Python and JavaScript"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 13: Add Easter Eggs
# ═══════════════════════════════════════════════
easter_eggs = {
    "secret mission": "🕵️ Agent mode activated! Scanning all databases...",
    "42": "🌌 The answer to life, the universe, and everything!"
}

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 14: Add Catchphrases
# ═══════════════════════════════════════════════
catchphrases = [
    "Let me investigate that...",
    "Based on my research...",
    "The data suggests..."
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 15: Set Blocked Topics
# ═══════════════════════════════════════════════
blocked_topics = [
    "homework answers",
    "inappropriate content"
]

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 16: Set Forbidden Words
# Words your agent must NEVER use in responses.
# ═══════════════════════════════════════════════
forbidden_words = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 17: Set the Mood
# Options: "cheerful", "serious", "sarcastic",
#          "mysterious", "energetic", "calm", "neutral"
# ═══════════════════════════════════════════════
mood = "neutral"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 18: Add Few-Shot Examples
# Show your agent HOW you want it to answer.
# ═══════════════════════════════════════════════
few_shot_examples = []

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 19: Set Language Style
# Options: "casual", "formal", "academic",
#          "slang", "poetic", "storyteller"
# ═══════════════════════════════════════════════
language_style = "casual"

# ═══════════════════════════════════════════════
# 🏆 CHALLENGE 20: Add a Sign-Off
# A closing phrase for every response.
# ═══════════════════════════════════════════════
sign_off = ""

# ═══════════════════════════════════════════════
# 🎨 APP THEME — Choose your app's color theme
# Options: "default", "ocean", "forest", "sunset", "purple", "rose"
# ═══════════════════════════════════════════════
app_theme = "default"

# BONUS SETTINGS
follow_up_questions = True
memory_enabled = True
response_format = "structured"
show_reasoning = True
max_thinking_steps = 5
error_message = "Mission failed! Let me try a different approach... 🔄"

tools = {
    "web_search": "Use for current events and up-to-date info",
    "calculator": "Use for ANY math or numerical analysis",
    "wikipedia": "Use for historical facts and science"
}

tool_instructions = {
    "web_search": "Search first, then summarise findings",
    "calculator": "Show the calculation steps clearly",
    "wikipedia": "Quote relevant sections"
}

# ═══════════════════════════════════════════════
# 🏁 CHALLENGE CHECKLIST
# ═══════════════════════════════════════════════
# ☐ 1.  bot_name — Change it, see preview header update
# ☐ 2.  bot_emoji — Change avatar emoji
# ☐ 3.  greeting — See welcome screen change
# ☐ 4.  creator — Ask "who created you?"
# ☐ 5.  system_message — Changes everything about your agent
# ☐ 6.  knowledge_base — Ask about facts you added
# ☐ 7.  qa_pairs — Ask exact questions to test
# ☐ 8.  temperature — 0.1 vs 1.0 — see the difference
# ☐ 9.  response_style — Try "Concise" vs "Detailed"
# ☐ 10. max_response_length — "short" vs "long"
# ☐ 11. rules — Test rule enforcement
# ☐ 12. conversation_starters — See buttons update
# ☐ 13. easter_eggs — Type "secret mission" to test
# ☐ 14. catchphrases — Chat and look for your phrases
# ☐ 15. blocked_topics — Ask about a blocked topic
# ☐ 16. forbidden_words — Add words, verify avoidance
# ☐ 17. mood — Try "serious" or "energetic"
# ☐ 18. few_shot_examples — Add examples to teach format
# ☐ 19. language_style — Try "academic" or "formal"
# ☐ 20. sign_off — Add a closing phrase
# ═══════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# ⚙️ ENGINE — DO NOT EDIT BELOW THIS LINE
# This is the LangChain ReAct agent engine that reads your
# variables above and runs your agent. FORGE handles this.
# ═══════════════════════════════════════════════════════════════

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory
from langchain.agents import AgentExecutor, create_react_agent
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_experimental.tools import PythonREPLTool

# Assemble system prompt from config
_system_parts = [system_message]
if knowledge_base.strip():
    _system_parts.append(f"KNOWLEDGE BASE:\\n{knowledge_base}")
if qa_pairs:
    _qa_text = "\\n".join([f'Q: "{p["q"]}" → A: "{p["a"]}"' for p in qa_pairs])
    _system_parts.append(f"MANDATORY Q&A PAIRS:\\n{_qa_text}")
if rules:
    _system_parts.append("RULES:\\n" + "\\n".join(f"- {r}" for r in rules))
if blocked_topics:
    _system_parts.append("BLOCKED TOPICS:\\n" + "\\n".join(f"- {t}" for t in blocked_topics))
if forbidden_words:
    _system_parts.append("FORBIDDEN WORDS:\\n" + "\\n".join(f"- {w}" for w in forbidden_words))
if catchphrases:
    _system_parts.append("CATCHPHRASES:\\n" + "\\n".join(f"- {c}" for c in catchphrases))
if mood != "neutral":
    _system_parts.append(f"MOOD: {mood}")
if language_style != "casual":
    _system_parts.append(f"LANGUAGE STYLE: {language_style}")
if sign_off:
    _system_parts.append(f"SIGN-OFF: {sign_off}")

_full_system = "\\n\\n".join(_system_parts)

# Build tools from config
_tools = []
if "web_search" in tools:
    _tools.append(DuckDuckGoSearchRun(description=tools["web_search"]))
if "calculator" in tools:
    _tools.append(PythonREPLTool(description=tools["calculator"]))
if "wikipedia" in tools:
    _tools.append(WikipediaQueryRun(description=tools["wikipedia"]))

# Build prompt with ReAct reasoning
prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content=_full_system),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# Memory + Agent Executor
memory = ConversationBufferWindowMemory(k=20, memory_key="chat_history", return_messages=True)

# FORGE connects the LLM, temperature, and streaming automatically.
# Your agent is now LIVE — test it in the preview panel! →
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
