

# Plan: Systematic Build Studio Bug Audit and Fixes

## Methodology
Scrutinize every feature area of Build Studio one-by-one. Each step below is a discrete bug with evidence from the code.

---

## Bug 1: Mission Progress checklist uses wrong defaults — many challenges show "done" on fresh template

**Location:** `ProjectEditor.tsx` lines 1501-1522 (sidebar Mission Progress)

**Problem:** The sidebar Mission Progress and the Live Preview challenge counter use *different* default-checking logic. For example:
- Sidebar checks `conversationRules.length > 0` (line 1510) — a fresh chatbot template has 3 rules, so this is always "done"
- Live Preview checks `conversationRules.length > 3` (line 2111) — correct threshold
- Same mismatch for: `conversationStarters`, `easterEggs`, `catchphrases`, `blockedTopics`, `qaPairsFromCode`

**Fix:** Unify both progress trackers to use the same thresholds (the stricter Live Preview ones that check if the student *added* beyond defaults).

---

## Bug 2: `handleChatSend` uses stale `liveConfig` for easter eggs / Q&A matching

**Location:** `ProjectEditor.tsx` line 1018

**Problem:** `liveConfig` is a `useMemo` that depends on `files['main.py']`, but `handleChatSend` captures it at call time. The real issue: `handleChatSend` is not wrapped in `useCallback` with the right deps — it's a plain `async` function that closes over `liveConfig`, `qaData`, `chatMessages`, `chatInput`, etc. Each render creates a new closure, which is fine, but conversation starters call `handleChatSend(example)` via an inline `onClick` which always gets the latest closure. This is actually okay. **However**, the Q&A matching logic at line 1044 is too aggressive:

```js
lowerMsg.split(/\s+/).filter(w => w.length > 2).every(word => qLower.includes(word))
```

If a user types "what can do" (3 words > 2 chars), it matches "what can you do" — but it would also match many unrelated messages. A short message like "can you help" would match "what can you do?" because all 3 words appear in it.

**Fix:** Require at least 60% word overlap in both directions, or require user message length to be > 50% of the Q length, to reduce false positive Q&A matches.

---

## Bug 3: Chat history sent to AI includes stale placeholder `...`

**Location:** `ProjectEditor.tsx` lines 1077-1081

**Problem:** The history filter at line 1079 filters `m.content !== '...'` but only *before* the new user message is appended. When the stream starts, the `...` placeholder is added (line 1086). If the user sends another message quickly (before streaming finishes), the previous `...` placeholder could still be in `chatMessages`. The filter handles this, but there's an edge case: if the stream never completes (timeout/error), the `...` placeholder remains permanently in the chat as a visible message.

**Fix:** In the `catch` block (line 1130-1131), remove the trailing `...` placeholder before adding the error message. Currently it appends an error but leaves the `...` visible.

---

## Bug 4: Auto-save fires even when there's no project to save to

**Location:** `ProjectEditor.tsx` lines 1272-1286

**Problem:** The auto-save interval calls `handleSaveRef.current()` when `isDirty` is true, but `handleSave` → `executeSave` will *insert a new project* if `currentProjectId` is null. This means auto-save can silently create DB records before the student intentionally saves for the first time.

**Fix:** Guard auto-save to only trigger when `currentProjectId` is not null (i.e., the student has explicitly saved at least once).

---

## Bug 5: Stream timeout is only 30 seconds — too short for complex AI responses

**Location:** `ProjectEditor.tsx` line 864

**Problem:** The `AbortController` timeout is 30s. For complex "run" simulations or detailed mentor responses, the AI may take longer, causing abrupt "AbortError" failures.

**Fix:** Increase timeout to 60s, or make it action-dependent (30s for test-agent, 60s for run/review/mentor-chat).

---

## Bug 6: Streaming `...` placeholder never removed on error

**Location:** `ProjectEditor.tsx` line 1130-1131

**Problem:** When the chat stream fails, the code appends a new error system message but never removes the `{ role: 'assistant', content: '...' }` placeholder added at line 1086. This leaves a visible "..." bubble in the chat.

**Fix:** In the catch block, replace the last message (the placeholder) instead of appending.

---

## Bug 7: Knowledge base double-sends to AI

**Location:** `ProjectEditor.tsx` line 1088

**Problem:** `mergedKnowledge` concatenates sidebar `knowledgeBase` state AND `config.knowledgeBaseFromCode`. But these are kept in sync via bidirectional effects (lines 447-481) — so they're always identical. The AI receives the same text twice, wasting tokens and potentially confusing responses.

**Fix:** Use only `config.knowledgeBaseFromCode` (the code is the source of truth) or deduplicate by checking if they're equal.

---

## Bug 8: `handleTypeChange` doesn't reset textarea imperatively

**Location:** `ProjectEditor.tsx` lines 617-641

**Problem:** When switching project type, `setFiles` updates state but the uncontrolled textarea still shows old content. The imperative sync effect (line 564-568) only runs when `files['main.py']` changes and the textarea isn't focused — but after type change, it may not trigger reliably since the component isn't remounted.

**Fix:** Add `if (textareaRef.current) textareaRef.current.value = scaffold.main;` after `setFiles`.

---

## Implementation Order

1. **Bug 6** — Fix streaming placeholder not removed on error (quick, high visibility)
2. **Bug 3** — Clean up stale `...` in chat history  
3. **Bug 4** — Guard auto-save against creating unintended DB records
4. **Bug 1** — Unify mission progress thresholds
5. **Bug 7** — Deduplicate knowledge base sent to AI
6. **Bug 2** — Tighten Q&A fuzzy matching to reduce false positives
7. **Bug 8** — Reset textarea on type change
8. **Bug 5** — Increase stream timeout

