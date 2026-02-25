

# Plan: Fix IDE Bugs and Make Templates Load Code Properly

## Bugs Found

### Bug 1: Templates Don't Load Code Into the Editor
When a student clicks "Start Building" on a template card, the code never actually loads. Here's why:

- `TemplatesTab` calls `onStartBuilding('', type.id)` -- passes **empty string** for code
- `Hackathons.tsx` sets `buildTemplate` and switches to the Build tab
- But `ProjectEditor` uses `useState(initialType || 'chatbot')` which only reads the prop **once on mount**
- If the editor is already mounted (student visited Build tab before), changing `initialType` does nothing

**Fix:** Add a `useEffect` in `ProjectEditor` that watches `initialType` and `initialCode` props. When they change, call `handleTypeChange` to reload the scaffold. Also pass the scaffold code from `TemplatesTab` instead of an empty string.

### Bug 2: Double Email Prompt on Save
In `handleSave` (lines 512-519), if `authorEmail` is empty:
1. Line 513: prompts for email
2. Line 517: prompts **again** because `authorEmail` state hasn't updated yet (React batches)

**Fix:** Restructure to use a single local variable for the email, only prompt once.

### Bug 3: Scroll Sync Still Broken
The highlight overlay is `absolute` positioned inside a `relative overflow-hidden` container, but the textarea is a flex child that scrolls independently. The `handleEditorScroll` sets `scrollTop` on the refs, but since the highlight div has `overflow-hidden`, it clips instead of scrolling.

**Fix:** Change the highlight div from `overflow-hidden` to `overflow-hidden` on the wrapper but allow the inner content to be offset via `transform: translateY(-scrollTop)` instead. This ensures the visible highlight tracks the textarea scroll position pixel-perfectly.

### Bug 4: Live Preview Hidden on Smaller Screens
The right panel has `hidden lg:flex` (line 826), making it invisible on tablets and smaller laptops. Students on 13" screens can't test their AI.

**Fix:** Make the Live Preview toggle-able on smaller screens with a button in the top bar, or reduce the breakpoint.

### Bug 5: No Loading State When Switching Project Types
When a student switches from Chatbot to Agent in the config sidebar, the code swaps instantly with no visual feedback. Students might not notice the change happened.

**Fix:** Add a brief flash/highlight animation on the editor when code reloads.

---

## Implementation Plan

### Step 1: Fix Template Code Loading (Critical)
In `ProjectEditor.tsx`:
- Add `useEffect` watching `initialType` prop:
  ```
  useEffect(() => {
    if (initialType && initialType !== projectType) {
      handleTypeChange(initialType);
    }
  }, [initialType]);
  ```
- Add a `key` prop to `ProjectEditor` in `Hackathons.tsx` based on `buildTemplate` so React remounts when the template changes. This is the simplest and most reliable fix.

### Step 2: Fix Double Email Prompt
Refactor `handleSave` to:
```
const handleSave = async () => {
  let emailToUse = authorEmail;
  if (!emailToUse) {
    emailToUse = prompt('Enter your email to save:') || '';
    if (!emailToUse) return;
    setAuthorEmail(emailToUse);
  }
  // ... rest of save logic using emailToUse
};
```

### Step 3: Fix Editor Scroll Sync
Replace the absolute-positioned highlight approach:
- Remove `absolute` from the highlight div
- Use a shared scroll container: wrap line numbers + highlight + textarea in a single div
- Use `transform: translateY(-${scrollTop}px)` on the line numbers and highlight content to sync with textarea scroll
- Track `scrollTop` in state from textarea's `onScroll`

### Step 4: Make Live Preview Accessible on Smaller Screens
- Add a "Preview" toggle button in the top bar (visible only below `lg` breakpoint)
- When toggled, show the preview as an overlay/drawer from the right
- Keep the current side-panel behavior on large screens

### Step 5: Pass Template Code from TemplatesTab
Update `TemplatesTab` to import `PROJECT_SCAFFOLDS` from `ProjectEditor` (or export them) and pass the actual scaffold code instead of empty string. Or simpler: just use the `type.id` and let `ProjectEditor` handle loading the scaffold internally (which it already does via `handleTypeChange`).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Hackathons.tsx` | Add `key={buildTemplate}` to `ProjectEditor` so it remounts on template change |
| `src/components/hackathon/ProjectEditor.tsx` | Fix double email prompt, fix scroll sync with transform approach, add mobile preview toggle |
| `src/components/hackathon/TemplatesTab.tsx` | No changes needed (passing type.id is sufficient) |

## Implementation Order
1. Add `key` prop fix in Hackathons.tsx (1 line, fixes template loading)
2. Fix double email prompt in ProjectEditor
3. Fix scroll sync with transform approach
4. Add mobile preview toggle

