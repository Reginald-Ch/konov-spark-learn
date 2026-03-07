

# Fix: Editor Typing Bugs (Tab, Enter, and Cursor Issues)

## Root Cause

The editor textarea uses `defaultValue` (uncontrolled component) — which is correct for preventing cursor resets during React re-renders. **However**, the Tab and Enter key handlers have a critical bug: they construct a new string (`newValue`) and pass it to `updateFile()`, which only calls `setFiles()` (React state). Since the textarea is uncontrolled, React state changes **do not** push back to the DOM. The textarea still shows the old text, while React state has the new text. This causes:

- **Tab key**: inserts spaces in React state but not in the visible textarea
- **Enter key**: inserts newline + indentation in React state but not in the visible textarea
- The next keystroke reads from the stale DOM, causing text jumps and cursor teleporting

## Fix

**File:** `src/components/hackathon/ProjectEditor.tsx`

In both the Tab and Enter `onKeyDown` handlers, add `target.value = newValue;` **before** the `requestAnimationFrame` call so the DOM is updated immediately:

**Tab handler** (around line 1894-1899):
```tsx
const newValue = value.substring(0, start) + '    ' + value.substring(end);
target.value = newValue;          // ← ADD: push to DOM immediately
updateFile(newValue);
requestAnimationFrame(() => {
  target.selectionStart = target.selectionEnd = start + 4;
  updateCursorInfo(target);
});
```

**Enter handler** (around line 1912-1918):
```tsx
const newValue = value.substring(0, pos) + insertion + value.substring(target.selectionEnd);
target.value = newValue;          // ← ADD: push to DOM immediately
updateFile(newValue);
requestAnimationFrame(() => {
  const newPos = pos + insertion.length;
  target.selectionStart = target.selectionEnd = newPos;
  updateCursorInfo(target);
});
```

This is a two-line fix (one line per handler) that resolves the typing flow issue participants experienced.

## Files Modified
- `src/components/hackathon/ProjectEditor.tsx` — add `target.value = newValue` in Tab and Enter handlers

