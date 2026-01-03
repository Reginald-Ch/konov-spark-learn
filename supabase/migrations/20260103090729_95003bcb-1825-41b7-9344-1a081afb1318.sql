-- Fix RLS policies for newsletter_signups table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own signups" ON public.newsletter_signups;

-- Create a proper policy that only allows users to view their own signups by email
CREATE POLICY "Users can view their own signups" 
ON public.newsletter_signups 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.email() = email);

-- Fix RLS policies for contact_submissions table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.contact_submissions;

-- Create a proper policy that only allows users to view their own submissions by email
CREATE POLICY "Users can view their own submissions" 
ON public.contact_submissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.email() = email);

-- Fix RLS policies for registrations table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;

-- Create a proper policy that only allows users to view registrations where they are the participant or parent
CREATE POLICY "Users can view their own registrations" 
ON public.registrations 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (participant_email = auth.email() OR parent_email = auth.email()));

-- Fix RLS policies for workshop_registrations table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.workshop_registrations;

-- Create a proper policy that only allows users to view their own workshop registrations
CREATE POLICY "Users can view their own registrations" 
ON public.workshop_registrations 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND participant_email = auth.email());