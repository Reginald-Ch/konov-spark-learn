
-- Create ai_projects table for published student projects
CREATE TABLE public.ai_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL DEFAULT '',
  template_id TEXT,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  hackathon_id UUID REFERENCES public.hackathons(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  demo_url TEXT,
  points_earned INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_projects ENABLE ROW LEVEL SECURITY;

-- Anyone can view published projects
CREATE POLICY "Anyone can view published projects"
ON public.ai_projects
FOR SELECT
USING (is_published = true);

-- Anyone can insert projects (no auth required for young users)
CREATE POLICY "Anyone can insert projects"
ON public.ai_projects
FOR INSERT
WITH CHECK (true);

-- Authors can update their own projects by email
CREATE POLICY "Authors can update own projects"
ON public.ai_projects
FOR UPDATE
USING (true);

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_projects;
