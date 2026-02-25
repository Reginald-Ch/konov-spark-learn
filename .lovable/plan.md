

# Plan: Make IDE and Codes Work for MVP

## Issues Found

### Critical Bug: Edge Function Blocked
`supabase/config.toml` only has `project_id`. There is no `[functions.python-ai-assist]` section with `verify_jwt = false`. Every call to "Run Tests", "Review", "Explain", "Suggest", and Live Preview chat will fail with a 401 auth error. This is the single biggest blocker.

**Fix:** Add the function config to `supabase/config.toml`.

### Critical Bug: Saved Projects Cannot Be Retrieved
The `ai_projects` table RLS SELECT policy only allows `is_published = true`. When a student clicks "Save Project" (which sets `is_published: false`), the row is inserted but can never be queried back. Students lose their work.

**Fix:** Add a SELECT policy that allows users to read their own drafts by `author_email`, and add an UPDATE policy scoped to `author_email` match. Also track the saved project ID in state so subsequent saves update instead of creating duplicates.

### Bug: Editor Scroll Desync
The syntax highlighting overlay is positioned `absolute` while the textarea scrolls independently. As soon as the code is longer than the visible area, the highlighted layer and the actual text drift apart, making the editor unusable for real code.

**Fix:** Replace the dual-layer approach (absolute highlight div + transparent textarea) with a single synchronized scroll container. Both the line numbers div and the highlight div must scroll together with the textarea using a shared `onScroll` handler.

### Bug: Console Warning on PublishModal
`PublishModal` is a function component being passed a ref by Radix Dialog. This triggers "Function components cannot be given refs" warnings.

**Fix:** This is cosmetic -- the Dialog wraps properly. No functional break, but wrapping the export with `forwardRef` would silence it. Low priority.

### UX Issue: No Visual Feedback on Errors
When the edge function returns a 401 (due to the config issue above), the error message shown is just "AI service error" with no guidance. Students won't know what's wrong.

**Fix:** Add specific error messages for common HTTP status codes (401, 429, 402) in `streamFromEdgeFunction`.

---

## Implementation Plan

### Step 1: Fix Edge Function Config
Add to `supabase/config.toml`:
```toml
[functions.python-ai-assist]
verify_jwt = false
```
This unblocks all AI features immediately.

### Step 2: Fix Editor Scroll Sync
In `ProjectEditor.tsx`, refactor the editor area:
- Add a `scrollTop` state tracked via `onScroll` on the textarea
- Apply the same `scrollTop` to the line numbers div and the highlight overlay using refs
- Both layers scroll in lockstep, preventing drift
- Wrap line numbers + highlight + textarea in a single scrollable container where all three share the same scroll position

### Step 3: Fix Save/Load with Project Persistence
In `ProjectEditor.tsx`:
- Add `currentProjectId` state (null for new projects, UUID after first save)
- On first save: INSERT into `ai_projects`, store returned `id` in state
- On subsequent saves: UPDATE the existing row using `eq('id', currentProjectId)`
- Show "Last saved: X" timestamp in the bottom bar

Database migration needed:
- Add RLS SELECT policy: allow reading rows where `author_email` matches (for drafts)
- This requires knowing the user's email -- currently stored as 'anonymous@hackathon.com' on save. Update save flow to prompt for email on first save (reuse the same email for all saves in that session via state).

### Step 4: Better Error Handling in Stream Helper
In `streamFromEdgeFunction` inside `ProjectEditor.tsx`:
- Check `resp.status` before parsing
- 401 → "Authentication error. Please refresh the page."
- 429 → "Too many requests. Wait a moment and try again."  
- 402 → "AI credits exhausted. Try again later."
- Add a 30-second timeout to prevent hanging requests

### Step 5: Fix PublishModal Ref Warning
Wrap `PublishModal` component with `forwardRef` to satisfy Radix Dialog's ref forwarding.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.python-ai-assist]` with `verify_jwt = false` |
| `src/components/hackathon/ProjectEditor.tsx` | Fix scroll sync, add project ID tracking for save/update, improve error handling in stream helper |
| `src/components/hackathon/PublishModal.tsx` | Add `forwardRef` wrapper |
| Database migration | Add RLS policy for draft reads by `author_email` |

## Implementation Order
1. Config fix (unblocks everything)
2. Editor scroll sync (makes code usable)
3. Save persistence + RLS (makes save work end-to-end)
4. Error handling improvements
5. PublishModal ref fix

