-- Create enum for hackathon status
CREATE TYPE public.hackathon_status AS ENUM ('upcoming', 'live', 'ended');

-- Create hackathons table
CREATE TABLE public.hackathons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 100,
  max_team_size INTEGER NOT NULL DEFAULT 5,
  min_team_size INTEGER NOT NULL DEFAULT 1,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status hackathon_status NOT NULL DEFAULT 'upcoming',
  prizes TEXT,
  rules TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hackathon teams table
CREATE TABLE public.hackathon_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  description TEXT,
  looking_for_members BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER NOT NULL DEFAULT 5,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, team_name)
);

-- Create hackathon registrations table
CREATE TABLE public.hackathon_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_phone TEXT,
  skills TEXT,
  experience_level TEXT,
  looking_for_team BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, participant_email)
);

-- Create hackathon submissions table
CREATE TABLE public.hackathon_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  demo_url TEXT,
  repo_url TEXT,
  video_url TEXT,
  technologies TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, team_id)
);

-- Enable RLS on all tables
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_submissions ENABLE ROW LEVEL SECURITY;

-- Hackathons: Anyone can view active hackathons
CREATE POLICY "Anyone can view active hackathons" 
ON public.hackathons 
FOR SELECT 
USING (is_active = true);

-- Teams: Anyone can view teams for active hackathons
CREATE POLICY "Anyone can view hackathon teams" 
ON public.hackathon_teams 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.hackathons h 
  WHERE h.id = hackathon_id AND h.is_active = true
));

-- Teams: Anyone can create teams
CREATE POLICY "Anyone can create teams" 
ON public.hackathon_teams 
FOR INSERT 
WITH CHECK (true);

-- Registrations: Anyone can register
CREATE POLICY "Anyone can register for hackathons" 
ON public.hackathon_registrations 
FOR INSERT 
WITH CHECK (true);

-- Registrations: Users can view registrations for their email
CREATE POLICY "Users can view their registrations" 
ON public.hackathon_registrations 
FOR SELECT 
USING (true);

-- Registrations: Users can update their own registration
CREATE POLICY "Users can update their registration" 
ON public.hackathon_registrations 
FOR UPDATE 
USING (true);

-- Submissions: Anyone can view submissions
CREATE POLICY "Anyone can view submissions" 
ON public.hackathon_submissions 
FOR SELECT 
USING (true);

-- Submissions: Teams can submit projects
CREATE POLICY "Teams can submit projects" 
ON public.hackathon_submissions 
FOR INSERT 
WITH CHECK (true);

-- Function to update participant count
CREATE OR REPLACE FUNCTION public.update_hackathon_participant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hackathons
    SET current_participants = current_participants + 1
    WHERE id = NEW.hackathon_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hackathons
    SET current_participants = current_participants - 1
    WHERE id = OLD.hackathon_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for participant count
CREATE TRIGGER update_hackathon_participants
AFTER INSERT OR DELETE ON public.hackathon_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_hackathon_participant_count();