

# Plan: Fix Grey Text, Improve Build Studio, Plan Leaderboard, Make AI Mentor Functional

## What the User Is Seeing

From the screenshot: the IDE code text appears grey/muted against the dark background. The user wants it blue — meaning the default code text color (`--ide-text`) needs to shift from the current whitish-grey (`210 29% 90%`) to a blue-tinted tone, and the muted text needs to be more visible.

---

## Build Studio Feature Explainer

Here is what every feature in the Build Studio does:

| Feature | Purpose |
|---------|---------|
| **Config Sidebar** (left) | Set project name, choose project type (Chatbot/Voice/Agent), write a system prompt, toggle capabilities, view AI call usage |
| **File Tabs** (main.py, config.json, requirements.txt) | Switch between the 3 files in your project scaffold |
| **Syntax Highlighting** | Color-codes Python keywords, strings, comments, numbers so code is readable |
| **Review / Explain / Suggest** (top bar) | AI Mentor actions — sends your code to the AI for feedback, explanation, or improvement suggestions. Output appears in the bottom "AI Mentor" panel |
| **Run Tests** (bottom bar) | Simulates running your Python code via AI — shows terminal-style output of what your code would produce |
| **Save Checkpoint** (bottom bar) | Saves your project code, name, and config to the database. Asks for email on first save |
| **Go Live** (bottom bar) | Opens the Publish modal — saves your project as "published" and generates a shareable `/projects/:id` URL |
| **Live Preview** (right panel) | Chat interface to test your AI project. Messages are sent to the AI using your system prompt, simulating how your chatbot/voice-assistant/agent would respond |
| **Pitch Controls** | "Go Live for Pitch" reminds you to share screen; "Copy URL" copies the project link for demo presentations |
| **Terminal** (bottom panel) | Shows output from Run Tests and save confirmations |
| **AI Mentor** (bottom panel) | Shows markdown-formatted AI feedback from Review/Explain/Suggest actions |
| **Dirty State Indicator** | Orange dot on file tabs and "Unsaved changes" / "All changes saved" in status bar |

---

## Changes Needed

### 1. Fix Grey Text — Make Code Text Blue-Tinted

Update CSS variables in `src/index.css`:

```
--ide-text: 215 40% 82%         → blue-tinted white (instead of grey-white)
--ide-text-muted: 215 30% 55%   → brighter blue-grey muted text
```

This makes the default code text appear with a subtle blue cast rather than flat grey.

### 2. Bug Fix: `setAiCallCount` Never Executes

In `ProjectEditor.tsx` line 496, `setAiCallCount(prev => prev + 1)` is placed AFTER `return fullText` — meaning it never runs. Move it before the return statement.

**File:** `src/components/hackathon/ProjectEditor.tsx` (lines 495-497)

### 3. AI Mentor — Make It Fully Functional

Currently the AI Mentor panel only shows output from the top-bar buttons (Review, Explain, Suggest). It should also support:

- **Interactive chat within the AI Mentor tab** — students can ask follow-up questions about their code
- **Contextual suggestions** — when the mentor gives feedback, add a "Fix This" button that applies the suggestion

Implementation:
- Add a small input field at the bottom of the AI Mentor panel
- When a student types a question, send it to the edge function with `action: 'review'` and the current code + their question as context
- Display responses with markdown rendering (already in place)

**File:** `src/components/hackathon/ProjectEditor.tsx` — add `mentorInput` state, `handleMentorChat` function, and an input row in the AI Mentor panel content area.

### 4. Leaderboard System — Improvement Plan

The current leaderboard calculates points client-side from raw database queries. This works but has issues:

**Current point system:**
- Register for hackathon: +100 pts
- Create a team: +150 pts
- Team base: +100 pts
- Per team member: +50 pts
- Per submission: +200 pts
- Published AI project: +10 pts (from `points_earned` column)

**Problems:**
- Points are calculated on every render — not persisted
- No point events for key actions: running tests, using AI mentor, saving checkpoints
- No daily/activity streaks
- No way to award bonus points (judges, peer votes)

**Proposed improvement (for future implementation):**

Create a `point_events` table to track individual scoring events:

```sql
CREATE TABLE point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'register', 'create_team', 'submit', 'publish', 'run_tests', 'ai_mentor', 'save', 'peer_vote', 'judge_bonus'
  points INTEGER NOT NULL,
  hackathon_id UUID REFERENCES hackathons(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Then the leaderboard queries `SUM(points) GROUP BY participant_email` instead of reconstructing scores from multiple tables. This is more accurate and extensible.

**For now (this sprint):** Add point tracking for "Run Tests" (+5), "Save Checkpoint" (+2), and "AI Mentor usage" (+3) by incrementing `aiCallCount` (fix the bug first) and awarding points when publishing.

### 5. Ensure All 3 Project Types Work End-to-End

All three types (Chatbot, Voice Assistant, Agent) share the same `streamFromEdgeFunction` pipeline. The flow is:

1. Pick template → code loads ✓
2. Edit code in editor ✓
3. Run Tests → AI simulates execution ✓ (once aiCallCount bug is fixed)
4. Live Preview chat → AI responds using system prompt ✓
5. Save Checkpoint → saves to database ✓
6. Go Live → publishes and generates URL ✓
7. View at `/projects/:id` → shows code with syntax highlighting ✓

The core issue is that **there is no real Python runtime** — everything is AI-simulated. This is by design for a hackathon platform. The "Deploy" produces a shareable code showcase page, not a running app. This is already honest in the UI with "Go Live" branding.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Change `--ide-text` and `--ide-text-muted` to blue-tinted values |
| `src/components/hackathon/ProjectEditor.tsx` | Fix `setAiCallCount` placement, add AI Mentor interactive chat input, add point tracking on actions |
| `src/components/hackathon/Leaderboard.tsx` | Add activity-based points display (AI calls, saves) |

## Implementation Order
1. Fix `--ide-text` to blue-tinted color (instant visual fix)
2. Fix `setAiCallCount` dead code bug
3. Add AI Mentor interactive chat input in bottom panel
4. Add point tracking on Run Tests / Save / AI Mentor usage
5. Update Leaderboard to show activity-based points

