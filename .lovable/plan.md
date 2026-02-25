

# Hackathon Platform MVP: 3 Project Types, Clean IDE, Real Deployment

## The Core Idea

Strip everything down to one clear flow: **Pick a project type (Chatbot / Voice Assistant / Agent) → Get scaffolded code instantly → Build in a 3-panel editor → Deploy a live demo URL**. Zero model selection, zero local setup. The platform handles AI routing behind the scenes.

---

## Current Problems

1. **Too many choices**: The IDE has 6 AI model options (LangChain, PyTorch, HuggingFace, sklearn, Whisper, Stable Diffusion) plus 6 templates. Students face decision paralysis instead of building.
2. **Code doesn't run**: The editor is a plain textarea with no line numbers, no file tabs, no "Run" button. Students write code but can't execute or test it.
3. **No deployment**: "Open in Colab" sends users away from the platform. There's no live demo URL generation.
4. **AI Models tab is disconnected**: The Teachable Machine-style tab exists separately from the IDE with no clear connection to project types.
5. **Leaderboard works but is empty**: Real-time subscriptions are correctly wired, but there are no seeded events to generate activity.

---

## New Architecture: 3 Panels, 3 Project Types, 3 Actions

### Project Types (Replace all current templates and model options)

| Type | What Students Build | Scaffolded Files |
|------|-------------------|-----------------|
| **AI Chatbot** | Conversational AI that answers questions on a topic | `main.py`, `config.json`, `requirements.txt` |
| **Voice Assistant** | Speech-to-text + AI response + text-to-speech pipeline | `main.py`, `config.json`, `requirements.txt` |
| **AI Agent** | Tool-using agent that can search, calculate, generate | `main.py`, `config.json`, `requirements.txt` |

Each type comes with a **complete working codebase** that students can customize, not a blank skeleton.

### The 3-Panel IDE (Matching Reference Images)

```text
┌──────────────┬──────────────────────────────┬─────────────────────┐
│ CONFIGURATION│  agent.py │ config.json │ req…│  LIVE PREVIEW       │
│              │─────────────────────────────│                     │
│ PROJECT NAME │  1  from agent import Agent  │ ⚡ Agent initialized │
│ [My Bot    ] │  2  from langchain import…   │                     │
│              │  3                            │ 🔵 "Find research   │
│ PROJECT TYPE │  4  # Initialize Agent       │    on AI safety"    │
│ [Chatbot  v] │  5  agent = Agent(           │                     │
│              │  6    name="ResearchBot",     │ 🟢 Searching...     │
│ SYSTEM PROMPT│  7    model="gpt-4",         │    Found 3 papers.  │
│ [You are a ] │  8    temperature=0.7,       │                     │
│ [helpful…  ] │  9    tools=[WebSearch()]    │ ✓ Response in 1.2s  │
│              │ 10  )                         │                     │
│ CAPABILITIES │                              │ [Ask something…] ▶  │
│ ☑ Web Search │                              │                     │
│ ☑ Citations  │                              │                     │
│ ☐ Image Gen  │                              │                     │
├──────────────┴──────────────────────────────┴─────────────────────┤
│  ▶ Run Tests          💾 Save Project         🚀 Deploy to Prod   │
└───────────────────────────────────────────────────────────────────┘
```

**Left Panel: Configuration**
- Project name input
- Project type dropdown (Chatbot / Voice Assistant / Agent)
- System prompt textarea
- Capability toggles (Web Search, Citations, Image Gen, Code Exec, Memory)
- Changing project type regenerates the scaffolded code automatically

**Center Panel: Code Editor with File Tabs**
- 3 file tabs: `main.py`, `config.json`, `requirements.txt`
- Line numbers in the gutter
- Basic Python syntax highlighting via CSS (keywords in different colors)
- Green status dot + "Ready" indicator
- Auto-generates `config.json` from left panel settings
- Auto-generates `requirements.txt` from imports

**Right Panel: Live Preview**
- Chat-style output for testing the AI
- Shows streaming AI responses from the backend function
- Input field at bottom: "Ask your AI something..." + Send button
- Status messages (initialized, thinking, responding)
- Clear button to reset conversation

**Bottom Action Bar**
- **Run Tests** (green): Sends code to edge function with `action: "run"`, shows simulated output in Live Preview
- **Save Project** (blue): Saves to `ai_projects` table with `is_published: false`, shows "Saved!" toast
- **Deploy to Production** (gradient): Opens enhanced PublishModal that generates a shareable project page URL

### How "Run Tests" Works

The `python-ai-assist` edge function gets a new `action: "run"` handler. The AI reads the student's code and simulates what it would output, returning terminal-style results. This gives instant feedback without needing a Python runtime.

### How "Deploy" Works

1. Student clicks "Deploy to Production"
2. PublishModal opens (pre-filled with project name and system prompt from config)
3. On publish: saves to `ai_projects` with `is_published: true`
4. Generates a shareable URL: `konov-spark-learn.lovable.app/projects/{id}`
5. Awards 10 leaderboard points
6. Shows the URL prominently with a copy button

---

## File Changes

### Files to Create

1. **`src/components/hackathon/ProjectEditor.tsx`** -- The new 3-panel IDE component replacing CodePlayground. Contains:
   - Left config panel with project type selector
   - Center code editor with line numbers, file tabs, syntax highlighting
   - Right live preview with chat-style AI testing
   - Bottom action bar (Run / Save / Deploy)
   - All 3 project type scaffolds built-in

2. **`src/pages/ProjectView.tsx`** -- Public project page for deployed projects. Shows:
   - Project name, author, description
   - Live code view (read-only)
   - Demo interaction panel
   - Route: `/projects/:id`

### Files to Modify

3. **`src/pages/Hackathons.tsx`** -- Simplify tabs:
   - Replace `CodePlayground` import with `ProjectEditor`
   - Keep 4 tabs but rename: Build → **Build**, Templates → **Templates** (simplified to 3 cards), Hackathons → **Hackathons**, AI Models → **AI Models**
   - Templates tab now shows only 3 large cards (Chatbot, Voice Assistant, Agent) that open the Build tab with that type pre-selected

4. **`src/components/hackathon/TemplatesTab.tsx`** -- Simplify from 6 generic templates to 3 focused project type cards (Chatbot, Voice Assistant, Agent) with clear descriptions of what students will build

5. **`supabase/functions/python-ai-assist/index.ts`** -- Add `action: "run"` handler that simulates Python code execution and returns terminal output. Add `action: "test-agent"` handler that takes a user message and the project's system prompt to simulate a live agent conversation

6. **`src/components/hackathon/PublishModal.tsx`** -- Add pre-fill from config, generate shareable URL after publish, show copy-to-clipboard for the project URL

7. **`src/App.tsx`** -- Add route for `/projects/:id` pointing to `ProjectView`

### Files Unchanged
- `Leaderboard.tsx` -- Already working with real-time subscriptions and ai_projects integration
- `AIModelsTab.tsx` -- Keep as-is for the Teachable Machine flow (separate from main build flow)

### Edge Function Update

Add to `python-ai-assist`:

```
action === "run" → AI simulates executing the code, returns terminal output
action === "test-agent" → AI acts as the student's configured agent, responds to test messages using the system prompt from config.json
```

### Database

No schema changes needed. The `ai_projects` table already has all required columns (`project_name`, `description`, `code`, `template_id`, `author_name`, `author_email`, `is_published`, `demo_url`, `points_earned`).

For the shareable project page, we query `ai_projects` where `is_published = true` -- the RLS policy already supports this.

---

## What Students Experience

1. Land on Hackathons page → see "Build" tab by default
2. A project type picker appears: **Chatbot** / **Voice Assistant** / **Agent** -- big cards, one click
3. Instantly: 3-panel IDE loads with complete scaffolded code, config, and requirements
4. Left panel lets them customize: change name, edit system prompt, toggle capabilities
5. Code updates automatically when they change config (or they edit freely)
6. Click "Run Tests" → see simulated output in Live Preview
7. Type a test message in Live Preview → get a real AI response (streamed from edge function using their system prompt)
8. Click "Save" → saved to database
9. Click "Deploy" → publish modal → get a shareable URL they can show during their hackathon pitch
10. Points appear on the leaderboard in real-time

---

## Implementation Order

1. Create `ProjectEditor.tsx` with the 3-panel layout, 3 project scaffolds, file tabs, and line numbers
2. Update `TemplatesTab.tsx` to show 3 project type cards
3. Update edge function with `run` and `test-agent` actions
4. Update `Hackathons.tsx` to use ProjectEditor
5. Create `ProjectView.tsx` for public project pages
6. Update `PublishModal.tsx` with URL generation
7. Add route in `App.tsx`

