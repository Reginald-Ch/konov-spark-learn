

# Plan: Fix "Build Chatbot" Visibility and Remaining Console Warning

## Root Cause — Can't See "Build Chatbot"

The Templates tab and Build tab are **gated behind `hasLiveEvent`** (line 522 in `Hackathons.tsx`). When no hackathon has `status: 'live'`, both tabs show a lock screen instead of the actual content. This is the designed "IDE Live Gate" behavior.

**To test right now**: Go to Hackathons tab → Judge Dashboard (shield icon, code `2059`) → set any event to "Live" → go back to Templates tab → "Build AI Chatbot" and "Build AI Agent" cards will appear.

If the intent is that Templates should **always** be visible (so students can browse before the event starts), here's the fix:

## Changes

### File: `src/pages/Hackathons.tsx`

**Remove the live gate from the Templates tab only** (lines 520-539). Always render `<TemplatesTab />` regardless of `hasLiveEvent`. Keep the Build tab gated — when a student clicks "Build Chatbot" on the Templates tab, `handleStartBuilding` switches to the Build tab, which will show the lock screen if no event is live. This lets students **browse** templates but not **build** until the event is live.

Alternatively, if the gate should stay on Templates too (current behavior is intentional), no code change needed — just set an event to Live.

### File: `src/components/hackathon/ProjectEditor.tsx`

**Fix the AnimatePresence ref warning**: The console warning comes from `AnimatePresence` wrapping `motion.div` children that may unmount/mount. Framer Motion's `AnimatePresence` uses `cloneElement` with refs internally. The fix: ensure all direct children of `AnimatePresence` are `motion.*` elements (which accept refs). Audit each `AnimatePresence` block to confirm no plain function components are direct children. This is a cosmetic console fix — no runtime impact.

## Result
- Students can browse templates before event goes live (if gate is removed from Templates)
- No console ref warnings
- Build tab remains locked until event is live

