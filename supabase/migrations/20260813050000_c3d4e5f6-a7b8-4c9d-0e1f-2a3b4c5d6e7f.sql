-- Companion to the ChallengesTab fix making auto_max_points/judge_max_points
-- read-only (70/30, matching the grading pipeline's actual hardcoded
-- rubric — the fields used to be freely editable but never rescaled
-- anything, just clamped the fixed-70/30 computation). Any challenge
-- already created with a different value would otherwise stay silently
-- wrong until an organizer happens to re-save it through the edit dialog.
-- One-time correction so it's fixed immediately, not just going forward.

UPDATE public.daily_challenges SET auto_max_points = 70 WHERE auto_max_points <> 70;
UPDATE public.daily_challenges SET judge_max_points = 30 WHERE judge_max_points <> 30;
