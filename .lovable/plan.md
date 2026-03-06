

# Plan: Leaderboard Update, Bug Fixes & Session Persistence

## 1. Update Leaderboard Scoring System

**File:** `src/components/hackathon/Leaderboard.tsx`

Remove `project_setup` and `app_runs_live` from `SCORING_CONFIG`. Rename remaining milestones and update points:

| Event Key | New Label | Points | Tier |
|-----------|-----------|--------|------|
| `team_formed` | System Message Quality | 10 | 1 |
| `project_deployed` | Knowledge Accuracy | 10 | 2 |
| `first_run_success` | Conversation Quality | 5 | 2 |
| `submitted_on_time` | Creativity & Personality | 5 | 3 |
| `judge_score` | Judge Score | 25 | 4 |

Update `TIER_META` max values accordingly (Tier 1: 10, Tier 2: 15, Tier 3: 5, Tier 4: 25). `MAX_SCORE` = 55.

## 2. Remove `app_runs_live` from Publish Flow

**File:** `src/components/hackathon/PublishModal.tsx`

Remove the `app_runs_live` milestone from the `milestones` array (line 140). Update points badge to show correct total.

## 3. Remove `project_setup` from Template Switch

**File:** `src/components/hackathon/ProjectEditor.tsx`

Remove the `project_setup` point_events insert in `handleTypeChange` (lines 586-592).

## 4. Fix Session Persistence — `currentProjectId` Not Saved

**Critical Bug:** `currentProjectId` is initialized as `null` every time the component mounts. On page reload, saved work exists in the DB but the IDE doesn't know about it, so the next save creates a duplicate record.

**File:** `src/components/hackathon/ProjectEditor.tsx`

- Initialize `currentProjectId` from `localStorage.getItem('forge-current-project-id')`
- After every successful save/publish that sets `currentProjectId`, also write to `localStorage`
- On mount, if `currentProjectId` exists in localStorage, fetch the project from DB and restore code, template, and project name into state

## 5. Fix CommunityChat `forwardRef` Warning

**File:** `src/components/hackathon/CommunityChat.tsx`

Console error: "Function components cannot be given refs" from `CommunityChat`. The `Dialog` component passes a ref. Convert `CommunityChat` to use `forwardRef` or wrap the exported component appropriately.

## 6. Go Live → Navigate to Live App

**File:** `src/components/hackathon/PublishModal.tsx`

After successful deployment, the "Open My App" button currently opens in a new tab via `<a target="_blank">`. Change to also auto-navigate or make the primary action navigate directly to `/projects/:id` instead of just showing the URL. Replace "Open My App" to use `window.open` in the same flow, making the deployed experience immediate.

## 7. Fix `value` Cursor Reset on Bidirectional Sync

**File:** `src/components/hackathon/ProjectEditor.tsx`

The textarea uses `value={files[activeFile]}` (controlled). When bidirectional sync effects (knowledge base, QA, system prompt, theme) update `files` state, React re-renders and can reset the cursor position. 

Fix: In the sync effects that write to `files['main.py']` from sidebar changes, use `textareaRef.current` to imperatively update the textarea value only if it differs, avoiding a state-driven re-render that resets the cursor. Or: guard updates to not trigger if the textarea is currently focused.

## Implementation Order

1. Leaderboard scoring update (Leaderboard.tsx)
2. Remove `app_runs_live` from PublishModal + `project_setup` from ProjectEditor
3. Add `currentProjectId` localStorage persistence + mount restore
4. Fix CommunityChat forwardRef warning
5. Go Live navigation improvement
6. Guard cursor stability in sync effects

## Files Modified
- `src/components/hackathon/Leaderboard.tsx`
- `src/components/hackathon/PublishModal.tsx`
- `src/components/hackathon/ProjectEditor.tsx`
- `src/components/hackathon/CommunityChat.tsx`

