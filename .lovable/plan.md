

# Plan: Fix IDE Bugs for Hackathon Readiness

## Bugs Identified

### Bug 1: Duplicate Key Warning (Console Error)
The conversation starters in the Live Preview (line 1647) use `key={example}` — if two starters have identical text, React throws a duplicate key error. The default fallback array has 3 unique strings, but code-defined `CONVERSATION_STARTERS` could have duplicates. The badge spans (lines 1616-1628) also lack keys entirely.

**Fix in `ProjectEditor.tsx`:**
- Change `key={example}` to `key={`${example}-${index}`}` on conversation starter buttons (line 1649)
- This eliminates the console warning

### Bug 2: SYSTEM_MESSAGE Sync Breaks with Triple-Quoted Strings
The scaffold template uses single-line `SYSTEM_MESSAGE = "..."`, but the two-way sync effects (lines 418 and 433) use `["'](.*)["']` which fails on triple-quoted `"""..."""` strings. The `extractConfigFromCode` function already handles triple quotes correctly, but the sync effects don't — so if a student writes a multiline system prompt directly in code, the sidebar won't pick it up (and vice versa).

**Fix in `ProjectEditor.tsx`:**
- Update both sync effects (lines 418 and 433) to also match triple-quoted strings `"""..."""` and `'''...'''`
- When writing back to code from the sidebar, use triple quotes for multiline prompts

### Bug 3: Live Preview Not Reflecting Code Edits (Residual)
The `liveConfig` memo (line 657) is correctly implemented now. However, the `handleChatSend` function (line 665) creates a *separate* `extractConfigFromCode` call instead of using `liveConfig`. While functionally equivalent, it's wasteful. More importantly, the chat function reads `systemPrompt` state (which may lag behind the code due to the sync effect timing).

**Fix in `ProjectEditor.tsx`:**
- In `handleChatSend`, use `liveConfig` instead of calling `extractConfigFromCode` again
- Use `liveConfig.systemMessage` (extracted from code) as the ground truth for the AI call instead of the `systemPrompt` state variable

### Bug 4: Terminal Output Duplicate Keys
The `terminalOutput.map((line, i) => <div key={i}>...)` pattern at line 1506 uses index keys. When lines are appended dynamically (during Run Tests streaming), React reconciliation works fine with index keys here since items are only appended, never reordered. Not a real bug — no change needed.

## Files to Change

1. **`src/components/hackathon/ProjectEditor.tsx`**
   - Fix duplicate key on conversation starters (add index to key)
   - Fix SYSTEM_MESSAGE sync to handle triple-quoted strings
   - Use `liveConfig` in `handleChatSend` instead of re-extracting

## Result
- No more console duplicate key warnings
- Multiline system prompts sync correctly between sidebar and code
- Live Preview always reflects the latest code edits
- IDE is stable and ready for the hackathon

