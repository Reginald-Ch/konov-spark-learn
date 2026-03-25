

# Bug Fix Plan: AI Chatbot IDE Workflow

## Bugs Found

### Bug 1: Challenge threshold mismatches frustrate students
The scaffold instructions tell students to write specific amounts, but the validation code uses `>` (strictly greater than) instead of `>=`, requiring one MORE item than documented:

| Challenge | Scaffold says | Code checks | Student writes 3 rules → |
|-----------|---------------|-------------|--------------------------|
| RULES | "Write at least 3 rules" | `length > 3` (needs 4+) | Stays incomplete |
| CONVERSATION_STARTERS | "Create a list of 3-5 strings" | `length > 4` (needs 5+) | Stays incomplete with 4 |
| BLOCKED_TOPICS | implicit 2+ | `length > 2` (needs 3+) | Stays incomplete with 2 |

This affects **all 3 validation sites**: `handleRun` (terminal), `getChallengeCount` (level badge), and the Mission Progress panel. Students follow instructions but challenges don't complete.

**Fix**: Change `> 3` to `>= 3` for RULES, `> 4` to `>= 4` for STARTERS, `> 2` to `>= 2` for BLOCKED_TOPICS — across all 3 validation sites.

### Bug 2: Chat messages use array index as React key
Line 3112 renders `{chatMessages.map((msg, i) => <div key={i}>...)}`. During streaming, the `_id`-based `findIndex` update mutates elements in-place, but React sees the same index keys and may skip re-rendering or flash incorrectly. This causes subtle UI glitches during message streaming.

**Fix**: Use `msg._id || i` as the key to give streaming messages stable identity.

### Bug 3: Loading dots render alongside the "..." placeholder text
Line 3139 shows animated loading dots when the last message is `'...'`. But the `'...'` placeholder is ALSO rendered by the `chatMessages.map` loop (line 3131 renders it through ReactMarkdown as visible text). So the user sees both literal "..." text AND animated dots simultaneously until the first streaming chunk arrives.

**Fix**: Skip rendering the message content when it's the placeholder `'...'` during streaming, so only the animated dots show.

## Files Modified

1. **src/components/hackathon/ProjectEditor.tsx**
   - Fix 3 challenge thresholds in `handleRun`, `getChallengeCount`, and Mission Progress panel
   - Use stable React keys for chat messages
   - Hide placeholder "..." text during streaming

## Implementation Order
1. Fix challenge thresholds (Bug 1) — 3 locations
2. Fix React keys and loading dots (Bugs 2 + 3)

