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
  Laugh, PartyPopper, Flame, Rocket, Star, Trophy, Bell, BellOff, Lock, Check, Menu, Crown,
} from 'lucide-react';
import { getStoredAdminRole, callAdminAction } from '@/lib/adminClient';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
  emails: string[];
  names: string[];
}

interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: 'chat_action' | 'self_report';
  action_channel_name: string | null;
  action_url: string | null;
  badge_emoji: string;
  badge_label: string;
  order_index: number;
}

interface Badge {
  emoji: string;
  label: string;
}

interface StaffInfo {
  role_label: string;
  badge_emoji: string;
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
  // Shared with every other identity-aware surface in the app (Lessons,
  // Daily Challenges, the Build Studio IDE, registration) — join once
  // anywhere, and it's known everywhere, including here.
  const [userName, setUserName] = useState(() => localStorage.getItem('forge-student-name') || '');
  const [userEmail, setUserEmail] = useState(() => (localStorage.getItem('forge-student-email') || '').trim().toLowerCase());
  const [isJoined, setIsJoined] = useState(() => !!(localStorage.getItem('forge-student-name') && localStorage.getItem('forge-student-email')));
  const [isInVoice, setIsInVoice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showJitsi, setShowJitsi] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showQuests, setShowQuests] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set());
  const [badgesByEmail, setBadgesByEmail] = useState<Record<string, Badge[]>>({});
  const [staffByEmail, setStaffByEmail] = useState<Record<string, StaffInfo>>({});
  // Remembered per browser tab, same pattern as the admin passphrase
  // elsewhere in this app — type it once per session, not every time the
  // chat modal is reopened.
  const [staffPin, setStaffPinState] = useState(() => sessionStorage.getItem('forge-staff-pin') || '');
  const setStaffPin = (value: string) => {
    setStaffPinState(value);
    if (value) sessionStorage.setItem('forge-staff-pin', value);
    else sessionStorage.removeItem('forge-staff-pin');
  };
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSentRef = useRef(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const isOrganizer = getStoredAdminRole() === 'organizer';
  const isStaffEmail = !!staffByEmail[userEmail];
  const { subscribe: subscribeToPush, isSubscribing: isSubscribingPush, isSubscribed: isSubscribedPush, isSupported: isPushSupported } = usePushNotifications();

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
      fetchQuestsAndBadges();
      fetchStaffList();
    }
  }, [isOpen]);

  const fetchStaffList = async () => {
    const { data } = await supabase.from('community_staff').select('participant_email, role_label, badge_emoji');
    if (data) {
      const map: Record<string, StaffInfo> = {};
      (data as any[]).forEach((row) => { map[row.participant_email] = { role_label: row.role_label, badge_emoji: row.badge_emoji }; });
      setStaffByEmail(map);
    }
  };

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
        // No channel_id column on reactions, so this subscribes globally —
        // but skip the refetch entirely unless the change actually touches a
        // message that's currently loaded, instead of re-querying on every
        // reaction anywhere in the app regardless of channel.
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'community_message_reactions' },
          (payload) => {
            const touchedId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
            if (touchedId && messagesRef.current.some(m => m.id === touchedId)) {
              fetchReactionsForMessages(messagesRef.current.map(m => m.id));
            }
          }
        )
        .subscribe();

      // Ephemeral typing indicator — Realtime broadcast, not persisted to any table.
      const typingChannel = supabase
        .channel(`typing-${activeChannel.id}`)
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (!payload?.email || payload.email === userEmail) return;
          setTypingUsers(prev => (prev.includes(payload.name) ? prev : [...prev, payload.name]));
          if (typingTimeoutsRef.current[payload.email]) clearTimeout(typingTimeoutsRef.current[payload.email]);
          typingTimeoutsRef.current[payload.email] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(n => n !== payload.name));
          }, 3000);
        })
        .subscribe();
      typingChannelRef.current = typingChannel;
      setTypingUsers([]);

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(typingChannel);
        typingChannelRef.current = null;
        Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
        typingTimeoutsRef.current = {};
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

  const fetchQuestsAndBadges = async (emailOverride?: string) => {
    const email = emailOverride ?? userEmail;
    const [{ data: questRows }, { data: completionRows }] = await Promise.all([
      supabase.from('community_quests').select('*').eq('is_active', true).order('order_index'),
      supabase.from('community_quest_completions').select('participant_email, quest_id, community_quests(badge_emoji, badge_label)'),
    ]);

    if (questRows) setQuests(questRows as unknown as Quest[]);

    if (completionRows) {
      const badgeMap: Record<string, Badge[]> = {};
      const mine = new Set<string>();
      (completionRows as any[]).forEach((row) => {
        const badge = row.community_quests;
        if (badge) {
          (badgeMap[row.participant_email] ||= []).push({ emoji: badge.badge_emoji, label: badge.badge_label });
        }
        if (email && row.participant_email === email) mine.add(row.quest_id);
      });
      setBadgesByEmail(badgeMap);
      setCompletedQuestIds(mine);
    }
  };

  const handleClaimQuest = async (quest: Quest) => {
    if (!userEmail.trim() || !userName.trim()) {
      toast({ title: 'Join first', description: 'Enter your name and email to claim quests.', variant: 'destructive' });
      return;
    }
    setClaimingQuestId(quest.id);
    try {
      const { data, error } = await supabase.rpc('claim_community_quest', {
        p_participant_email: userEmail,
        p_participant_name: userName,
        p_quest_id: quest.id,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.ok) {
        toast({ title: `${result.badge_emoji || '🏅'} ${result.message}`, description: result.badge_label ? `You earned the "${result.badge_label}" badge!` : undefined });
        await fetchQuestsAndBadges();
      } else {
        toast({ title: 'Not yet', description: result?.message || 'Could not claim this quest.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to claim quest.', variant: 'destructive' });
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleToggleNotifications = async () => {
    if (!userEmail.trim()) {
      toast({ title: 'Join first', description: 'Enter your email to turn on notifications.', variant: 'destructive' });
      return;
    }
    const ok = await subscribeToPush({ participantEmail: userEmail, topics: ['community'] });
    if (ok) {
      toast({ title: '🔔 Notifications on', description: "We'll ping you when something new drops in the community." });
    } else {
      toast({ title: 'Could not enable notifications', description: 'Check your browser permission settings and try again.', variant: 'destructive' });
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
      const rows = data as unknown as Message[];
      setMessages(rows);
      fetchReactionsForMessages(rows.map(m => m.id));
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
    // Normalize now — everything downstream (messages, reactions, quest
    // claims, staff badge lookup) keys off this exact string. Untrimmed
    // whitespace or inconsistent casing would silently break badge matching.
    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanName = userName.trim();
    setUserName(cleanName);
    setUserEmail(cleanEmail);
    localStorage.setItem('forge-student-name', cleanName);
    localStorage.setItem('forge-student-email', cleanEmail);
    setIsJoined(true);
    fetchQuestsAndBadges(cleanEmail);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || isSending) return;

    if (activeChannel.channel_type === 'announcement') {
      if (!isOrganizer) {
        toast({ title: 'Locked', description: 'Only FORGE organizers can post announcements.', variant: 'destructive' });
        return;
      }
      setIsPostingAnnouncement(true);
      try {
        await callAdminAction('post_community_announcement', {
          channel_name: activeChannel.name,
          sender_name: userName || 'FORGE Team',
          content: newMessage.trim(),
        });
        setNewMessage('');
        fetchMessages(activeChannel.id);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to post announcement.', variant: 'destructive' });
      } finally {
        setIsPostingAnnouncement(false);
      }
      return;
    }

    if (isStaffEmail) {
      if (!staffPin.trim()) {
        toast({ title: 'Staff PIN required', description: 'Enter your staff PIN below to chat with your badge.', variant: 'destructive' });
        return;
      }
      setIsSending(true);
      const { data, error } = await supabase.rpc('send_staff_message', {
        p_participant_email: userEmail,
        p_pin: staffPin,
        p_channel_id: activeChannel.id,
        p_content: newMessage.trim(),
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast({ title: 'Could not send', description: result?.message || error?.message || 'Failed to verify staff PIN.', variant: 'destructive' });
        setStaffPin(''); // wrong PIN — force re-entry rather than silently retrying
      } else {
        setNewMessage('');
      }
      setIsSending(false);
      return;
    }

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

  const handleTypingBroadcast = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return; // throttle
    lastTypingSentRef.current = now;
    typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { name: userName, email: userEmail } });
  };

  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const fetchReactionsForMessages = async (messageIds: string[]) => {
    if (messageIds.length === 0) { setMessageReactions({}); return; }
    const { data, error } = await supabase
      .from('community_message_reactions')
      .select('message_id, emoji, participant_email, participant_name')
      .in('message_id', messageIds);
    if (error || !data) return;
    const grouped: Record<string, MessageReaction[]> = {};
    (data as any[]).forEach((r) => {
      const arr = (grouped[r.message_id] ||= []);
      const existing = arr.find(x => x.emoji === r.emoji);
      if (existing) {
        existing.count++;
        existing.emails.push(r.participant_email);
        existing.names.push(r.participant_name);
      } else {
        arr.push({ emoji: r.emoji, count: 1, emails: [r.participant_email], names: [r.participant_name] });
      }
    });
    setMessageReactions(grouped);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const existing = (messageReactions[messageId] || []).find(r => r.emoji === emoji);
    const alreadyReacted = existing?.emails.includes(userEmail);

    if (alreadyReacted) {
      await supabase
        .from('community_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji)
        .eq('participant_email', userEmail);
    } else {
      await supabase
        .from('community_message_reactions')
        .insert({ message_id: messageId, emoji, participant_email: userEmail, participant_name: userName });
    }
    // Realtime subscription (below) will also refresh this, but update now for snappy feedback.
    fetchReactionsForMessages(messages.map(m => m.id));
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
      <DialogContent hideCloseButton aria-describedby={undefined} className="w-[95vw] max-w-[95vw] h-[90vh] sm:max-w-[1000px] sm:h-[85vh] p-0 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white overflow-hidden">
        <div className="flex h-full relative">
          {/* Mobile sidebar backdrop */}
          {mobileSidebarOpen && (
            <div className="md:hidden absolute inset-0 z-30 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          )}

          {/* Channels Sidebar */}
          <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex w-64 flex-shrink-0 absolute md:relative inset-y-0 left-0 z-40 md:z-auto bg-[hsl(var(--discord-darker))] flex-col border-r border-[hsl(var(--discord-light)/0.15)]`}>
            {/* Server Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-darker))] hover:bg-[hsl(var(--discord-light)/0.1)] transition-colors cursor-pointer">
              <h3 className="font-bold text-white truncate">Hackathon Hub</h3>
              <div className="flex items-center gap-1">
                <ChevronDown className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
                <button onClick={() => setMobileSidebarOpen(false)} className="md:hidden text-[hsl(var(--discord-text-muted))] hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                        onClick={() => { setActiveChannel(channel); setMobileSidebarOpen(false); }}
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
                          onClick={() => { setActiveChannel(channel); setMobileSidebarOpen(false); }}
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
                          onClick={() => { setActiveChannel(channel); setMobileSidebarOpen(false); }}
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
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Quests Panel */}
            <AnimatePresence>
              {showQuests && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'tween', duration: 0.2 }}
                  className="absolute top-0 right-0 bottom-0 w-80 max-w-full z-20 bg-[hsl(var(--discord-darker))] border-l border-[hsl(var(--discord-light)/0.2)] flex flex-col shadow-2xl"
                >
                  <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
                      <span className="font-bold text-white">Community Quests</span>
                    </div>
                    <button onClick={() => setShowQuests(false)} className="text-[hsl(var(--discord-text-muted))] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {quests.length === 0 && (
                        <p className="text-xs text-[hsl(var(--discord-text-muted))] text-center py-8">No quests available right now.</p>
                      )}
                      {quests.map((quest) => {
                        const done = completedQuestIds.has(quest.id);
                        return (
                          <div key={quest.id} className={`rounded-lg p-3 border ${done ? 'bg-[hsl(var(--discord-green)/0.1)] border-[hsl(var(--discord-green)/0.3)]' : 'bg-[hsl(var(--discord-light)/0.08)] border-[hsl(var(--discord-light)/0.2)]'}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-xl leading-none">{quest.badge_emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{quest.title}</p>
                                <p className="text-[11px] text-[hsl(var(--discord-text-muted))] mt-0.5">{quest.description}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {done ? (
                                <span className="text-[11px] font-bold text-[hsl(var(--discord-green))] flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> {quest.badge_label} earned
                                </span>
                              ) : (
                                <>
                                  {quest.quest_type === 'self_report' && quest.action_url && (
                                    <a href={quest.action_url} target="_blank" rel="noreferrer"
                                      className="text-[11px] text-[hsl(var(--discord-blurple))] hover:underline">
                                      Open link →
                                    </a>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleClaimQuest(quest)}
                                    disabled={claimingQuestId === quest.id}
                                    className="h-7 text-[11px] ml-auto"
                                  >
                                    {claimingQuestId === quest.id ? 'Checking...' : quest.quest_type === 'chat_action' ? "I've done this" : "I did this!"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Channel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-dark))]">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setMobileSidebarOpen(true); setShowQuests(false); }} className="md:hidden text-[hsl(var(--discord-text-muted))] hover:text-white flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </button>
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
                {isPushSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleNotifications}
                    disabled={isSubscribingPush || isSubscribedPush}
                    title={isSubscribedPush ? "Notifications on" : "Get notified about community activity"}
                    className={`${isSubscribedPush ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white`}
                  >
                    {isSubscribedPush ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => { setShowQuests(s => !s); setMobileSidebarOpen(false); }}
                  className={`${showQuests ? 'text-[hsl(var(--discord-yellow))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white gap-1.5 px-2.5`}
                >
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Quests</span>
                </Button>
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
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${staffByEmail[message.sender_email] ? 'ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[hsl(var(--discord-dark))]' : ''}`}
                                  style={{ backgroundColor: getAvatarColor(message.sender_name) }}
                                >
                                  {message.sender_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-white hover:underline cursor-pointer">
                                      {message.sender_name}
                                    </span>
                                    {staffByEmail[message.sender_email] && (
                                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700]/25 to-[#F7941D]/25 text-[#FFD700] border border-[#FFD700]/40 flex items-center gap-1">
                                        {staffByEmail[message.sender_email].badge_emoji} {staffByEmail[message.sender_email].role_label}
                                      </span>
                                    )}
                                    {(badgesByEmail[message.sender_email] || []).map((badge, bi) => (
                                      <span key={bi} title={badge.label} className="text-xs">{badge.emoji}</span>
                                    ))}
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
                                    title={reaction.names.join(', ')}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                      reaction.emails.includes(userEmail)
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
                  {activeChannel?.channel_type === 'announcement' && !isOrganizer ? (
                    <div className="flex items-center gap-2 bg-[hsl(var(--discord-lighter))] rounded-lg px-4 py-3 text-[hsl(var(--discord-text-muted))]">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Only FORGE organizers can post in #{activeChannel.name}</span>
                    </div>
                  ) : (
                  <div className="space-y-2">
                  {isStaffEmail && activeChannel?.channel_type !== 'announcement' && (
                    <div className="flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg px-3 py-2">
                      <Crown className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                      <Input
                        type="password"
                        value={staffPin}
                        onChange={(e) => setStaffPin(e.target.value)}
                        placeholder="Enter your staff PIN to chat with your badge"
                        className="flex-1 h-8 bg-transparent border-none text-white placeholder:text-[hsl(var(--discord-text-muted))] focus-visible:ring-0 text-sm"
                      />
                    </div>
                  )}
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
                      onChange={(e) => { setNewMessage(e.target.value); handleTypingBroadcast(); }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={activeChannel?.channel_type === 'announcement' ? 'Post an announcement...' : `Message #${activeChannel?.name || 'channel'}`}
                      className="flex-1 bg-transparent border-none text-white placeholder:text-[hsl(var(--discord-text-muted))] focus-visible:ring-0 h-auto py-0"
                    />

                    <motion.button
                      onClick={handleSendMessage}
                      disabled={isSending || isPostingAnnouncement || !newMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-blurple))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </div>
                  </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
