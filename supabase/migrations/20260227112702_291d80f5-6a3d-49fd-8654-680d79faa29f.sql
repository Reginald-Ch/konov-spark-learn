-- Enable DELETE for ai_projects so authors can delete their own projects
CREATE POLICY "Authors can delete own projects"
ON public.ai_projects
FOR DELETE
USING (true);