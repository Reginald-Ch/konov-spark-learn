

# Hackathon Platform: Bug Fixes, AI Models Testing, and Completion Audit

This plan covers three phases to make the hackathon page production-ready for 200+ users.

---

## Phase 1: Critical Bug Fixes

### Bug 1: Edge Function Missing JWT Configuration
The `supabase/config.toml` only has `project_id` -- it is missing the `[functions.python-ai-assist]` section with `verify_jwt = false`. This means all AI assistant calls (Review, Explain, Suggest, Idea-to-Code) will fail with 401 errors because the default JWT verification blocks unauthenticated requests.

**Fix:** Add `[functions.python-ai-assist]` with `verify_jwt = false` to `supabase/config.toml`.

### Bug 2: Missing DialogDescription Warning
Console logs show: `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`. The `PublishModal` is missing a `DialogDescription` component inside its `DialogHeader`.

**Fix:** Add `<DialogDescription>` to `PublishModal.tsx`.

### Bug 3: AI Output Not Rendered as Markdown
The AI mentor panel in `CodePlayground.tsx` renders `aiOutput` as plain `whitespace-pre-wrap` text instead of parsed markdown. The `react-markdown` library was mentioned in memory but is not actually used.

**Fix:** Install `react-markdown` and render AI output with proper markdown formatting (code blocks, bold, lists).

### Bug 4: Leaderboard Not Including ai_projects Points
The `Leaderboard.tsx` only queries `hackathon_teams`, `hackathon_registrations`, and `hackathon_submissions`. Published `ai_projects` (which award 10 points each) are not included in the participant scores.

**Fix:** Fetch `ai_projects` data and merge points into the leaderboard participant scores.

### Bug 5: PublishModal State Not Reset Between Opens
When the user closes and re-opens the PublishModal after a successful publish, the `isPublished` state persists showing the success screen immediately.

**Fix:** Already handled in `handleClose` -- verified this is correct. No change needed.

### Bug 6: CommunityChat DialogContent Missing Description
The large community chat dialog also lacks a `DialogDescription`, triggering the same console warning.

**Fix:** Add `aria-describedby` or `DialogDescription` to the community chat dialog.

---

## Phase 2: AI Models Tab -- Teachable Machine-Style Testing

The current AI Models tab lets users click "Train Model" which runs a fake timer simulation. There is no actual data upload, no real prediction testing, and no meaningful interactivity.

### Redesign: 3-Step Workflow (Upload -> Train -> Predict)

**Step 1: Upload Data**
- For Image Classifier: Add file input that accepts images. Show uploaded images as a thumbnail grid with class labels (e.g., "Class A", "Class B").
- For Text AI: Add a textarea for sample text inputs with labeled categories.
- For Audio: Add audio file upload with playback preview.
- Users can add at least 2 classes with sample data per class.

**Step 2: Train (Simulated with Visual Feedback)**
- Keep the simulated training (since real model training cannot run in the browser), but make it more interactive:
  - Show epoch-by-epoch progress with animated accuracy/loss chart using Recharts
  - Display per-epoch metrics (accuracy, loss) updating in real-time
  - Show confusion matrix-style results after training

**Step 3: Predict / Test**
- After training completes, show a "Test Your Model" section:
  - For images: drag-and-drop an image, see prediction with confidence bars
  - For text: type text, see classification result with confidence percentages
  - For audio: upload/record audio, see transcription or classification
- Display results with animated confidence bars (like Teachable Machine)
- "Export Code" button generates the Python code for the trained model

### Implementation Details
- Modify `AIModelsTab.tsx` to add state management for uploaded samples, class labels, training epochs data, and test predictions
- Add a Recharts line chart for training visualization (already installed)
- Use the `python-ai-assist` edge function with the `visual-builder` action to generate contextual code based on the user's uploaded data description
- Add file input handling (images stored in state as base64 for preview, not uploaded to server)

---

## Phase 3: Hackathon Page Completeness Audit

Here is what the platform needs to be fully complete for 200+ users:

### Already Working
- Hackathon event listing with live/upcoming/ended filters
- Registration modal with validation
- Team creation and viewing
- Project submission modal
- Quick submit modal
- Community chat with text channels, voice rooms, and reactions
- Leaderboard with teams and individual rankings
- Getting Started guide and FAQ
- Python AI Lab IDE with AI mentor
- 1-click templates
- Project publishing to database
- Countdown timers on hackathon cards
- Submissions gallery for ended events
- Real-time updates via database subscriptions

### Needs Fixing/Adding
1. **Seed hackathon data** -- Currently only 2 hackathons exist in the database. For 200+ users, there should be active live/upcoming events ready. *Recommend adding sample hackathon events through the database.*

2. **Mobile responsiveness** -- The 72px icon rail sidebar works on desktop but may be tight on mobile. The Build tab code editor needs better mobile layout. *Fix the `min-h-screen flex` layout for small screens with a collapsible sidebar.*

3. **Error handling for edge cases** -- Registration doesn't check for duplicate emails before submitting (relies on DB constraint). Add pre-check query or better error message handling.

4. **Hackathon sub-view header display** -- The header bar shows raw `hackathonSubView` value like `all-events` instead of a formatted name like "All Events".

5. **No loading state for Templates tab** -- Templates load instantly (static data), which is fine.

6. **Community channels need seed data** -- If no channels exist in the database, the community chat opens with an empty sidebar. Need default channels seeded.

7. **ai_projects RLS UPDATE policy is too permissive** -- Currently uses `USING (true)` which lets anyone update any project. Should restrict to `author_email = current user email` or similar.

---

## Technical Summary of Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add `[functions.python-ai-assist]` with `verify_jwt = false` |
| `src/components/hackathon/AIModelsTab.tsx` | Complete rewrite: add upload UI, Recharts training chart, test/predict section |
| `src/components/hackathon/CodePlayground.tsx` | Add react-markdown for AI output rendering |
| `src/components/hackathon/PublishModal.tsx` | Add DialogDescription |
| `src/components/hackathon/Leaderboard.tsx` | Add ai_projects query to leaderboard scores |
| `src/pages/Hackathons.tsx` | Fix header display format, mobile responsiveness |
| `src/components/hackathon/CommunityChat.tsx` | Add DialogDescription to fix console warning |

### New Dependency
- `react-markdown` -- for rendering AI mentor output with proper formatting

