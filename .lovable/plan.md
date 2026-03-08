

# Plan: Fix Typing Performance Bugs in Build Studio IDE

## Root Cause Analysis

Every keystroke triggers this cascade:

1. `onChange` → `updateFile()` → `setFiles()` (re-render)
2. Re-render recomputes: `lines` (not memoized, line 1305), `isDirty`, `liveConfig` (runs 30+ regex extractions), `highlightedContent` (tokenizes every line), and `bracketHighlights`
3. Six `useEffect` hooks watching `files['main.py']` fire — extracting system prompt, knowledge base, Q&A, theme from code via regex, potentially calling `setKnowledgeBase`, `setQaData`, `setSystemPrompt`, `setSelectedTheme` — each triggering another re-render
4. Those state changes trigger the *write-back* effects (knowledge→code, QA→code, theme→code, systemPrompt→code), which call `setFiles` again — causing yet another render cycle
5. `syncTextareaIfNotFocused` effect (line 564) runs on every `files['main.py']` change — while it guards against overwriting during focus, it still fires the effect

**Net result**: A single keystroke causes 3-5 render cycles with heavy regex work each time.

## Fixes (in priority order)

### Fix 1: Debounce `updateFile` state updates

Currently every keystroke immediately calls `setFiles`. Instead, keep the textarea as the source of truth and debounce the React state update by ~150ms. The syntax highlight overlay reads from `files['main.py']`, so it will update after the debounce — giving smooth typing with slightly delayed highlighting.

- Add a `fileUpdateTimerRef` ref
- In `updateFile`, clear/set a 150ms `setTimeout` before calling `setFiles`
- Keep the undo snapshot timer as-is (already debounced at 500ms)

### Fix 2: Memoize `lines` 

Line 1305: `const lines = files[activeFile].split('\n')` runs on every render. Wrap in `useMemo`.

### Fix 3: Guard read-back effects from firing during typing

The six `useEffect` hooks that read config back from code (knowledge, Q&A, theme, system prompt) should not run while the user is actively typing in the code editor. Add an `isTypingRef` flag:
- Set `true` on textarea `onInput`/`onChange`
- Set `false` after a 300ms debounce
- Skip the read-back effects when `isTypingRef.current` is true

This breaks the render cascade: keystroke → debounced `setFiles` → read-back effects skipped → no state churn.

### Fix 4: Throttle `updateCursorInfo` and bracket matching

`updateCursorInfo` (line 742) runs on every `onClick`, `onSelect`, and `onChange`. It does bracket matching which iterates the entire code string. Throttle to run at most once per 100ms using `requestAnimationFrame`.

### Fix 5: Debounce `liveConfig` extraction

`liveConfig` (line 1012) runs `extractConfigFromCode` (30+ regex) on every `files['main.py']` change. Since it's used for the Live Preview (not typing), debounce it with a separate state + timer rather than `useMemo`.

## Files Modified

- `src/components/hackathon/ProjectEditor.tsx` — all fixes in this single file

## Implementation Order

1. Fix 1 (debounce `updateFile`) — biggest impact
2. Fix 3 (guard read-back effects) — stops cascade
3. Fix 2 (memoize `lines`) — quick win
4. Fix 4 (throttle cursor/bracket) — reduces per-keystroke work
5. Fix 5 (debounce `liveConfig`) — reduces regex overhead

