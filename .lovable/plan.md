

# Bug Report: Final Issues Before Platform Launch

After a thorough end-to-end audit, here are the remaining issues.

---

## Critical

### 1. `supabase/config.toml` STILL Missing `verify_jwt = false`

The file contains only `project_id = "agkhmqhgaazfhrwnyeoa"` — one line. Previous fixes claimed to add the JWT config but it was never persisted. Every AI call (Run Tests, Live Preview chat, AI Mentor, Idea-to-Code) will fail with 401 errors because the edge function defaults to requiring JWT verification.

**Fix:** Redeploy the `python-ai-assist` edge function (the deploy tool handles `verify_jwt` automatically). No manual config.toml edit needed since the deployment tool sets this.

---

## Medium

### 2. Conversation Starters Only Set Input — Don't Auto-Send

In both `ProjectEditor.tsx` (line 1705) and `ProjectView.tsx` (line 541), clicking a conversation starter calls `setChatInput(example)` but does NOT call `handleChatSend()`. The student clicks a starter chip, the text fills the input box, then they must manually press Enter or click Send. This is unintuitive — users expect clicking a starter to immediately send.

**Fix:** After setting chat input, trigger `handleChatSend` with the clicked message directly, or use a ref/effect to auto-send.

### 3. ProjectView Chat Streaming Shows Bounce Dots Even After Content Arrives

In `ProjectView.tsx` line 573, the streaming indicator checks `chatMessages[chatMessages.length - 1]?.content === '...'`. But once the first chunk arrives, content changes from `'...'` to actual text, and the bounce dots disappear — while `isStreaming` is still true. There's no loading indicator between the user message and first AI chunk arriving. Not a bug per se, but the `'...'` placeholder message IS visible as a literal "..." bubble before chunks arrive.

**Fix:** This is minor polish. No change needed unless you want a dedicated typing indicator.

### 4. `handleViewCode` Confirmation Dialog Uses `confirm()` (Browser Native)

In `Hackathons.tsx` line 148, `confirm('This will load new code...')` uses the browser's native dialog which looks jarring and can't be styled. For a polished platform, this should use a proper modal or toast confirmation.

**Fix:** Replace `confirm()` with a styled dialog or simply skip the confirmation (the build tab already has a dirty indicator).

---

## Low

### 5. Duplicated `extractConfigFromCode` Logic

The config extraction function is duplicated across `ProjectEditor.tsx` (60+ lines) and `ProjectView.tsx` (90+ lines) with slight differences. This is a maintenance risk — if you add Challenge 21, you'd need to update both.

**Fix (optional):** Extract into a shared utility. Not blocking for launch.

### 6. ProjectView Does Not Show Un-published Projects Gracefully

If someone navigates to `/projects/some-id` for a saved-but-not-published project, the query has `.eq('is_published', true)` (line 123). The user sees "Project not found" with no explanation that the project exists but isn't published yet.

**Fix:** Show a message like "This project hasn't been published yet" instead of the generic "not found."

---

## Implementation Plan

| # | Severity | Fix |
|---|----------|-----|
| 1 | **Critical** | Redeploy edge function with verify_jwt=false |
| 2 | **Medium** | Make conversation starter clicks auto-send in ProjectEditor + ProjectView |
| 3 | **Low** | No change needed |
| 4 | **Low** | Replace `confirm()` with toast or remove |
| 5 | **Low** | Skip for now |
| 6 | **Low** | Better "not published" message |

### Files to Modify
- Edge function redeployment (handles config.toml)
- `src/components/hackathon/ProjectEditor.tsx` — conversation starter auto-send
- `src/pages/ProjectView.tsx` — conversation starter auto-send, unpublished message
- `src/pages/Hackathons.tsx` — remove native `confirm()`

