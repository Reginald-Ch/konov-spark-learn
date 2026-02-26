

# Plan: Fix IDE Bugs and Improve Build Studio UI/UX

## Bugs Found

### Bug 1: Editor Height is Unconstrained — Content Overflows Off Screen
The `ProjectEditor` root div uses `flex flex-col h-full`, but its parent in `Hackathons.tsx` (line 322) is a `motion.div` with `flex-1 flex flex-col overflow-hidden`. The problem: the bottom action bar (lines 1013-1064) sits **outside** the main flex layout — it's a sibling of the editor area container, not inside the flex column. This means the action bar may be pushed off-screen or overlap content. The entire component structure has the action bar and publish modal outside the main `flex` layout, breaking the height calculation.

**Fix:** Move the bottom action bar **inside** the main flex container and ensure the editor area uses `min-h-0` so it properly shrinks within the flex layout.

### Bug 2: Textarea and Highlight Layer Don't Share the Same Coordinate Space
The textarea (line 853) is `absolute inset-0` and the highlight layer (line 840) is also `absolute inset-0` but with `overflow-hidden`. The textarea scrolls natively, and `scrollTop` state updates on scroll — but the highlight layer uses `transform: translateY(-${scrollTop}px)` inside a div with `overflow-hidden`. The problem: the textarea's `scrollTop` resets when React re-renders `files[activeFile]` (e.g., on every keystroke), causing jitter. Also, on fast typing, the memoized `highlightedContent` recalculates on every keystroke since `files` is in the dependency array, causing lag on longer files.

**Fix:** Debounce the highlight update (or use `requestAnimationFrame` for scroll sync). Use refs instead of state for `scrollTop` to avoid re-renders.

### Bug 3: Config Sidebar Covers Code on Small/Medium Screens
The config sidebar animates to `width: 240` (line 698) regardless of screen size. On tablets or small laptops, this leaves very little room for the code editor, making it unusable.

**Fix:** Hide config sidebar by default on screens below `lg`. Add a slide-over/drawer pattern for mobile.

### Bug 4: No Export of ProjectEditor Component
Line 1077 shows the component is defined as `const ProjectEditor = (...)` but there's no `export default`. The import in `Hackathons.tsx` uses `{ ProjectEditor }` (named import, line 12). The component uses `export const ProjectEditor` on line 353, so this works. But `ProjectType` is only exported as a type (line 17), which is correct. No bug here — confirmed working.

### Bug 5: Bottom Bar Not Visible — Layout Structure
Looking at lines 661-1075, the structure is:
```
<div flex-col h-full>        ← root
  <div h-11>                 ← top bar  
  <div flex-1 overflow-hidden> ← main layout (editor + sidebar + preview)
  </div>                     ← main layout ends at line 927
  <button> mobile preview    ← floating button
  <div> live preview panel   ← RIGHT panel is OUTSIDE the main flex-1
  </div>
  <div h-11> bottom bar      ← action bar
  <PublishModal>
</div>
```
The Live Preview panel (lines 938-1010) is a **sibling** of the main `flex-1` container, not inside it. This means the flex layout breaks: the right panel doesn't participate in the horizontal flex. The preview panel should be inside the `flex-1 overflow-hidden` container alongside the config sidebar and code editor.

**Fix:** Restructure so the Live Preview panel is inside the main horizontal flex container (the `flex-1 flex overflow-hidden` on line 692).

### Bug 6: Inline Styles Everywhere — Hard to Maintain
Every element uses `style={{ background: '#282c34', color: '#abb2bf' }}` instead of Tailwind classes or CSS variables. This makes theming impossible and bloats the component.

**Fix:** Define CSS variables for the One Dark theme colors and use Tailwind classes. This is a UX/maintainability improvement, not a critical bug — lower priority.

---

## UI/UX Improvements (Inspired by Reference Image)

### Improvement 1: Cleaner Top Bar with Breadcrumb Navigation
The reference image shows a clean top bar with project name, file path breadcrumbs, and action buttons grouped on the right. Current top bar mixes AI actions (Review, Explain, Suggest) with project info.

**Fix:** Move AI actions into a dropdown or toolbar below the file tabs. Top bar should show: logo + project name + deploy status indicator.

### Improvement 2: Better File Tabs
The reference shows tabs with close buttons and a "+" to add files. Current tabs are static and flat.

**Fix:** Add subtle active state with rounded top corners and a background that blends into the editor. Add a small dot indicator for modified files.

### Improvement 3: Integrated Terminal with Tab Switching
Reference shows terminal as a proper bottom panel with tabs (Terminal, Output, Problems). Current terminal is a simple collapsible div.

**Fix:** Add tab switching in the terminal panel for "Terminal" and "AI Mentor" output, collapsing them into a single toggleable bottom panel.

### Improvement 4: Status Bar
Reference has a proper VS Code-like status bar at the bottom showing language, line/col, encoding. Current bottom bar only has action buttons.

**Fix:** Add status info (line count, file type, project type indicator) to the bottom bar alongside the action buttons.

---

## Implementation Plan

### Step 1: Fix Layout Structure (Critical)
Restructure `ProjectEditor.tsx` so that:
- The main horizontal flex (`flex-1 flex overflow-hidden`) contains: config sidebar + code editor + live preview panel
- The bottom action bar is outside but properly placed in the outer flex column
- Add `min-h-0` to the flex-1 editor area to prevent overflow

### Step 2: Fix Scroll Sync Performance  
- Change `scrollTop` from `useState` to `useRef` to avoid re-renders on every scroll event
- Use `requestAnimationFrame` in the scroll handler
- Apply scroll offset directly via ref manipulation instead of state-driven transform

### Step 3: Add IDE Theme CSS Variables
Add to `index.css`:
```css
--ide-bg: 220 13% 18%;
--ide-sidebar: 220 13% 15%;
--ide-editor: 220 13% 18%;
--ide-border: 220 13% 22%;
--ide-text: 219 14% 71%;
--ide-text-muted: 219 10% 40%;
--ide-accent: 207 82% 66%;
--ide-green: 95 38% 62%;
```
Replace all inline `style={{ background: '#282c34' }}` with Tailwind classes using these variables.

### Step 4: Restructure Bottom Panel
Combine Terminal + AI Mentor into a single bottom panel with tabs. Add a proper status bar below it.

### Step 5: Responsive Config Sidebar
- Default `showConfig` to `false` on screens below `md`
- Use a Sheet/drawer on mobile instead of inline sidebar

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/hackathon/ProjectEditor.tsx` | Fix layout structure, move preview inside flex container, fix scroll sync with refs, restructure bottom panels, add status bar, replace inline styles |
| `src/index.css` | Add IDE theme CSS variables |

## Implementation Order
1. Fix layout structure (preview panel inside flex, action bar positioned correctly)
2. Fix scroll sync (useRef instead of useState)
3. Add CSS variables and replace inline styles
4. Combine terminal + AI panels with tabs
5. Responsive sidebar improvements

