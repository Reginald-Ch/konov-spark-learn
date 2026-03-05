# Plan: Complete FORGE Platform for Training Tomorrow

## Current State Assessment

The platform has a solid foundation: 6-tab Discord-style UI, 3-panel Build Studio IDE, AI streaming via `python-ai-assist` edge function, project saving/publishing, leaderboard, and community chat. However, several critical issues need fixing and polish is needed for a training session.

## Critical Fixes

### 1. Fix `supabase/config.toml` — Edge Function JWT Config

The config only has `project_id`. Missing `verify_jwt = false` for `python-ai-assist`, which may cause 401 errors on AI calls.

**File:** `supabase/config.toml`
Add:

```toml
[functions.python-ai-assist]
verify_jwt = false
```

### 2. Fix Save Flow — Update Requires `author_email` Match

The `executeSave` update call uses `.eq('id', currentProjectId)` but RLS restricts updates to matching `author_email`. The update call doesn't include the email filter, which could silently fail.

**File:** `src/components/hackathon/ProjectEditor.tsx`

- Add `.eq('author_email', authorEmail)` to the update query for save checkpoint

### 3. Fix Publish (Go Live) — Duplicate Insert Issue

When a user saves first then publishes, two separate records are created. The Go Live flow should update the existing saved project to `is_published = true` instead of inserting a new one.

**File:** `src/components/hackathon/PublishModal.tsx`

- Accept `currentProjectId` as a prop
- If `currentProjectId` exists, update that record with `is_published: true` instead of inserting new
- Otherwise insert as before

**File:** `src/components/hackathon/ProjectEditor.tsx`

- Pass `currentProjectId` to `PublishModal`

### 4. Rename Platform to "FORGE"

Update visible branding across the UI.

**Files affected:**

- `src/pages/Hackathons.tsx` — Welcome banner title, SEO title, onboarding modal
- `src/components/hackathon/TemplatesTab.tsx` — Header text

### 5. Streamline the Student Entry Flow

For training: when a student arrives, the flow should be Templates → pick type → Build tab auto-opens with code and Live Preview working immediately. This already works but the default tab is `hackathons`. For training, default to `templates`.

**File:** `src/pages/Hackathons.tsx`

- Change `useState<MainTab>('hackathons')` to `useState<MainTab>('templates')`

### 6. Add Live Preview Interactive Demo Chat

The Live Preview chat works via `test-agent` action. Currently sends only the latest message without conversation history. For a real chatbot feel, send conversation history.

**File:** `src/components/hackathon/ProjectEditor.tsx`

- In `handleChatSend`, collect previous user/assistant messages and send them as context in the `code` field or add a `messages` field to the edge function

**File:** `supabase/functions/python-ai-assist/index.ts`

- Add support for `messages` array in `test-agent` action to maintain conversation context



### 8. Polish ProjectView Page — Add Live Demo Chat

The `/projects/:id` page shows code but has no interactive demo. Add a chat panel so visitors can interact with the published AI.

**File:** `src/pages/ProjectView.tsx`

- Add a chat panel using the same streaming logic as the IDE preview
- Extract system prompt from the code's `SYSTEM_PROMPT` variable
- Show chat alongside code view

## Implementation Order

1. Fix config.toml (critical — prevents 401s)
2. Fix Save/Publish flow (critical — reported broken)
3. Rename to FORGE + default to templates tab
4. Add conversation history to Live Preview
5. Polish ProjectView with interactive demo
6. Add "Try It" to gallery

## Files Modified

- `supabase/config.toml`
- `src/components/hackathon/ProjectEditor.tsx`
- `src/components/hackathon/PublishModal.tsx`
- `src/pages/Hackathons.tsx`
- `src/components/hackathon/TemplatesTab.tsx`
- `supabase/functions/python-ai-assist/index.ts`
- `src/components/hackathon/ProjectGallery.tsx`
- `src/pages/ProjectView.tsx`