# MVP Plan: Production-Ready Hackathon Platform

This plan focuses on making the hackathon page work reliably for 200+ users by fixing real issues, improving the IDE structure (inspired by the reference images), and ensuring all features connect properly.

---

## Current State Assessment

**What works:**

- 4-tab navigation (Build, Templates, Hackathons, AI Models)
- Template selection loads code into IDE
- AI mentor streaming (review, explain, suggest, idea-to-code)
- Publish modal saves to database
- Leaderboard fetches from multiple tables including ai_projects
- AI Models tab has upload/train/predict flow
- Real-time subscriptions on hackathon data

**What is broken or incomplete:**

- IDE is a plain textarea -- no syntax highlighting, line numbers, or file tabs (the reference images show a proper code editor with line numbers and file tabs)
- No "Run" or "Save" buttons with clear actions in the IDE
- No "Live Preview" panel for AI output (reference shows a chat-like preview panel)
- The code cannot actually run in the browser (Python) -- need clear UX for this
- Hackathon events have past dates (Feb 1-3 and Mar 15-17) but status is still "upcoming"
- No bottom action bar like the reference (Run Tests / Save Agent / Deploy to Production)
- AI Models training is purely simulated with no connection to actual AI generation
- No file tab system (agent.py, config.json, requirements.txt like in reference)

---

## Phase 1: IDE Redesign (Inspired by Reference Images)

### 1A. Restructure CodePlayground Layout

Redesign `CodePlayground.tsx` to match the 3-panel layout from the reference:

&nbsp;

**Center Panel: Code Editor with File Tabs**

- File tab bar: `main.py`, `config.json`, `requirements.txt`
- Line numbers on the left gutter
- Syntax-highlighted textarea (using CSS-based highlighting for Python keywords)
- Status indicator: green dot + "Ready"

&nbsp;

**Bottom Action Bar** (key addition from reference)

- "Run Tests" button (green) -- simulates running Python code and shows output
- "Save Project" button (blue) -- saves to database via ai_projects table
- "Deploy to Production" button (gradient) -- opens Publish modal

### 1B. Add Line Numbers + Basic Syntax Highlighting

Create a custom code editor component that overlays syntax highlighting on the textarea:

- Line number gutter
- Python keyword highlighting (import, def, class, return, etc.)
- String and comment highlighting
- Current line highlight

### 1C. Multi-File Tab System

Add state for multiple files per project:

- `main.py` -- the main code (current code state)
- `config.json` -- auto-generated config based on selected model
- `requirements.txt` -- auto-generated from imports in code

Switching tabs shows different content. Config and requirements are generated automatically.

---

## Phase 2: IDE Functionality (Save, Run, Deploy)

### 2A. "Run" Button -- Simulated Python Execution

Since Python cannot run in the browser, the "Run" button will:

1. Send code to the `python-ai-assist` edge function with a new `action: "run"`
2. The AI simulates running the code and returns expected output
3. Display the output in the Live Preview panel as terminal-style text
4. This gives users immediate feedback without leaving the platform

Update `supabase/functions/python-ai-assist/index.ts` to add:

```
action === "run" -> AI simulates executing the Python code and returns expected output
```

### 2B. "Save" Button -- Auto-Save to Database

- Save current project state to `ai_projects` table without publishing
- Set `is_published: false` for saves (vs `true` for publish)
- Show "Saved!" toast notification
- Track last save time in the UI

### 2C. "Deploy to Production" -- Enhanced Publish Flow

- Opens the existing PublishModal
- But now pre-fills project name and description if already saved
- Shows the Colab link prominently as the "production" deployment option

---

## Phase 3: Leaderboard Real-Time Data Fix

### 3A. Fix Hackathon Event Dates

The two existing hackathons have dates that may not match their status. Insert seed data with correct dates so "live" events actually show as live during the hackathon.

### 3B. Ensure Real-Time Leaderboard Updates

The Leaderboard component already subscribes to real-time changes on `hackathon_teams`, `hackathon_registrations`, `hackathon_submissions`, and `ai_projects`. This is working. 

The fix needed: The leaderboard currently shows empty when there are no registrations. Add a more helpful empty state with a CTA to register for a hackathon or publish a project.

---

## Phase 4: AI Models Tab Polish

### 4A. Connect "Export Code" to IDE Properly

When users click "Export Code" after training, the code should:

1. Switch to the Build tab
2. Load the generated Python code into the editor
3. Auto-populate the config.json with model parameters
4. Auto-populate requirements.txt with needed packages

### 4B. Training Result Persistence

After training, save the model configuration (classes, accuracy) to local state so users can return to the AI Models tab and see their last training result.

---

## Phase 5: Database Seeding

Insert hackathon events with correct dates for the upcoming event:

- One "live" hackathon (starts today or recently)
- One "upcoming" hackathon (starts in 1-2 weeks)
- Seed default community channels (general, help, showcase)

---

## Technical File Changes Summary


| File                                           | Change                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/components/hackathon/CodePlayground.tsx`  | Complete redesign: 3-panel layout, file tabs, line numbers, syntax highlighting, bottom action bar, Live Preview chat panel |
| `src/components/hackathon/PythonEditor.tsx`    | **NEW** -- Custom code editor with line numbers and syntax highlighting                                                     |
| `supabase/functions/python-ai-assist/index.ts` | Add `action: "run"` for simulated code execution                                                                            |
| `src/components/hackathon/AIModelsTab.tsx`     | Fix Export Code flow to properly switch tabs with config                                                                    |
| `src/components/hackathon/Leaderboard.tsx`     | Improve empty state with CTAs                                                                                               |
| `src/pages/Hackathons.tsx`                     | Minor adjustments for new CodePlayground props                                                                              |
| Database                                       | Seed hackathon events with correct dates, seed community channels                                                           |
