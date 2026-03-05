

# Scrutiny Report: End-to-End Workflow Bugs

After reading every key file in the workflow chain, here are the bugs found, ranked by severity.

---

## Critical Bugs

### 1. Edge Function Will Return 401 — Missing JWT Config
**File:** `supabase/config.toml` only has `project_id`. There is no `[functions.python-ai-assist]` section with `verify_jwt = false`. Every AI call (Run Tests, Live Preview chat, AI Mentor, Idea-to-Code) will fail with a 401 auth error because the function requires a valid JWT by default, but the client sends only the anon key.

**Fix:** Add `[functions.python-ai-assist]` with `verify_jwt = false` to `supabase/config.toml`.

### 2. "Build Chatbot" Button Silently Does Nothing Without Live Event
**File:** `src/pages/Hackathons.tsx` line 132 — `handleStartBuilding` has `if (!hasLiveEvent) return;` with no user feedback. After ungating the Templates tab, students can see the "Build AI Chatbot" / "Build AI Agent" cards, click them, and nothing happens. No toast, no message. This will cause confusion.

**Fix:** Instead of silent return, show a toast: "Set an event to Live first (Judge Dashboard → Make Live)" and optionally switch to the hackathons tab.

### 3. Duplicate Project on Publish After Save
**File:** `src/components/hackathon/PublishModal.tsx` lines 105-136 — When `currentProjectId` exists but the update fails (e.g. email mismatch due to regenerated identity), it falls through to insert a NEW record. This creates duplicates on the leaderboard. The fallback insert at line 116 is a silent data integrity issue.

**Fix:** Log a warning to the user instead of silently inserting a duplicate. Or better: ensure `authorEmail` is stable by always reading from localStorage before generating a new random one.

---

## Medium Bugs

### 4. Random Student Identity Can Change Between Sessions
**File:** `src/components/hackathon/ProjectEditor.tsx` lines 353-356 — `authorEmail` initializes from localStorage OR generates a new random one. If localStorage is cleared (incognito, different browser), a new identity is created. The old saved project can no longer be updated (email mismatch in `.eq('author_email', email)`), leading to bug #3.

**Fix:** Always persist immediately on generation: if no stored email, generate AND save to localStorage in the same initialization.

*Looking at the code more closely: line 353 does `localStorage.getItem` first, and line 846 does `localStorage.setItem` on save. But if a user never saves and closes, the identity is lost. The initialization should immediately persist.*

### 5. Knowledge Base & Q&A Not Saved to Database
Knowledge base text and Q&A pairs are stored only in `localStorage` (lines 307, 308, 393, 394). When a project is saved or published, only `code` is persisted to the `ai_projects` table. If a student switches devices or clears browser data, their knowledge base is lost. The deployed ProjectView page also has no access to this data — it only reads `code` from the database.

**Impact:** The deployed app at `/projects/:id` will NOT have the student's knowledge base or sidebar Q&A pairs. Only Q&A pairs embedded directly in the Python code (`QA_PAIRS = [...]`) will work.

**Fix (for training):** This is acceptable if students are told to put Q&A in the code. For a full fix, add `knowledge_base` and `qa_data` columns to `ai_projects`.

### 6. `as any` Casts on Database Inserts
Multiple locations cast point_events inserts with `as any`:
- `ProjectEditor.tsx` line 502, 681
- `PublishModal.tsx` line 151

This bypasses TypeScript safety. If the `point_events` table schema changes, these will silently break.

---

## Minor / Polish Issues

### 7. Editor Textarea Not Tab-Friendly
The `<textarea>` at line 1490 doesn't handle Tab key — pressing Tab moves focus away instead of inserting indentation. For a code editor, this is a usability issue during a hackathon.

### 8. AI Call Limit Counter Resets on Remount
`aiCallCount` (line 361) is local state, not persisted. When the student switches templates (which remounts via `buildKey`), the counter resets to 0. The "40 per session" limit shown in the config sidebar is misleading since the actual limit is server-side (rate limiting).

---

## Summary of Required Fixes

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **Critical** | `supabase/config.toml` | Add `verify_jwt = false` for edge function |
| 2 | **Critical** | `src/pages/Hackathons.tsx` | Show toast when Build clicked without live event |
| 3 | **High** | `src/components/hackathon/PublishModal.tsx` | Prevent duplicate insert on publish |
| 4 | **Medium** | `src/components/hackathon/ProjectEditor.tsx` | Persist random identity immediately |
| 5 | **Low** | Documentation | Tell students to put Q&A in code, not sidebar |
| 6 | **Low** | Multiple files | Remove `as any` casts |
| 7 | **Low** | `ProjectEditor.tsx` | Add Tab key handler |

## Implementation Approach

Fix items 1-4 in code. Items 5-7 are polish for after the training.

