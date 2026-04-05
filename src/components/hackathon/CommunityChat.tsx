import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Hash, Volume2, Megaphone, Send, Users, Circle, 
  Video, Phone, PhoneOff, X, User, Smile, MessageSquare,
  Mic, MicOff, Settings, ChevronDown, Plus, Heart, ThumbsUp, 
  Laugh, PartyPopper, Flame, Rocket, Star
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

interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface CommunityChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '🚀', '⭐', '✨', '👏', '💯', '🤔', '😍', '🙌', '💪', '🎯', '💡'];

const QUICK_EMOJIS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '❤️', icon: Heart },
  { emoji: '😂', icon: Laugh },
  { emoji: '🎉', icon: PartyPopper },
  { emoji: '🔥', icon: Flame },
  { emoji: '🚀', icon: Rocket },
];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showJitsi, setShowJitsi] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate unique room name for Jitsi based on channel
  const jitsiRoomName = useMemo(() => {
    if (activeChannel) {
      return `hackathon-${activeChannel.name.replace(/\s+/g, '-')}-${activeChannel.id.slice(0, 8)}`;
    }
    return 'hackathon-community';
  }, [activeChannel]);

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeChannel && activeChannel.channel_type === 'text') {
      fetchMessages(activeChannel.id);
      
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
      .from('community_channels')
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
      .from('community_messages')
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
      .from('voice_room_participants')
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
      .from('community_messages')
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

  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessageReactions(prev => {
      const existing = prev[messageId] || [];
      const reactionIndex = existing.findIndex(r => r.emoji === emoji);
      
      if (reactionIndex >= 0) {
        const reaction = existing[reactionIndex];
        if (reaction.users.includes(userName)) {
          // Remove reaction
          const newUsers = reaction.users.filter(u => u !== userName);
          if (newUsers.length === 0) {
            return {
              ...prev,
              [messageId]: existing.filter((_, i) => i !== reactionIndex)
            };
          }
          return {
            ...prev,
            [messageId]: existing.map((r, i) => 
              i === reactionIndex ? { ...r, count: r.count - 1, users: newUsers } : r
            )
          };
        } else {
          // Add to existing reaction
          return {
            ...prev,
            [messageId]: existing.map((r, i) => 
              i === reactionIndex ? { ...r, count: r.count + 1, users: [...r.users, userName] } : r
            )
          };
        }
      } else {
        // New reaction
        return {
          ...prev,
          [messageId]: [...existing, { emoji, count: 1, users: [userName] }]
        };
      }
    });
  };

  const handleJoinVoice = async () => {
    if (!activeChannel) return;

    const { error } = await supabase
      .from('voice_room_participants')
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
      .from('voice_room_participants')
      .delete()
      .eq('channel_id', activeChannel.id)
      .eq('participant_email', userEmail);

    setIsInVoice(false);
    setShowJitsi(false);
    setIsVideoEnabled(false);
  };

  const handleStartVideo = () => {
    setShowJitsi(true);
    setIsVideoEnabled(true);
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
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
      ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'hsl(var(--discord-blurple))',
      'hsl(var(--discord-green))',
      'hsl(var(--discord-yellow))',
      'hsl(var(--discord-red))',
      'hsl(280 70% 50%)',
      'hsl(200 80% 50%)',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Join modal
  if (!isJoined) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[420px] bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-xl">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--discord-blurple))] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              Join Hackathon Community
            </DialogTitle>
            <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
              Enter your details to join the community chat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--discord-text))]">Display Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="How others will see you"
                className="h-11 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:border-[hsl(var(--discord-blurple))] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--discord-text))]">Email Address</label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-11 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:border-[hsl(var(--discord-blurple))] transition-colors"
              />
            </div>
            
            <div className="pt-2">
              <Button
                onClick={handleJoin}
                className="w-full h-11 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.85)] text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Users className="w-4 h-4 mr-2" />
                Join Community
              </Button>
            </div>

            <p className="text-xs text-center text-[hsl(var(--discord-text-muted))]">
              Connect with fellow hackers, share ideas, and collaborate in real-time!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton aria-describedby={undefined} className="sm:max-w-[1000px] h-[85vh] p-0 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white overflow-hidden">
        <div className="flex h-full">
          {/* Channels Sidebar */}
          <div className="w-64 bg-[hsl(var(--discord-darker))] flex flex-col border-r border-[hsl(var(--discord-light)/0.15)]">
            {/* Server Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-darker))] hover:bg-[hsl(var(--discord-light)/0.1)] transition-colors cursor-pointer">
              <h3 className="font-bold text-white truncate">Hackathon Hub</h3>
              <ChevronDown className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {/* Online Status */}
                <div className="px-2 py-3 mb-2">
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text-muted))]">
                    <Circle className="w-2 h-2 fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))]" />
                    <span>{voiceParticipants.length + 1} online</span>
                  </div>
                </div>

                {/* Text Channels */}
                <div className="mb-4">
                  <div className="px-2 flex items-center justify-between mb-1 group">
                    <p className="text-[10px] font-bold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide">
                      Text Channels
                    </p>
                    <Plus className="w-3 h-3 text-[hsl(var(--discord-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-white" />
                  </div>
                  {textChannels.map((channel) => {
                    const Icon = getChannelIcon(channel.channel_type);
                    const isActive = activeChannel?.id === channel.id;
                    return (
                      <motion.button
                        key={channel.id}
                        onClick={() => setActiveChannel(channel)}
                        whileHover={{ x: 2 }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-all ${
                          isActive
                            ? 'bg-[hsl(var(--discord-light)/0.5)] text-white'
                            : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.2)] hover:text-[hsl(var(--discord-text))]'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{channel.name}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Voice Channels */}
                <div className="mb-4">
                  <div className="px-2 flex items-center justify-between mb-1 group">
                    <p className="text-[10px] font-bold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide">
                      Voice Channels
                    </p>
                    <Plus className="w-3 h-3 text-[hsl(var(--discord-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-white" />
                  </div>
                  {voiceChannels.map((channel) => {
                    const channelParticipants = voiceParticipants.filter(p => p.channel_id === channel.id);
                    const isActive = activeChannel?.id === channel.id;
                    return (
                      <div key={channel.id}>
                        <motion.button
                          onClick={() => setActiveChannel(channel)}
                          whileHover={{ x: 2 }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-all ${
                            isActive
                              ? 'bg-[hsl(var(--discord-light)/0.5)] text-white'
                              : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.2)] hover:text-[hsl(var(--discord-text))]'
                          }`}
                        >
                          <Volume2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate flex-1 text-left">{channel.name}</span>
                          {channelParticipants.length > 0 && (
                            <span className="text-xs bg-[hsl(var(--discord-green)/0.2)] text-[hsl(var(--discord-green))] px-1.5 py-0.5 rounded-full">
                              {channelParticipants.length}
                            </span>
                          )}
                        </motion.button>
                        {/* Participants */}
                        <AnimatePresence>
                          {channelParticipants.map((participant) => (
                            <motion.div
                              key={participant.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex items-center gap-2 px-7 py-1 text-xs text-[hsl(var(--discord-text-muted))]"
                            >
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                style={{ backgroundColor: getAvatarColor(participant.participant_name) }}
                              >
                                {participant.participant_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{participant.participant_name}</span>
                              {participant.participant_email === userEmail && (
                                <span className="text-[hsl(var(--discord-green))]">(you)</span>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Announcements */}
                {announcementChannels.length > 0 && (
                  <div>
                    <div className="px-2 flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide">
                        Announcements
                      </p>
                    </div>
                    {announcementChannels.map((channel) => {
                      const isActive = activeChannel?.id === channel.id;
                      return (
                        <motion.button
                          key={channel.id}
                          onClick={() => setActiveChannel(channel)}
                          whileHover={{ x: 2 }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-all ${
                            isActive
                              ? 'bg-[hsl(var(--discord-light)/0.5)] text-white'
                              : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.2)] hover:text-[hsl(var(--discord-text))]'
                          }`}
                        >
                          <Megaphone className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{channel.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* User Panel */}
            <div className="p-2 bg-[hsl(var(--discord-dark)/0.7)] border-t border-[hsl(var(--discord-light)/0.15)]">
              <div className="flex items-center gap-2 p-1.5 rounded hover:bg-[hsl(var(--discord-light)/0.2)] transition-colors">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: getAvatarColor(userName) }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[hsl(var(--discord-green))] border-2 border-[hsl(var(--discord-dark))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-[10px] text-[hsl(var(--discord-text-muted))] truncate">Online</p>
                </div>
                <button className="p-1 text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Channel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-dark))]">
              <div className="flex items-center gap-3">
                {activeChannel && (
                  <>
                    {(() => {
                      const Icon = getChannelIcon(activeChannel.channel_type);
                      return <Icon className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />;
                    })()}
                    <span className="font-semibold text-white">{activeChannel.name}</span>
                    {activeChannel.description && (
                      <>
                        <div className="w-px h-5 bg-[hsl(var(--discord-light)/0.3)]" />
                        <span className="text-sm text-[hsl(var(--discord-text-muted))] truncate max-w-xs">
                          {activeChannel.description}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeChannel?.channel_type === 'voice' && isInVoice && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`${isMuted ? 'text-[hsl(var(--discord-red))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white`}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStartVideo}
                      className={`${isVideoEnabled ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white`}
                    >
                      <Video className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light)/0.3)]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {activeChannel?.channel_type === 'voice' ? (
              // Voice Channel with Jitsi
              <div className="flex-1 flex flex-col">
                {showJitsi && isInVoice ? (
                  // Jitsi Video Conference
                  <div className="flex-1 relative">
                    <iframe
                      src={`https://meet.jit.si/${jitsiRoomName}?userInfo.displayName=${encodeURIComponent(userName)}`}
                      className="w-full h-full"
                      allow="camera; microphone; fullscreen; display-capture; autoplay"
                      style={{ border: 'none' }}
                    />
                    <Button
                      onClick={() => setShowJitsi(false)}
                      className="absolute top-4 right-4 bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)]"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Hide Video
                    </Button>
                  </div>
                ) : (
                  // Voice Channel Lobby
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center mb-8"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-[hsl(var(--discord-green))] flex items-center justify-center mx-auto mb-4">
                        <Volume2 className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{activeChannel.name}</h3>
                      <p className="text-[hsl(var(--discord-text-muted))]">
                        {voiceParticipants.filter(p => p.channel_id === activeChannel.id).length} participants connected
                      </p>
                    </motion.div>

                    {/* Participants Grid */}
                    <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-lg">
                      {voiceParticipants
                        .filter(p => p.channel_id === activeChannel.id)
                        .map((participant, index) => (
                          <motion.div
                            key={participant.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center"
                          >
                            <div 
                              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ring-2 ring-[hsl(var(--discord-green))] ring-offset-2 ring-offset-[hsl(var(--discord-dark))]"
                              style={{ backgroundColor: getAvatarColor(participant.participant_name) }}
                            >
                              {participant.participant_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-white mt-2">{participant.participant_name}</span>
                            {participant.participant_email === userEmail && (
                              <span className="text-[10px] text-[hsl(var(--discord-green))]">(you)</span>
                            )}
                          </motion.div>
                        ))}
                    </div>

                    {/* Voice Controls */}
                    <div className="flex gap-3">
                      {isInVoice ? (
                        <>
                          <Button
                            onClick={handleLeaveVoice}
                            className="bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)] px-6"
                          >
                            <PhoneOff className="w-4 h-4 mr-2" />
                            Disconnect
                          </Button>
                          <Button
                            onClick={handleStartVideo}
                            className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] px-6"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Start Video Call
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleJoinVoice}
                          className="bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] px-8 py-6 text-lg"
                        >
                          <Phone className="w-5 h-5 mr-2" />
                          Join Voice Channel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Text Channel
              <>
                <ScrollArea className="flex-1">
                  <div className="p-4 pb-0">
                    {/* Welcome message */}
                    {messages.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <div className="w-16 h-16 rounded-full bg-[hsl(var(--discord-light)/0.3)] flex items-center justify-center mx-auto mb-4">
                          <Hash className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Welcome to #{activeChannel?.name}!</h3>
                        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto">
                          This is the start of the #{activeChannel?.name} channel. Say hello to your fellow hackers!
                        </p>
                      </motion.div>
                    )}

                    {/* Messages */}
                    <AnimatePresence>
                      {messages.map((message, index) => {
                        const showHeader = index === 0 || 
                          messages[index - 1].sender_email !== message.sender_email ||
                          new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;
                        
                        const reactions = messageReactions[message.id] || [];
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onMouseEnter={() => setHoveredMessage(message.id)}
                            onMouseLeave={() => setHoveredMessage(null)}
                            className={`group relative ${showHeader ? 'mt-4 pt-1' : 'py-0.5'} hover:bg-[hsl(var(--discord-light)/0.05)] px-2 -mx-2 rounded`}
                          >
                            {showHeader ? (
                              <div className="flex items-start gap-4">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: getAvatarColor(message.sender_name) }}
                                >
                                  {message.sender_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-white hover:underline cursor-pointer">
                                      {message.sender_name}
                                    </span>
                                    <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">
                                      {formatTime(message.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-[hsl(var(--discord-text))] break-words leading-relaxed">
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-4">
                                <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[hsl(var(--discord-text))] break-words leading-relaxed">
                                  {message.content}
                                </p>
                              </div>
                            )}

                            {/* Reactions */}
                            {reactions.length > 0 && (
                              <div className="flex gap-1 mt-1 ml-14">
                                {reactions.map((reaction) => (
                                  <button
                                    key={reaction.emoji}
                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                      reaction.users.includes(userName)
                                        ? 'bg-[hsl(var(--discord-blurple)/0.3)] border border-[hsl(var(--discord-blurple))]'
                                        : 'bg-[hsl(var(--discord-light)/0.3)] hover:bg-[hsl(var(--discord-light)/0.5)]'
                                    }`}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="text-[hsl(var(--discord-text))]">{reaction.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Reaction Toolbar */}
                            <AnimatePresence>
                              {hoveredMessage === message.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute -top-3 right-2 flex items-center gap-0.5 bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.3)] rounded-md shadow-lg overflow-hidden"
                                >
                                  {QUICK_EMOJIS.map(({ emoji }) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(message.id, emoji)}
                                      className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors text-sm"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors">
                                        <Plus className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                      className="w-auto p-2 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))]"
                                      side="top"
                                    >
                                      <div className="grid grid-cols-8 gap-1">
                                        {EMOJI_LIST.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReaction(message.id, emoji)}
                                            className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] rounded transition-colors text-lg"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </ScrollArea>

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="px-4 py-1 text-xs text-[hsl(var(--discord-text-muted))]">
                    <span className="font-semibold">{typingUsers.join(', ')}</span> is typing...
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 bg-[hsl(var(--discord-lighter))] rounded-lg px-4 py-3">
                    {/* Emoji Picker */}
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <button className="text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-text))] transition-colors">
                          <Smile className="w-5 h-5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-3 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))]" 
                        side="top"
                        align="start"
                      >
                        <div className="grid grid-cols-8 gap-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleAddEmoji(emoji)}
                              className="p-2 hover:bg-[hsl(var(--discord-light)/0.3)] rounded transition-colors text-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={`Message #${activeChannel?.name || 'channel'}`}
                      className="flex-1 bg-transparent border-none text-white placeholder:text-[hsl(var(--discord-text-muted))] focus-visible:ring-0 h-auto py-0"
                    />
                    
                    <motion.button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-blurple))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
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
