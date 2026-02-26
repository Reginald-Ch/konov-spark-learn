# Plan: Fix Grey Text, Polish Build Studio, Improve Go Live UX

## What the System Prompt Is (Simple Explanation)

Think of the **System Prompt** like giving your AI a personality card before it meets anyone.

Imagine you're hiring someone for a job. Before they start talking to customers, you give them a note that says: *"You are a friendly math tutor. Always explain things step by step. Use simple language. If you don't know something, say so."*

That note is the System Prompt. Your AI reads it before every conversation and follows those instructions. It controls:

- **Who** the AI thinks it is ("You are a health advisor for teens")
- **How** it talks (formal, casual, funny)
- **What** it knows about ("Only answer questions about Ghana's history")
- **What** it refuses to do ("Never give medical diagnoses")

Without a system prompt, your AI is like a new employee with no job description — it will try to help but won't know what role to play.

---

## Issue 1: Text Still Appears Grey

The current `--ide-text: 215 40% 82%` has 40% saturation at 82% lightness. On the dark background, this reads as a slightly tinted grey. The fix is to increase saturation to 60%+ and make the muted text bluer too. Additionally, the **default `text` token type** maps to `text-ide-text`, which means variable names, module names, and other plain identifiers all render in this color — it dominates the editor. Making it distinctly blue will transform the entire look.

New values:

```
--ide-text: 210 60% 78%;         /* clearly blue-white, not grey */
--ide-text-muted: 210 40% 50%;  /* visible blue-grey for comments/labels */
```

**File:** `src/index.css` (lines 74-75)

## Issue 2: "Go Live" / Deploy UX Polish

The PublishModal still says "Deploy to Production" in the title and button. This should match the "Go Live" branding used elsewhere. Update:

- Title: "Deploy to Production" → "Go Live"
- Button: "Deploy to Production 🚀" → "Go Live 🚀"
- Description: update to match the pitch-focused language
- The Discord-themed colors should shift to IDE theme colors for visual consistency

**File:** `src/components/hackathon/PublishModal.tsx`

## Issue 3: Remove Remaining `as any` Casts

Three `as any` casts remain in `ProjectEditor.tsx` (lines 517, 580, 601) on `point_events` inserts. Since the `point_events` table exists in the schema with matching columns, these casts are unnecessary and should be removed.

**File:** `src/components/hackathon/ProjectEditor.tsx` (lines 517, 580, 601)

## Issue 4: Resources Page Age Target

The Resources page was built for younger kids. The note says the target is now **secondary students** (ages 13-18). Update the intro text and adjust the "Why Learn AI" section framing to speak to secondary students rather than young children. The comic panel approach stays but the language should be more age-appropriate.

**File:** `src/pages/Resources.tsx` — update intro copy, age references, and parent section framing

## Issue 5: Build Studio Continuity

The Build Studio core flows are functional:

- Code editing with syntax highlighting: working
- Run Tests (AI-simulated execution): working
- Save Checkpoint (database persistence): working
- Go Live (publish + shareable URL): working
- Live Preview chat: working
- AI Mentor (Review/Explain/Suggest + interactive chat): working
- Keyboard shortcuts (Ctrl+S, Ctrl+Enter): working

Remaining polish items for this pass:

- The `forwardRef` wrapper is still missing on `ProjectEditor` (console warning from framer-motion)
- Point events fire but errors are silently swallowed — add a console.warn on failure

---

## Files to Modify


| File                                         | Changes                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/index.css`                              | Increase `--ide-text` saturation to 60%, `--ide-text-muted` to 40%               |
| `src/components/hackathon/ProjectEditor.tsx` | Remove `as any` casts, add `forwardRef`, add console.warn on point_events errors |
| `src/components/hackathon/PublishModal.tsx`  | Rebrand to "Go Live", switch from Discord to IDE theme colors                    |
| `src/pages/Resources.tsx`                    | Update age target copy from kids to secondary students                           |


## Implementation Order

1. Fix `--ide-text` and `--ide-text-muted` to distinctly blue values (instant visual fix)
2. Rebrand PublishModal to "Go Live" with IDE-themed colors
3. Remove `as any` casts and add `forwardRef` to ProjectEditor
4. Update Resources page copy for secondary student audience  
  
5 help me our the prompt system us the users in their project 