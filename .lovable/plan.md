

# Plan: Fix IDE Code Syntax & Parsing Bugs

## Problems Found

### 1. Syntax Highlighter Breaks on Multi-Line Triple-Quoted Strings (Critical — Visual)
The `tokenizeLine` function processes code **one line at a time**. When a student writes:
```python
KNOWLEDGE_BASE = """
You are IndependenceBot...
You specialise in Ghana's history...
"""
```
Line 1 opens a `"""` but never finds the closing `"""` on that same line. Lines 2-4 are then parsed as regular code — so `#` inside the knowledge text would render as comments, keywords like `in` or `for` would highlight as purple keywords, etc. This is the exact issue visible in the screenshot: the knowledge base content looks like code instead of a green string.

**Fix:** Track a `multiLineStringState` across lines. When a line opens a triple-quote without closing it, all subsequent lines are treated as `string` type until the closing `"""` or `'''` is found. Update `highlightedContent` memo to use a multi-line-aware tokenizer.

### 2. Apostrophes Break Q&A, List, and Dict Parsing (Critical — Data Loss)
All regex extractors use `[^"']+` to match values inside quotes. A student writing:
- Q&A: `"What's your name?"` → regex stops at `'`, captures only `What`
- Rules: `"Don't be rude"` → captures only `Don`
- Easter eggs: `"it's a secret"` → captures only `it`

This silently drops most of the student's content.

**Fix:** Change extraction regex patterns from `[^"']+` to be quote-type-aware: if the outer delimiter is `"`, only stop at `"` (not `'`), and vice versa. Use a smarter pattern like `"([^"\\]*(?:\\.[^"\\]*)*)"` that handles escaped quotes too.

### 3. Knowledge Base Sync Breaks if Content Contains `"""`  (Medium)
If a student types `"""` inside their knowledge text (unlikely but possible), the sidebar→code sync produces: `KNOWLEDGE_BASE = """text with """ inside"""` which is invalid Python.

**Fix:** Sanitize triple-quotes in content before inserting, replacing `"""` with `\"\"\"` or stripping them.

### 4. Q&A Sidebar→Code Sync Breaks on Apostrophes (Medium)
Line 456: `"${p.q.replace(/"/g, '\\"')}"` only escapes double quotes. If a student adds a Q&A pair with content containing a backslash or newline, it produces invalid Python.

**Fix:** Also escape backslashes and newlines in Q&A serialization.

---

## Implementation Plan

| # | Fix | File |
|---|-----|------|
| 1 | Multi-line-aware syntax highlighting | `ProjectEditor.tsx` — replace `tokenizeLine` usage in `highlightedContent` with multi-line tokenizer |
| 2 | Fix apostrophe handling in all extractors | `ProjectEditor.tsx` — update `extractList`, `extractDict`, `extractQAPairs`, and Q&A code→sidebar regex |
| 3 | Sanitize triple-quotes in knowledge sync | `ProjectEditor.tsx` — strip/escape `"""` in sidebar→code sync |
| 4 | Robust Q&A serialization | `ProjectEditor.tsx` — escape backslashes and newlines in Q&A sidebar→code sync |

### Files Modified
- `src/components/hackathon/ProjectEditor.tsx`

