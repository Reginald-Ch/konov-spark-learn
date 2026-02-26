

# Plan: Fix IDE Bugs and Improve Build Studio UI/UX

## Current State (from screenshots)

The Build Studio loads and shows code with syntax highlighting. The 3-panel layout (config sidebar, editor, live preview) is functional. However, several bugs and UX issues degrade the experience.

---

## Bugs to Fix

### Bug 1: Top Bar and File Tabs Scroll Off Screen
The entire `ProjectEditor` component is inside a scrollable container. When the user scrolls down in the page, the top bar ("Build Studio" header with AI actions) and file tabs scroll away. These should be fixed/sticky — only the code area inside the editor should scroll, not the chrome around it.

**Root Cause:** The parent in `Hackathons.tsx` (line 322) is `flex-1 flex flex-col overflow-hidden`, which is correct. But the outer page may be scrolling. The `ProjectEditor` root `div` has `h-full` but no explicit height constraint from its parent chain when the page itself scrolls.

**Fix:** Ensure the `min-h-screen` on the Hackathons page and `overflow-hidden` on the main content area prevent page-level scrolling. The top bar and file tabs are already `flex-shrink-0` which is correct — the issue is likely the parent not constraining height properly. Add `h-screen` or `h-full` chain from the root.

### Bug 2: Code Lines Truncated — No Horizontal Scroll
Long lines like `SYSTEM_PROMPT = "You are a helpful AI assista..."` get cut off at the right edge. The editor textarea and highlight layer need horizontal scrolling.

**Fix:** Add `overflow-x-auto` to the code area wrapper and ensure the textarea and highlight layer both support horizontal scroll. Use `white-space: pre` (already set) but also `min-width: max-content` on the content so it extends beyond the viewport.

### Bug 3: Live Preview Panel Sizing
The Live Preview chat panel on the right appears but is squished — the chat input and messages take minimal space. On the screenshot, it shows "Type a message..." input at the bottom right, but the panel width seems inconsistent.

**Fix:** Ensure the Live Preview panel has a minimum width of 280px and uses `flex-shrink-0` properly. The current `w-72` (288px) should work but verify the flex layout isn't compressing it.

### Bug 4: Config Sidebar Overlaps on Small Screens
The config sidebar (left panel showing project type, system prompt, capabilities) is always visible and takes ~220px. On smaller screens this leaves very little room for the code editor.

**Fix:** Already has mobile handling (`isMobile ? '100%' : 220`), but medium-sized screens (tablets, small laptops) still get squeezed. Default `showConfig` to `false` on screens below 1024px width.

### Bug 5: Editor Line Numbers Misaligned After Scroll
The line numbers use `transform: translateY(-${top}px)` via ref, but the line number container has no `overflow-hidden`, meaning numbers could visually leak outside the gutter area when scrolling fast.

**Fix:** Add `overflow-hidden` to the line number container div (the one wrapping `lineNumberRef`).

---

## UX Improvements

### Improvement 1: Sticky Top Bar with Better Hierarchy
Move the AI action buttons (Review, Explain, Suggest) into a smaller toolbar or dropdown. The top bar should focus on: project identity (icon + name) and a deploy status indicator. This reduces visual noise.

### Improvement 2: Editor Horizontal Scrolling
Enable proper horizontal scrolling in the code editor so long lines aren't truncated. Both the textarea and the syntax highlight overlay need to scroll horizontally in sync.

### Improvement 3: Keyboard Shortcuts
Add `Ctrl+S` / `Cmd+S` to save, `Ctrl+Enter` to run tests. This is standard IDE behavior and currently missing.

### Improvement 4: Better Empty State for Live Preview
When no messages have been sent, show a more helpful empty state in the Live Preview panel — e.g., "Test your AI by typing a message below" with example prompts.

### Improvement 5: Visual Feedback When Switching Project Types
When clicking a different project type in the config sidebar, add a brief highlight flash on the editor to indicate the code has changed.

---

## Implementation Plan

### Step 1: Fix Height Chain (Critical)
In `Hackathons.tsx`, ensure the parent chain constrains height:
- The root div already has `min-h-screen` and `flex` — change to `h-screen` to prevent page scrolling when in Build tab
- Verify `overflow-hidden` propagates correctly

In `ProjectEditor.tsx`:
- The root div `flex flex-col h-full bg-ide-bg` is correct
- Verify `flex-1 min-h-0` on the main layout prevents overflow

### Step 2: Fix Horizontal Scrolling in Editor
In `ProjectEditor.tsx`:
- Change the code area wrapper (line 747) from `overflow-hidden` to `overflow-auto`
- Ensure the highlight layer div uses `min-width: fit-content` so highlighted content doesn't wrap
- Sync horizontal scroll between textarea and highlight layer in `handleEditorScroll`
- Add horizontal scroll sync to the line numbers (they should stay fixed horizontally)

### Step 3: Add Keyboard Shortcuts
Add a `useEffect` with `keydown` listener:
- `Ctrl+S` / `Cmd+S` → `handleSave()`
- `Ctrl+Enter` → `handleRun()`
- `Ctrl+B` → toggle config sidebar

### Step 4: Overflow Guard on Line Numbers
Add `overflow-hidden` to the line number gutter container (line 749).

### Step 5: Improve Config Sidebar Responsiveness  
Use `window.innerWidth` or a media query hook to default `showConfig` to `false` below 1024px (not just `isMobile` which is typically 768px).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/hackathon/ProjectEditor.tsx` | Fix horizontal scroll, add overflow-hidden to line numbers, add keyboard shortcuts, improve empty state |
| `src/pages/Hackathons.tsx` | Change `min-h-screen` to `h-screen` on root div to prevent page scrolling in Build tab |

## Implementation Order
1. Fix height chain in Hackathons.tsx (1 line)
2. Fix horizontal scrolling in editor (textarea + highlight sync)
3. Add overflow-hidden to line number gutter
4. Add keyboard shortcuts (Ctrl+S, Ctrl+Enter)
5. Improve sidebar responsiveness threshold

