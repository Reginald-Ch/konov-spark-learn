-- Leaderboard / gamification read performance
CREATE INDEX IF NOT EXISTS idx_point_events_hackathon_type ON public.point_events (hackathon_id, event_type);
CREATE INDEX IF NOT EXISTS idx_point_events_participant ON public.point_events (participant_email);
CREATE INDEX IF NOT EXISTS idx_point_events_participant_hackathon ON public.point_events (participant_email, hackathon_id, event_type);
CREATE INDEX IF NOT EXISTS idx_point_events_created_at ON public.point_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_projects_hackathon_published ON public.ai_projects (hackathon_id, is_published);
CREATE INDEX IF NOT EXISTS idx_ai_projects_author ON public.ai_projects (author_email);
CREATE INDEX IF NOT EXISTS idx_ai_projects_created_at ON public.ai_projects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_hackathon ON public.challenge_submissions (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_participant ON public.challenge_submissions (participant_email);
CREATE INDEX IF NOT EXISTS idx_submission_scores_submission ON public.submission_scores (submission_id);
CREATE INDEX IF NOT EXISTS idx_reward_boxes_hackathon_status ON public.reward_boxes (hackathon_id, status);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_hackathon ON public.hackathon_registrations (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_participant ON public.community_quest_completions (participant_email);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_participant ON public.lesson_progress (participant_email);

-- Idempotency: one registration coin bonus per participant per hackathon
DELETE FROM public.point_events pe
USING public.point_events dup
WHERE pe.event_type = 'forge_coin_grant'
  AND dup.event_type = 'forge_coin_grant'
  AND pe.participant_email = dup.participant_email
  AND pe.hackathon_id IS NOT DISTINCT FROM dup.hackathon_id
  AND pe.metadata->>'reason' = 'registration_bonus'
  AND dup.metadata->>'reason' = 'registration_bonus'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_registration_bonus
  ON public.point_events (participant_email, hackathon_id)
  WHERE event_type = 'forge_coin_grant' AND metadata->>'reason' = 'registration_bonus';

-- Idempotency: one badge award per participant per badge per hackathon
DELETE FROM public.point_events pe
USING public.point_events dup
WHERE pe.event_type = 'badge_award'
  AND dup.event_type = 'badge_award'
  AND pe.participant_email = dup.participant_email
  AND pe.hackathon_id IS NOT DISTINCT FROM dup.hackathon_id
  AND pe.metadata->>'badge' = dup.metadata->>'badge'
  AND pe.id > dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_badge_award
  ON public.point_events (participant_email, hackathon_id, (metadata->>'badge'))
  WHERE event_type = 'badge_award';