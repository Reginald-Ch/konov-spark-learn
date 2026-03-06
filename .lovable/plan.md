

# Plan: Bug Fixes, Icon Replacement & Anti-Cheat Strategy

## 1. Replace All `Sparkles` Icons with `Rocket` Icons

Replace every `Sparkles` import and usage across the codebase with `Rocket`. Files affected:

| File | Changes |
|------|---------|
| `src/components/hackathon/ProjectEditor.tsx` | Import line 10: remove `Sparkles`, already has `Rocket`. Line 1243: change `icon: Sparkles` → `icon: Rocket` for Review button |
| `src/components/hackathon/CodePlayground.tsx` | Replace `Sparkles` with `Rocket` in import and all 3 usages (Idea→Code header, Review button, AI Mentor label) |
| `src/pages/Hackathons.tsx` | Replace `Sparkles` with `Rocket` in import and all 3 usages (background decoration, heading icon, welcome modal icon) |
| `src/pages/Resources.tsx` | Replace `Sparkles` with `Rocket` in import and usage (Creative AI card icon) |
| `src/components/HackathonBanner.tsx` | Replace `Sparkles` with `Rocket` in import and button usage |
| `src/components/hackathon/LearnTab.tsx` | Replace `Sparkles` with `Rocket` in import and usages |
| Any other files found in the search (13 files total) | Same pattern |

## 2. Consolidate "Submit Project" and "Go Live" Buttons

Both buttons call `handleGoLive()` which opens the same `PublishModal`. The "Submit Project" button at the bottom of the Live Preview panel (line 2091-2095) duplicates the "Go Live" button in the status bar (line 2144-2148).

**Fix:** Remove the "Submit Project" button from the Live Preview panel (lines 2088-2097). Keep only the "Go Live" button in the bottom status bar. This eliminates confusion. Rename the status bar button label from "Go Live" to "Submit & Go Live" for clarity.

## 3. Live UI Demo Bugs

### 3a. Chat not scrolling to bottom on new messages
The `chatEndRef` scroll isn't triggered reliably when streaming. Add a `useEffect` that scrolls to `chatEndRef` whenever `chatMessages` changes.

### 3b. Conversation starters fire but don't show user message immediately
When clicking a conversation starter button (line 2032), `handleChatSend(example)` is called. Inside `handleChatSend`, the user message is added to `chatMessages` only at line 979 (after easter egg and Q&A checks). If a Q&A match is found (line 950-956), the user message IS added, so this works. But the flow is correct — no bug here after review.

### 3c. ReactMarkdown in chat messages — already wrapped in `<div>` (line 2056)
This was fixed in the previous round. Confirmed working.

## 4. Anti-Cheat Measures for AI Copy-Paste

This is an important concern. Here's a practical strategy that doesn't require new infrastructure:

**Approach: Keystroke/Edit Tracking + Code Similarity Detection**

Add lightweight anti-cheat metrics to the editor that track:
- **Keystroke count** vs **total code length**: If a student has very few keystrokes but a large codebase, they likely pasted code
- **Paste event count**: Track how many times `Ctrl+V`/`Cmd+V` was used and how many characters were pasted
- **Edit session duration**: How long they actually spent in the editor
- **Large paste detection**: Flag when >100 chars are pasted at once

Store these metrics in `localStorage` and include them in the project's `metadata` when saving/publishing. Judges can see a "Code Authenticity Score" on the Judge Dashboard.

**Implementation:**
- In `ProjectEditor.tsx`: Add `onPaste` handler to textarea tracking paste size/count. Track `keydown` count. Store in component state.
- Include metrics in save/publish payload as metadata on `ai_projects` table (use the existing `description` field or add to point_events metadata).
- In `JudgeDashboardPanel.tsx`: Display an authenticity indicator (e.g., "⚠ High paste ratio" or "✅ Organic editing") per project.

## 5. Judge Dashboard — Score Already Submitted Cannot Be Changed

Currently by design. The `point_events` table has no UPDATE policy. This is fine for a hackathon — judges score once.

## Implementation Summary

| # | Change | Files | Priority |
|---|--------|-------|----------|
| 1 | Replace Sparkles → Rocket icons | 7+ files | Medium |
| 2 | Remove duplicate Submit button from preview | ProjectEditor.tsx | Medium |
| 3 | Add chat auto-scroll fix | ProjectEditor.tsx | Medium |
| 4 | Add anti-cheat paste/keystroke tracking | ProjectEditor.tsx, JudgeDashboardPanel.tsx | High |

## Files Modified
- `src/components/hackathon/ProjectEditor.tsx`
- `src/components/hackathon/CodePlayground.tsx`
- `src/components/hackathon/JudgeDashboardPanel.tsx`
- `src/pages/Hackathons.tsx`
- `src/pages/Resources.tsx`
- `src/components/HackathonBanner.tsx`
- `src/components/hackathon/LearnTab.tsx`
- Additional files with Sparkles imports

