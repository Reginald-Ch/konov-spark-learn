
CREATE TABLE point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  hackathon_id UUID REFERENCES hackathons(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert point events" ON point_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view point events" ON point_events FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.point_events;
