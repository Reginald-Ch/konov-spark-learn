import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Hash, Volume2, Megaphone, Send, Users, Circle, 
  Video, Phone, PhoneOff, X, User, Smile, AtSign 
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: 'text' | 'voice' | 'announcement';
  is_default: boolean;
}

interface Message {
  id: string;
  channel_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface VoiceParticipant {
  id: string;
  channel_id: string;
  participant_name: string;
  participant_email: string;
  joined_at: string;
}

interface CommunityChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommunityChat = ({ isOpen, onClose }: CommunityChatProps) => {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeChannel && activeChannel.channel_type === 'text') {
      fetchMessages(activeChannel.id);
      
      // Subscribe to new messages
      const messagesChannel = supabase
        .channel(`messages-${activeChannel.id}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'community_messages',
            filter: `channel_id=eq.${activeChannel.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    } else if (activeChannel && activeChannel.channel_type === 'voice') {
      fetchVoiceParticipants(activeChannel.id);
      
      // Subscribe to voice participants
      const voiceChannel = supabase
        .channel(`voice-${activeChannel.id}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'voice_room_participants',
            filter: `channel_id=eq.${activeChannel.id}`
          },
          () => {
            fetchVoiceParticipants(activeChannel.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(voiceChannel);
      };
    }
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('community_channels' as any)
      .select('*')
      .order('channel_type')
      .order('name');

    if (!error && data) {
      const channelData = data as unknown as Channel[];
      setChannels(channelData);
      const defaultChannel = channelData.find(c => c.is_default && c.channel_type === 'text');
      if (defaultChannel) {
        setActiveChannel(defaultChannel);
      }
    }
  };

  const fetchMessages = async (channelId: string) => {
    const { data, error } = await supabase
      .from('community_messages' as any)
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as unknown as Message[]);
    }
  };

  const fetchVoiceParticipants = async (channelId: string) => {
    const { data, error } = await supabase
      .from('voice_room_participants' as any)
      .select('*')
      .eq('channel_id', channelId);

    if (!error && data) {
      setVoiceParticipants(data as unknown as VoiceParticipant[]);
    }
  };

  const handleJoin = () => {
    if (!userName.trim() || !userEmail.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter your name and email to join.',
        variant: 'destructive',
      });
      return;
    }
    setIsJoined(true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || isSending) return;

    setIsSending(true);
    const { error } = await supabase
      .from('community_messages' as any)
      .insert({
        channel_id: activeChannel.id,
        sender_name: userName,
        sender_email: userEmail,
        content: newMessage.trim(),
        message_type: 'text',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleJoinVoice = async () => {
    if (!activeChannel) return;

    const { error } = await supabase
      .from('voice_room_participants' as any)
      .insert({
        channel_id: activeChannel.id,
        participant_name: userName,
        participant_email: userEmail,
      });

    if (!error) {
      setIsInVoice(true);
      toast({
        title: '🎤 Joined Voice',
        description: `You joined ${activeChannel.name}`,
      });
    }
  };

  const handleLeaveVoice = async () => {
    if (!activeChannel) return;

    await supabase
      .from('voice_room_participants' as any)
      .delete()
      .eq('channel_id', activeChannel.id)
      .eq('participant_email', userEmail);

    setIsInVoice(false);
  };

  const textChannels = channels.filter(c => c.channel_type === 'text');
  const voiceChannels = channels.filter(c => c.channel_type === 'voice');
  const announcementChannels = channels.filter(c => c.channel_type === 'announcement');

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'voice': return Volume2;
      case 'announcement': return Megaphone;
      default: return Hash;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isJoined) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[400px] bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
              Join Community Chat
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-[hsl(var(--discord-text))]">Your Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[hsl(var(--discord-text))]">Your Email</label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white"
              />
            </div>
            <Button
              onClick={handleJoin}
              className="w-full bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
            >
              Join Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] p-0 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white">
        <div className="flex h-full">
          {/* Channels Sidebar */}
          <div className="w-60 bg-[hsl(var(--discord-darker))] flex flex-col border-r border-[hsl(var(--discord-light)/0.2)]">
            <div className="p-4 border-b border-[hsl(var(--discord-light)/0.2)]">
              <h3 className="font-semibold text-white">Hackathon Community</h3>
              <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                <Circle className="w-2 h-2 inline fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))] mr-1" />
                {voiceParticipants.length} in voice
              </p>
            </div>

            <ScrollArea className="flex-1 p-2">
              {/* Text Channels */}
              <div className="mb-4">
                <p className="px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase mb-1">
                  Text Channels
                </p>
                {textChannels.map((channel) => {
                  const Icon = getChannelIcon(channel.channel_type);
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        activeChannel?.id === channel.id
                          ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                          : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {channel.name}
                    </button>
                  );
                })}
              </div>

              {/* Voice Channels */}
              <div className="mb-4">
                <p className="px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase mb-1">
                  Voice Channels
                </p>
                {voiceChannels.map((channel) => (
                  <div key={channel.id}>
                    <button
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        activeChannel?.id === channel.id
                          ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                          : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-white'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      {channel.name}
                    </button>
                    {/* Show participants in voice */}
                    {voiceParticipants.filter(p => p.channel_id === channel.id).map((participant) => (
                      <div key={participant.id} className="flex items-center gap-2 px-6 py-1 text-xs text-[hsl(var(--discord-text-muted))]">
                        <User className="w-3 h-3" />
                        {participant.participant_name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Announcements */}
              {announcementChannels.length > 0 && (
                <div>
                  <p className="px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase mb-1">
                    Announcements
                  </p>
                  {announcementChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        activeChannel?.id === channel.id
                          ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                          : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-white'
                      }`}
                    >
                      <Megaphone className="w-4 h-4" />
                      {channel.name}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* User Info */}
            <div className="p-2 bg-[hsl(var(--discord-dark)/0.5)] border-t border-[hsl(var(--discord-light)/0.2)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--discord-blurple))] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))] truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Channel Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.2)]">
              <div className="flex items-center gap-2">
                {activeChannel && (
                  <>
                    {(() => {
                      const Icon = getChannelIcon(activeChannel.channel_type);
                      return <Icon className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />;
                    })()}
                    <span className="font-semibold text-white">{activeChannel.name}</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-[hsl(var(--discord-text-muted))] hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Area */}
            {activeChannel?.channel_type === 'voice' ? (
              // Voice Channel UI
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="text-center mb-8">
                  <Volume2 className="w-16 h-16 text-[hsl(var(--discord-blurple))] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">{activeChannel.name}</h3>
                  <p className="text-[hsl(var(--discord-text-muted))]">
                    {voiceParticipants.filter(p => p.channel_id === activeChannel.id).length} participants
                  </p>
                </div>

                {/* Voice Participants */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {voiceParticipants
                    .filter(p => p.channel_id === activeChannel.id)
                    .map((participant) => (
                      <motion.div
                        key={participant.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-[hsl(var(--discord-blurple))] flex items-center justify-center mb-2 ring-2 ring-[hsl(var(--discord-green))]">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm text-white">{participant.participant_name}</span>
                      </motion.div>
                    ))}
                </div>

                {/* Voice Controls */}
                <div className="flex gap-4">
                  {isInVoice ? (
                    <>
                      <Button
                        onClick={handleLeaveVoice}
                        className="bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)]"
                      >
                        <PhoneOff className="w-4 h-4 mr-2" />
                        Leave Voice
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[hsl(var(--discord-light))] text-white"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Video
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleJoinVoice}
                      className="bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)]"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Join Voice
                    </Button>
                  )}
                </div>

                <p className="mt-4 text-sm text-[hsl(var(--discord-text-muted))]">
                  Note: Full video conferencing requires external integration (e.g., Jitsi, Daily.co)
                </p>
              </div>
            ) : (
              // Text Channel UI
              <>
                <ScrollArea className="flex-1 p-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 mb-4 hover:bg-[hsl(var(--discord-light)/0.1)] p-2 rounded"
                      >
                        <div className="w-10 h-10 rounded-full bg-[hsl(var(--discord-blurple))] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold">
                            {message.sender_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-white">{message.sender_name}</span>
                            <span className="text-xs text-[hsl(var(--discord-text-muted))]">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-[hsl(var(--discord-text))] break-words">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-[hsl(var(--discord-light)/0.2)]">
                  <div className="flex items-center gap-2 bg-[hsl(var(--discord-lighter))] rounded-lg px-4 py-2">
                    <button className="text-[hsl(var(--discord-text-muted))] hover:text-white">
                      <Smile className="w-5 h-5" />
                    </button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={`Message #${activeChannel?.name || 'channel'}`}
                      className="flex-1 bg-transparent border-none text-white placeholder:text-[hsl(var(--discord-text-muted))] focus-visible:ring-0"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim()}
                      className="text-[hsl(var(--discord-text-muted))] hover:text-white disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
