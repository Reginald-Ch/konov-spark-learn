-- delete_hackathon's confirmation dialog promises "this will remove all
-- associated data," and every other hackathon_id foreign key cascades — but
-- these two were left as the Postgres default (NO ACTION), so deleting an
-- event with any point_events or ai_projects rows attached to it would fail
-- with a raw FK-violation error instead of doing what the UI promises.
--
-- ai_projects gets SET NULL rather than CASCADE: a participant's actual
-- built project is their work, not disposable event metadata — deleting the
-- event record shouldn't delete their bot, just detach it (same state as a
-- project built outside any event).

ALTER TABLE public.point_events DROP CONSTRAINT IF EXISTS point_events_hackathon_id_fkey;
ALTER TABLE public.point_events ADD CONSTRAINT point_events_hackathon_id_fkey
  FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id) ON DELETE CASCADE;

ALTER TABLE public.ai_projects DROP CONSTRAINT IF EXISTS ai_projects_hackathon_id_fkey;
ALTER TABLE public.ai_projects ADD CONSTRAINT ai_projects_hackathon_id_fkey
  FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id) ON DELETE SET NULL;
