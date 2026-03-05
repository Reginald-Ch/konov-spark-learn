

# Plan: Build Studio Bug Fixes & Enhancements

## Findings

### Bug 1: Console Warning — `CountdownTimer` needs `forwardRef` (Critical)
Console shows: `Function components cannot be given refs. Check the render method of HackathonCard.`
`CountdownTimer` is a plain function component. When used inside `motion.div` in `HackathonCard`, Radix/Framer attempts ref attachment.

**Fix:** Convert `CountdownTimer` in `src/components/hackathon/CountdownTimer.tsx` to `React.forwardRef`.

### Bug 2: Console Warning — `Leaderboard` needs `forwardRef` (Critical)
Console shows: `Function components cannot be given refs. Check the render method of Hackathons.`

**Fix:** Convert `Leaderboard` in `src/components/hackathon/Leaderboard.tsx` to `React.forwardRef`.

### Bug 3: Knowledge Base sidebar data not synced to code (Medium)
The Knowledge tab lets students add knowledge text and Q&A pairs via the UI sidebar. These are stored in React state (`knowledgeBase`, `qaData`) and passed to the edge function at chat time. However, they are NOT written back into the `main.py` code variables (`KNOWLEDGE_BASE`, `QA_PAIRS`). This means:
- When a student saves/publishes, only the code is persisted — sidebar knowledge is lost
- The `ProjectView.tsx` deployed page extracts config from code only — so deployed apps won't have sidebar-added knowledge
- The Mission Progress bar checks `config.knowledgeBaseFromCode` and `config.qaPairsFromCode` which only read from code, not sidebar state

**Fix:** When `knowledgeBase` or `qaData` changes in the sidebar, sync them back into the `main.py` code by updating the `KNOWLEDGE_BASE` and `QA_PAIRS` variables via regex replacement (same pattern as `systemPrompt` sync). This ensures:
1. Save/Publish persists all knowledge
2. Deployed `ProjectView` reads it from code
3. Mission Progress accurately reflects sidebar additions

### Bug 4: Streaming bounce dots show DURING content streaming (Low)
Line 1802: `isStreaming` shows bounce dots even while content is already streaming into the last message. The dots appear below the actively-updating assistant message, creating a double indicator.

**Fix:** Only show bounce dots when `isStreaming && chatMessages[chatMessages.length - 1]?.content === '...'` (i.e., before first chunk arrives).

### Bug 5: `Leaderboard` doesn't subscribe to DELETE events (Medium)
The realtime subscription on line 136 only listens for `INSERT` events. After the Judge uses "Reset Leaderboard" (which deletes all rows), the leaderboard doesn't refresh until manual page reload.

**Fix:** Change `event: 'INSERT'` to `event: '*'` to catch INSERT, UPDATE, and DELETE.

### Bug 6: Mission Progress defaults don't account for Agent template (Low)
The Mission Progress bar (line 1150) uses chatbot defaults for all checks (e.g., `botName !== 'AI Bot'`, `temperature !== 0.7`). But the Agent template has different defaults (`'Research Agent'`, `0.3`). A student who just loaded the Agent template would see some missions incorrectly marked as complete because the agent defaults differ from the chatbot defaults being checked.

**Fix:** Use type-aware defaults in the mission progress calculation, same as the Live Preview challenge tracker already does (lines 1697-1700).

---

## Implementation Plan

| # | File | Fix |
|---|------|-----|
| 1 | `CountdownTimer.tsx` | Convert to `forwardRef` |
| 2 | `Leaderboard.tsx` | Convert to `forwardRef` + subscribe to `*` events |
| 3 | `ProjectEditor.tsx` | Sync sidebar knowledge/QA to code, fix streaming dots, fix mission defaults |

## Files to Modify
- `src/components/hackathon/CountdownTimer.tsx`
- `src/components/hackathon/Leaderboard.tsx`
- `src/components/hackathon/ProjectEditor.tsx`

