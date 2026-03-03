#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          🤖 BUILD YOUR OWN AI CHATBOT — HACKATHON 2025          ║
║                     Built on FORGE Platform                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Welcome! Today you will build your very own AI chatbot.         ║
║  You do not need to be an expert — just follow the challenges!   ║
║                                                                  ║
║  🎯 CHALLENGE 1 — Give Your Bot a Personality     (~10 mins)    ║
║  💬 CHALLENGE 2 — Teach Your Bot What It Knows    (~15 mins)    ║
║  🧠 CHALLENGE 3 — Add Smart Follow-Up Questions   (~15 mins)    ║
║  ⭐ CHALLENGE 4 — Personalise & Polish (Bonus)    (~10 mins)    ║
║                                                                  ║
║  💡 TIPS FOR SUCCESS:                                            ║
║     → Read each challenge fully before writing any code          ║
║     → Test in Live Preview after EVERY change you make           ║
║     → There is no single right answer — be creative!             ║
║     → Ask your facilitator if stuck for more than 5 minutes      ║
║                                                                  ║
║  🚀 CHATBOT IDEAS TO GET YOU STARTED:                            ║
║     → A study buddy for a subject you love                       ║
║     → A travel guide for your favourite city                     ║
║     → A recipe assistant for a cuisine you enjoy                 ║
║     → A fitness coach or mental wellness bot                     ║
║     → A customer service bot for an imaginary business           ║
║     → A fun quiz master or trivia host                           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
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


# ══════════════════════════════════════════════════════════════════
# 🎯 CHALLENGE 1 — GIVE YOUR BOT A PERSONALITY
# ══════════════════════════════════════════════════════════════════
#
# The SYSTEM_PROMPT is the soul of your chatbot.
# It tells the AI who it is, how to talk, and what to do.
# This is the single most important thing you will write today.
#
# STEP 1: Decide what your chatbot does.
#         Pick ONE clear purpose from the ideas above — or invent
#         your own! Write it down on paper before coding.
#
# STEP 2: Rewrite the SYSTEM_PROMPT below.
#         A great system prompt answers these questions:
#
#   ✅ WHO is the bot?       "You are a friendly travel guide for Accra..."
#   ✅ WHAT does it do?      "Your job is to help tourists discover..."
#   ✅ HOW does it talk?     "Always be warm, enthusiastic, and use simple English..."
#   ✅ WHAT should it avoid? "Never give medical or legal advice..."
#   ✅ Any special rules?    "Always end each response with a fun local tip..."
#
# ──────────────────────────────────────────────────────────────────
# 💡 EXAMPLE — A travel guide bot's system prompt:
#
#   "You are Kofi, a friendly and knowledgeable travel guide for Ghana.
#    Your job is to help tourists discover the best places to eat,
#    visit, and experience in Ghana.
#    Always be warm, enthusiastic, and use simple English.
#    Always suggest at least one hidden gem that tourists usually miss.
#    Never make up prices — say 'prices vary, please check locally.'
#    End every response with one fun fact about Ghana."
#
# ──────────────────────────────────────────────────────────────────
# ❌ TOO VAGUE — Rewrite everything between the triple quotes:

SYSTEM_PROMPT = """
You are a helpful assistant. Answer any question the user asks.
"""

# ✅ DONE? Test it: type a question your bot should know about.
#    Does it respond the way you imagined? Adjust until it does!
# ══════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════
# ⚙️ SETTINGS — Tweak these to change your bot's behaviour
# ══════════════════════════════════════════════════════════════════

MODEL         = "gpt-4o-mini"   # The AI brain powering your bot
TEMPERATURE   = 0.7             # 0.0 = very precise | 1.5 = very creative
                                # 💡 TRY: set to 0.2 for a factual bot,
                                #         set to 1.2 for a creative/story bot
MAX_TOKENS    = 1024            # Max length of each response
MEMORY_WINDOW = 20              # How many past messages the bot remembers

# ── CHALLENGE 4 — Change these to personalise your bot ───────────
BOT_NAME  = "My AI Chatbot"     # TODO: Give your bot a real name!
PAGE_ICON = "🤖"                # TODO: Pick an emoji that fits your bot
                                # e.g. "🍕" for food, "✈️" for travel,
                                #      "📚" for study, "💪" for fitness
# ──────────────────────────────────────────────────────────────────


# ══════════════════════════════════════════════════════════════════
# 💬 CHALLENGE 2 — TEACH YOUR BOT WHAT IT KNOWS
# ══════════════════════════════════════════════════════════════════
#
# Even the best AI can give wrong or generic answers without
# specific knowledge. This is your bot's personal knowledge base —
# think of it as its textbook or reference guide.
#
# Each entry has:
#   - A KEY   → the topic name (e.g. "menu", "opening_hours")
#   - A VALUE → the actual information as a string
#
# YOUR TASK:
#   ✅ Delete ALL the example entries below
#   ✅ Add at least 4 entries that are relevant to YOUR bot
#   ✅ Each entry should give the bot useful, specific information
#   ✅ Keep the format: "topic_name": """ your content here """
#
# ──────────────────────────────────────────────────────────────────
# 💡 EXAMPLES by bot type:
#
#   TRAVEL BOT:
#     "top_attractions": "1. Kakum National Park... 2. Cape Coast Castle..."
#     "local_food":      "Must-try dishes: Jollof rice, Kelewele, Waakye..."
#     "transport_tips":  "Use Uber or trotros to get around Accra cheaply..."
#
#   STUDY BUDDY (Maths):
#     "algebra_basics":  "An equation has two sides separated by = ..."
#     "quadratic":       "Use the formula x = (-b ± √(b²-4ac)) / 2a ..."
#
#   RECIPE BOT:
#     "jollof_rice":     "Ingredients: 2 cups rice, 1 tin tomatoes..."
#     "cooking_tips":    "Always wash rice 3 times before cooking..."
#
# ──────────────────────────────────────────────────────────────────

KNOWLEDGE_BASE = {

    # ── DELETE these examples and replace with YOUR content ──────

    "example_topic_1": """
        TODO — Replace this with something your bot actually needs to know.
        Think: What information would make your bot more useful and accurate?
        Write it out clearly, as if explaining to a friend.
    """,

    "example_topic_2": """
        TODO — Add a second topic here.
        The more specific your knowledge base, the smarter your bot appears!
        You can use bullet points, numbered lists, or plain sentences.
    """,

    "example_topic_3": """
        TODO — Add a third topic here.
        💡 Research tip: Look up real facts online and paste them in.
        Your bot will be much more impressive with accurate information!
    """,

    "example_topic_4": """
        TODO — Add a fourth topic here.
        Bonus: Can you think of a topic that would SURPRISE or DELIGHT users?
        E.g. a fun fact section, a FAQ, or a list of common mistakes to avoid.
    """,

}

# ✅ DONE? Test it: ask your bot something that needs this knowledge.
#    Does it use your information in the answer?
# ══════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════
# 🧠 CHALLENGE 3 — ADD SMART FOLLOW-UP QUESTIONS
# ══════════════════════════════════════════════════════════════════
#
# A smart chatbot does not just answer immediately.
# Sometimes it needs more information first — just like a person!
#
# This dictionary maps topics to follow-up questions your bot
# will ask before giving a full response.
#
# YOUR TASK:
#   ✅ Replace the example topic keys with topics that match YOUR bot
#   ✅ Write 2–3 follow-up questions for each topic
#   ✅ Questions should help your bot give a BETTER, more personal answer
#
# ──────────────────────────────────────────────────────────────────
# 💡 EXAMPLES by bot type:
#
#   TRAVEL BOT topics:  "accommodation", "things_to_do", "food"
#     Questions for "accommodation":
#       "What is your budget per night — budget, mid-range, or luxury?"
#       "Do you prefer a hotel, guesthouse, or Airbnb?"
#       "Which city or region are you visiting?"
#
#   FITNESS BOT topics: "workout_plan", "diet_advice", "motivation"
#     Questions for "workout_plan":
#       "What is your current fitness level — beginner, intermediate, advanced?"
#       "How many days per week can you exercise?"
#       "Do you have access to a gym or are you working out at home?"
#
#   RECIPE BOT topics:  "suggest_recipe", "cooking_help"
#     Questions for "suggest_recipe":
#       "What ingredients do you currently have available?"
#       "How much time do you have to cook?"
#       "Any dietary restrictions I should know about?"
#
# ──────────────────────────────────────────────────────────────────
# 💡 FORMAT REMINDER — each topic must be a list of strings:
#    "your_topic": [
#        "Your first question here?",
#        "Your second question here?",
#    ],
# ──────────────────────────────────────────────────────────────────

FOLLOW_UP_QUESTIONS = {

    # ── REPLACE these with topics that match YOUR bot ─────────────

    "example_topic_a": [
        # TODO: Write 2-3 follow-up questions for this topic
        # "Your question 1?",
        # "Your question 2?",
    ],

    "example_topic_b": [
        # TODO: Write 2-3 follow-up questions for this topic
        # "Your question 1?",
        # "Your question 2?",
    ],

}

# ──────────────────────────────────────────────────────────────────
# KEYWORD TRIGGERS — tell the bot WHEN to ask follow-up questions
#
# YOUR TASK:
#   ✅ For each topic in FOLLOW_UP_QUESTIONS, add keywords that
#      a user might type to trigger that topic
#   ✅ Match the keys exactly to the ones in FOLLOW_UP_QUESTIONS
#
# 💡 EXAMPLE:
#   If your bot is a travel guide and topic is "accommodation":
#   "accommodation": ["hotel", "stay", "sleep", "where to stay", "guesthouse"]
# ──────────────────────────────────────────────────────────────────

TOPIC_KEYWORDS = {

    # ── REPLACE these with your own keywords ─────────────────────
    "example_topic_a": [
        # TODO: "keyword1", "keyword2", "keyword3",
    ],
    "example_topic_b": [
        # TODO: "keyword1", "keyword2", "keyword3",
    ],

}

# ✅ DONE? Test it: type a message containing one of your keywords.
#    Does the bot ask your follow-up question before answering?
# ══════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════
# ⭐ CHALLENGE 4 — PERSONALISE & POLISH (BONUS)
# ══════════════════════════════════════════════════════════════════
#
# You have a working bot! Now make it truly yours.
#
# IDEAS:
#   ✅ Change BOT_NAME and PAGE_ICON at the top of this file
#   ✅ Add a WELCOME_MESSAGE that greets users when they open the bot
#   ✅ Add a 5th entry to your KNOWLEDGE_BASE on a topic you love
#   ✅ Change TEMPERATURE — make your bot more creative or more precise
#   ✅ Add a 3rd topic to FOLLOW_UP_QUESTIONS
#   ✅ Change the chat input placeholder text (find it near the bottom)
#
# ──────────────────────────────────────────────────────────────────
# TODO: Write a welcome message for your bot!
#       This appears at the top of the chat when someone opens it.
#       Make it friendly and tell users what the bot can help with.

WELCOME_MESSAGE = """
👋 Hello! I am your AI assistant. How can I help you today?
"""
# Replace the text above with something specific to YOUR bot!
# e.g. "🌍 Hi! I'm Kofi, your Ghana travel guide! Ask me about
#       the best places to visit, eat, and explore in Ghana!"
# ══════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════
# 🔍 TOPIC DETECTION — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

def detect_topic(user_message):
    """Detects which topic the user is asking about based on keywords."""
    msg_lower = user_message.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw.lower() in msg_lower for kw in keywords):
            return topic
    return None


# ══════════════════════════════════════════════════════════════════
# 🔧 PROMPT BUILDER — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

def build_enhanced_prompt():
    """Builds the full system prompt, injecting the knowledge base."""
    base = SYSTEM_PROMPT

    style_modifiers = {
        "Concise":  " Keep your answers short (2-3 sentences max). Be direct.",
        "Detailed": " Provide thorough, well-structured answers with examples.",
        "Friendly": " Use a warm, encouraging tone with emojis. Be supportive!",
        "Balanced": "",
    }

    kb_text = "\n\n".join([
        f"### {key.upper().replace('_', ' ')}:\n{info.strip()}"
        for key, info in KNOWLEDGE_BASE.items()
    ])

    return (
        base
        + style_modifiers.get(response_style, "")
        + "\n\n## YOUR KNOWLEDGE BASE — use this information when relevant:\n\n"
        + kb_text
    )


# ══════════════════════════════════════════════════════════════════
# 🎨 APP SETUP — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

st.set_page_config(page_title=BOT_NAME, page_icon=PAGE_ICON, layout="wide")
st.title(f"{PAGE_ICON} {BOT_NAME}")
st.caption("Built with FORGE • Powered by LangChain")

# Session state
if "memory" not in st.session_state:
    st.session_state.memory = ConversationBufferWindowMemory(
        memory_key="history", return_messages=True, k=MEMORY_WINDOW,
    )
if "messages"        not in st.session_state: st.session_state.messages = []
if "msg_count"       not in st.session_state: st.session_state.msg_count = 0
if "pending_topic"   not in st.session_state: st.session_state.pending_topic = None
if "questions_asked" not in st.session_state: st.session_state.questions_asked = 0
if "welcomed"        not in st.session_state: st.session_state.welcomed = False


# ══════════════════════════════════════════════════════════════════
# 🔧 SIDEBAR — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

with st.sidebar:
    st.header("⚙️ Settings")

    temperature = st.slider(
        "Creativity Level", 0.0, 1.5, TEMPERATURE, 0.1,
        help="Higher = more creative, Lower = more focused",
    )
    response_style = st.selectbox(
        "Response Style", ["Balanced", "Concise", "Detailed", "Friendly"],
        help="Changes how verbose the AI responds",
    )
    st.text_area(
        "System Prompt (edit in code)", value=SYSTEM_PROMPT,
        height=120, disabled=True,
        help="Edit SYSTEM_PROMPT in the code editor",
    )

    st.divider()

    col1, col2 = st.columns(2)
    with col1:
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages        = []
            st.session_state.msg_count       = 0
            st.session_state.pending_topic   = None
            st.session_state.questions_asked = 0
            st.session_state.welcomed        = False
            st.session_state.memory = ConversationBufferWindowMemory(
                memory_key="history", return_messages=True, k=MEMORY_WINDOW,
            )
            st.rerun()
    with col2:
        if st.button("💾 Export Chat", use_container_width=True):
            if st.session_state.get("messages"):
                export = json.dumps(st.session_state.messages, indent=2)
                st.download_button(
                    "Download JSON", data=export,
                    file_name=f"chat_{datetime.now():%Y%m%d_%H%M}.json",
                    mime="application/json",
                )

    if st.session_state.get("messages"):
        st.caption(f"📊 {len(st.session_state.messages)} messages")

    # ── Progress Tracker ──────────────────────────────────────────
    st.divider()
    st.subheader("🏁 Your Progress")

    ch1_done = SYSTEM_PROMPT.strip() not in [
        "You are a helpful assistant. Answer any question the user asks.", ""
    ]
    kb_filled = sum(1 for v in KNOWLEDGE_BASE.values() if "TODO" not in v)
    ch2_done  = kb_filled == len(KNOWLEDGE_BASE)
    ch3_done  = all(len(q) > 0 for q in FOLLOW_UP_QUESTIONS.values()) and \
                all(len(k) > 0 for k in TOPIC_KEYWORDS.values())
    ch4_done  = BOT_NAME != "My AI Chatbot" and \
                WELCOME_MESSAGE.strip() not in [
                    "👋 Hello! I am your AI assistant. How can I help you today?", ""
                ]

    st.markdown(f"{'✅' if ch1_done else '❌'} Challenge 1 — Bot Personality")
    st.markdown(f"{'✅' if ch2_done else f'⏳ {kb_filled}/{len(KNOWLEDGE_BASE)} topics'} Challenge 2 — Knowledge Base")
    st.markdown(f"{'✅' if ch3_done else '❌'} Challenge 3 — Follow-Up Questions")
    st.markdown(f"{'⭐' if ch4_done else '○ '} Challenge 4 — Personalised (Bonus)")

    if ch1_done and ch2_done and ch3_done:
        st.success("🎉 All core challenges done! Go for the bonus!")

    st.divider()
    st.subheader("📚 Knowledge Base")
    for key, val in KNOWLEDGE_BASE.items():
        status = "✅" if "TODO" not in val else "⬜"
        st.markdown(f"{status} `{key.replace('_', ' ')}`")


# ══════════════════════════════════════════════════════════════════
# 🤖 AI CHAIN BUILDER — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

def build_chain():
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
        llm=llm, prompt=prompt,
        memory=st.session_state.memory, verbose=False,
    )


# ══════════════════════════════════════════════════════════════════
# 💬 CHAT INTERFACE — DO NOT CHANGE THIS
# ══════════════════════════════════════════════════════════════════

# Show welcome message on first load
if not st.session_state.welcomed and WELCOME_MESSAGE.strip():
    with st.chat_message("assistant"):
        st.markdown(WELCOME_MESSAGE.strip())
    st.session_state.messages.append({
        "role": "assistant", "content": WELCOME_MESSAGE.strip()
    })
    st.session_state.welcomed = True

# Render previous messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# TODO (Challenge 4 bonus): Change the placeholder text below
# to something that fits your bot!
# e.g. "Ask me about places to visit in Ghana..."
#      "What recipe would you like to make today?"
if user_input := st.chat_input("Type your message here..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.session_state.msg_count += 1

    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        try:
            chain    = build_chain()
            detected = detect_topic(user_input)

            # ── Follow-up question logic: start ────────────────
            if detected and st.session_state.pending_topic is None:
                questions = FOLLOW_UP_QUESTIONS.get(detected, [])

                if questions:
                    st.session_state.pending_topic   = detected
                    st.session_state.questions_asked = 0
                    response = (
                        f"Great question! Before I answer, I just need "
                        f"a little more information:\n\n**{questions[0]}**"
                    )
                    st.session_state.questions_asked += 1
                    st.markdown(response)
                    st.session_state.messages.append({"role": "assistant", "content": response})

                else:
                    with st.spinner("Thinking..."):
                        response = chain.predict(input=user_input)
                    st.markdown(response)
                    st.session_state.messages.append({"role": "assistant", "content": response})

            # ── Follow-up question logic: continue ─────────────
            elif st.session_state.pending_topic is not None:
                topic     = st.session_state.pending_topic
                questions = FOLLOW_UP_QUESTIONS.get(topic, [])
                q_index   = st.session_state.questions_asked

                if q_index < len(questions):
                    response = f"Thanks! One more thing:\n\n**{questions[q_index]}**"
                    st.session_state.questions_asked += 1
                    st.markdown(response)
                    st.session_state.messages.append({"role": "assistant", "content": response})
                else:
                    st.session_state.pending_topic   = None
                    st.session_state.questions_asked = 0
                    with st.spinner("Thinking..."):
                        response = chain.predict(input=user_input)
                    st.markdown(response)
                    st.session_state.messages.append({"role": "assistant", "content": response})

            # ── Regular message ────────────────────────────────
            else:
                with st.spinner("Thinking..."):
                    response = chain.predict(input=user_input)
                st.markdown(response)
                st.session_state.messages.append({"role": "assistant", "content": response})

        except Exception as e:
            error_msg = str(e)
            if "rate" in error_msg.lower() or "limit" in error_msg.lower():
                st.warning("⏳ Too many requests. Wait a moment and try again!")
            elif "token" in error_msg.lower():
                st.warning("📏 Message too long. Try a shorter question!")
            else:
                st.error(f"❌ Error: {error_msg}")
            st.info("💡 Tip: Check your system prompt and try again!")
