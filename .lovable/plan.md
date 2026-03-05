

# Plan: Enhanced IDE Features & New Syntax Color

## Summary

Upgrade the code editor to feel like a professional IDE with current-line highlighting, auto-indentation, bracket matching, improved multi-line string highlighting, and a new `class_name` token color (teal/pink for class names and `self` references).

## Changes

### 1. Add new token type: `class_name` (New Color)
**File:** `src/components/hackathon/ProjectEditor.tsx`
- Add `'class_name'` to the `Token['type']` union
- In `tokenizeLine`, detect class names (word after `class` keyword) and `self` as `class_name` type
- Add `class_name` to `TOKEN_COLORS` mapped to a new `text-ide-pink` color

**File:** `src/index.css`
- Add `--ide-pink: 330 80% 70%;` to the IDE theme variables

**File:** `tailwind.config.ts`
- Add `pink: "hsl(var(--ide-pink))"` to the `ide` color group

### 2. Multi-line string state tracking in syntax highlighter
**File:** `src/components/hackathon/ProjectEditor.tsx`
- The current `highlightedContent` useMemo tokenizes each line independently, so triple-quoted strings (`"""..."""`) spanning multiple lines break highlighting — middle lines render as plain text/keywords instead of green strings
- Track `inMultiLineString` state across lines: if a line opens `"""` without closing it, all subsequent lines are strings until the closing `"""`

### 3. Current line highlight
**File:** `src/components/hackathon/ProjectEditor.tsx`
- Add `cursorLine` state tracking via `onSelect` / `onClick` on the textarea (compute line from `selectionStart`)
- In the highlight overlay, add a subtle `bg-ide-line-highlight` background on the current line div
- Highlight the current line number in the gutter with `text-ide-text` instead of `text-ide-text-muted`

### 4. Auto-indentation on Enter
**File:** `src/components/hackathon/ProjectEditor.tsx`
- In the `onKeyDown` handler, handle `Enter` key:
  - Get the current line's leading whitespace
  - If the line ends with `:` (def, if, for, class, etc.), add 4 extra spaces
  - Insert `\n` + computed indent and set cursor position

### 5. Bracket matching highlight
**File:** `src/components/hackathon/ProjectEditor.tsx`
- On cursor position change, check if character at cursor or before cursor is a bracket `()[]{}` 
- Find the matching bracket by scanning forward/backward with nesting count
- In the highlight overlay, wrap matched bracket characters with a `bg-ide-selection rounded` span

### 6. Gutter active line styling
Already have `--ide-line-highlight` defined. The gutter line numbers currently all use `text-ide-text-muted`. The active line number should be brighter (`text-ide-text`) and have the line-highlight background.

---

## Implementation Plan

| # | Task | File(s) |
|---|------|---------|
| 1 | Add `--ide-pink` CSS variable and tailwind color | `src/index.css`, `tailwind.config.ts` |
| 2 | Add `class_name` token type + detection + color | `ProjectEditor.tsx` |
| 3 | Multi-line string state tracking in highlighter | `ProjectEditor.tsx` |
| 4 | Current line tracking + gutter/editor highlight | `ProjectEditor.tsx` |
| 5 | Auto-indent on Enter key | `ProjectEditor.tsx` |
| 6 | Bracket matching highlight | `ProjectEditor.tsx` |

### Files Modified
- `src/index.css` — add `--ide-pink`
- `tailwind.config.ts` — add `pink` to IDE colors
- `src/components/hackathon/ProjectEditor.tsx` — all editor enhancements

