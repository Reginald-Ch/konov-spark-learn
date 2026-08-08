-- ai_projects' UPDATE policy is USING(true)/WITH CHECK(true) — its own
-- migration comment admits this was "scoped by author_email check in app
-- code for MVP", i.e. only the client's own well-behaved query filters by
-- author_email; RLS itself enforces nothing. Anyone bypassing the normal UI
-- (a raw REST call) could reassign a project to a different author/email,
-- move it to a different hackathon, or overwrite the stored points_earned
-- directly — none of which the app ever legitimately does after creation.
--
-- Real per-request ownership verification would need real auth (out of
-- scope here, same limitation this whole app already accepts for lessons/
-- community/etc.). What IS fixable without that: a trigger that makes the
-- identity/integrity fields immutable after insert, regardless of who's
-- asking. Content fields (code, description, is_published, demo_url) stay
-- editable — that's the same accepted "no real per-user auth" bar as
-- everywhere else in the app, not a new gap.
CREATE OR REPLACE FUNCTION public.lock_ai_project_identity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.author_email := OLD.author_email;
  NEW.hackathon_id := OLD.hackathon_id;
  NEW.points_earned := OLD.points_earned;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_ai_project_identity_fields ON public.ai_projects;
CREATE TRIGGER lock_ai_project_identity_fields
BEFORE UPDATE ON public.ai_projects
FOR EACH ROW
EXECUTE FUNCTION public.lock_ai_project_identity_fields();
