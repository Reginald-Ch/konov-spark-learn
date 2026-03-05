

# Plan: Final Bug Fixes & Polish

## Findings

### 1. Remove Teams Button from Event Cards (User Request)
**File:** `src/components/hackathon/HackathonCard.tsx` (lines 203-211)
The "Teams" button appears on every event card. User wants it removed.

**Fix:** Remove the Teams button `<Button>` block (lines 203-211).

### 2. Build Studio Gate Blocks Templates Flow
**File:** `src/pages/Hackathons.tsx` (lines 132-136)
`handleStartBuilding` checks `hasLiveEvent` and shows an error toast if no live event exists. This blocks students from picking a template and entering the Build Studio unless a judge has made an event live. For training/demo scenarios, this is frustrating.

**Fix:** Remove the `hasLiveEvent` check from `handleStartBuilding`. The Build tab itself already shows the "IDE Opens When Event Goes Live" message (line 508-524) — but that gate should also be removed so students can build freely. Allow the Build Studio to work without a live event by removing the `hasLiveEvent` conditional around `<ProjectEditor>`.

### 3. `handleChatSend` Send Button Disabled Without Input
**File:** `src/components/hackathon/ProjectEditor.tsx` (line 1898)
The Send button has `disabled={isStreaming || !chatInput.trim()}`. When using conversation starters (which call `handleChatSend(example)` directly), the button correctly isn't involved. However, if a user types a message and the `chatInput` gets cleared by `handleChatSend` (line 777: `setChatInput('')`), and the streaming hasn't started yet in the next render, there's a brief moment where the input is empty. This is fine — no bug here.

### 4. Knowledge Tab — Sidebar Textarea Has No Placeholder Guidance
**File:** `src/components/hackathon/ProjectEditor.tsx`
The Knowledge Base textarea in the sidebar should have a helpful placeholder guiding students on what to paste. Need to verify this exists.

### 5. `handleStartBuilding` Passes Empty String Code
**File:** `src/components/hackathon/TemplatesTab.tsx` (line 147)
`onStartBuilding('', type.id)` passes empty string for code. In `Hackathons.tsx` line 137: `setBuildCode(code || undefined)` — empty string `''` is falsy, so it becomes `undefined`. This is correct behavior, no bug.

### 6. Unused `onSubmitProject` / `onViewTeams` Props After Teams Removal
After removing the Teams button, `onViewTeams` is no longer called from `HackathonCard`. We should also clean up the unused prop and related state/handler in `Hackathons.tsx`.

### 7. `TeamsModal` Import and State — Dead Code After Removal
With Teams button removed, the `TeamsModal` component, `teamsModalOpen` state, and `handleViewTeams` handler become dead code in `Hackathons.tsx`.

---

## Implementation Plan

| # | Fix | File |
|---|-----|------|
| 1 | Remove Teams button from HackathonCard | `HackathonCard.tsx` |
| 2 | Remove `onViewTeams` prop from HackathonCard interface | `HackathonCard.tsx` |
| 3 | Remove Teams-related dead code from Hackathons.tsx | `Hackathons.tsx` |
| 4 | Remove `hasLiveEvent` gate from `handleStartBuilding` and Build tab | `Hackathons.tsx` |

### Files Modified
- `src/components/hackathon/HackathonCard.tsx` — remove Teams button and `onViewTeams` prop
- `src/pages/Hackathons.tsx` — remove TeamsModal import, `teamsModalOpen` state, `handleViewTeams` handler, `hasLiveEvent` gate on Build tab and `handleStartBuilding`

