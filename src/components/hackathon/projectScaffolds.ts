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
🤖 AI Chatbot — Built on FORGE Platform
=========================================
This is YOUR chatbot's brain. The FORGE platform handles:
  ✅ AI API keys (no setup needed!)
  ✅ Hosting & deployment
  ✅ Chat interface (Live Preview panel →)

YOU control:
  🎯 SYSTEM_PROMPT — Your bot's personality
  📚 Knowledge Base — What your bot knows (Config > Data tab)
  ⚙️ Settings — Temperature, model, capabilities

HOW IT WORKS:
  1. Edit the SYSTEM_PROMPT below to change your bot's behaviour
  2. Test instantly in the Live Preview panel (right side)
  3. Add knowledge in Config > Data tab
  4. Click "Submit Project" when ready!
"""

import os
import json
from datetime import datetime

import streamlit as st
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import LLMChain

# ──────────────────────────────────────────────
# 🎯 YOUR BOT'S PERSONALITY — EDIT THIS!
# ──────────────────────────────────────────────
# This is the most important part. It controls
# how your AI responds to every message.
#
# Try changing it to:
#   "You are a maths tutor for SHS students"
#   "You are a creative story writer"
#   "You are a coding mentor who explains with analogies"
#
SYSTEM_PROMPT = "You are a helpful AI assistant that answers questions clearly and concisely."

# ──────────────────────────────────────────────
# ⚙️ SETTINGS — Tweak these to change behaviour
# ──────────────────────────────────────────────
MODEL = "gpt-4o-mini"           # AI model (FORGE provides the API key)
TEMPERATURE = 0.7               # 0.0 = precise, 1.0 = creative
MAX_TOKENS = 1024               # Max length of each response
MEMORY_WINDOW = 20              # Remember last N messages
BOT_NAME = "My AI Chatbot"      # Name shown in the UI header

# ──────────────────────────────────────────────
# 🎨 App Setup — Customise your chat interface
# ──────────────────────────────────────────────
st.set_page_config(
    page_title=BOT_NAME,
    page_icon="🤖",
    layout="wide",
)

st.title(f"🤖 {BOT_NAME}")
st.caption("Built with FORGE • Powered by LangChain")

# ──────────────────────────────────────────────
# 🧠 Chat Memory — Remembers the conversation
# ──────────────────────────────────────────────
if "memory" not in st.session_state:
    st.session_state.memory = ConversationBufferWindowMemory(
        memory_key="history",
        return_messages=True,
        k=MEMORY_WINDOW,
    )

if "messages" not in st.session_state:
    st.session_state.messages = []

if "msg_count" not in st.session_state:
    st.session_state.msg_count = 0

# ──────────────────────────────────────────────
# 🔧 Sidebar — Settings Panel
# ──────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")

    temperature = st.slider(
        "Creativity Level",
        min_value=0.0,
        max_value=1.5,
        value=TEMPERATURE,
        step=0.1,
        help="Higher = more creative, Lower = more focused",
    )

    response_style = st.selectbox(
        "Response Style",
        ["Balanced", "Concise", "Detailed", "Friendly"],
        help="Changes how verbose the AI responds",
    )

    st.text_area(
        "System Prompt (edit in code)",
        value=SYSTEM_PROMPT,
        height=100,
        disabled=True,
        help="Edit SYSTEM_PROMPT variable in the code editor",
    )

    st.divider()

    col1, col2 = st.columns(2)
    with col1:
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.session_state.msg_count = 0
            st.session_state.memory = ConversationBufferWindowMemory(
                memory_key="history",
                return_messages=True,
                k=MEMORY_WINDOW,
            )
            st.rerun()
    with col2:
        if st.button("💾 Export Chat", use_container_width=True):
            if st.session_state.get("messages"):
                export = json.dumps(st.session_state.messages, indent=2)
                st.download_button(
                    "Download JSON",
                    data=export,
                    file_name=f"chat_{datetime.now():%Y%m%d_%H%M}.json",
                    mime="application/json",
                )

    if st.session_state.get("messages"):
        st.caption(f"📊 {len(st.session_state.messages)} messages")

# ──────────────────────────────────────────────
# 🤖 Build the AI Chain
# ──────────────────────────────────────────────

def build_enhanced_prompt():
    """Build system prompt with response style modifier."""
    base = SYSTEM_PROMPT

    style_modifiers = {
        "Concise": " Keep your answers short (2-3 sentences max). Be direct.",
        "Detailed": " Provide thorough, well-structured answers with examples.",
        "Friendly": " Use a warm, encouraging tone with emojis. Be supportive!",
        "Balanced": "",
    }

    return base + style_modifiers.get(response_style, "")


def build_chain():
    """Create the conversation chain with memory."""
    llm = ChatOpenAI(
        model_name=MODEL,
        temperature=temperature,
        max_tokens=MAX_TOKENS,
        streaming=True,
    )

    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=build_enhanced_prompt()),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    return LLMChain(
        llm=llm,
        prompt=prompt,
        memory=st.session_state.memory,
        verbose=False,
    )

# ──────────────────────────────────────────────
# 💬 Chat Interface — Where the magic happens!
# ──────────────────────────────────────────────

# Show all previous messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Handle new user input
if user_input := st.chat_input("Type your message..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.session_state.msg_count += 1
    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        try:
            chain = build_chain()

            with st.spinner("Thinking..."):
                response = chain.predict(input=user_input)

            st.markdown(response)
            st.session_state.messages.append(
                {"role": "assistant", "content": response}
            )

        except Exception as e:
            error_msg = str(e)
            if "rate" in error_msg.lower() or "limit" in error_msg.lower():
                st.warning("⏳ Too many requests. Wait a moment and try again!")
            elif "token" in error_msg.lower():
                st.warning("📏 Message too long. Try a shorter question!")
            else:
                st.error(f"❌ Error: {error_msg}")
            st.info("💡 Tip: Check your system prompt and try again!")`,
    config: `{
  "project_type": "chatbot",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 1024,
  "memory_window": 20,
  "capabilities": ["conversation_memory", "streaming", "export_history"],
  "forge_version": "1.0",
  "notes": "Edit SYSTEM_PROMPT in main.py to change your bot's personality"
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
    main: `#!/usr/bin/env python3
"""
🧠 AI Agent — Autonomous Tool-Using Assistant
Built on FORGE Platform with LangChain

WHAT'S DIFFERENT FROM A CHATBOT?
  🤖 Chatbot = Answers questions using its training data
  🧠 Agent   = Can USE TOOLS to take actions:
     🔍 Search the web for live information
     🐍 Run Python code for calculations
     📚 Look up facts on Wikipedia

YOU control:
  🎯 SYSTEM_PROMPT — Agent's mission & personality
  🛠️ TOOLS — Which tools the agent can use
  ⚙️ SETTINGS — Max thinking steps, model, etc.
"""

import os
import json
from datetime import datetime

import streamlit as st
from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType, Tool
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_experimental.tools import PythonREPLTool
from langchain_community.utilities import WikipediaAPIWrapper
from langchain.callbacks import StreamlitCallbackHandler

# ──────────────────────────────────────────────
# 🎯 AGENT'S MISSION — EDIT THIS!
# ──────────────────────────────────────────────
# Unlike a chatbot, the agent decides WHEN to
# use its tools based on this prompt.
#
# Try: "You are a research assistant that always
#       cites sources and double-checks facts"
#
SYSTEM_PROMPT = "You are an AI agent that can use tools to search the web, run calculations, and generate content."

# ──────────────────────────────────────────────
# ⚙️ SETTINGS
# ──────────────────────────────────────────────
MODEL = "gpt-4o-mini"           # FORGE provides the API key
MAX_ITERATIONS = 5              # Max thinking steps
SHOW_REASONING = True           # Show agent's thought process

# ──────────────────────────────────────────────
# 🎨 App Setup
# ──────────────────────────────────────────────
st.set_page_config(
    page_title="AI Agent",
    page_icon="🧠",
    layout="wide",
)

st.title("🧠 AI Agent")
st.caption("Autonomous AI with tools • Built with FORGE")

# ──────────────────────────────────────────────
# 🛠️ TOOLS — What your agent can DO
# ──────────────────────────────────────────────
# Each tool has a name and description.
# The agent reads the descriptions to decide
# which tool to use for each task.

def create_tools():
    """Set up all the tools your agent can use."""
    tools = []

    # 🔍 Tool 1: Web Search
    search = DuckDuckGoSearchResults(
        name="web_search",
        description="Search the web for current information, news, or facts.",
    )
    tools.append(search)

    # 🐍 Tool 2: Python Calculator
    python_repl = PythonREPLTool(
        name="python_calculator",
        description="Run Python code for calculations or data analysis.",
    )
    tools.append(python_repl)

    # 📚 Tool 3: Wikipedia
    wiki = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=2000)
    wiki_tool = Tool(
        name="wikipedia",
        func=wiki.run,
        description="Look up factual information on Wikipedia.",
    )
    tools.append(wiki_tool)

    return tools

# ──────────────────────────────────────────────
# 🔧 Sidebar — Agent Settings
# ──────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Agent Settings")

    show_reasoning = st.toggle("Show Agent Reasoning", value=SHOW_REASONING)

    max_steps = st.slider(
        "Max Thinking Steps",
        min_value=2,
        max_value=10,
        value=MAX_ITERATIONS,
        help="How many steps the agent can take",
    )

    st.divider()
    st.subheader("🛠️ Available Tools")
    st.markdown("""
    | Tool | What it does |
    |------|-------------|
    | 🔍 Web Search | Finds current info online |
    | 🐍 Python | Runs calculations & code |
    | 📚 Wikipedia | Looks up facts |
    """)

    st.divider()
    if st.button("🗑️ Clear History", use_container_width=True):
        st.session_state.agent_history = []
        st.rerun()

# ──────────────────────────────────────────────
# 🧠 Create the Agent
# ──────────────────────────────────────────────
if "agent_history" not in st.session_state:
    st.session_state.agent_history = []

def create_agent():
    """Build the ReAct agent with all tools."""
    # FORGE provides the API key automatically!
    llm = ChatOpenAI(
        model_name=MODEL,
        temperature=0,
        streaming=True,
    )

    tools = create_tools()

    return initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=max_steps,
        early_stopping_method="generate",
    )

# ──────────────────────────────────────────────
# 💬 Chat Interface
# ──────────────────────────────────────────────
for item in st.session_state.agent_history:
    with st.chat_message(item["role"]):
        st.markdown(item["content"])

if task := st.chat_input("Give me a task... (e.g. 'What is the population of Ghana?')"):
    st.session_state.agent_history.append({"role": "user", "content": task})
    with st.chat_message("user"):
        st.markdown(task)

    with st.chat_message("assistant"):
        try:
            agent = create_agent()

            if show_reasoning:
                st_callback = StreamlitCallbackHandler(st.container())
                result = agent.run(task, callbacks=[st_callback])
            else:
                with st.spinner("🤔 Thinking & using tools..."):
                    result = agent.run(task)

            st.markdown(result)
            st.session_state.agent_history.append(
                {"role": "assistant", "content": result}
            )

        except Exception as e:
            st.error(f"❌ Agent error: {str(e)}")
            st.info("💡 Tip: Try rephrasing your task or breaking it into smaller steps.")`,
    config: `{
  "project_type": "agent",
  "model": "gpt-4o-mini",
  "temperature": 0,
  "max_iterations": 5,
  "tools": ["web_search", "python_calculator", "wikipedia"],
  "capabilities": ["tool_calling", "step_by_step_reasoning", "web_search"],
  "forge_version": "1.0",
  "notes": "Edit SYSTEM_PROMPT and add/remove tools in main.py"
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
  agent: ['Web Search', 'Calculator', 'Code Execution', 'File Reading'],
};
