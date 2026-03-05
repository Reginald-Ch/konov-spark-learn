

## Plan: Fix IDE Bugs — Template Loading, Live Preview Sync, and Stability

### Problems Identified

1. **Template not refreshing with latest code**: When clicking "Build Chatbot" on the Templates tab, the `ProjectEditor` component key (`chatbot-undefined`) is identical to the previous session, so React reuses the old component instance and never loads the updated scaffold from `projectScaffolds.ts`. The user keeps seeing stale code.

2. **`extractConfigFromCode` called 6+ times per render**: Lines 1563, 1634, 1637, 1638, 1641, 1642 each independently call `extractConfigFromCode(files['main.py'])` inline in JSX. This is wasteful and can cause subtle inconsistencies if state changes mid-render.

3. **PublishModal ref warning**: Console error "Function components cannot be given refs" — the `PublishModal` component needs `React.forwardRef` or the parent needs to stop passing a ref.

4. **Live Preview not reflecting code edits immediately**: The challenge tracker and bot info panel (lines 1562-1628) recalculate on render but conversation starters (lines 1641-1642) call `extractConfigFromCode` separately — these should all use a single memoized config.

### Changes

**File: `src/components/hackathon/ProjectEditor.tsx`**

1. **Add a `useMemo` for config extraction** — Create a single `const liveConfig = useMemo(() => extractConfigFromCode(files['main.py']), [files['main.py']]);` and replace all 6+ inline calls with `liveConfig`. This ensures the Live Preview always reflects the latest code edits consistently.

2. **Move `extractConfigFromCode` outside the component** — It's a pure function that doesn't depend on component state, so it should be declared at module scope (before the component) to avoid recreation on every render.

**File: `src/pages/Hackathons.tsx`**

3. **Fix stale template key** — Change the `ProjectEditor` key from `${buildTemplate}-${buildCode?.slice(0, 20)}` to include a timestamp or counter: `${buildTemplate}-${buildCode?.slice(0, 20)}-${buildKey}` where `buildKey` increments each time `handleStartBuilding` is called. This forces React to remount the editor with the latest scaffold code every time the user selects a template.

**File: `src/components/hackathon/PublishModal.tsx`**

4. **Fix ref warning** — Wrap `PublishModal` with `React.forwardRef` or ensure the parent doesn't pass a ref to it (the Dialog component likely expects a ref).

### Result
- Clicking "Build Chatbot" always loads the latest template from `projectScaffolds.ts`
- Editing any variable in `main.py` immediately reflects in the Live Preview panel (bot name, emoji, Q&A, theme, etc.)
- No console warnings about refs
- Better performance from memoized config extraction

