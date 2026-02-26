

# Plan: Fix IDE Code Text Color — Grey to Blue

## Problem
The code text in the Build Studio editor still appears grey despite previous updates. The current value `--ide-text: 210 60% 78%` at 78% lightness and 60% saturation renders as a pale, washed-out blue-grey on the `#0d1117` dark background. It needs to be a distinctly blue, readable tone.

## Root Cause
The `text` token type in the syntax highlighter maps to `text-ide-text` and covers ~60% of visible code (variable names, module names, arguments, plain identifiers). This single color dominates the editor appearance. Similarly, `--ide-text-muted` at `210 40% 50%` is used for comments, labels, and secondary UI text — still too grey.

## Solution

Update two CSS variables in `src/index.css` (lines 74-75):

| Variable | Current | New | Visual |
|----------|---------|-----|--------|
| `--ide-text` | `210 60% 78%` | `210 80% 72%` | Strong sky-blue, clearly blue not grey |
| `--ide-text-muted` | `210 40% 50%` | `215 55% 55%` | Blue-steel muted, readable on dark bg |

The key change: **saturation jumps from 60% to 80%** and lightness drops from 78% to 72%. This shifts the perceived color from "light grey with a hint of blue" to "clearly blue with good brightness." The muted text gets similar treatment — saturation from 40% to 55%.

These values will produce:
- `--ide-text`: approximately `#6db3e8` — a medium sky blue
- `--ide-text-muted`: approximately `#527ba3` — a steel blue for secondary text

## File Changed
- `src/index.css` — lines 74-75 only (two CSS variable values)

No other files need changes. The Tailwind config already maps these variables correctly, and all 200+ usages of `text-ide-text` across `ProjectEditor.tsx` will pick up the new color automatically.

