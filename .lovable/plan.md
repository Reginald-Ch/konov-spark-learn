

# Bug Report: Remaining Issues Before Platform Launch

## Critical

### 1. `supabase/config.toml` Still Missing `verify_jwt = false`
The file only contains `project_id = "agkhmqhgaazfhrwnyeoa"`. The previous fix was supposed to add `[functions.python-ai-assist] verify_jwt = false` but it was never applied. Every AI call (Run Tests, Live Preview chat, AI Mentor, Idea-to-Code) will fail with 401 errors in production.

**Fix:** Add the function config block to `supabase/config.toml`.

### 2. Console Warning: `DialogHeader` Cannot Be Given Refs
The console error `Function components cannot be given refs. Check the render method of PublishModal` fires because `AnimatePresence` in `PublishModal.tsx` (line 168) wraps `motion.div` children that contain `DialogHeader` — a plain function component (not `forwardRef`). Framer Motion's `AnimatePresence` internally clones elements with refs. When `DialogHeader` is nested inside a `motion.div` child of `AnimatePresence`, the Radix Dialog's `Presence` component (not Framer) attempts to attach a ref to `DialogHeader`.

**Fix:** Convert `DialogHeader` in `src/components/ui/dialog.tsx` (line 61) to use `React.forwardRef` so it accepts refs properly. Same for `DialogFooter`.

### 3. Tab Key Doesn't Indent in Code Editor
Pressing Tab in the `<textarea>` (line 1496) moves focus away instead of inserting spaces. For a coding hackathon, this makes editing painful.

**Fix:** Add an `onKeyDown` handler to the textarea that intercepts Tab, inserts 4 spaces at cursor, and calls `e.preventDefault()`.

## High

### 4. `as any` Casts on `point_events` Inserts
Three locations bypass TypeScript safety:
- `ProjectEditor.tsx` line 508, 687
- `PublishModal.tsx` line 146

If the `point_events` table schema doesn't match the generated types (likely since `metadata` is typed as `jsonb`), these silently break. The `as any` casts hide the real issue.

**Fix:** Remove `as any` casts. Cast only the `metadata` field if needed, or use proper typing.

## Medium

### 5. Switching Project Type Doesn't Reset `currentProjectId`
When a student switches from Chatbot to Agent via `handleTypeChange` (line 483), the `currentProjectId` is NOT reset to `null`. The next Save will try to update the old chatbot project record with the new agent code, which may succeed silently but creates confusion — the project type label won't match.

**Fix:** Add `setCurrentProjectId(null)` in `handleTypeChange`.

### 6. Save Doesn't Persist `author_name` on Update
In `executeSave` (line 825), the update payload includes `project_name`, `description`, `code`, `template_id` — but NOT `author_name`. If a student changes their name (e.g., from auto-generated "Student-XXXX" to their real name) and saves, the name change is lost in the database.

**Fix:** Add `author_name: name || authorName` to the update payload.

### 7. `handleViewCode` from Gallery Bypasses Live Gate
`handleViewCode` (line 143) sets `activeTab` to `'build'` directly without checking `hasLiveEvent`. A student viewing the showcase gallery can click "View Code" and land on the locked Build tab screen, which is confusing.

**Fix:** Either check `hasLiveEvent` and show a toast, or allow viewing code in read-only mode.

## Low

### 8. Conversation Starters Not Rendered in Live Preview
The code extracts `conversationStarters` from the Python config but they're never rendered as clickable buttons in the IDE's Live Preview chat panel. Students complete Challenge 12 but see no visual feedback.

**Fix:** Render conversation starters as clickable chips above the chat input when `chatMessages` only contains system messages.

---

## Implementation Order
1. Fix `config.toml` — prevents 401s on all AI features
2. Fix `DialogHeader` forwardRef — eliminates console error
3. Add Tab key support — critical for coding UX
4. Reset `currentProjectId` on type switch
5. Add `author_name` to save update payload
6. Remove `as any` casts
7. Guard `handleViewCode` with live check
8. Render conversation starters (polish)

## Files to Modify
- `supabase/config.toml`
- `src/components/ui/dialog.tsx`
- `src/components/hackathon/ProjectEditor.tsx`
- `src/components/hackathon/PublishModal.tsx`
- `src/pages/Hackathons.tsx`

