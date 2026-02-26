

# Plan: Fix Build Studio + Match HackForge Theme

## Summary

Three areas to address: (1) update IDE color theme to match the uploaded HackForge reference image, (2) ensure all core flows work end-to-end (code, run, save, deploy, chat for all 3 project types), and (3) confirm the AI model is optimal for a 1:30 hackathon.

---

## AI Model Status

The edge function uses `google/gemini-3-flash-preview` — this is the fastest free model available. For a 90-minute hackathon, a student might make 20-40 AI calls. This model handles that easily. No changes needed here.

---

## Theme Update (from reference image)

The HackForge reference image uses a **deep black-teal** background (not navy) with much more vibrant, neon-like syntax colors. Current theme is too washed-out by comparison.

New palette derived from the reference:

```text
Current (deep navy)          →  New (dark teal-black, like reference)
─────────────────────────────────────────────────────────────────────
bg:       #1e2030 (navy)     →  #0d1117 (near-black teal)
sidebar:  #191c2a            →  #161b22 (slightly lighter)
editor:   #1e2030            →  #0d1117
border:   #2d3247            →  #21262d (subtle grey)
text:     #b8c0d4 (blueish)  →  #e6edf3 (bright white)
muted:    #636d83            →  #7d8590
accent:   #3399ff            →  #58a6ff (GitHub-style blue)
green:    #66cc66            →  #3fb950 (bright green)
yellow:   #d4a845            →  #d29922 (warm gold)
red:      #d45555            →  #f85149
purple:   #9b6ed4            →  #d2a8ff (bright lavender)
cyan:     #44b8b8            →  #79c0ff (bright cyan)
orange:   #cc8844            →  #f0883e
```

The key visual difference: the reference has **cyan for imports/from**, **magenta/purple for keywords** like `export`, `const`, `function`, and **bright green for strings**. The current tokenizer maps these correctly already — just the colors need updating.

**File:** `src/index.css` — update all `--ide-*` CSS variables.

---

## Functional Fixes

### Fix 1: Bottom Action Bar — Better Labels + "Go Live" Branding

The reference image shows "RUN TESTS", "SAVE CHECKPOINT", and "GO LIVE" as the three bottom actions. Currently we have "Run Tests", "Save", "Deploy". Update labels and styling to match:

- "Run Tests" stays
- "Save" → "Save Checkpoint" (matches reference)  
- "Deploy" → "Go Live" with rocket icon (matches reference)

**File:** `src/components/hackathon/ProjectEditor.tsx` (lines 988-1002)

### Fix 2: Add Resources/Token Usage Display

The reference shows a "RESOURCES USED" section in the left sidebar with Tokens, Limit, and Calls. Add a simple counter that tracks how many AI calls the student has made in the session and displays it in the config sidebar.

**File:** `src/components/hackathon/ProjectEditor.tsx` — add state for `aiCallCount` and `tokensUsed`, increment in `streamFromEdgeFunction`, display in config sidebar.

### Fix 3: "All changes saved" Status in Bottom Bar

The reference shows "● All changes saved" in the bottom-left. Currently we show "Saved {time}". Update to match reference styling with green dot + "All changes saved" text.

**File:** `src/components/hackathon/ProjectEditor.tsx` (lines 958-968)

### Fix 4: Live Preview — Add "Pitch Controls" Section

The reference has a "PITCH CONTROLS" section below the chat with "GO LIVE FOR PITCH" and "COPY DEMO URL" buttons. Add this below the chat input in the right panel.

**File:** `src/components/hackathon/ProjectEditor.tsx` (after line 953, before the closing `</div>` of the right panel)

### Fix 5: Verify All 3 Project Types Work

All three scaffolds (Chatbot, Voice Assistant, Agent) use the same `streamFromEdgeFunction` which calls `python-ai-assist`. The edge function handles all actions (`run`, `test-agent`, `review`, `explain`, `suggest`). This is confirmed working. No code changes needed — just visual confirmation.

### Fix 6: ProjectView — Add Syntax Highlighting

Currently `/projects/:id` shows plain text code. Add the same token-based highlighter to make published projects look professional.

**File:** `src/pages/ProjectView.tsx` — import and apply `tokenizeLine` + `TOKEN_COLORS` to the code display.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Update IDE CSS variables to dark teal-black theme matching reference |
| `src/components/hackathon/ProjectEditor.tsx` | Update button labels, add resource tracking, add pitch controls, update status bar |
| `src/pages/ProjectView.tsx` | Add syntax highlighting to published project view |

## Implementation Order
1. Update IDE theme colors to match reference image
2. Update bottom bar labels (Save Checkpoint, Go Live)
3. Add resource usage counter in sidebar
4. Add Pitch Controls section in Live Preview panel
5. Update status bar to show "All changes saved"
6. Add syntax highlighting to ProjectView

