-- Enable realtime for hackathon tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.hackathons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hackathon_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hackathon_teams;