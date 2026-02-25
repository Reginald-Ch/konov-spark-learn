-- Fix SELECT: allow viewing published projects OR all projects (since no auth, allow all reads for hackathon MVP)
DROP POLICY IF EXISTS "Anyone can view published projects" ON public.ai_projects;
CREATE POLICY "Anyone can view projects" ON public.ai_projects FOR SELECT USING (true);

-- Fix UPDATE: allow updates (scoped by author_email check in app code for MVP)
DROP POLICY IF EXISTS "Authors can update own projects" ON public.ai_projects;
CREATE POLICY "Authors can update own projects" ON public.ai_projects FOR UPDATE USING (true) WITH CHECK (true);