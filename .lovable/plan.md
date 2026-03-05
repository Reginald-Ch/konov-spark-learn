

# Plan: Bug Fixes & Enhancements

## Critical Bug

### 1. `HackathonCard` needs `forwardRef` (Runtime Warning)
Console error: `Function components cannot be given refs. Check the render method of Hackathons.`
The `HackathonCard` component is a plain function component but receives refs from parent context (ScrollArea/motion).

**File:** `src/components/hackathon/HackathonCard.tsx`
- Convert to `React.forwardRef`, forward ref to the outer wrapper div.

## Enhancements

### 2. System Prompt bidirectional sync has stale-state risk
In `ProjectEditor.tsx`, the code→sidebar sync (line 547) compares `match[1] !== systemPrompt` but `systemPrompt` is a stale closure value in this effect. This can cause missed updates when the user edits the code directly. The ref-based pattern used for `knowledgeBase` (lines 407-428) is the correct approach.

**File:** `src/components/hackathon/ProjectEditor.tsx`
- The system prompt code→sidebar effect (line 542-554) already uses `prevSystemPromptRef` but also references `systemPrompt` directly in the comparison (line 547). Change to only compare against `prevSystemPromptRef.current` for consistency with the knowledge/QA sync pattern.

### 3. Knowledge Base and Q&A not reset when switching templates
When `handleTypeChange` is called (line 556), it resets files, system prompt, chat, and terminal — but does NOT reset `knowledgeBase`, `qaData`, or `selectedTheme`. This means stale knowledge from a previous template carries into the new one, polluting the new bot and breaking mission progress accuracy.

**File:** `src/components/hackathon/ProjectEditor.tsx`
- In `handleTypeChange`, reset `knowledgeBase` to `''`, `qaData` to `[]`, and read fresh values from the new scaffold code after setting files.

### 4. Mission Progress "System Message" check is always true
Line 1249: `{ emoji: '🧠', name: 'System Message', done: config.systemMessage !== '' }` — the scaffold always ships with a non-empty `SYSTEM_MESSAGE`, so this mission starts as "done" immediately. It should check whether the student has *changed* it from the default.

**File:** `src/components/hackathon/ProjectEditor.tsx`
- Compare `config.systemMessage` against `PROJECT_SCAFFOLDS[projectType].systemPrompt` instead of empty string.

### 5. `Greeting` mission check doesn't account for scaffold defaults
Line 1232: `{ emoji: '👋', name: 'Greeting Message', done: config.greeting !== '' }` — the chatbot scaffold has `AI_MESSAGE = "Hey there! I'm Spark..."` which is non-empty, so this is always "done" on load. Should check against the scaffold default greeting.

**File:** `src/components/hackathon/ProjectEditor.tsx`
- Extract default greeting from scaffold code and compare against it.

---

## Implementation Plan

| # | Fix | File |
|---|-----|------|
| 1 | Convert `HackathonCard` to `forwardRef` | `HackathonCard.tsx` |
| 2 | Fix system prompt sync stale closure | `ProjectEditor.tsx` |
| 3 | Reset knowledge/QA on template switch | `ProjectEditor.tsx` |
| 4 | Fix "System Message" mission check | `ProjectEditor.tsx` |
| 5 | Fix "Greeting" mission check | `ProjectEditor.tsx` |

### Files Modified
- `src/components/hackathon/HackathonCard.tsx`
- `src/components/hackathon/ProjectEditor.tsx`

