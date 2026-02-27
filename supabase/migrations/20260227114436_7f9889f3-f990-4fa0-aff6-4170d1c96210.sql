-- Allow hackathon status updates (for judge dashboard Go Live / End)
CREATE POLICY "Allow hackathon status updates"
ON public.hackathons
FOR UPDATE
USING (true)
WITH CHECK (true);