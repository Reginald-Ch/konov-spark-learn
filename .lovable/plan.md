

# MVP Readiness Assessment — 3-Day Sprint Plan

## What's Already Working
- Build Studio with 3-panel IDE (config sidebar, code editor, live preview)
- Python syntax highlighting with token-based lexer
- 3 project scaffolds (Chatbot, Voice Assistant, Agent)
- Templates tab with 1-click "Start Building"
- AI-powered code review, explain, suggest, run tests (via edge function)
- Live Preview chat panel for testing AI projects
- Save/load projects to database (`ai_projects` table)
- Publish modal for deployment
- Hackathon events with registration, teams, submissions
- Leaderboard with real-time updates
- Community chat system
- Getting Started guide and FAQ

## What Needs Fixing (Bugs)

### 1. Keyboard Shortcuts Have Stale Closures
In `ProjectEditor.tsx` line 607, the `useEffect` for keyboard shortcuts has an empty dependency array `[]`, but calls `handleSave` and `handleRun` which depend on state (`files`, `authorEmail`, `projectName`, etc.). This means `Ctrl+S` always saves the **initial** code, not the current code.

**Fix:** Add proper dependencies or use refs for the handlers.

### 2. Editor Horizontal Scroll Breaks Highlight Alignment
The editor area wrapper (line 761) has `overflow-auto`, but the textarea inside uses `absolute inset-0`. When the wrapper scrolls horizontally, the textarea doesn't move with it — only the highlight layer transforms. The textarea and highlight layer are in different scroll contexts.

**Fix:** Both layers need to scroll together. Use a single scroll container approach: remove `absolute` positioning, stack layers via `position: relative` with a grid overlay pattern.

### 3. No Auth — Anyone Can Overwrite Anyone's Project
All database operations use `supabase.from('ai_projects' as any)` with no authentication. The `as any` cast bypasses type safety. There are no RLS policies protecting projects — any user can update or delete any project.

**Fix (for MVP):** Keep the email-based save flow but add a simple verification step. Full auth can come post-MVP.

### 4. `handleSave` Uses `as any` Everywhere
Lines 558-570 cast all Supabase calls with `as any`, hiding type errors. The `ai_projects` table exists in the schema but the types aren't being used properly.

**Fix:** Remove `as any` casts and use proper typed queries.

## What Needs Improvement (UX)

### 5. No "Learn" Tab Content
The `MAIN_TABS` array in `Hackathons.tsx` has Build, Templates, Hackathons, AI Models — but there's no Learn tab despite the platform being educational. The Getting Started and FAQ are buried in the hackathons sub-sidebar.

### 6. AI Models Tab Is Not Connected to Build
Students can view AI model info in the AI Models tab but the "View Code" action that navigates to Build doesn't clearly show what happened.

### 7. No Project Gallery / Browse Others' Work
The `SubmissionsGallery` only shows submissions for a specific hackathon. There's no way for students to browse all published `ai_projects` for inspiration.

### 8. No Onboarding / First-Time User Experience
A student landing on `/hackathons` for the first time sees the Hackathons tab with possibly zero events. No guided tour, no "try the IDE" prompt.

---

## 3-Day Sprint Plan

### Day 1: Fix Critical Bugs + Polish Build Studio

**Task 1.1 — Fix keyboard shortcut stale closures** (30 min)
- Use `useRef` for `handleSave` and `handleRun` so the `useEffect` always calls the latest version
- File: `ProjectEditor.tsx`

**Task 1.2 — Fix editor scroll alignment** (1 hr)
- Replace absolute positioning with CSS grid overlay for textarea + highlight layer
- Both layers share the same native scroll context
- File: `ProjectEditor.tsx`

**Task 1.3 — Remove `as any` casts and fix Supabase types** (30 min)
- Use proper typed queries against `ai_projects`, `hackathons`, etc.
- Files: `ProjectEditor.tsx`, `Hackathons.tsx`, `Leaderboard.tsx`, `SubmissionsGallery.tsx`

**Task 1.4 — Add "unsaved changes" indicator** (20 min)
- Track dirty state: show a dot on the file tab when code differs from last saved version
- File: `ProjectEditor.tsx`

### Day 2: Add Project Gallery + Default Hackathon Data

**Task 2.1 — Create Project Gallery page/tab** (2 hrs)
- Add a "Gallery" sub-view in the Hackathons tab or a new main tab
- Query all `ai_projects` where `is_published = true`
- Show cards with project name, description, author, template type, "View Code" button
- File: New `src/components/hackathon/ProjectGallery.tsx`, update `Hackathons.tsx`

**Task 2.2 — Seed default hackathon event** (30 min)
- Create a database migration to insert a default "always-open" hackathon so new users see at least one event
- This prevents the empty state problem

**Task 2.3 — Add "Learn" tab with curated resources** (1 hr)
- Simple tab with cards linking to Python AI tutorials, documentation
- Embed the Getting Started guide content here
- File: New component or reuse `GettingStarted.tsx`

### Day 3: Onboarding, Testing, Deploy

**Task 3.1 — First-time user onboarding** (1 hr)
- When a student visits `/hackathons` for the first time (localStorage flag), show a brief welcome overlay with 3 steps: "Pick a template → Write code → Deploy"
- Auto-navigate to Templates tab on first visit
- File: `Hackathons.tsx`

**Task 3.2 — End-to-end testing sweep** (2 hrs)
- Test: Templates → Build flow (code loads correctly)
- Test: Save project → Reload → Project persists
- Test: Run Tests → AI responds in terminal
- Test: Live Preview chat → AI responds
- Test: Publish flow
- Test: Hackathon registration → Team creation → Submission
- Test: Leaderboard updates in real-time
- Test: Mobile responsiveness (sidebar drawer, preview overlay)

**Task 3.3 — Deploy and verify published URL** (30 min)
- Verify `https://konov-spark-learn.lovable.app` loads correctly
- Check edge function is deployed and responding
- Test on mobile device

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/hackathon/ProjectEditor.tsx` | Fix stale closures, fix scroll alignment, remove `as any`, add dirty state indicator |
| `src/pages/Hackathons.tsx` | Remove `as any` casts, add onboarding overlay, optionally add Gallery/Learn tabs |
| `src/components/hackathon/Leaderboard.tsx` | Remove `as any` casts |
| `src/components/hackathon/SubmissionsGallery.tsx` | Remove `as any` casts |
| `src/components/hackathon/ProjectGallery.tsx` | New file — published projects browser |
| Database migration | Seed a default hackathon event |

## Priority Order
1. Fix keyboard shortcut stale closures (blocks core UX)
2. Fix editor scroll alignment (visual bug)
3. Remove `as any` casts (stability)
4. Add unsaved changes indicator (UX polish)
5. Project Gallery (content discovery)
6. Seed default hackathon (empty state fix)
7. First-time onboarding (retention)
8. Full E2E testing sweep

