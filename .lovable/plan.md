

# Honest Assessment: Is the App Ready?

## Verdict: **Almost.** There are 5 remaining bugs that need fixing before the hackathon.

---

## Bug 1: `supabase/config.toml` Missing Edge Function Config (Critical)

The config file only has `project_id = "agkhmqhgaazfhrwnyeoa"`. It's missing `verify_jwt = false` for the `python-ai-assist` edge function. This can cause **401 errors** on AI calls (Run Tests, Live Preview chat, Review/Explain/Suggest).

**Fix:** Add `[functions.python-ai-assist]` section with `verify_jwt = false`.

---

## Bug 2: `ai_projects` Table Default `points_earned = 10` (Medium)

The database column `points_earned` has a **default value of 10**. Even though we set `points_earned: 0` in the code, any external insert (or if the field is omitted) will still get 10 points. This is a leftover from the old scoring system. Should be changed to default 0.

**Fix:** Database migration to `ALTER TABLE ai_projects ALTER COLUMN points_earned SET DEFAULT 0`.

---

## Bug 3: PublishModal Still Shows "+15 Points Earned" Text (Low)

The success screen (line 236) shows "+15 Points Earned" and the form (line 328) says "15 leaderboard points". The actual milestone breakdown is `project_deployed` (10) + `submitted_on_time` (5) = 15. This is technically correct, but the user flagged it. Since the scoring IS 15 pts from publishing, this is accurate. **No change needed** unless user wants different messaging.

---

## Bug 4: `description` Field Polluted with Anti-Cheat Metrics (Medium)

In `executeSave` (line 1041), the metrics tag is appended to `systemPrompt` and stored as `description`:
```
const descWithMetrics = systemPrompt + metricsTag;
```

But in `PublishModal`, `description` is separately set from the user's form input. So when a student saves (description = systemPrompt + metrics), then publishes (description = user-typed description), the metrics are lost on publish. Also, the Judge Dashboard shows the `description` field with `<!--FORGE_METRICS:...-->` visible in the project card (line 122 attempts to strip it, but only strips if preceded by newline).

**Fix:** Store metrics in a separate field. Since we can't add columns easily, append metrics to the `code` field instead (at the very end as a comment), or use a more robust regex strip. The simpler fix: ensure metrics regex in JudgeDashboardPanel strips the tag regardless of prefix.

---

## Bug 5: Textarea `updateFile` Doesn't Sync Back to Textarea (Edge Case)

When sync effects (knowledge base, QA, theme, system prompt) update `files['main.py']` via `setFiles`, the textarea is uncontrolled (`defaultValue`). The `useEffect` on line 430-434 only fires when `activeFile` changes, not when `files[activeFile]` changes. So if a student is on `main.py` and edits the knowledge base in the sidebar, the code updates in `files` state (and syntax highlighting updates), but the actual textarea content becomes stale.

**Fix:** Add a second `useEffect` that watches `files[activeFile]` and imperatively updates `textareaRef.current.value` only when the change came from a sync effect (not from typing). Use a ref flag `isExternalUpdate` to distinguish.

---

## Implementation Plan

### Files to modify:
1. **`supabase/config.toml`** — Add edge function JWT bypass
2. **Database migration** — Change `points_earned` default to 0
3. **`src/components/hackathon/ProjectEditor.tsx`** — Fix textarea sync for sidebar edits; improve metrics storage
4. **`src/components/hackathon/JudgeDashboardPanel.tsx`** — Improve metrics regex stripping

### Technical Details

**config.toml addition:**
```toml
[functions.python-ai-assist]
verify_jwt = false
```

**Textarea sync fix (ProjectEditor.tsx):**
Add a ref `externalUpdateRef = useRef(false)` and set it `true` before `setFiles` calls from sync effects (knowledge, QA, theme, systemPrompt). Add a `useEffect` watching `files[activeFile]` that does:
```ts
useEffect(() => {
  if (externalUpdateRef.current && textareaRef.current) {
    textareaRef.current.value = files[activeFile];
    externalUpdateRef.current = false;
  }
}, [files[activeFile]]);
```

**Metrics storage fix:**
Append metrics as a Python comment to the `code` field instead: `\n# FORGE_METRICS:{"ks":...}` — this way it survives publish and is always available to judges.

