

# Plan: Fix Typing/Backspace Bug by Converting to Uncontrolled Textarea

## Root Cause

The textarea uses React's controlled pattern (`value={files[activeFile]}`). Every time `files` state changes — whether from user typing OR sync effects — React re-renders the textarea with the new value, which **resets the cursor to the end**. The `useLayoutEffect` cursor restore is unreliable because:
1. The saved cursor position is captured **before** the edit, not after
2. React batching means multiple renders can occur between saves
3. The sync effects (knowledge, QA, theme, system prompt) modify `files` state, triggering additional re-renders that fight the cursor

No amount of ref guards or debouncing can fully fix this because the fundamental problem is React's controlled textarea behavior.

## Solution: Uncontrolled Textarea

Convert the textarea from controlled (`value={}`) to **uncontrolled** (no `value` prop). The textarea DOM element becomes the source of truth for what's displayed. React state (`files`) is still updated on every keystroke for syntax highlighting and config extraction, but the textarea itself is never re-rendered by React.

### How it works:
1. Remove `value={files[activeFile]}` from the textarea
2. Set initial content via `textareaRef.current.value = ...` imperatively (on mount, file tab switch, template change)
3. `updateFile()` reads from `e.target.value`, updates `files` state (for highlighting/config), but React never pushes back to the textarea
4. Sidebar→code sync effects update `files` state AND imperatively set `textareaRef.current.value`, preserving cursor where possible
5. Remove all the cursor-save/restore hacks (`cursorPosRef`, `useLayoutEffect`, `isUserTypingRef`, `filesChangeSourceRef`, `typingTimeoutRef`)

### Changes in `ProjectEditor.tsx`:
1. **Remove** `isUserTypingRef`, `typingTimeoutRef`, `cursorPosRef`, `filesChangeSourceRef` refs and related logic
2. **Remove** the `useLayoutEffect` cursor restore hack
3. **Change textarea** from `value={files[activeFile]}` to no value prop
4. **Add** imperative setter: when `activeFile` changes or template loads, set `textareaRef.current.value`
5. **Update** sidebar→code sync effects to also imperatively update `textareaRef.current.value` (with cursor preservation since the user isn't typing in these cases)
6. **Simplify** `updateFile()` — just `setFiles(...)`, no cursor/typing tracking needed
7. **Keep** all code→sidebar sync effects as-is (they read from `files` state, which still updates)

### Files Modified
- `src/components/hackathon/ProjectEditor.tsx`

