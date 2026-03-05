

# Plan: Fix Timer, PublishModal Ref Warning, and IDE Reliability

## Issues to Fix

### 1. CountdownWidget Timer — Should Only Reset via Judge Control
**Problem**: The `CountdownWidget` in `ProjectEditor.tsx` (line 226) counts UP from a localStorage timestamp (`forge-session-start`). It resets after 24 hours automatically, but should only reset when judges restart/end an event. Currently it has no connection to the hackathon's actual `start_date` from the database.

**Fix in `ProjectEditor.tsx`**:
- Accept an optional `hackathonStartDate` prop on `ProjectEditor`
- Pass the live hackathon's `start_date` from `Hackathons.tsx` into `ProjectEditor`
- In `CountdownWidget`, accept and use the hackathon start date as the timer origin instead of localStorage
- Remove the localStorage-based session timer — use the database `start_date` as the single source of truth
- Timer stops (shows final elapsed time) when the event status changes to `ended`

**Fix in `Hackathons.tsx`**:
- Find the first live hackathon's `start_date` and pass it to `ProjectEditor` as a prop
- Also pass `hackathonStatus` so the timer knows when to freeze

### 2. PublishModal Ref Warning (Console Error)
**Problem**: Console shows "Function components cannot be given refs" for `PublishModal`. The `Dialog` component from Radix tries to pass a ref.

**Fix in `PublishModal.tsx`**:
- The issue is that `PublishModal` itself is NOT receiving a ref from `ProjectEditor` (line 1782 shows no `ref` prop). The warning comes from Radix `Dialog` internally trying to ref child components. The actual fix: wrap the export with `forwardRef` or restructure to avoid the warning. Since `ProjectEditor` doesn't pass a ref, the simplest fix is to ensure the `Dialog` root doesn't trigger the warning — wrap `PublishModal` in `React.forwardRef`.

### 3. Template Key Fix — Explanation and Verification
**What it does**: In `Hackathons.tsx` line 500, `ProjectEditor` has `key={`${buildTemplate}-${buildKey}`}`. When `buildKey` increments (line 135), React destroys the old `ProjectEditor` and creates a new one, forcing it to read the latest scaffold from `projectScaffolds.ts`. Without this, clicking "Build Chatbot" twice would reuse the stale component.

**Verify**: The `handleStartBuilding` function (line 131) already increments `buildKey`. This is working correctly. No change needed here.

### 4. Live Preview Chat — Ensure `systemPrompt` State Is Synced
**Problem**: In `handleChatSend` (line 752), the `systemPrompt` state variable is passed to the edge function. But if the user edited `SYSTEM_MESSAGE` directly in code, the state may lag behind because the code→state sync effect (line 441-453) runs asynchronously.

**Fix**: Use `liveConfig.systemMessage` (extracted from code via regex) instead of the `systemPrompt` state in the edge function call. But `extractConfigFromCode` currently returns `systemMessage` only indirectly. Need to add it.

**Fix in `ProjectEditor.tsx`**:
- Add `systemMessage` to the `extractConfigFromCode` return object (extract from `SYSTEM_MESSAGE`)
- In `handleChatSend`, pass `liveConfig.systemMessage` (or fall back to `systemPrompt` state) to the edge function instead of `systemPrompt`

## Files to Change

1. **`src/components/hackathon/ProjectEditor.tsx`**
   - Add `hackathonStartDate` and `hackathonStatus` props
   - Refactor `CountdownWidget` to use hackathon start date from props
   - Add `systemMessage` to `extractConfigFromCode` return
   - Use `liveConfig.systemMessage` in `handleChatSend` and `handleRun`

2. **`src/pages/Hackathons.tsx`**
   - Pass first live hackathon's `start_date` and `status` to `ProjectEditor`

3. **`src/components/hackathon/PublishModal.tsx`**
   - Wrap with `React.forwardRef` to fix the console ref warning

## Result
- Timer counts from actual event start time, freezes when judges end the event
- No more console ref warnings
- Live Preview chat always uses the latest system prompt from the code editor
- Template switching works reliably via the existing buildKey mechanism

