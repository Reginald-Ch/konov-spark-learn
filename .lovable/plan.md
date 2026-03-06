

# Plan: Bug Fixes for Hackathon Day

## Bugs Found

### 1. Textarea Cursor Reset Bug (Critical)
**File:** `src/components/hackathon/ProjectEditor.tsx` (line 1776)

The textarea uses `value={files[activeFile]}` (controlled) despite memory stating it should use `defaultValue` (uncontrolled). Every time bidirectional sync effects update `files` state (knowledge base, QA, system prompt, theme), React re-renders the textarea and resets the cursor position. This causes text "glitching" while typing.

**Fix:** Change `value={files[activeFile]}` to `defaultValue` and use imperative updates via `textareaRef.current.value` for file switching and template loading. Update the `onChange` handler to update `files` state without the controlled prop causing re-renders.

### 2. ReactMarkdown Ref Warning (Console Error)
**File:** `src/components/hackathon/ProjectEditor.tsx` (line 2028)

Console shows: "Function components cannot be given refs. Check the render method of ProjectEditor." This is from `<ReactMarkdown>` being used inside framer-motion's `<AnimatePresence>`, which tries to attach refs to children. ReactMarkdown is a function component and doesn't support refs.

**Fix:** Wrap `<ReactMarkdown>` in a `<div>` within the chat message rendering to absorb the ref from AnimatePresence/motion.

### 3. Leaderboard `team_formed` Milestone Never Awarded
**File:** `src/components/hackathon/ProjectEditor.tsx`

The `team_formed` event (now "System Message Quality", 10 pts) is never inserted into `point_events` anywhere in the codebase. The old `project_setup` was removed, and `team_formed` was never wired up. Students can never earn Tier 1 points.

**Fix:** Award `team_formed` points when the student customizes their system prompt beyond the default (e.g., in `handleSave` or `handleRun`, check if system prompt differs from default scaffold prompt). Insert `team_formed` with dedup via localStorage key.

### 4. Judge Score Update Not Possible (point_events table)
**File:** Database RLS

The `point_events` table has no UPDATE policy. If a judge submits a score and wants to change it, they can't. The `JudgeDashboardPanel` marks projects as scored once, with no way to re-score.

**Fix:** This is by design (one score per project). No change needed, but note it.

### 5. `handleRun` Checks 20 Challenges but `first_run_success` Points Don't Require Any
**File:** `src/components/hackathon/ProjectEditor.tsx` (line 883-888)

The "Conversation Quality" (5 pts) milestone is awarded on ANY successful run, regardless of code quality. This is intentional per the scoring design (milestone-based), so no fix needed.

### 6. Go Live Button in Preview Panel Duplicates Submit Flow
**File:** `src/components/hackathon/ProjectEditor.tsx` (lines 2060-2069)

The "Submit Project" button at the bottom of the Live Preview panel duplicates the "Go Live" button in the status bar. Both call `handleGoLive()`. This isn't a bug per se, but clutters the UI.

**Fix:** Keep it — it's useful for mobile users who can't see the bottom bar.

## Implementation Summary

| # | Bug | File | Priority |
|---|-----|------|----------|
| 1 | Textarea cursor reset — switch to defaultValue | ProjectEditor.tsx | Critical |
| 2 | ReactMarkdown ref warning | ProjectEditor.tsx | Medium |
| 3 | `team_formed` milestone never awarded | ProjectEditor.tsx | Critical |

### Detailed Changes

**ProjectEditor.tsx — Textarea (line 1776):**
- Change `value={files[activeFile]}` to remove controlled prop
- Use `defaultValue` only on initial render
- On file tab switch (`activeFile` change), imperatively set `textareaRef.current.value`
- On template change, imperatively set via ref (already partially done in `handleTypeChange`)
- On session restore, imperatively set via ref (already done)
- Keep `onChange` updating `files` state for syntax highlighting and config extraction

**ProjectEditor.tsx — ReactMarkdown wrapper:**
- Wrap `<ReactMarkdown>` in the AI mentor panel (line 1868) and chat messages (line 2028) inside a `<div>` so AnimatePresence refs land on the div

**ProjectEditor.tsx — Award `team_formed` milestone:**
- In `handleSave` or `handleRun`, check if `systemPrompt` differs from `PROJECT_SCAFFOLDS[projectType].systemPrompt`
- If so, insert `team_formed` event with 10 points (dedup via localStorage `forge-scored-team_formed-{email}`)

## Files Modified
- `src/components/hackathon/ProjectEditor.tsx`

