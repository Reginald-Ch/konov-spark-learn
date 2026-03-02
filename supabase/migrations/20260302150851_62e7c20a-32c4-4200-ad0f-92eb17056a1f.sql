-- Allow judges to create and delete hackathon events
CREATE POLICY "Anyone can create hackathons" ON public.hackathons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete hackathons" ON public.hackathons FOR DELETE USING (true);