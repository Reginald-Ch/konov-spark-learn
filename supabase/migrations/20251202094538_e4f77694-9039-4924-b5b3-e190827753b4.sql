-- Create enum for program types
CREATE TYPE public.program_type AS ENUM ('workshop', 'tech_camp', 'tech_fair');

-- Create program_sessions table
CREATE TABLE public.program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  program_type public.program_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  age_group TEXT NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 20,
  current_participants INTEGER NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  session_id UUID REFERENCES public.program_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  participant_age INTEGER NOT NULL,
  participant_email TEXT NOT NULL,
  participant_phone TEXT,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  special_requirements TEXT
);

-- Enable RLS
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for program_sessions
CREATE POLICY "Anyone can view active sessions"
ON public.program_sessions
FOR SELECT
USING (is_active = true);

-- RLS policies for registrations
CREATE POLICY "Anyone can register"
ON public.registrations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own registrations"
ON public.registrations
FOR SELECT
USING (true);

-- Trigger to update participant count
CREATE OR REPLACE FUNCTION public.update_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.program_sessions
    SET current_participants = current_participants + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.program_sessions
    SET current_participants = current_participants - 1
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_session_participant_count
AFTER INSERT OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_participant_count();