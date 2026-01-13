-- Create community chat channels table
CREATE TABLE public.community_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'text' CHECK (channel_type IN ('text', 'voice', 'announcement')),
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community messages table
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join', 'leave')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice room participants table for tracking who's in a voice call
CREATE TABLE public.voice_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, participant_email)
);

-- Enable RLS on all tables
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_room_participants ENABLE ROW LEVEL SECURITY;

-- Channels are readable by everyone
CREATE POLICY "Channels are viewable by everyone"
ON public.community_channels
FOR SELECT
USING (true);

-- Messages are readable by everyone
CREATE POLICY "Messages are viewable by everyone"
ON public.community_messages
FOR SELECT
USING (true);

-- Anyone can send messages (for hackathon participants)
CREATE POLICY "Anyone can send messages"
ON public.community_messages
FOR INSERT
WITH CHECK (true);

-- Voice room participants are viewable by everyone
CREATE POLICY "Voice participants are viewable by everyone"
ON public.voice_room_participants
FOR SELECT
USING (true);

-- Anyone can join voice rooms
CREATE POLICY "Anyone can join voice rooms"
ON public.voice_room_participants
FOR INSERT
WITH CHECK (true);

-- Participants can leave (delete their own record)
CREATE POLICY "Participants can leave voice rooms"
ON public.voice_room_participants
FOR DELETE
USING (true);

-- Enable realtime for messages and voice participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_room_participants;

-- Insert default community channels
INSERT INTO public.community_channels (name, description, channel_type, is_default) VALUES
('general', 'General discussion for all hackers', 'text', true),
('introductions', 'Introduce yourself to the community', 'text', false),
('help-desk', 'Get help with technical issues', 'text', false),
('team-finder', 'Find teammates for hackathons', 'text', false),
('announcements', 'Official announcements from organizers', 'announcement', false),
('Voice Lounge', 'General voice chat room', 'voice', true),
('Study Room', 'Quiet voice room for focused work', 'voice', false);