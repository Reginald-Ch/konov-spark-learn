

# Plan: Replace Sparkles with Rocket, Make UI More Techie, Gate IDE Access to Live Events

## 1. Replace All Sparkles Icons with Rocket

Every `Sparkles` import and usage across hackathon-related files will be replaced with `Rocket`:

| File | Changes |
|------|---------|
| `src/pages/Hackathons.tsx` | 3 Sparkles → Rocket (banner bg icon, banner title, onboarding modal) |
| `src/components/hackathon/ProjectEditor.tsx` | Sparkles in "Review" action → Rocket |
| `src/components/hackathon/ProjectGallery.tsx` | Sparkles icon in gallery header → Rocket |
| `src/components/hackathon/ProjectIdeas.tsx` | "All Ideas" category icon → Rocket |
| `src/components/hackathon/AIModelsTab.tsx` | Personality config icon → Rocket |
| `src/components/hackathon/TemplatesTab.tsx` | Remove Sparkles import if used |
| `src/components/HackathonBanner.tsx` | Remove unused Sparkles import |

Remove `Sparkles` from import statements where no longer needed.

## 2. Make Hackathon Platform Look More Techie

Enhance the visual feel with subtle tech elements:

- **Sidebar**: Add a scanline/grid overlay effect via CSS to the icon rail background
- **Welcome banner**: Replace plain red background with a gradient using dark tones and a subtle circuit-board SVG pattern or dot-matrix overlay
- **Onboarding modal**: Add a subtle terminal-style font for step descriptions and a blinking cursor effect
- **Header bar**: Add a monospace font treatment and a subtle "terminal prompt" prefix (e.g., `>`)
- **CSS additions**: Add a `.tech-grid` utility with a subtle grid pattern, and a `.terminal-text` class with monospace font

## 3. Gate Build/Submit Access Behind Live Hackathon Events

**Problem**: Students can access the IDE and submit projects even when no hackathon is live.

**Solution**: Add a "practice mode" concept vs "competition mode":

- When **no live hackathon exists** (`hasLiveEvent === false`):
  - Build tab still accessible (students can practice coding)
  - The **"Submit & Go Live" button is disabled** with a tooltip: "Submissions open during live hackathon events only"
  - The `PublishModal` shows a message that submissions are closed
  - Templates tab shows a "Practice Mode" badge

- When **a live hackathon exists** (`hasLiveEvent === true`):
  - Full access: build, submit, publish all enabled
  - "Competition Mode" badge shown

This approach lets students still explore and learn without blocking the IDE entirely, while preventing submissions outside of events.

### Implementation:
- Pass `hasLiveEvent` as a prop to `ProjectEditor`
- In `ProjectEditor`, conditionally disable the "Go Live" button and show a practice mode indicator in the status bar
- In `PublishModal`, check the prop and show a gated message if no live event

### Files to modify:
| File | Change |
|------|--------|
| `src/pages/Hackathons.tsx` | Pass `hasLiveEvent` prop to ProjectEditor |
| `src/components/hackathon/ProjectEditor.tsx` | Accept `hasLiveEvent` prop, disable submit button, show practice/competition badge |
| `src/components/hackathon/PublishModal.tsx` | Gate submission behind `hasLiveEvent` |
| `src/index.css` | Add `.tech-grid` and `.terminal-text` utility classes |

