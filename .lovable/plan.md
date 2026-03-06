

# Plan: Fix Scoring Display, Live Demo Link & Polish

## Bugs Found

### 1. PublishModal shows "+15 Points Earned" — incorrect total
**File:** `src/components/hackathon/PublishModal.tsx` (line 236 and line 328)

The "You're Live" success screen shows "+15 Points Earned" and the form says "15 leaderboard points". The actual milestones awarded in `handlePublish` are `project_deployed` (10 pts) + `submitted_on_time` (5 pts) = 15. However, the leaderboard MAX_SCORE is 55, and the old `points_earned: 10` field on the `ai_projects` table is a legacy artifact. The display is technically correct (10+5=15), but the user mentioned "you are live says 15 points earned" as an issue — this likely refers to the fact that `points_earned: 10` is set on the record itself (line 108), which is an old system.

**Fix:** Remove the legacy `points_earned: 10` from the insert/update in PublishModal (set to 0 since scoring is now milestone-based via `point_events`). Keep the "+15 Points Earned" display since it's accurate (10+5).

### 2. FORGE link on Live Demo (ProjectView) goes to `/hackathons` instead of the IDE
**File:** `src/pages/ProjectView.tsx` (lines 452, 495, 674)

Three "FORGE" / "Back to FORGE" links all point to `/hackathons`. The user wants these to go to the templates/IDE selection instead.

**Fix:** Change the links to `/hackathons?tab=templates` so clicking them lands on the project selection (templates tab) rather than the events listing. The Hackathons page already reads URL params for tab selection — need to verify and wire up if not.

### 3. Hackathons page doesn't read `tab` from URL query params
**File:** `src/pages/Hackathons.tsx`

Need to check if the page reads a `?tab=templates` query param to set the initial tab. If not, add `useSearchParams` to read it.

### 4. ReactMarkdown ref warning in PublishModal (console error)
**File:** `src/components/hackathon/PublishModal.tsx`

Console shows: "Function components cannot be given refs. Check the render method of PublishModal." The `AnimatePresence` with `mode="wait"` tries to attach refs to direct `motion.div` children, but the issue is likely from framer-motion trying to ref a child. Since the children are already `motion.div`, this should work — the warning may come from the `DialogContent` interaction with `AnimatePresence`. Wrap each `motion.div` key variant to ensure no bare function components are direct children.

### 5. Save doesn't refresh Live Preview immediately
The Live Preview uses `liveConfig` which is `useMemo(() => extractConfigFromCode(files['main.py']), [files['main.py']])`. Since `executeSave` doesn't change `files` state (it reads from it), saving itself doesn't need to trigger a refresh — the preview already reacts to code edits in real-time. This is working correctly. No fix needed.

## Implementation Summary

| # | Fix | File | Priority |
|---|-----|------|----------|
| 1 | Remove legacy `points_earned: 10` from PublishModal | PublishModal.tsx | Medium |
| 2 | Change FORGE links to `/hackathons?tab=templates` | ProjectView.tsx | High |
| 3 | Read `tab` query param in Hackathons page | Hackathons.tsx | High |
| 4 | Fix AnimatePresence ref warning in PublishModal | PublishModal.tsx | Low |

## Technical Details

**PublishModal.tsx:**
- Line 108: Change `points_earned: 10` to `points_earned: 0`
- Line 125: Change `points_earned: 10` to `points_earned: 0`

**ProjectView.tsx:**
- Lines 452, 495, 674: Change `to="/hackathons"` to `to="/hackathons?tab=templates"`

**Hackathons.tsx:**
- Import `useSearchParams` from `react-router-dom`
- Read `tab` param on mount and set initial `mainTab` accordingly
- e.g., `const [searchParams] = useSearchParams(); const initialTab = searchParams.get('tab');` then use it in the initial state

## Files Modified
- `src/components/hackathon/PublishModal.tsx`
- `src/pages/ProjectView.tsx`
- `src/pages/Hackathons.tsx`

