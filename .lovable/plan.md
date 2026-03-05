

# Plan: Fix IDE Backspace Bug, Project Persistence on Reload, and Console Warnings

## Bugs Found

### 1. Backspace Deletes Wrong Content (Critical)
The code editor uses a controlled `<textarea>` with bidirectional sync effects. When the user presses backspace inside a variable like `KNOWLEDGE_BASE`, `SYSTEM_MESSAGE`, or `QA_PAIRS`:
1. `updateFile()` sets new `files['main.py']`
2. Code→sidebar effect extracts the new value, updates `knowledgeBase`/`systemPrompt` state
3. On next render, sidebar→code effect detects the state change and calls `setFiles()` with a regex-replaced string
4. This second `setFiles()` causes React to re-render the textarea with a new value, **resetting the cursor position**

The ref guards (`prevKnowledgeRef`, `prevSystemPromptRef`) are supposed to prevent this, but there's a timing issue: the code→sidebar effect updates both the ref AND the state in the same tick, but React batches state updates and the sidebar→code effect runs in a separate render cycle where it sees the new state but the ref comparison can still mismatch due to sanitization differences (e.g., triple-quote escaping).

**Fix:** Add an `isUserTypingRef` flag. Set it to `true` in `updateFile()` (textarea onChange) and clear it after a short delay. All sidebar→code sync effects check this flag and skip if true. This prevents the sync effects from fighting with the user's typing.

**File:** `src/components/hackathon/ProjectEditor.tsx`
- Add `const isUserTypingRef = useRef(false)` and a `typingTimeoutRef`
- In `updateFile()`, set `isUserTypingRef.current = true` and debounce clearing it (300ms)
- In all 3 sidebar→code effects (knowledge, QA, system prompt), add early return if `isUserTypingRef.current` is true

### 2. Project Not Persisted on Page Reload (Critical)
`currentProjectId` only lives in React state. When the user saves a project and reloads the page, the state is lost. The IDE starts fresh with no project loaded.

**Fix:** 
- Save `currentProjectId` to `localStorage` whenever it's set (after save or publish)
- On mount, read `currentProjectId` from localStorage
- If it exists, fetch the project from DB and populate the editor with the saved code, template, and name

**File:** `src/components/hackathon/ProjectEditor.tsx`
- Initialize `currentProjectId` from `localStorage.getItem('forge-current-project-id')`
- Add effect to persist `currentProjectId` to localStorage when it changes
- Add mount effect: if `currentProjectId` exists and no `initialCode` was provided, fetch the project from `ai_projects` and load the code into the editor

### 3. PublishModal forwardRef Warning (Minor)
Console shows: `Function components cannot be given refs. Check the render method of ProjectEditor` for `PublishModal`. This is the same pattern as the HackathonCard fix.

**File:** `src/components/hackathon/PublishModal.tsx`
- No ref is actually passed to PublishModal from ProjectEditor (it's just `<PublishModal isOpen=... />`), so this warning likely comes from the `Dialog` component internally. Wrapping with `forwardRef` will silence it.

---

## Implementation Plan

| # | Fix | File |
|---|-----|------|
| 1 | Add `isUserTypingRef` debounce to prevent sync effects from fighting textarea | `ProjectEditor.tsx` |
| 2 | Persist `currentProjectId` to localStorage + load saved project on mount | `ProjectEditor.tsx` |
| 3 | Convert `PublishModal` to `forwardRef` | `PublishModal.tsx` |

### Files Modified
- `src/components/hackathon/ProjectEditor.tsx`
- `src/components/hackathon/PublishModal.tsx`

