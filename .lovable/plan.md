

# Bug Fix Plan: IDE, Live Preview & Live UI Demo

## Bugs Found

### Bug 1: Response Tone challenge logic inconsistent across 3 places
The Response Tone challenge (challenge 19) is evaluated using **3 different algorithms** in the same file, leading to inconsistent completion status between the mission progress panel, the getChallengeCount function, and the handleRun terminal output.

- **Mission Progress (line 2127)**: Checks `responseToneConditional.length > 0 || responseTone !== '' && not-default`
- **getChallengeCount (line 1529-1537)**: Compares conditional values against scaffold defaults
- **handleRun (line 1411-1419)**: Same as getChallengeCount but independently defined

**Fix**: Unify all 3 into a single shared helper function.

### Bug 2: ProjectView missing `errorMessage` config in chat error handler
In ProjectView line 690, it references `config?.errorMessage` but `extractConfigFromCode` in ProjectView (lines 256-293) does NOT extract `errorMessage`. It's always `undefined`, so custom error messages set by students are ignored in the published Live UI Demo.

**Fix**: Add `errorMessage: extract('', 'ERROR_MESSAGE', 'error_message')` to ProjectView's config extraction.

### Bug 3: ProjectView missing `languageStyle`, `signOff`, and `mood` fields
ProjectView's `extractConfigFromCode` doesn't extract `languageStyle`, `signOff`, or `mood` — but these are sent in `botConfig` to the edge function (lines 610-611). They'll always be `undefined`, meaning published projects lose language style, sign-off, and mood personality.

**Fix**: Add these 3 fields to ProjectView's config extraction.

### Bug 4: Chat type mismatch — `_id` property causes TypeScript `as any` casts
Both files use `as any` casts to attach `_id` to messages. This is fragile and could cause issues with React's reconciliation.

**Fix**: Add `_id` to the ChatMessage interface as an optional field in both files. Remove `as any` casts.

### Bug 5: Welcome screen shows alongside greeting message
In ProjectView, the welcome screen (with bot emoji + conversation starters) shows when `chatMessages.length <= 1`. But the greeting fires as `chatMessages[0]`, so `length === 1` still shows the welcome hero AND the greeting bubble, creating visual duplication.

**Fix**: Change condition to `chatMessages.length === 0` so the welcome only shows before the greeting arrives.

## Files Modified

1. **src/components/hackathon/ProjectEditor.tsx**
   - Extract Response Tone check into a reusable helper
   - Add `_id` to ChatMessage interface

2. **src/pages/ProjectView.tsx**
   - Add missing config fields: `errorMessage`, `languageStyle`, `signOff`, `mood`
   - Add `_id` to ChatMessage interface
   - Fix welcome screen condition from `<= 1` to `=== 0`

## Implementation Order
1. Fix ProjectView config extraction (bugs 2 + 3)
2. Fix welcome screen overlap (bug 5)
3. Unify Response Tone logic (bug 1)
4. Clean up ChatMessage types (bug 4)

