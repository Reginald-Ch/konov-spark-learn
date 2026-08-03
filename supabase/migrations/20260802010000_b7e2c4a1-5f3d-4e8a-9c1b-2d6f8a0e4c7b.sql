-- Adds what the automated grading pipeline needs:
--   - daily_challenges.benchmark_tests: organizer-authored test cases
--     ({label, input, expected_contains}[]) run against the participant's bot.
--   - challenge_submissions.project_id: optional link to the participant's
--     actual FORGE project (ai_projects), so grading can pull the real system
--     prompt/config instead of only reading free-text notes.

ALTER TABLE public.daily_challenges
  ADD COLUMN benchmark_tests JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.challenge_submissions
  ADD COLUMN project_id UUID REFERENCES public.ai_projects(id) ON DELETE SET NULL;
