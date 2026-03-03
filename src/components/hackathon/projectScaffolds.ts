export type ProjectType = 'chatbot' | 'agent';

export interface ChallengeStage {
  id: number;
  title: string;
  emoji: string;
  objective: string;
  hints: string[];
  timeEstimate: string;
}

export interface ProjectScaffold {
  main: string;
  config: string;
  requirements: string;
  name: string;
  icon: string;
  systemPrompt: string;
  capabilities: string[];
  stages: ChallengeStage[];
}

export const PROJECT_SCAFFOLDS: Record<ProjectType, ProjectScaffold> = {
  chatbot: {
    name: 'AI Chatbot',
    icon: '🤖',
    systemPrompt: 'You are a helpful AI assistant.',
    capabilities: ['Web Search', 'Citations', 'Memory'],
    stages: [
      {
        id: 1,
        title: 'Foundation',
        emoji: '🏗️',
        objective: 'Get the basic chat loop working — import LangChain, create the LLM, and handle user input so your bot can receive and display messages.',
        hints: [
          'Import ChatOpenAI from langchain_openai',
          'Import HumanMessage, AIMessage, SystemMessage from langchain_core.messages',
          'Use st.chat_input() to capture what the user types',
          'Use st.chat_message() to display messages in the UI',
        ],
        timeEstimate: '~8 min',
      },
      {
        id: 2,
        title: 'Give Your Bot a Personality',
        emoji: '🎭',
        objective: 'Write a detailed SYSTEM_PROMPT that defines WHO your bot is, HOW it speaks, and WHAT rules it follows. A great prompt is at least 3-5 sentences.',
        hints: [
          'Bad: "You are helpful" — Good: "You are a friendly SHS maths tutor in Ghana who explains with real-world analogies"',
          'Add rules: "Always respond in 2-3 sentences max" or "Never give direct answers, ask guiding questions instead"',
          'Give it a name, a tone (formal/casual/funny), and a specialty',
          'Test by asking "Who are you?" — does the answer match your prompt?',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 3,
        title: 'Teach Your Bot What to Know',
        emoji: '📚',
        objective: 'Add a knowledge base so your bot can answer questions about specific topics. Use the Data tab to add facts, or hardcode knowledge directly in your system prompt.',
        hints: [
          'Add facts to the Knowledge Base in the Data tab (left sidebar)',
          'Or add them directly in SYSTEM_PROMPT: "You know these facts: ..."',
          'Add Q&A pairs for precise question→answer matching',
          'Test: ask your bot a specific fact — does it know the answer?',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 4,
        title: 'Memory — Remember Conversations',
        emoji: '🧠',
        objective: 'Add ConversationBufferWindowMemory so your bot remembers what was said earlier. Without this, every message is like talking to a stranger!',
        hints: [
          'Import ConversationBufferWindowMemory from langchain.memory',
          'Use MessagesPlaceholder(variable_name="history") in your prompt template',
          'Store memory in st.session_state so it persists between messages',
          'Test: tell the bot your name, then ask "what is my name?" 3 messages later',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 5,
        title: 'Add Smart Follow-Up Questions',
        emoji: '💬',
        objective: 'Make your bot proactive! After answering, it should ask a relevant follow-up question to keep the conversation going and guide the user deeper.',
        hints: [
          'Add to your SYSTEM_PROMPT: "After every answer, ask one follow-up question related to what the user asked"',
          'Example: User asks about gravity → Bot explains → Bot asks "Want to know how gravity works on the Moon?"',
          'You can also add st.button() quick-reply suggestions below the chat',
          'Test: have a 5-message conversation — does the bot keep it flowing naturally?',
        ],
        timeEstimate: '~8 min',
      },
      {
        id: 6,
        title: 'Personalise & Special Powers',
        emoji: '⚡',
        objective: 'Make your bot UNIQUE! Add at least ONE special feature: response styles, sidebar settings, chat export, emoji reactions, or your own creative idea.',
        hints: [
          'st.sidebar.selectbox() for response style: "Concise", "Detailed", "Explain Like I\'m 5"',
          'st.sidebar.slider() for creativity (temperature) control',
          'Add a "Download Chat" button using st.download_button() with JSON export',
          'Try st.sidebar.radio() for language selection or topic filters',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 7,
        title: 'Polish & Deploy',
        emoji: '🚀',
        objective: 'Final touches! Give your bot a creative name, test 5+ conversations, handle edge cases (empty input, very long messages), and submit your project.',
        hints: [
          'Change BOT_NAME to something memorable and creative',
          'Test edge cases: empty messages, very long input, nonsense text',
          'Write a compelling 2-sentence project description for the gallery',
          'Click "Submit Project" when you\'re proud of it!',
        ],
        timeEstimate: '~5 min',
      },
    ],
    main: `#!/usr/bin/env python3
"""
🤖 AI Chatbot — Build-Up Challenge
====================================
Welcome to FORGE! You'll build this chatbot in 5 stages.
Each stage has a TODO section you need to complete.

The platform handles API keys — just write the code!

STAGES:
  Stage 1: 🏗️ Foundation — Get basic chat working
  Stage 2: 🎭 Personality — Give your bot a unique character
  Stage 3: 📚 Knowledge — Teach your bot what to know
  Stage 4: 🧠 Memory — Make your bot remember conversations
  Stage 5: 💬 Follow-Ups — Add smart follow-up questions
  Stage 6: ⚡ Special Powers — Add unique features
  Stage 7: 🚀 Polish & Deploy — Name, test, and ship it!

TIPS:
  - Read the TODO comments carefully
  - Use the AI Mentor (bottom panel) if you're stuck
  - Test in Live Preview (right panel) after each stage
  - Don't skip stages — each one builds on the last!
"""

import os
import json
from datetime import datetime

import streamlit as st

# ══════════════════════════════════════════════
# 🏗️ STAGE 1: FOUNDATION
# ══════════════════════════════════════════════
# Goal: Import LangChain and create a basic chat
#
# TODO 1.1: Import ChatOpenAI from langchain_openai
#   Hint: from langchain_openai import ChatOpenAI
#
# TODO 1.2: Import message types from langchain_core
#   Hint: from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
#
# YOUR IMPORTS HERE ↓↓↓



# ══════════════════════════════════════════════
# 🎭 STAGE 2: PERSONALITY
# ══════════════════════════════════════════════
# Goal: Define WHO your bot is. This is the most
# important part — it controls everything!
#
# TODO 2.1: Write a detailed SYSTEM_PROMPT (at least 2 sentences)
#   Bad:  "You are helpful"
#   Good: "You are a friendly maths tutor for SHS students
#          in Ghana. You explain concepts using real-world
#          analogies and always encourage the student."
#
# TODO 2.2: Give your bot a creative name
#
SYSTEM_PROMPT = "You are a helpful AI assistant."

BOT_NAME = "My AI Chatbot"

# ══════════════════════════════════════════════
# ⚙️ SETTINGS — You can tweak these later
# ══════════════════════════════════════════════
MODEL = "gpt-4o-mini"           # AI model (FORGE provides the key)
TEMPERATURE = 0.7               # 0.0 = precise, 1.0 = creative
MAX_TOKENS = 1024               # Max response length
MEMORY_WINDOW = 20              # Remember last N messages

# ══════════════════════════════════════════════
# 🎨 APP SETUP
# ══════════════════════════════════════════════
st.set_page_config(
    page_title=BOT_NAME,
    page_icon="🤖",
    layout="wide",
)

st.title(f"🤖 {BOT_NAME}")
st.caption("Built with FORGE • Powered by LangChain")

# ══════════════════════════════════════════════
# 📚 STAGE 3: TEACH YOUR BOT WHAT TO KNOW
# ══════════════════════════════════════════════
# Goal: Give your bot specialized knowledge!
# You can hardcode facts here OR use the Data tab.
#
# TODO 3.1: Add a KNOWLEDGE section to your system prompt
#   Example: Add facts, rules, or instructions directly:
#
#   KNOWLEDGE = """
#   - Ghana's capital is Accra
#   - The Volta River is the longest river in Ghana
#   - SHS stands for Senior High School
#   - WASSCE is the West African exam
#   """
#
# TODO 3.2: Combine knowledge with your system prompt
#   Hint: full_prompt = SYSTEM_PROMPT + "\\n\\nHere is your knowledge:\\n" + KNOWLEDGE
#
# TODO 3.3: Or use the Data tab (left sidebar) to add
#   knowledge without changing your code!
#
# YOUR KNOWLEDGE CODE HERE ↓↓↓



# ══════════════════════════════════════════════
# 🧠 STAGE 4: MEMORY
# ══════════════════════════════════════════════
# Goal: Make your bot remember the conversation!
# Without memory, every message is like talking
# to a stranger.
#
# TODO 4.1: Import memory tools
#   Hint: from langchain.memory import ConversationBufferWindowMemory
#   Hint: from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
#
# TODO 4.2: Create conversation memory in session state
#   Hint: Use st.session_state to persist between messages
#   Example:
#     if "memory" not in st.session_state:
#         st.session_state.memory = ConversationBufferWindowMemory(
#             memory_key="history",
#             return_messages=True,
#             k=MEMORY_WINDOW,
#         )
#
# YOUR MEMORY CODE HERE ↓↓↓



# Message history (this part is done for you)
if "messages" not in st.session_state:
    st.session_state.messages = []

if "msg_count" not in st.session_state:
    st.session_state.msg_count = 0

# ══════════════════════════════════════════════
# 💬 STAGE 5: SMART FOLLOW-UP QUESTIONS
# ══════════════════════════════════════════════
# Goal: Make your bot ask follow-up questions
# to keep conversations going naturally!
#
# TODO 5.1: Update your SYSTEM_PROMPT to include
#   a follow-up instruction:
#   "After every answer, ask one relevant follow-up
#    question to help the user explore deeper."
#
# TODO 5.2: Add quick-reply suggestion buttons
#   Hint: You can create clickable buttons below chat:
#
#   suggested = ["Tell me more", "Give an example", "What else?"]
#   cols = st.columns(len(suggested))
#   for i, text in enumerate(suggested):
#       if cols[i].button(text, key=f"quick_{i}"):
#           # Process this as user input
#           pass
#
# YOUR FOLLOW-UP CODE HERE ↓↓↓



# ══════════════════════════════════════════════
# ⚡ STAGE 6: PERSONALISE & SPECIAL POWERS
# ══════════════════════════════════════════════
# Goal: Make your bot UNIQUE! Add at least ONE
# of these features:
#
# TODO 6.1 (Pick at least ONE):
#
#   OPTION A — Response Styles:
#     Add a st.sidebar selectbox with styles like
#     "Concise", "Detailed", "Explain Like I'm 5"
#     Then modify the system prompt based on selection
#
#   OPTION B — Settings Panel:
#     Add sidebar controls for temperature, clear chat
#     button, message counter, export button
#
#   OPTION C — Chat Export:
#     Add a button to download chat history as JSON:
#     st.download_button("💾 Export Chat",
#         json.dumps(st.session_state.messages, indent=2),
#         "chat_history.json")
#
#   OPTION D — Emoji Reactions:
#     Add thumbs up/down buttons after each AI response
#
#   OPTION E — Your Own Idea!
#     What would make YOUR bot different from everyone else's?
#
# YOUR SPECIAL FEATURES HERE ↓↓↓



# ══════════════════════════════════════════════
# 🤖 BUILD THE AI CHAIN
# ══════════════════════════════════════════════
# This connects everything together.
#
# TODO: Create a function that builds your AI chain
#   Step 1: Create a ChatOpenAI instance with your settings
#   Step 2: Create a ChatPromptTemplate with:
#           - SystemMessage (your SYSTEM_PROMPT)
#           - MessagesPlaceholder (for memory/history)
#           - HumanMessage placeholder (for new input)
#   Step 3: Connect them into an LLMChain
#
# Hint — here's the structure:
#
#   from langchain.chains import LLMChain
#
#   def build_chain():
#       llm = ChatOpenAI(
#           model_name=MODEL,
#           temperature=TEMPERATURE,
#           max_tokens=MAX_TOKENS,
#           streaming=True,
#       )
#       prompt = ChatPromptTemplate.from_messages([
#           SystemMessage(content=SYSTEM_PROMPT),
#           MessagesPlaceholder(variable_name="history"),
#           ("human", "{input}"),
#       ])
#       return LLMChain(llm=llm, prompt=prompt, memory=st.session_state.memory)
#
# YOUR CHAIN CODE HERE ↓↓↓



# ══════════════════════════════════════════════
# 💬 CHAT INTERFACE
# ══════════════════════════════════════════════
# This handles the chat UI. Some is done for you,
# but you need to connect YOUR chain.

# Show previous messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Handle new input
if user_input := st.chat_input("Type your message..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.session_state.msg_count += 1
    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        try:
            # TODO: Call your chain here!
            # Hint:
            #   chain = build_chain()
            #   with st.spinner("Thinking..."):
            #       response = chain.predict(input=user_input)
            #   st.markdown(response)
            #   st.session_state.messages.append(
            #       {"role": "assistant", "content": response}
            #   )
            
            # DELETE THIS LINE once you've built your chain:
            st.warning("⚠️ Chain not built yet! Complete the TODOs above to make me work.")

        except Exception as e:
            error_msg = str(e)
            if "rate" in error_msg.lower() or "limit" in error_msg.lower():
                st.warning("⏳ Too many requests. Wait a moment and try again!")
            elif "token" in error_msg.lower():
                st.warning("📏 Message too long. Try a shorter question!")
            else:
                st.error(f"❌ Error: {error_msg}")
            st.info("💡 Tip: Check your code and try again!")

# ══════════════════════════════════════════════
# 🚀 STAGE 7: POLISH & DEPLOY
# ══════════════════════════════════════════════
# Before you submit:
#   ✅ Change BOT_NAME to something creative
#   ✅ Write a detailed SYSTEM_PROMPT (Stage 2)
#   ✅ Add knowledge so your bot is smart (Stage 3)
#   ✅ Make sure memory works — ask "what did I say?" (Stage 4)
#   ✅ Test that follow-up questions flow naturally (Stage 5)
#   ✅ Add at least ONE special feature (Stage 6)
#   ✅ Test at least 5 different conversations
#   ✅ Click "Submit Project" when ready!
`,
    config: `{
  "project_type": "chatbot",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 1024,
  "memory_window": 20,
  "capabilities": ["conversation_memory", "streaming", "knowledge_base", "follow_ups", "export_history"],
  "forge_version": "2.0",
  "challenge_mode": true,
  "total_stages": 7,
  "notes": "Build-Up Challenge: Complete all 7 stages!"
}`,
    requirements: `# FORGE handles API keys automatically — no setup needed!
streamlit>=1.28.0
langchain>=0.3.0
langchain-openai>=0.2.0
langchain-core>=0.3.0
openai>=1.0.0
tiktoken>=0.5.0`,
  },
  agent: {
    name: 'AI Agent',
    icon: '🧠',
    systemPrompt: 'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    capabilities: ['Web Search', 'Calculator', 'Code Execution'],
    stages: [
      {
        id: 1,
        title: 'Foundation',
        emoji: '🏗️',
        objective: 'Import LangChain agent tools and set up the basic app structure.',
        hints: [
          'Import initialize_agent, AgentType from langchain.agents',
          'Import Tool from langchain.agents',
          'Set up st.set_page_config and st.title',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 2,
        title: 'Mission Brief',
        emoji: '🎯',
        objective: 'Write a SYSTEM_PROMPT that defines your agent\'s mission. What is it specialized in?',
        hints: [
          'An agent needs a clear mission, not just "be helpful"',
          'Example: "You are a research assistant that always cites sources"',
          'The prompt guides WHEN the agent uses tools',
        ],
        timeEstimate: '~8 min',
      },
      {
        id: 3,
        title: 'Tools',
        emoji: '🛠️',
        objective: 'Create at least 2 tools your agent can use: web search, calculator, Wikipedia, or custom ones.',
        hints: [
          'DuckDuckGoSearchResults for web search',
          'PythonREPLTool for calculations',
          'WikipediaAPIWrapper for facts',
        ],
        timeEstimate: '~12 min',
      },
      {
        id: 4,
        title: 'Agent Brain',
        emoji: '🧠',
        objective: 'Wire up the ReAct agent with your tools and add the reasoning display (StreamlitCallbackHandler).',
        hints: [
          'Use AgentType.ZERO_SHOT_REACT_DESCRIPTION',
          'StreamlitCallbackHandler shows thinking steps',
          'Set handle_parsing_errors=True for stability',
        ],
        timeEstimate: '~10 min',
      },
      {
        id: 5,
        title: 'Polish & Deploy',
        emoji: '🚀',
        objective: 'Add a sidebar, test with complex tasks, and submit your project!',
        hints: [
          'Add a toggle for showing/hiding reasoning',
          'Test: "What is 15% of Ghana\'s GDP?"',
          'Click Submit Project when ready!',
        ],
        timeEstimate: '~5 min',
      },
    ],
    main: `#!/usr/bin/env python3
"""
🧠 AI Agent — Build-Up Challenge
===================================
Welcome to FORGE! Build an autonomous AI agent in 5 stages.

WHAT'S DIFFERENT FROM A CHATBOT?
  🤖 Chatbot = Answers using its training data only
  🧠 Agent   = Can USE TOOLS to take real actions:
     🔍 Search the web for live information
     🐍 Run Python code for calculations
     📚 Look up facts on Wikipedia

STAGES:
  Stage 1: 🏗️ Foundation — Imports & app setup
  Stage 2: 🎯 Mission Brief — Define your agent's purpose
  Stage 3: 🛠️ Tools — Give your agent superpowers
  Stage 4: 🧠 Agent Brain — Wire up the ReAct agent
  Stage 5: 🚀 Polish & Deploy — Test and ship it!

TIPS:
  - Read TODO comments carefully
  - Use AI Mentor if stuck
  - Test after EACH stage in Live Preview
"""

import os
import json
from datetime import datetime

import streamlit as st

# ══════════════════════════════════════════════
# 🏗️ STAGE 1: FOUNDATION
# ══════════════════════════════════════════════
# Goal: Import the agent libraries from LangChain
#
# TODO 1.1: Import ChatOpenAI
#   Hint: from langchain_openai import ChatOpenAI
#
# TODO 1.2: Import agent tools
#   Hint: from langchain.agents import initialize_agent, AgentType, Tool
#
# TODO 1.3: Import the tools you want to use
#   Hint: from langchain_community.tools import DuckDuckGoSearchResults
#   Hint: from langchain_experimental.tools import PythonREPLTool
#   Hint: from langchain_community.utilities import WikipediaAPIWrapper
#
# TODO 1.4: Import the callback handler for showing reasoning
#   Hint: from langchain.callbacks import StreamlitCallbackHandler
#
# YOUR IMPORTS HERE ↓↓↓



# ══════════════════════════════════════════════
# 🎯 STAGE 2: MISSION BRIEF
# ══════════════════════════════════════════════
# Goal: Define WHAT your agent does and WHY
#
# Unlike a chatbot, an agent decides WHEN to use
# its tools based on this prompt.
#
# TODO 2.1: Write a specific mission prompt
#   Bad:  "You are an AI agent"
#   Good: "You are a research assistant that helps
#          students find and verify facts. Always
#          search for the latest data and cite your
#          sources. Compare multiple sources when
#          answering controversial questions."
#
SYSTEM_PROMPT = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

# ══════════════════════════════════════════════
# ⚙️ SETTINGS
# ══════════════════════════════════════════════
MODEL = "gpt-4o-mini"           # FORGE provides the API key
MAX_ITERATIONS = 5              # Max thinking steps
SHOW_REASONING = True           # Show agent's thought process

# ══════════════════════════════════════════════
# 🎨 APP SETUP
# ══════════════════════════════════════════════
st.set_page_config(
    page_title="AI Agent",
    page_icon="🧠",
    layout="wide",
)

st.title("🧠 AI Agent")
st.caption("Autonomous AI with tools • Built with FORGE")

# ══════════════════════════════════════════════
# 🛠️ STAGE 3: TOOLS
# ══════════════════════════════════════════════
# Goal: Create the tools your agent can use.
# Each tool has a name, a function, and a description.
# The agent reads the descriptions to decide which
# tool to use!
#
# TODO 3.1: Create a create_tools() function that
#   returns a list of Tool objects
#
# Hint — here's the structure:
#
#   def create_tools():
#       tools = []
#
#       # 🔍 Tool 1: Web Search
#       search = DuckDuckGoSearchResults(
#           name="web_search",
#           description="Search the web for current information.",
#       )
#       tools.append(search)
#
#       # 🐍 Tool 2: Python Calculator
#       python_repl = PythonREPLTool(
#           name="python_calculator",
#           description="Run Python code for calculations.",
#       )
#       tools.append(python_repl)
#
#       # 📚 Tool 3: Wikipedia
#       wiki = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=2000)
#       wiki_tool = Tool(
#           name="wikipedia",
#           func=wiki.run,
#           description="Look up factual information on Wikipedia.",
#       )
#       tools.append(wiki_tool)
#
#       return tools
#
# YOUR TOOLS CODE HERE ↓↓↓



# ══════════════════════════════════════════════
# 🧠 STAGE 4: AGENT BRAIN
# ══════════════════════════════════════════════
# Goal: Create the ReAct agent that uses your tools
#
# TODO 4.1: Create a create_agent() function
#   Step 1: Create a ChatOpenAI instance
#   Step 2: Get tools from create_tools()
#   Step 3: Use initialize_agent with:
#           - AgentType.ZERO_SHOT_REACT_DESCRIPTION
#           - verbose=True
#           - handle_parsing_errors=True
#           - max_iterations=MAX_ITERATIONS
#
# Hint — here's the structure:
#
#   def create_agent():
#       llm = ChatOpenAI(
#           model_name=MODEL,
#           temperature=0,
#           streaming=True,
#       )
#       tools = create_tools()
#       return initialize_agent(
#           tools=tools,
#           llm=llm,
#           agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
#           verbose=True,
#           handle_parsing_errors=True,
#           max_iterations=MAX_ITERATIONS,
#           early_stopping_method="generate",
#       )
#
# YOUR AGENT CODE HERE ↓↓↓



# ══════════════════════════════════════════════
# 💬 CHAT INTERFACE
# ══════════════════════════════════════════════
# Chat history
if "agent_history" not in st.session_state:
    st.session_state.agent_history = []

# Show previous messages
for item in st.session_state.agent_history:
    with st.chat_message(item["role"]):
        st.markdown(item["content"])

# Handle new tasks
if task := st.chat_input("Give me a task... (e.g. 'What is the population of Ghana?')"):
    st.session_state.agent_history.append({"role": "user", "content": task})
    with st.chat_message("user"):
        st.markdown(task)

    with st.chat_message("assistant"):
        try:
            # TODO: Call your agent here!
            # Hint:
            #   agent = create_agent()
            #   if SHOW_REASONING:
            #       st_callback = StreamlitCallbackHandler(st.container())
            #       result = agent.run(task, callbacks=[st_callback])
            #   else:
            #       with st.spinner("🤔 Thinking..."):
            #           result = agent.run(task)
            #   st.markdown(result)
            #   st.session_state.agent_history.append(
            #       {"role": "assistant", "content": result}
            #   )

            # DELETE THIS LINE once you've built your agent:
            st.warning("⚠️ Agent not built yet! Complete the TODOs above.")

        except Exception as e:
            st.error(f"❌ Agent error: {str(e)}")
            st.info("💡 Tip: Try rephrasing your task or check your code.")

# ══════════════════════════════════════════════
# ⚡ STAGE 5: POLISH & DEPLOY
# ══════════════════════════════════════════════
# TODO 5.1: Add a sidebar with:
#   - Toggle for show/hide reasoning
#   - Slider for max thinking steps
#   - Clear history button
#   - Tools reference table
#
# TODO 5.2: Before submitting, test these:
#   ✅ "What is the population of Ghana?"
#   ✅ "Calculate 15% of 2847"
#   ✅ "Compare Python and JavaScript for AI"
#   ✅ "Search for the latest AI news"
#
# YOUR SIDEBAR CODE HERE ↓↓↓


`,
    config: `{
  "project_type": "agent",
  "model": "gpt-4o-mini",
  "temperature": 0,
  "max_iterations": 5,
  "tools": ["web_search", "python_calculator", "wikipedia"],
  "capabilities": ["tool_calling", "step_by_step_reasoning", "web_search"],
  "forge_version": "2.0",
  "challenge_mode": true,
  "notes": "Build-Up Challenge: Complete all 5 stages!"
}`,
    requirements: `# FORGE handles API keys automatically — no setup needed!
streamlit>=1.28.0
langchain>=0.3.0
langchain-openai>=0.2.0
langchain-core>=0.3.0
langchain-community>=0.3.0
langchain-experimental>=0.3.0
openai>=1.0.0
tiktoken>=0.5.0
duckduckgo-search>=3.9.0
wikipedia>=1.4.0`,
  },
};

export const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Summarization'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'Wikipedia', 'File Processing'],
};
