

# Plan: Bugs, Enhancements & New Features

## Findings from Audit

### Bugs Still Present

**1. Badge component triggers ref warning in ProjectGallery**
Console shows: `Function components cannot be given refs. Check the render method of ProjectGallery.` The `Badge` component is a plain function (not `forwardRef`). When used inside `motion.div` children, Framer Motion tries to attach refs.

**Fix:** Convert `Badge` in `src/components/ui/badge.tsx` to `React.forwardRef`.

**2. Remaining `as any` casts in JudgeDashboardPanel**
Lines 222, 258, 305, 309, 341 still use `as any` on database calls. These bypass type safety and were flagged in prior audits.

**Fix:** Remove `as any` casts — the Supabase types already match these tables.

**3. Leaderboard doesn't filter by hackathon**
The leaderboard queries ALL `point_events` globally. When a new event/competition starts, old scores from previous events pollute the leaderboard. There's no way to reset or scope scores to a specific event.

---

### New Feature: Leaderboard Reset / Per-Event Filtering

Currently `point_events` has a `hackathon_id` column but it's always `null` — no code sets it. For new competitions, the leaderboard shows stale data from past events.

**Solution — "Reset Leaderboard" button in Judge Dashboard:**
- Add a "Reset Leaderboard" button in the Judge Dashboard's Hackathon Control section
- This button deletes all `point_events` rows (requires adding a DELETE RLS policy on `point_events`)
- Also clears all `forge-scored-*` keys from localStorage so milestone deduplication resets
- Optionally deletes unpublished `ai_projects` to clean the slate

**Database change:** Add DELETE policy on `point_events` table so rows can be removed.

---

### New Feature: Mission Progress Bar in Build Studio

Add a visual progress tracker showing which of the 20 challenges the student has completed. The code already parses all config variables via `extractConfigFromCode`. We can check which variables have been changed from their defaults.

**Implementation:**
- Add a collapsible "Mission Progress" widget in the Build Studio sidebar (config panel)
- Count how many of the 20 challenge variables have been modified from defaults
- Show a progress bar: "12/20 Challenges Complete"
- List each challenge with a checkmark or empty circle
- Auto-updates as the student edits code

**File:** `src/components/hackathon/ProjectEditor.tsx` — add a progress section in the config sidebar

---

## Implementation Plan

### 1. Fix Badge forwardRef warning
**File:** `src/components/ui/badge.tsx`
- Convert `Badge` function to `React.forwardRef`

### 2. Remove `as any` casts in JudgeDashboardPanel
**File:** `src/components/hackathon/JudgeDashboardPanel.tsx`
- Remove `as any` from lines 222, 258, 305, 309, 341

### 3. Add DELETE RLS policy on `point_events`
**Migration:** `ALTER TABLE point_events; CREATE POLICY "Anyone can delete point events" ON point_events FOR DELETE USING (true);`

### 4. Add "Reset Leaderboard" button to Judge Dashboard
**File:** `src/components/hackathon/JudgeDashboardPanel.tsx`
- Add a red "Reset Leaderboard" button with confirmation dialog
- On confirm: delete all rows from `point_events`, clear `forge-scored-*` localStorage keys, show success toast
- Optionally add "Clear All Projects" button that deletes all `ai_projects`

### 5. Add Mission Progress Bar to Build Studio
**File:** `src/components/hackathon/ProjectEditor.tsx`
- Define default values for all 20 challenge variables
- Compare current `extractConfigFromCode` output against defaults
- Render a progress bar + checklist in the config sidebar (settings tab, above "Resources Used")
- Each challenge shows: emoji, name, check/circle icon
- Progress auto-updates on every code change

### Files Modified
- `src/components/ui/badge.tsx`
- `src/components/hackathon/JudgeDashboardPanel.tsx`
- `src/components/hackathon/ProjectEditor.tsx`
- Database migration for `point_events` DELETE policy

