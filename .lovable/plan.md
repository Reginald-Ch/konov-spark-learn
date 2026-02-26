

# Plan: Make Build Studio Production-Ready + Better Theme

## Current State Assessment

After thorough code review, here is the status of each of your questions:

---

## Question 1: "Can I start building a project, where it would run well and I can deploy and view?"

**Current status: Partially working.** The Build Studio loads code, you can edit it, save to database, and "publish" via the Deploy modal. However:

- **"Run Tests" works** — it calls the `python-ai-assist` edge function which simulates Python execution and returns terminal output. This uses Lovable AI (`google/gemini-3-flash-preview`), the best free model available.
- **"Deploy to Production" does NOT actually deploy** — the Publish modal saves to the `ai_projects` database table and generates a URL like `/projects/{id}`, but the `ProjectView` page that renders this URL likely just displays the saved code. There is no actual Python runtime or Streamlit hosting.
- **Live Preview chat works** — it calls the edge function with `action: 'test-agent'` and streams AI responses using the project's system prompt.

**What needs fixing:** Make the "Deploy" flow honest. Students should understand they're publishing their code to the Gallery, not deploying a running app. The project view page needs to work correctly.

## Question 2: "Are we using the best free models, we don't run out of tokens?"

**Current status: Yes, optimal.** The edge function uses `google/gemini-3-flash-preview` — this is the fastest, most cost-efficient model available through Lovable AI. It has generous rate limits and is included with your plan. For a 1:30 minute hackathon session, a student might make 10-20 AI calls. This model handles that well.

**One issue:** The `PublishModal` still uses `as any` casts (line 56), which we removed elsewhere but missed here.

## Question 3: "Is the Build Studio working 100%?"

**Bugs found:**

1. **Console warning: "Function components cannot be given refs"** — `ProjectEditor` and `HackathonCard` are being passed refs by `Hackathons.tsx` (likely via framer-motion's `motion.div` wrapping). Need to wrap both with `forwardRef`.

2. **`PublishModal` still uses `as any` casts** (lines 56, 73) — missed in the previous cleanup pass.

3. **`config.toml` missing edge function config** — The `python-ai-assist` function isn't declared in `config.toml`, which means JWT verification defaults may cause issues. Need to add `[functions.python-ai-assist]` with `verify_jwt = false`.

4. **Editor scroll: textarea is `absolute inset-0` but parent has `overflow-auto`** — The textarea doesn't scroll with the overflow container. Long code content extends beyond view and the highlight layer's `transform` approach only works for vertical scroll. Horizontal scrolling is broken because the textarea is positioned absolutely and doesn't participate in the parent's scroll flow.

5. **`ProjectView` page may not render published projects correctly** — Need to verify it loads the project from the database.

## Question 4: "I don't like the grey color used for the IDE"

**Current theme values (One Dark inspired):**
```
--ide-bg: 220 13% 18%        → #282c34 (dark charcoal)
--ide-bg-deep: 220 14% 11%   → #1e2127 (deeper charcoal)
--ide-sidebar: 220 13% 15%   → #21252b (dark grey)
--ide-editor: 220 13% 18%    → #282c34
--ide-border: 220 13% 20%    → #2c313a
```

These are technically blue-tinted dark greys, which can look flat/washed out. I'll shift the palette to a richer, deeper tone with more contrast — inspired by VS Code's default dark theme with a hint of the brand colors.

---

## Implementation Plan

### Step 1: Update IDE Theme — Richer, Deeper Colors
Replace the current grey-ish One Dark palette with a deeper, more vibrant dark theme:

```css
--ide-bg: 222 18% 14%;           /* #1e2030 — deep navy */
--ide-bg-deep: 225 20% 10%;     /* #161924 — near-black navy */
--ide-sidebar: 222 18% 12%;     /* #191c2a — slightly darker sidebar */
--ide-editor: 222 18% 14%;      /* #1e2030 — matches bg */
--ide-gutter: 222 18% 14%;      /* same as editor */
--ide-border: 222 15% 22%;      /* #2d3247 — visible but subtle */
--ide-border-subtle: 222 15% 16%; /* #232637 */
--ide-text: 220 20% 80%;        /* #b8c0d4 — brighter text */
--ide-text-muted: 220 12% 45%;  /* #636d83 — more readable muted */
--ide-accent: 210 100% 60%;     /* #3399ff — vivid blue accent */
--ide-green: 120 50% 60%;       /* #66cc66 — brighter green */
--ide-yellow: 40 80% 65%;       /* #d4a845 — warm gold */
--ide-red: 0 70% 65%;           /* #d45555 — clear red */
--ide-purple: 270 60% 68%;      /* #9b6ed4 — vivid purple */
--ide-cyan: 185 60% 55%;        /* #44b8b8 — teal */
--ide-orange: 25 70% 60%;       /* #cc8844 — warm orange */
--ide-line-highlight: 222 18% 18%; /* subtle highlight */
--ide-selection: 210 50% 25%;   /* selection blue */
--ide-cursor: 210 100% 60%;     /* bright blue cursor */
```

This shifts the IDE from "grey" to "deep navy" with more contrast and richer syntax colors.

**File:** `src/index.css`

### Step 2: Fix Editor Scroll — Grid Overlay Approach
Replace the current absolute-positioned textarea + highlight layer with a CSS grid stack where both layers share the same scroll context:

- Wrap both in a single `div` with `display: grid` and `grid-template: "stack" 1fr / 1fr`
- Both children use `grid-area: stack` so they overlap
- The parent div handles scrolling (`overflow: auto`)
- Remove `absolute inset-0` from textarea
- Remove the manual `transform` scroll sync — it's no longer needed since both layers scroll together natively

**File:** `src/components/hackathon/ProjectEditor.tsx`

### Step 3: Fix forwardRef Warning
Wrap `ProjectEditor` with `React.forwardRef` to suppress the console warning from framer-motion.

**File:** `src/components/hackathon/ProjectEditor.tsx`

### Step 4: Fix PublishModal `as any` Casts
Remove `as any` on lines 56 and 73.

**File:** `src/components/hackathon/PublishModal.tsx`

### Step 5: Add Edge Function Config
Add `[functions.python-ai-assist]` to `supabase/config.toml` with `verify_jwt = false` so the function works reliably.

**Note:** `config.toml` is auto-managed — we cannot edit it. The function deploys automatically. Since the function already works (it's being called successfully), this is not blocking.

### Step 6: Verify ProjectView Page
Check that `/projects/:id` correctly loads and displays published projects from the database.

**File:** `src/pages/ProjectView.tsx` (read and fix if needed)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Update IDE theme CSS variables to deep navy palette |
| `src/components/hackathon/ProjectEditor.tsx` | Fix editor scroll with grid overlay, add forwardRef |
| `src/components/hackathon/PublishModal.tsx` | Remove `as any` casts |
| `src/pages/ProjectView.tsx` | Verify and fix project rendering |

## Implementation Order
1. Update IDE theme colors (visual impact, addresses "grey" complaint)
2. Fix editor scroll with grid overlay (critical UX bug)
3. Add forwardRef to ProjectEditor (console warning fix)
4. Fix PublishModal type casts (code quality)
5. Verify ProjectView page (deploy flow completeness)

