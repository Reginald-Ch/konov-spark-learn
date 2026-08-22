import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Hash, Volume2, Megaphone, Send, Users, Circle,
  Phone, PhoneOff, X, Smile, MessageSquare,
  Settings, Plus, Heart, ThumbsUp,
  Laugh, PartyPopper, Flame, Rocket, Trophy, Bell, BellOff, Lock, Check, Menu, Crown, Loader2, SmilePlus,
  Pencil, Trash2, Pin, PinOff, VolumeX, ShieldAlert, AlertTriangle,
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
  edited_at: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
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
  quest_type: 'chat_action' | 'self_report' | 'proof_upload';
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
  display_name: string;
  role_label: string;
  badge_emoji: string;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '🚀', '⭐', '✨', '👏', '💯', '🤔', '😍', '🙌', '💪', '🎯', '💡'];

// `.charAt(0)` indexes UTF-16 code units, not codepoints — a display name
// starting with an emoji (e.g. "🚀Nova", a surrogate pair) yields half a
// surrogate pair, rendering as a broken glyph in the fallback avatar
// circle instead of the emoji or a real first letter. Array.from splits by
// codepoint, matching the same fix already applied to the Python
// interpreter's len()/indexing this session.
const firstChar = (s: string): string => Array.from(s || '')[0] || '';

// Matches send_community_message's own server-side check ("Messages can't
// be longer than 4000 characters") — see supabase/migrations/
// 20260818050000_community_chat_round2_fixes.sql. Keep in sync if that
// ever changes.
const MAX_MESSAGE_LENGTH = 4000;

// One combined pass over the raw text — mentions, links, and basic
// markdown all used to render as inert plain text (a pasted URL wasn't
// even clickable). Named capture groups let a single regex own the whole
// tokenization so nothing double-processes another token's output; every
// branch renders as a real React element, never dangerouslySetInnerHTML.
// Hoisted to module scope (was re-declared inside the component body on
// every render) — safe with String.prototype.matchAll specifically (used
// below), which takes its own internal copy of a global regex rather than
// mutating this shared object's lastIndex across calls.
const MESSAGE_TOKEN_RE = /@\[(?<mentionName>[^\]]+)\]\((?<mentionEmail>[^)]+)\)|(?<url>https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|\*\*(?<bold>[^*\n]+)\*\*|`(?<code>[^`\n]+)`|\*(?<italic>[^*\n]+)\*/g;

const QUICK_EMOJIS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '❤️', icon: Heart },
  { emoji: '😂', icon: Laugh },
  { emoji: '🎉', icon: PartyPopper },
  { emoji: '🔥', icon: Flame },
  { emoji: '🚀', icon: Rocket },
];

// Preset cartoon avatars via DiceBear's public SVG endpoint — no file
// upload, no storage infra (same category of external embed this app
// already relies on for Lesson videos, just images instead of iframes).
// Each option is a short seed string, not literal image data — the actual
// artwork is generated deterministically from the seed, so this list only
// needs to stay stable, not store any real asset. profileAvatarUrl() is the
// only place that knows the URL format, so switching styles/providers later
// is a one-line change.
const PROFILE_AVATAR_OPTIONS = ['nova', 'pixel', 'comet', 'byte', 'flux', 'echo', 'zephyr', 'quark', 'ember', 'glitch', 'turbo', 'sprint', 'nebula', 'cipher', 'volt', 'atlas', 'orbit', 'spark', 'vector', 'crimson', 'lumen', 'drift', 'nimbus', 'quasar'];
const profileAvatarUrl = (seed: string, size = 64) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundType=gradientLinear`;

interface CommunityChatProps {
  // Set from a `?staff_invite=<token>` URL param by the Hackathons page
  // (which owns the access gate + tab state, both of which live above where
  // this component mounts). Redeeming it verifies this browser as the
  // matching staff account, permanently — see the effect below.
  pendingStaffInviteToken?: string | null;
  onInviteConsumed?: () => void;
}

export const CommunityChat = ({ pendingStaffInviteToken, onInviteConsumed }: CommunityChatProps = {}) => {
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
  // Profile (username + emoji avatar) is layered on top of name/email, not a
  // replacement — email stays the real identity everything else is keyed
  // by. `profileChecked` distinguishes "still finding out if they have one"
  // from "confirmed they don't", so a fresh join doesn't flash the profile
  // setup step for someone who already has one, and a returning participant
  // isn't asked to redo it every visit.
  const [userUsername, setUserUsername] = useState(() => localStorage.getItem('forge-student-username') || '');
  const [userAvatarEmoji, setUserAvatarEmoji] = useState(() => localStorage.getItem('forge-student-avatar') || '');
  const [profileChecked, setProfileChecked] = useState(() => !!(localStorage.getItem('forge-student-username') && localStorage.getItem('forge-student-avatar')));
  const [profileByEmail, setProfileByEmail] = useState<Record<string, { username: string; avatar_emoji: string }>>({});
  const [isInVoice, setIsInVoice] = useState(false);
  // Kept in sync with state via the effect below so the unmount cleanup can
  // read the CURRENT values — a plain closure captured at mount time would
  // see stale (false/null) values no matter when the user actually left.
  const voicePresenceRef = useRef<{ inVoice: boolean; channelId: string | null; email: string }>({ inVoice: false, channelId: null, email: '' });
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  // "Join Voice Channel" used to just insert a presence row with no actual
  // audio connection — you and everyone else showed up as "connected" while
  // nobody could hear anybody until someone separately clicked a second,
  // easy-to-miss "Start Video Call" button. Real mute/camera controls also
  // never existed — the old header buttons just flipped a local icon color
  // with zero connection to the call. Fixed by embedding Jitsi via its real
  // External API: joining connects real audio immediately (video starts
  // muted, toggleable from Jitsi's own native in-call toolbar, which has
  // always been fully functional — our old buttons were redundant AND fake).
  const jitsiApiRef = useRef<any>(null);
  // Lets disposeJitsi cancel a still-pending 45s connect timeout when the
  // user manually disconnects mid-connection — without this, clicking
  // Disconnect while still "Connecting…" tore down the call cleanly, but
  // the timeout fired anyway up to 45s later: a misleading "Could not
  // connect" toast plus a redundant leave_voice_room call, potentially
  // after the user had already joined a different voice channel.
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  // DiceBear (api.dicebear.com) is a third-party CDN that a school network
  // can block, or that can simply be down — none of the profileAvatarUrl()
  // <img> tags had an onError handler, so a failed load showed a plain
  // broken-image icon in the round avatar slot instead of falling back to
  // the initial-letter circle already used for participants with no
  // profile at all. Tracked by seed (not per-message) since the same seed
  // failing once means it'll fail everywhere it's used.
  const [failedAvatarSeeds, setFailedAvatarSeeds] = useState<Set<string>>(new Set());
  const markAvatarSeedFailed = (seed: string) => setFailedAvatarSeeds(prev => prev.has(seed) ? prev : new Set(prev).add(seed));
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showQuests, setShowQuests] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  // The messages list and the admin quest tab both got a real 3-way
  // loading/error/empty distinction; this panel never did — it only ever
  // checked quests.length === 0, so a panel opened before the first fetch
  // resolves (or one whose fetch genuinely failed) showed the identical
  // "No quests available right now" a hackathon with zero quests would.
  const [questsLoading, setQuestsLoading] = useState(true);
  const [questsError, setQuestsError] = useState(false);
  // Replaced the old plain Set<questId> — proof_upload quests need a
  // richer per-quest state than a binary "done or not" (pending awaiting
  // review, approved, or rejected-with-a-reason-to-show), and chat_action/
  // self_report quests just always land as 'approved' immediately, so this
  // is a strict superset of what the old Set tracked.
  const [myQuestStatus, setMyQuestStatus] = useState<Record<string, { status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null }>>({});
  // Hidden file input shared by every proof_upload quest card — which
  // quest the next file selection is FOR is tracked separately rather than
  // one input per card, since only one upload can be in flight at a time
  // anyway.
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const [proofUploadQuestId, setProofUploadQuestId] = useState<string | null>(null);
  const [badgesByEmail, setBadgesByEmail] = useState<Record<string, Badge[]>>({});
  const [staffByEmail, setStaffByEmail] = useState<Record<string, StaffInfo>>({});
  // Bearer token from redeeming a one-time staff invite link — kept in
  // localStorage (not sessionStorage) so verification persists on this
  // browser indefinitely, not just for the current tab session.
  const [staffToken, setStaffTokenState] = useState(() => localStorage.getItem('forge-staff-token') || '');
  const setStaffToken = (value: string) => {
    setStaffTokenState(value);
    if (value) localStorage.setItem('forge-staff-token', value);
    else localStorage.removeItem('forge-staff-token');
  };
  // Trust-on-first-use device token for REGULAR (non-staff) messages —
  // same idea as staffToken above, minted server-side by
  // send_community_message the first time this email ever sends, then
  // required on every send after that. Closes the sender-email-spoofing
  // hole a plain insert-as-yourself policy could never actually enforce.
  const [deviceToken, setDeviceTokenState] = useState(() => localStorage.getItem('forge-device-token') || '');
  const setDeviceToken = (value: string) => {
    setDeviceTokenState(value);
    if (value) localStorage.setItem('forge-device-token', value);
    else localStorage.removeItem('forge-device-token');
  };
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSentRef = useRef(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  // Covers the brief network round-trip while a staff invite link is being
  // redeemed, so a first-time visitor sees "Verifying…" instead of a flash
  // of the empty join form before their identity auto-fills.
  const [isRedeemingInvite, setIsRedeemingInvite] = useState(() => !!pendingStaffInviteToken);

  // Editing/deleting a sent message — previously absent entirely.
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // Pagination — only the newest PAGE_SIZE messages ever loaded, with no
  // way to see anything older. hasMoreMessages/oldestLoadedAt drive a
  // "Load earlier messages" affordance at the top of the list.
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // Without these, a channel that's still loading its first page and a
  // channel whose fetch just failed both rendered the identical "Welcome
  // to #channel! Say hello..." empty state as a genuinely new channel —
  // once the failure toast faded, a channel that actually had history
  // looked like an inviting blank slate instead of a broken load.
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesLoadError, setMessagesLoadError] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  // Channel creation — the sidebar's "+" buttons used to be pure decoration
  // with no backing feature at all (there was no way to create a channel
  // anywhere in the app). Organizer-only, via a real admin action.
  const [createChannelType, setCreateChannelType] = useState<'text' | 'voice' | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // @mention autocomplete — typing "@" used to just be a literal character;
  // there was no way to address someone specifically in a busy channel.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

  // Moderation — previously an organizer could only delete THEIR OWN
  // messages (same as any regular participant) and had no way to stop a
  // disruptive participant from continuing to post.
  const [deletingAnyMessageId, setDeletingAnyMessageId] = useState<string | null>(null);
  const [mutingMessage, setMutingMessage] = useState<Message | null>(null);
  const [muteMinutes, setMuteMinutes] = useState('30');
  const [muteReason, setMuteReason] = useState('');
  const [isMuting, setIsMuting] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  // The organizer's free-text reason (community_muted_users.reason) used
  // to be captured and then discarded — get_my_mute_status only ever
  // returned muted_until, so a moderated teen saw a countdown with no
  // explanation of why. Same lifecycle as mutedUntil (cleared together,
  // re-fetched together).
  const [mutedReason, setMutedReason] = useState<string | null>(null);

  // Muted-users roster — mute_community_user existed with no way to see
  // who's currently muted or lift it early; an organizer had to wait out
  // the timer or mute someone with 1 minute left as a workaround.
  const [mutedUsersDialogOpen, setMutedUsersDialogOpen] = useState(false);
  const [mutedUsersList, setMutedUsersList] = useState<{ participant_email: string; muted_until: string; reason: string | null }[]>([]);
  const [loadingMutedUsers, setLoadingMutedUsers] = useState(false);
  const [unmutingEmail, setUnmutingEmail] = useState<string | null>(null);

  // Pinned messages — organizers could only "pin" something by posting to
  // the separate #announcements channel; nothing could be pinned in place.
  // Fetched independently of the regular paginated message list (not
  // derived from `messages`) since a pinned message can be far outside
  // whatever page happens to be currently loaded.
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  // Mirrors profileByEmail for the same reason messagesRef exists — the
  // realtime INSERT handler below is registered once per [activeChannel]
  // effect run and closes over whatever profileByEmail was at that moment
  // (usually {} right after switching channels), so every single incoming
  // message re-queried a profile that was actually already cached by the
  // time it arrived. Reading the ref instead of the closed-over state fixes
  // that without adding activeChannel-effect churn every time a profile loads.
  const profileByEmailRef = useRef(profileByEmail);
  useEffect(() => { profileByEmailRef.current = profileByEmail; }, [profileByEmail]);

  // Same stale-closure class as profileByEmailRef, two more instances:
  // (1) fetchMessages/loadOlderMessages/fetchPinnedMessages all capture
  // whichever channelId they were called with, but nothing stopped a
  // slower in-flight fetch from a
  // channel the user has since switched away from landing its result
  // (via setMessages/setPinnedMessages/etc.) under the NEW channel's
  // header after the fact — rapid A→B switching, or clicking "Load
  // earlier" then immediately switching channels, could show channel A's
  // messages/pagination state under channel B's name. Checked before
  // every relevant setState below. (2) the realtime message-subscription
  // effect (deps: [activeChannel] only) closes over userEmail at
  // registration time — after a "Switch identity" (which doesn't remount
  // this component), the self-scroll and typing-indicator self-filter
  // both compared against the PREVIOUS person's email.
  const activeChannelIdRef = useRef<string | null>(null);
  useEffect(() => { activeChannelIdRef.current = activeChannel?.id ?? null; }, [activeChannel]);
  const userEmailRef = useRef(userEmail);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  useEffect(() => {
    voicePresenceRef.current = { inVoice: isInVoice, channelId: activeChannel?.id ?? null, email: userEmail };
  }, [isInVoice, activeChannel, userEmail]);

  // Voice presence had no cleanup at all — switching to another tab (Build,
  // Learn, etc. all unmount this component since Community is a full page
  // now, not a modal that stays mounted in the background) or closing the
  // browser tab left a phantom voice_room_participants row forever, showing
  // that person as permanently "in voice" to everyone else.
  useEffect(() => {
    const leaveVoiceBeacon = () => {
      // Also covers switching away from Community entirely (unmounting this
      // component) — without this, a live Jitsi connection kept running
      // detached from any visible UI, and the browser tab/mic stayed "in
      // use" from Jitsi's perspective even though nothing on screen showed it.
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch { /* already gone */ }
        jitsiApiRef.current = null;
      }
      const { inVoice, channelId, email } = voicePresenceRef.current;
      if (!inVoice || !channelId || !email) return;
      // fire-and-forget — component is unmounting/page is closing, nothing
      // to await. Supabase's rpc call still issues a real HTTP request.
      // Reads localStorage directly rather than a ref — this closure is
      // created once per effect run, so a ref would need its own
      // keep-in-sync effect just to avoid going stale the same way
      // voicePresenceRef's own doc comment already warns about.
      const token = localStorage.getItem('forge-device-token') || null;
      // Raw fetch with keepalive, not supabase.rpc() — browsers commonly
      // abort in-flight non-keepalive requests once beforeunload returns
      // and the page starts tearing down, so on an actual tab close (as
      // opposed to switching tabs within the SPA, which keeps the JS
      // runtime alive) the RPC call above was frequently never delivered,
      // leaving exactly the phantom "still in voice" row this effect
      // exists to prevent. keepalive is the standard mechanism for
      // requests that must survive page unload, unlike sendBeacon which
      // can't carry the apikey/Authorization headers PostgREST requires.
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/leave_voice_room`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ p_channel_id: channelId, p_participant_email: email, p_device_token: token }),
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', leaveVoiceBeacon);
    return () => {
      window.removeEventListener('beforeunload', leaveVoiceBeacon);
      leaveVoiceBeacon();
    };
  }, []);

  const isOrganizer = getStoredAdminRole() === 'organizer';
  const isStaffEmail = !!staffByEmail[userEmail];
  const { subscribe: subscribeToPush, unsubscribe: unsubscribeFromPush, isSubscribing: isSubscribingPush, isSubscribed: isSubscribedPush, isSupported: isPushSupported } = usePushNotifications();


  useEffect(() => {
    fetchChannels();
    fetchQuestsAndBadges();
    fetchStaffList();
  }, []);

  // Voice presence used to only ever be fetched/subscribed for whichever
  // channel was currently ACTIVE (see the old per-channel branch this
  // replaced, further down) — the sidebar's per-voice-channel participant
  // badge and the lobby list both already filter this same shared
  // `voiceParticipants` array by channel_id, but the array itself only
  // ever held ONE channel's rows at a time, reset to empty on every
  // switch. Viewing any text channel showed every voice channel as 0
  // participants regardless of who was actually in them, and being in
  // Voice Room A meant joins/leaves in Voice Room B never appeared
  // anywhere until you clicked into B. One global, unfiltered fetch +
  // subscription for the whole session fixes this without needing a
  // separate subscription per voice channel.
  useEffect(() => {
    fetchAllVoiceParticipants();
    const globalVoiceChannel = supabase
      .channel('voice-participants-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_room_participants' }, () => {
        fetchAllVoiceParticipants();
      })
      .subscribe();
    return () => { supabase.removeChannel(globalVoiceChannel); };
  }, []);

  // fetchQuestsAndBadges was only ever re-run on mount, on join/identity-set,
  // and after your OWN successful claim — no realtime subscription. Another
  // participant earning a badge mid-session never appeared next to their
  // messages (badgesByEmail) until your own next fetch trigger, effectively
  // a reload. This data is already public (see fetchQuestsAndBadges' own
  // comments), so one broad subscription refetching on any completion is a
  // simple, safe fix — badge/quest data is small and this app is
  // hackathon-scale, not high-frequency.
  // Also covers community_quests itself (INSERT/UPDATE), not just
  // completions — a quest being deactivated or edited used to leave a
  // participant's already-open Quests panel showing stale content until
  // something else (anyone completing any quest, or their own next claim)
  // happened to trigger a refetch. Attempting to claim a since-deactivated
  // quest was already handled gracefully server-side either way (a clean
  // "not available right now" rejection, never a false success) — this
  // closes the display-staleness gap on top of that.
  useEffect(() => {
    const questChannel = supabase
      .channel('quest-completions-global')
      // '*', not just INSERT — proof_upload completions land as 'pending'
      // (an INSERT) but only ever become visibly earned via an organizer's
      // approve_quest_proof, which is an UPDATE on this same row. INSERT-only
      // meant a participant sitting on the Quests panel after submitting a
      // screenshot never found out it was approved/rejected without an
      // unrelated action happening to trigger a refetch first.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_quest_completions' }, () => {
        fetchQuestsAndBadges(userEmailRef.current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_quests' }, () => {
        fetchQuestsAndBadges(userEmailRef.current);
      })
      .subscribe();
    return () => { supabase.removeChannel(questChannel); };
  }, []);

  // community_channels and community_staff were both fetch-once-on-mount
  // with no realtime subscription at all — an organizer creating a channel
  // (handleCreateChannel already refetches, but only for the creator) or
  // adding/removing someone from staff was invisible to every OTHER
  // already-open tab until a manual reload. Both tables are small and
  // low-frequency (organizer actions, not participant chat volume), so one
  // broad refetch-on-any-change subscription each is a simple, safe fix —
  // same reasoning as the quest subscription above.
  useEffect(() => {
    const channelsChannel = supabase
      .channel('community-channels-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_channels' }, () => {
        fetchChannels();
      })
      .subscribe();
    const staffChannel = supabase
      .channel('community-staff-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_staff' }, () => {
        fetchStaffList();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(staffChannel);
    };
  }, []);

  // Enforcement is server-side (RLS blocks the insert regardless), but
  // without this the only feedback a muted person got was a cryptic
  // generic "Failed to send message" after typing the whole thing out.
  useEffect(() => {
    if (!isJoined || !userEmail) return;
    // Routed through an RPC, not a direct select — community_muted_users
    // had a wide-open SELECT policy, so anyone with the anon key could
    // dump the whole table (who's muted, until when, the organizer's
    // free-text reason) even though this only ever needed the caller's
    // own row. That same access change means Realtime can no longer push
    // changes to this table to an anon client either (same as
    // ParticipantStatsPanel's reward_boxes) — so this used to only fetch
    // once per identity, meaning an organizer muting someone mid-session
    // never updated their composer (they'd type a full message and hit
    // the generic server rejection instead of the clear pre-check
    // message), and unmuting left them stuck showing "Muted until..."
    // until a full page reload despite actually being clear. Polling on a
    // light interval instead, matching that same established pattern.
    const checkMuteStatus = async () => {
      // Reads localStorage directly, not the deviceToken state closure —
      // this effect's deps don't include deviceToken, so a token minted
      // AFTER this polling interval was set up would otherwise never be
      // picked up. Also required now: get_my_mute_status used to take no
      // proof of identity at all, letting anyone read anyone's mute status
      // and the organizer's private reason just by passing their email —
      // now verified server-side against this same token.
      const token = localStorage.getItem('forge-device-token') || null;
      const { data, error } = await supabase.rpc('get_my_mute_status', { p_participant_email: userEmail, p_device_token: token });
      if (error) {
        // Don't treat a failed check as "not muted" — that would silently
        // clear a real mute's countdown/reason from the UI while the
        // server-side block (which doesn't depend on this call) stays in
        // effect, leaving someone confused about why sends still fail.
        // Just skip this poll and keep whatever state we last knew.
        console.error('get_my_mute_status failed:', error.message);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const stillMuted = row?.muted_until && new Date(row.muted_until) > new Date();
      setMutedUntil(stillMuted ? row.muted_until : null);
      setMutedReason(stillMuted ? (row.reason || null) : null);
    };
    checkMuteStatus();
    const pollId = setInterval(checkMuteStatus, 20000);
    return () => clearInterval(pollId);
  }, [isJoined, userEmail]);

  // Confirms server-side whether this email already has a profile — covers
  // returning on a browser that lost localStorage, or having set one from a
  // different device. Only runs once we don't already believe we have one.
  useEffect(() => {
    if (!isJoined || !userEmail || profileChecked) return;
    (async () => {
      const { data } = await supabase
        .from('participant_profiles')
        .select('username, avatar_emoji')
        .eq('participant_email', userEmail)
        .maybeSingle();
      if (data) {
        setUserUsername(data.username);
        setUserAvatarEmoji(data.avatar_emoji);
        localStorage.setItem('forge-student-username', data.username);
        localStorage.setItem('forge-student-avatar', data.avatar_emoji);
      }
      setProfileChecked(true);
    })();
  }, [isJoined, userEmail, profileChecked]);

  // Real presence, replacing what used to be a fake "voice participants + 1"
  // stand-in for "online" — that number had nothing to do with who was
  // actually viewing the page, just who happened to be in a voice call.
  useEffect(() => {
    if (!isJoined || !userEmail) return;
    const presenceChannel = supabase.channel('community-presence', { config: { presence: { key: userEmail } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(presenceChannel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ name: userName, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [isJoined, userEmail, userName]);

  const fetchStaffList = async () => {
    const { data, error } = await supabase.from('community_staff').select('participant_email, display_name, role_label, badge_emoji');
    if (data) {
      const map: Record<string, StaffInfo> = {};
      (data as any[]).forEach((row) => { map[row.participant_email] = { display_name: row.display_name, role_label: row.role_label, badge_emoji: row.badge_emoji }; });
      setStaffByEmail(map);
    } else if (error) {
      // Silently leaving staffByEmail empty on failure isn't harmless here —
      // isStaffEmail (below) would read false for a real staff member,
      // routing their send through send_community_message instead of
      // send_staff_message, which the DB hard-rejects with a confusing
      // "this email belongs to a staff account" error despite them holding
      // a valid staffToken. Loud enough to debug, not user-facing (this
      // runs on every page load, not from a user action).
      console.error('Failed to load community staff list:', error);
    }
  };

  // Batch-fetches only the profiles not already cached, for whichever
  // senders are currently visible — not everyone will have set up a
  // username/avatar yet, so messages fall back to sender_name/initial-circle
  // when there's no entry here for that email.
  const fetchProfilesForSenders = async (emails: string[]) => {
    const missing = [...new Set(emails)].filter(e => !(e in profileByEmailRef.current));
    if (missing.length === 0) return;
    const { data } = await supabase.from('participant_profiles').select('participant_email, username, avatar_emoji').in('participant_email', missing);
    if (data) {
      setProfileByEmail(prev => {
        const next = { ...prev };
        (data as any[]).forEach(row => { next[row.participant_email] = { username: row.username, avatar_emoji: row.avatar_emoji }; });
        missing.forEach(e => { if (!(e in next)) next[e] = undefined as any; }); // mark checked-but-absent so we don't refetch every render
        return next;
      });
    }
  };

  // Redeeming a staff invite link verifies this browser once, forever — no
  // PIN, no per-session prompt. Auto-joins as the matching identity too,
  // since opening the link IS the proof of who you are.
  useEffect(() => {
    if (!pendingStaffInviteToken) return;
    setIsRedeemingInvite(true);
    (async () => {
      const { data, error } = await supabase.rpc('redeem_staff_invite', { p_token: pendingStaffInviteToken });
      const result = Array.isArray(data) ? data[0] : data;
      if (!error && result?.ok) {
        const cleanEmail = (result.participant_email as string).trim().toLowerCase();
        const cleanName = result.display_name as string;
        setUserName(cleanName);
        setUserEmail(cleanEmail);
        localStorage.setItem('forge-student-name', cleanName);
        localStorage.setItem('forge-student-email', cleanEmail);
        setIsJoined(true);
        setStaffToken(pendingStaffInviteToken);
        fetchStaffList();
        fetchQuestsAndBadges(cleanEmail);
        toast({ title: `✅ Verified as ${cleanName}`, description: 'Your staff badge is active on this browser from now on — no need to do this again.' });
      } else {
        toast({ title: 'Invalid invite link', description: 'This link is expired or was already rotated. Ask your organizer for a fresh one.', variant: 'destructive' });
      }
      setIsRedeemingInvite(false);
      onInviteConsumed?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStaffInviteToken]);

  useEffect(() => {
    // Nothing previously cleared the prior channel's messages/pinned list/
    // pagination state here — for the duration of the fetch below (or
    // permanently, if that fetch silently failed, since none of the fetch
    // functions had an error branch), the header would show the NEW
    // channel's name over the OLD channel's messages. Worse, if a fetch
    // failed outright, loadOlderMessages would keep reading `messages[0]`
    // as if it belonged to the new channel and query the wrong channel's
    // history entirely. Resetting up front means a slow/failed fetch shows
    // an empty/loading state instead of stale, wrongly-attributed content.
    setMessages([]);
    setPinnedMessages([]);
    setHasMoreMessages(false);
    setMessagesLoadError(false);
    // voiceParticipants is intentionally NOT reset here anymore — it's now
    // a global, all-channels picture kept in sync by its own dedicated
    // effect (see fetchAllVoiceParticipants above), not scoped to
    // whichever channel is currently active.
    // A draft typed in one channel used to survive switching to another
    // channel untouched — Enter/Send there delivered it to whatever
    // channel was now active, with no per-channel isolation and no
    // warning. Discord/Slack deliberately keep drafts per-channel
    // specifically to prevent exactly this kind of misdelivery; the
    // simpler, safer fix here is just not letting a draft silently follow
    // you to a channel you never meant to send it to.
    setNewMessage('');
    // The mention dropdown itself wasn't cleared alongside the draft — a
    // stale query could linger open, now recomputed against the NEW
    // channel's messages/staff, floating over an emptied composer.
    setMentionQuery(null);
    setMentionActiveIndex(0);

    // Announcement channels render through the exact same message-list/
    // composer JSX as text channels (just with posting locked to
    // organizers) — but this effect used to only ever fetch messages and
    // subscribe to realtime for 'text'. Clicking into Announcements loaded
    // nothing: the list just kept showing whatever channel was active
    // before, with no indication anything was wrong, and no live updates
    // ever arrived. The only reason it ever looked like it worked was that
    // posting an announcement happened to trigger a manual refetch as a
    // side effect — which only ever helped the organizer who just posted,
    // never anyone actually trying to read announcements.
    if (activeChannel && (activeChannel.channel_type === 'text' || activeChannel.channel_type === 'announcement')) {
      fetchMessages(activeChannel.id);
      fetchPinnedMessages(activeChannel.id);

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
            const incoming = payload.new as Message;
            // Only auto-scroll if the viewport was already near the bottom
            // (or this is the sender's own message) — unconditionally
            // yanking the view down on every incoming message made reading
            // history in a busy channel impossible, and raced with
            // loadOlderMessages' own scroll-position restoration below.
            const viewport = scrollRootRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
            const nearBottom = !viewport || viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
            // Deduped by id — the send handler now also appends the
            // sender's own message locally as soon as the RPC confirms it
            // (see handleSendMessage), so this event and that optimistic
            // append can both try to add the same row if both arrive.
            setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]));
            fetchProfilesForSenders([incoming.sender_email]);
            if (nearBottom || incoming.sender_email === userEmailRef.current) {
              requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
            }
          }
        )
        // Edit/delete had no realtime handling at all — one viewer editing
        // or deleting a message would silently desync from everyone else's
        // copy of the channel until their next reload.
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannel.id}` },
          (payload) => {
            const updated = payload.new as Message;
            setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
            // Pin state changes are just a community_messages UPDATE, so
            // this same event covers keeping the pinned list in sync too.
            setPinnedMessages(prev => {
              if (updated.pinned_at) {
                const withoutOld = prev.filter(m => m.id !== updated.id);
                return [updated, ...withoutOld].sort((a, b) => (b.pinned_at! > a.pinned_at! ? 1 : -1));
              }
              return prev.filter(m => m.id !== updated.id);
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannel.id}` },
          (payload) => {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setMessages(prev => prev.filter(m => m.id !== deletedId));
              setPinnedMessages(prev => prev.filter(m => m.id !== deletedId));
            }
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

      let typingChannel: ReturnType<typeof supabase.channel> | null = null;
      if (activeChannel.channel_type === 'text') {
        // Ephemeral typing indicator — Realtime broadcast, not persisted to
        // any table. Announcements skip this: only organizers can post
        // there, and a "typing" indicator on a one-to-many broadcast
        // channel isn't meaningful.
        typingChannel = supabase
          .channel(`typing-${activeChannel.id}`)
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (!payload?.email || payload.email === userEmailRef.current) return;
            setTypingUsers(prev => (prev.includes(payload.name) ? prev : [...prev, payload.name]));
            if (typingTimeoutsRef.current[payload.email]) clearTimeout(typingTimeoutsRef.current[payload.email]);
            typingTimeoutsRef.current[payload.email] = setTimeout(() => {
              setTypingUsers(prev => prev.filter(n => n !== payload.name));
            }, 3000);
          })
          .subscribe();
        typingChannelRef.current = typingChannel;
        setTypingUsers([]);
      }

      return () => {
        supabase.removeChannel(messagesChannel);
        if (typingChannel) supabase.removeChannel(typingChannel);
        typingChannelRef.current = null;
        Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
        typingTimeoutsRef.current = {};
      };
    }
    // Voice channels need no per-channel fetch/subscription here anymore —
    // the global voice-participants effect above covers every voice
    // channel, active or not.
  }, [activeChannel]);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('community_channels')
      .select('*')
      .order('channel_type')
      .order('name');

    if (!error && data) {
      const channelData = data as unknown as Channel[];
      setChannels(channelData);
      // Only auto-select the default on a genuine first load (nothing
      // active yet) — activeChannelIdRef, not the activeChannel state
      // closure, since this now also runs from a realtime subscription
      // whose closure is fixed at mount and would otherwise always see a
      // stale null here. Guarding on it matters now that fetchChannels can
      // also fire from ANY other participant's channel create/edit: without
      // this, every already-open tab would get yanked back to the default
      // channel mid-conversation every time an organizer touched channels.
      if (!activeChannelIdRef.current) {
        const defaultChannel = channelData.find(c => c.is_default && c.channel_type === 'text');
        if (defaultChannel) setActiveChannel(defaultChannel);
      }
    } else if (error) {
      // The channel list rarely fails (mostly static), but a silent
      // failure here previously just left the sidebar permanently empty
      // with no explanation and no way to know a retry might help.
      console.error('fetchChannels failed:', error.message);
      toast({ title: 'Could not load channels', description: 'Try refreshing the page.', variant: 'destructive' });
    }
  };

  const fetchQuestsAndBadges = async (emailOverride?: string) => {
    const email = emailOverride ?? userEmail;
    setQuestsLoading(true);
    setQuestsError(false);
    // completionRows is unscoped (every completion, every participant) —
    // fine for badgesByEmail (display-only, and this app is hackathon-
    // scale, not thousands of rows), but PostgREST's default row cap means
    // it can silently truncate. myQuestStatus derived from that same
    // truncated set is a real bug, not just cosmetic: past the cap, an
    // already-earned quest reads as unclaimed in the Quests panel, and
    // clicking it returns `ok: true, 'Already claimed'` — a success toast
    // for something that looked like it needed claiming. Fetching the
    // caller's own completions as a SEPARATE, always-scoped query
    // guarantees this one specific case (mine) is never wrong regardless
    // of how large the table gets, independent of the display-only query.
    const [{ data: questRows, error: questErr }, { data: completionRows }, { data: myRows }] = await Promise.all([
      // order_index has no UNIQUE constraint — two quests sharing a value
      // sorted in Postgres's unstable tie order (which can shift after any
      // row UPDATE) with no secondary key to break the tie consistently.
      // created_at as a tie-breaker keeps ordering stable across reloads
      // even when order_index collides.
      supabase.from('community_quests').select('*').eq('is_active', true).order('order_index').order('created_at'),
      // status='approved' only — proof_upload completions land as
      // 'pending' and must NOT grant the visible badge until an organizer
      // actually reviews the screenshot.
      supabase.from('community_quest_completions').select('participant_email, quest_id, community_quests(badge_emoji, badge_label)').eq('status', 'approved'),
      // Via RPC, not a direct table select — this needs rejection_reason
      // too now (so a participant can see why a proof was rejected before
      // resubmitting), and that column's public SELECT grant was
      // deliberately revoked (see the proof_upload migration) since it's
      // organizer feedback, not a public broadcast. get_my_quest_status
      // scopes it to the caller's own rows only, same pattern as the
      // pre-existing get_my_mute_status — and (security audit) now also
      // requires the caller's device token, same as that fix. It used to
      // take a bare email with no proof of identity at all, letting anyone
      // read anyone's quest rejection reasons just by passing their email.
      // Read directly from localStorage, not the deviceToken state
      // closure — fetchQuestsAndBadges is called from several mount-time
      // effects with empty dep arrays, whose closures would otherwise
      // never see a token minted after they were set up.
      email ? supabase.rpc('get_my_quest_status', { p_participant_email: email, p_device_token: localStorage.getItem('forge-device-token') || null }) : Promise.resolve({ data: null }),
    ]);

    if (questRows) {
      setQuests(questRows as unknown as Quest[]);
    } else if (questErr) {
      setQuestsError(true);
    }
    setQuestsLoading(false);

    if (completionRows) {
      const badgeMap: Record<string, Badge[]> = {};
      (completionRows as any[]).forEach((row) => {
        const badge = row.community_quests;
        if (badge) {
          (badgeMap[row.participant_email] ||= []).push({ emoji: badge.badge_emoji, label: badge.badge_label });
        }
      });
      setBadgesByEmail(badgeMap);
    }
    const statusMap: Record<string, { status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null }> = {};
    (myRows as any[] | null)?.forEach((r) => { statusMap[r.quest_id] = { status: r.status, rejection_reason: r.rejection_reason }; });
    setMyQuestStatus(statusMap);
  };

  const handleClaimQuest = async (quest: Quest, proofImage?: string) => {
    if (!userEmail.trim() || !userName.trim()) {
      toast({ title: 'Join first', description: 'Enter your name and email to claim quests.', variant: 'destructive' });
      return;
    }
    setClaimingQuestId(quest.id);
    try {
      // Now device-token gated, same as every other mutating community RPC
      // — it used to take no proof of identity at all, letting anyone
      // claim a badge for any email.
      const { data, error } = await supabase.rpc('claim_community_quest', {
        p_participant_email: userEmail,
        p_participant_name: userName,
        p_quest_id: quest.id,
        p_device_token: deviceToken || null,
        p_proof_image: proofImage || null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.new_device_token) setDeviceToken(result.new_device_token);
      if (result?.ok) {
        // proof_upload lands as 'pending' (no badge yet, nothing to claim
        // credit for until an organizer reviews the screenshot) — distinct
        // toast, no badge_emoji/badge_label on this path since the RPC
        // deliberately doesn't return them until approval.
        if (result.status === 'pending') {
          toast({ title: '📤 Submitted for review', description: result.message });
        } else {
          toast({ title: `${result.badge_emoji || '🏅'} ${result.message}`, description: result.badge_label ? `You earned the "${result.badge_label}" badge!` : undefined });
        }
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

  // Triggered by the hidden file input below the quest list — validation
  // mirrors ProjectEditor's one existing image-upload precedent in this app
  // (MIME-type allowlist + a hard size cap), scaled up since a screenshot
  // naturally runs larger than a logo. No Supabase Storage bucket exists in
  // this app; base64-into-a-TEXT-column (same as ProjectEditor's logo
  // field) is the established pattern here, not a new one invented for
  // this feature.
  const handleProofFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const quest = quests.find(q => q.id === proofUploadQuestId);
    setProofUploadQuestId(null);
    if (!file || !quest) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
      toast({ title: 'Unsupported file', description: 'Please upload a PNG, JPG, GIF, or WEBP screenshot.', variant: 'destructive' });
      return;
    }
    // 1.3MB raw, not 1.5MB — base64 encoding expands a file by ~4/3 plus a
    // ~25-char "data:image/...;base64," prefix. 1.5MB raw encodes to
    // *exactly* the server's 2MB cap on the full string (claim_community_
    // quest checks length(p_proof_image) > 2*1024*1024), before even
    // adding the prefix — meaning a maximal upload passed this check but
    // was then rejected server-side as "too large" every time. 1.3MB
    // leaves real headroom (~1.82MB encoded) instead of landing exactly on
    // the boundary.
    if (file.size > 1.3 * 1024 * 1024) {
      toast({ title: 'Screenshot too large', description: 'Please upload an image under 1.3MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      handleClaimQuest(quest, dataUrl);
    };
    reader.onerror = () => {
      toast({ title: 'Could not read that file', description: 'Try a different image.', variant: 'destructive' });
    };
    reader.readAsDataURL(file);
  };

  // Used to be one-directional — subscribing disabled the button for good,
  // with no way to turn notifications back off from this UI.
  const handleToggleNotifications = async () => {
    if (isSubscribedPush) {
      const ok = await unsubscribeFromPush();
      toast(ok
        ? { title: '🔕 Notifications off', description: "You won't get pinged about community activity anymore." }
        : { title: 'Could not disable notifications', description: 'Something went wrong — try again.', variant: 'destructive' });
      return;
    }
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

  const MESSAGE_PAGE_SIZE = 50;

  const fetchPinnedMessages = async (channelId: string) => {
    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .eq('channel_id', channelId)
      .not('pinned_at', 'is', null)
      .order('pinned_at', { ascending: false });
    if (!error && data && activeChannelIdRef.current === channelId) setPinnedMessages(data as unknown as Message[]);
  };

  const fetchMessages = async (channelId: string) => {
    setIsLoadingMessages(true);
    setMessagesLoadError(false);
    // Order DESC + limit so we grab the newest page, not the oldest one —
    // then reverse for display. Ascending+limit would permanently freeze any
    // channel past one page on its oldest batch for every fresh load.
    // Fetching one extra row is a cheap way to know whether there's an
    // older page to offer, without a separate COUNT query.
    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);

    if (activeChannelIdRef.current !== channelId) return;

    if (!error && data) {
      const hasMore = data.length > MESSAGE_PAGE_SIZE;
      const page = hasMore ? data.slice(0, MESSAGE_PAGE_SIZE) : data;
      const rows = (page as unknown as Message[]).reverse();
      setMessages(rows);
      setHasMoreMessages(hasMore);
      setIsLoadingMessages(false);
      fetchReactionsForMessages(rows.map(m => m.id));
      fetchProfilesForSenders(rows.map(m => m.sender_email));
      // Fresh load — jump straight to the bottom, no animation (there's
      // nothing to animate from; the list didn't exist a moment ago).
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }));
    } else if (error) {
      // messages/pinned/hasMore are already reset to empty before this
      // runs (see the effect above). messagesLoadError keeps the empty
      // state from claiming this is a genuinely new, message-free channel
      // once the toast below fades — a failed load and an empty channel
      // used to be visually indistinguishable.
      setIsLoadingMessages(false);
      setMessagesLoadError(true);
      toast({ title: 'Could not load messages', description: 'Try switching channels again.', variant: 'destructive' });
    }
  };

  // "Load earlier messages" — there was previously no way to see anything
  // before the newest page at all; older history was just unreachable.
  // Prepending shifts the scroll content, so the viewport's scrollTop is
  // adjusted by the exact height added — otherwise the view would jump to
  // wherever the new top of the list happens to land instead of staying on
  // whatever the user was actually looking at.
  const loadOlderMessages = async () => {
    if (!activeChannel || messages.length === 0 || isLoadingOlder) return;
    const channelIdAtStart = activeChannel.id;
    setIsLoadingOlder(true);
    const oldest = messages[0];

    // Anchor on the message currently at the top of the list, not on total
    // scrollHeight — the old height-delta approach assumed every pixel
    // added between "before" and "after" came from the prepended page. If
    // a realtime message landed at the bottom during the network
    // round-trip (or the brief window before the RAF fires), its height
    // silently got folded into the same delta and pushed the viewport down
    // past where the user was actually reading. Anchoring to a specific
    // element's on-screen position is immune to unrelated height changes
    // elsewhere in the list.
    const viewport = scrollRootRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const anchorEl = viewport?.querySelector(`[data-message-id="${oldest.id}"]`) as HTMLElement | null;
    const anchorOffset = anchorEl && viewport ? anchorEl.getBoundingClientRect().top - viewport.getBoundingClientRect().top : null;

    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .eq('channel_id', channelIdAtStart)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);

    if (!error && data && activeChannelIdRef.current === channelIdAtStart) {
      const hasMore = data.length > MESSAGE_PAGE_SIZE;
      const page = hasMore ? data.slice(0, MESSAGE_PAGE_SIZE) : data;
      const older = (page as unknown as Message[]).reverse();

      setMessages(prev => [...older, ...prev]);
      setHasMoreMessages(hasMore);
      fetchReactionsForMessages(older.map(m => m.id));
      fetchProfilesForSenders(older.map(m => m.sender_email));

      if (viewport && anchorOffset !== null) {
        requestAnimationFrame(() => {
          const newAnchorEl = viewport.querySelector(`[data-message-id="${oldest.id}"]`) as HTMLElement | null;
          if (newAnchorEl) {
            const newOffset = newAnchorEl.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
            viewport.scrollTop += newOffset - anchorOffset;
          }
        });
      }
    }
    setIsLoadingOlder(false);
  };

  // Unfiltered — every voice channel's participants at once, not just the
  // active one. Both the sidebar's per-channel badge and the active
  // lobby's participant list already filter this shared array by
  // channel_id client-side, so one global picture correctly serves both.
  const fetchAllVoiceParticipants = async () => {
    const { data, error } = await supabase
      .from('voice_room_participants')
      .select('*');

    if (!error && data) {
      setVoiceParticipants(data as unknown as VoiceParticipant[]);
      // join_voice_room now enforces single-room-at-a-time at the DB level
      // (deletes the caller's OTHER voice_room_participants rows before
      // inserting the new one) — but that's a server-side presence fix
      // only. If this identity joins a different room from another tab or
      // device, THIS tab's presence row gets silently deleted while its
      // local isInVoice/jitsiApiRef state has no idea anything happened —
      // a real, still-connected Jitsi WebRTC session with live audio kept
      // running, invisible to everyone (including this tab's own user),
      // backed by no presence row at all. voicePresenceRef (kept in sync
      // via its own effect) lets this stale-closure-safe check compare the
      // fresh fetch against what THIS tab currently believes about itself.
      const { inVoice, channelId, email } = voicePresenceRef.current;
      if (inVoice && channelId && email) {
        const stillPresent = (data as any[]).some(p => p.channel_id === channelId && p.participant_email === email);
        if (!stillPresent) {
          disposeJitsi();
          setIsInVoice(false);
          setIsConnectingVoice(false);
          toast({
            title: 'Disconnected from voice',
            description: "You joined a voice channel from another tab or device, so this one was disconnected.",
            variant: 'destructive',
          });
        }
      }
    }
  };

  const handleJoin = () => {
    if (!userName.trim() || !userEmail.trim()) {
      toast({
        title: 'Join first',
        description: 'Enter your name and email to join the community.',
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
    // Every other mutating action in this file wraps its outcome in a
    // try/catch + toast; this one didn't. A localStorage write can throw
    // (Safari private-mode quota, storage blocked by browser settings) —
    // without a catch, that stops execution before setIsJoined(true),
    // leaving someone stuck on the join screen with no error shown and a
    // retry that would just fail identically every time.
    try {
      localStorage.setItem('forge-student-name', cleanName);
      localStorage.setItem('forge-student-email', cleanEmail);
    } catch (e) {
      console.error('Failed to persist join info to localStorage:', e);
      toast({
        title: 'Could not save your info',
        description: "Your browser is blocking local storage, so you'll need to rejoin next visit — you can still chat now.",
        variant: 'destructive',
      });
    }
    setIsJoined(true);
    fetchQuestsAndBadges(cleanEmail);
  };

  const [profileUsernameInput, setProfileUsernameInput] = useState('');
  const [profileAvatarInput, setProfileAvatarInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSetProfile = async () => {
    if (!profileUsernameInput.trim() || !profileAvatarInput) {
      toast({ title: 'Pick a username and an avatar', variant: 'destructive' });
      return;
    }
    setSavingProfile(true);
    try {
      const { data, error } = await supabase.rpc('set_my_profile', {
        p_participant_email: userEmail,
        p_device_token: deviceToken || null,
        p_username: profileUsernameInput.trim(),
        p_avatar_emoji: profileAvatarInput,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast({ title: 'Could not save profile', description: result?.message || error?.message, variant: 'destructive' });
        return;
      }
      if (result.new_device_token) setDeviceToken(result.new_device_token);
      localStorage.setItem('forge-student-username', profileUsernameInput.trim());
      localStorage.setItem('forge-student-avatar', profileAvatarInput);
      setUserUsername(profileUsernameInput.trim());
      setUserAvatarEmoji(profileAvatarInput);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendMessage = async () => {
    // isPostingAnnouncement guards the Send button's disabled state but not
    // the Enter-key path below, which called this function directly — a
    // fast double-Enter while an announcement post was still in flight
    // fired two overlapping post_community_announcement calls.
    if (!newMessage.trim() || !activeChannel || isSending || isPostingAnnouncement) return;

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
        // No manual refetch needed — announcement channels now have a real
        // realtime subscription (fixed above), so the new message arrives
        // the same way it does for everyone else viewing the channel.
        // Refetching here too used to double-append it for the poster only.
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to post announcement.', variant: 'destructive' });
      } finally {
        setIsPostingAnnouncement(false);
      }
      return;
    }

    if (isStaffEmail) {
      if (!staffToken) {
        toast({ title: 'Verify this browser first', description: 'Open your staff invite link once (ask your organizer if you need it resent) to unlock chatting with your badge.', variant: 'destructive' });
        return;
      }
      setIsSending(true);
      const trimmedStaffContent = newMessage.trim();
      const { data, error } = await supabase.rpc('send_staff_message', {
        p_participant_email: userEmail,
        p_token: staffToken,
        p_channel_id: activeChannel.id,
        p_content: trimmedStaffContent,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast({ title: 'Could not send', description: result?.message || error?.message || 'Staff verification failed.', variant: 'destructive' });
        // Only clear on a genuine rejection from the RPC (stale/revoked
        // token) — `error` is also set for any transport failure (offline,
        // a 500, a timeout), and those aren't proof the token is bad. A
        // one-second wifi blip used to permanently wipe a real staff
        // credential and force re-minting a fresh invite link for no reason.
        if (!error && result?.ok === false) setStaffToken('');
      } else {
        setNewMessage('');
        // Append locally as soon as the send is confirmed, rather than
        // relying solely on the realtime INSERT echo to ever show it. A
        // missed/delayed event during a Realtime reconnect previously meant
        // a message that genuinely saved (ok: true) could simply never
        // appear on the sender's own screen until they switched channels or
        // reloaded. Deduped by id against the INSERT handler above in case
        // both arrive.
        if (result.message_id && activeChannelIdRef.current === activeChannel.id) {
          const optimistic: Message = {
            id: result.message_id,
            channel_id: activeChannel.id,
            sender_name: userName,
            sender_email: userEmail,
            content: trimmedStaffContent,
            message_type: 'text',
            created_at: new Date().toISOString(),
            edited_at: null,
            pinned_at: null,
            pinned_by: null,
          };
          setMessages(prev => (prev.some(m => m.id === optimistic.id) ? prev : [...prev, optimistic]));
          requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
        }
        // This branch never called notify-mention at all — a staff
        // member's @[name](email) mention rendered the pill fine but
        // silently never notified anyone, inconsistent with regular
        // participants' messages just below. send_staff_message needed to
        // start returning message_id first (it didn't before).
        if (result.message_id && /@\[[^\]]+\]\([^)]+\)/.test(trimmedStaffContent)) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-mention`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ message_id: result.message_id }),
          }).catch(() => {});
        }
      }
      setIsSending(false);
      return;
    }

    // Only reachable here, not for staff/announcement — mute enforcement
    // (both server-side via RLS and this client-side pre-check) applies
    // specifically to the regular-participant insert path; a muted person
    // who's separately verified as staff can still send verified staff
    // messages, since that path carries its own real accountability.
    if (isCurrentlyMuted) {
      toast({
        title: 'You are muted',
        description: `You can post again after ${new Date(mutedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${mutedReason ? ` Reason: ${mutedReason}` : ''}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    const trimmedContent = newMessage.trim();
    const { data, error } = await supabase.rpc('send_community_message', {
      p_participant_email: userEmail,
      p_participant_name: userName,
      p_device_token: deviceToken || null,
      p_channel_id: activeChannel.id,
      p_content: trimmedContent,
    });
    const result = Array.isArray(data) ? data[0] : data;

    if (error || !result?.ok) {
      // community_staff only gets fetched once on mount/join — if an
      // organizer adds this email as staff while this tab is already open,
      // isStaffEmail stays stale/false, this branch keeps getting chosen
      // instead of the staff-send one, and the server (correctly) rejects
      // every attempt with this exact message forever, with nothing here
      // ever re-fetching to notice the promotion. Refetching on this
      // specific rejection lets the very next send attempt route correctly
      // instead of requiring a manual page reload to un-stick.
      if (result?.message === 'This email belongs to a staff account — use your staff invite link to chat') {
        fetchStaffList();
        toast({
          title: "You're now community staff",
          description: 'Open your staff invite link (ask your organizer to resend it) to unlock chatting with your badge.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not send',
          description: result?.message || error?.message || 'Failed to send message.',
          variant: 'destructive',
        });
      }
    } else {
      // Only set on this browser's first-ever send as this email — the RPC
      // omits it on every later call once the identity is already claimed.
      if (result.new_device_token) setDeviceToken(result.new_device_token);
      setNewMessage('');
      // Same reasoning as the staff-send branch above — append locally on
      // confirmed send rather than depending solely on the realtime INSERT
      // echo, which isn't guaranteed to arrive (e.g. a brief Realtime
      // reconnect can drop an event). Deduped by id either way.
      if (result.message_id && activeChannelIdRef.current === activeChannel.id) {
        const optimistic: Message = {
          id: result.message_id,
          channel_id: activeChannel.id,
          sender_name: userName,
          sender_email: userEmail,
          content: trimmedContent,
          message_type: 'text',
          created_at: new Date().toISOString(),
          edited_at: null,
          pinned_at: null,
          pinned_by: null,
        };
        setMessages(prev => (prev.some(m => m.id === optimistic.id) ? prev : [...prev, optimistic]));
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
      // Best-effort only — a mention still "worked" (the highlighted pill
      // renders regardless) even if the push fan-out fails or the mentioned
      // person never enabled notifications in the first place.
      if (result.message_id && /@\[[^\]]+\]\([^)]+\)/.test(trimmedContent)) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-mention`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ message_id: result.message_id }),
        }).catch(() => {});
      }
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

  // Candidates come from who's actually active in this channel (recent
  // senders in the currently loaded messages) plus community staff —
  // there's no "member list" concept in this app to draw from otherwise.
  const mentionCandidates = (() => {
    if (mentionQuery === null) return [];
    const seen = new Map<string, { name: string; email: string }>();
    [...messages].reverse().forEach((m) => {
      if (m.sender_email !== userEmail && !seen.has(m.sender_email)) {
        seen.set(m.sender_email, { name: m.sender_name, email: m.sender_email });
      }
    });
    Object.entries(staffByEmail).forEach(([email, info]) => {
      if (email !== userEmail && !seen.has(email)) seen.set(email, { name: info.display_name, email });
    });
    const q = mentionQuery.toLowerCase();
    return [...seen.values()].filter(c => c.name.toLowerCase().startsWith(q)).slice(0, 6);
  })();

  // Detects "@partial" right before the cursor (not preceded by another
  // word character, so a mid-word "@" like an email address doesn't
  // trigger it) to drive the autocomplete dropdown.
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTypingBroadcast();
    const cursor = e.target.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    // \w only matches [A-Za-z0-9_] — typing "@José" only ever captured
    // "@Jos" as the query before the accented character broke the match,
    // so a display name distinguished by non-ASCII characters could never
    // be found via autocomplete past that point. \p{L}/\p{N} (Unicode
    // property escapes, same fix already applied to isalpha()/isdigit()
    // in the Python interpreter) match any Unicode letter/digit, not just
    // ASCII ones.
    const match = beforeCursor.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    if (match) {
      setMentionQuery(match[1]);
      setMentionActiveIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (candidate: { name: string; email: string }) => {
    const cursor = inputRef.current?.selectionStart ?? newMessage.length;
    const beforeCursor = newMessage.slice(0, cursor);
    const afterCursor = newMessage.slice(cursor);
    // candidate.name is another participant's self-asserted sender_name —
    // send_community_message never validated it, so it could contain `]`,
    // `)`, or newlines. Unsanitized, mentioning someone with a crafted
    // display name (e.g. `Bob](x) Claim your prize https://evil.example
    // [x`) broke out of the @[name](email) markup and injected an
    // attacker-controlled real link into the CALLER's own message — third-
    // party content forgery inside something they never typed, worse on a
    // platform where that message might carry a staff badge.
    const safeName = candidate.name.replace(/[\]\)\r\n]/g, '').trim() || 'user';
    // Same \p{L}/\p{N} fix as the detection regex above (handleMessageInputChange)
    // — this one was missed when that fix went in. It stayed ASCII-only
    // (\w*), so selecting a candidate while the just-typed query contained
    // any non-ASCII letter (e.g. "@José") silently no-op'd: the string
    // came back unchanged, no @[Name](email) markup was ever inserted, and
    // that person was never notified — the detection side got fixed, this
    // replace side didn't.
    const replaced = beforeCursor.replace(/(?:^|\s)@([\p{L}\p{N}_]*)$/u, (m) => `${m[0] === '@' ? '' : m[0]}@[${safeName}](${candidate.email}) `);
    setNewMessage(replaced + afterCursor);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const fetchReactionsForMessages = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
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
    // Merge rather than replace — a full replace keyed only to whatever
    // subset of message IDs was just queried (e.g. loadOlderMessages
    // querying just the newly-fetched older batch) would wipe out reaction
    // state for every other already-loaded message not in that subset.
    // Clearing exactly the queried IDs first (before merging grouped back
    // in) still correctly reflects a reaction being fully removed down to
    // zero, which wouldn't appear as a key in `grouped` at all otherwise.
    setMessageReactions(prev => {
      const next = { ...prev };
      messageIds.forEach(id => delete next[id]);
      return { ...next, ...grouped };
    });
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const existing = (messageReactions[messageId] || []).find(r => r.emoji === emoji);
    const alreadyReacted = existing?.emails.includes(userEmail);

    // Routed through RPCs (not a raw insert/delete) so reacting/un-reacting
    // as someone else's email requires the same device token messages do —
    // the old USING(true) policies let anyone impersonate a reaction or
    // wipe out someone else's with zero ownership check.
    if (alreadyReacted) {
      const { data, error } = await supabase.rpc('remove_community_reaction', {
        p_message_id: messageId,
        p_participant_email: userEmail,
        p_device_token: deviceToken || null,
        p_emoji: emoji,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast({ title: 'Could not remove reaction', description: result?.message || error?.message, variant: 'destructive' });
        return;
      }
    } else {
      const { data, error } = await supabase.rpc('add_community_reaction', {
        p_message_id: messageId,
        p_participant_email: userEmail,
        p_participant_name: userName,
        p_device_token: deviceToken || null,
        p_emoji: emoji,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast({ title: 'Could not react', description: result?.message || error?.message, variant: 'destructive' });
        return;
      }
      if (result.new_device_token) setDeviceToken(result.new_device_token);
    }
    // Realtime subscription (below) will also refresh this, but update now for snappy feedback.
    fetchReactionsForMessages(messages.map(m => m.id));
  };

  // Editing/deleting a sent message — previously absent entirely, and RLS
  // (see the edit/delete migration) refuses this for staff-authored
  // messages regardless of what the client sends, so this only ever
  // succeeds for the caller's own regular messages in practice.
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setHoveredMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;
    setIsSavingEdit(true);
    // Announcements are always sender_email='team@forge.internal' — no
    // real participant's email ever matches that, so edit_own_community_
    // message's ownership check would reject this for literally everyone
    // including the organizer who posted it. Routed through the
    // organizer-only edit_community_announcement admin action instead,
    // which checks sender_email === the synthetic account rather than a
    // per-person match.
    let data: any, error: any;
    if (activeChannel?.channel_type === 'announcement') {
      try {
        data = [await callAdminAction('edit_community_announcement', { message_id: editingMessageId, content: editingContent.trim() })];
      } catch (e: any) {
        error = e;
      }
    } else {
      // Routed through an RPC, not a raw table .update() — the RPC actually
      // checks the row's sender_email against what we're claiming here before
      // touching anything, instead of RLS that (before this fix) let anyone
      // edit any non-staff message with no ownership check at all.
      ({ data, error } = await supabase.rpc('edit_own_community_message', {
        p_message_id: editingMessageId,
        p_participant_email: userEmail,
        p_content: editingContent.trim(),
        p_device_token: deviceToken || null,
      }));
    }
    setIsSavingEdit(false);
    if (error) {
      toast({ title: 'Could not save edit', description: error.message || 'Something went wrong — try again.', variant: 'destructive' });
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    // Realtime UPDATE will also land, but this keeps the editor's own view
    // snappy instead of waiting on the round trip back through Realtime.
    setMessages(prev => prev.map(m => (m.id === editingMessageId ? { ...m, content: result?.content ?? editingContent.trim(), edited_at: result?.edited_at ?? new Date().toISOString() } : m)));
    // All three send paths (regular/staff/announcement) scan for a new
    // @[Name](email) and notify — editing a message to ADD a mention never
    // did, so someone mentioned only via an edit was silently never told.
    if (/@\[[^\]]+\]\([^)]+\)/.test(editingContent.trim())) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ message_id: editingMessageId }),
      }).catch(() => {});
    }
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);
    const { error } = await supabase.rpc('delete_own_community_message', {
      p_message_id: messageId,
      p_participant_email: userEmail,
      p_device_token: deviceToken || null,
    });
    setDeletingMessageId(null);
    if (error) {
      toast({ title: 'Could not delete', description: error.message || 'Something went wrong — try again.', variant: 'destructive' });
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  // Organizer moderation — previously an organizer could only delete THEIR
  // OWN messages, same as any regular participant, with no way to remove
  // someone else's abusive/spam message or stop them from continuing.
  const handleDeleteAnyMessage = async (messageId: string) => {
    setDeletingAnyMessageId(messageId);
    try {
      await callAdminAction('delete_community_message', { message_id: messageId });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setDeletingAnyMessageId(null);
    }
  };

  const handleMuteUser = async () => {
    if (!mutingMessage) return;
    const minutes = Number(muteMinutes);
    if (!minutes || minutes <= 0) {
      toast({ title: 'Invalid duration', description: 'Enter a positive number of minutes.', variant: 'destructive' });
      return;
    }
    setIsMuting(true);
    try {
      await callAdminAction('mute_community_user', {
        participant_email: mutingMessage.sender_email,
        duration_minutes: minutes,
        reason: muteReason.trim() || undefined,
      });
      toast({ title: `Muted ${mutingMessage.sender_name}`, description: `They can't post for ${minutes} minutes.` });
      setMutingMessage(null);
      setMuteReason('');
    } catch (e: any) {
      toast({ title: 'Could not mute', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setIsMuting(false);
    }
  };

  const openMutedUsersDialog = async () => {
    setMutedUsersDialogOpen(true);
    setLoadingMutedUsers(true);
    try {
      const data = await callAdminAction<{ participant_email: string; muted_until: string; reason: string | null }[]>('list_muted_community_users');
      // Expired mutes still have a row (unmute_community_user is the only
      // delete path) — filter them out here rather than showing a stale
      // "muted" entry for someone who can post again.
      setMutedUsersList((data || []).filter(m => new Date(m.muted_until) > new Date()));
    } catch (e: any) {
      toast({ title: 'Could not load muted users', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setLoadingMutedUsers(false);
    }
  };

  const handleUnmute = async (email: string) => {
    setUnmutingEmail(email);
    try {
      await callAdminAction('unmute_community_user', { participant_email: email });
      setMutedUsersList(prev => prev.filter(m => m.participant_email !== email));
      toast({ title: `Unmuted ${email}` });
    } catch (e: any) {
      toast({ title: 'Could not unmute', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setUnmutingEmail(null);
    }
  };

  // Pinning is just an UPDATE on community_messages, so the existing
  // realtime UPDATE subscription already picks it up for every viewer —
  // no separate pin-specific realtime wiring needed.
  const handleTogglePin = async (message: Message) => {
    setPinningMessageId(message.id);
    try {
      const action = message.pinned_at ? 'unpin_community_message' : 'pin_community_message';
      const updated = await callAdminAction<Message>(action, { message_id: message.id });
      const merged = { ...message, ...updated };
      setMessages(prev => prev.map(m => (m.id === message.id ? merged : m)));
      // Realtime will also sync this, but update now for snappy feedback
      // instead of waiting on the round trip back through it.
      setPinnedMessages(prev => (merged.pinned_at ? [merged, ...prev.filter(m => m.id !== merged.id)] : prev.filter(m => m.id !== merged.id)));
    } catch (e: any) {
      toast({ title: 'Could not update pin', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setPinningMessageId(null);
    }
  };

  const disposeJitsi = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch { /* already gone */ }
      jitsiApiRef.current = null;
    }
  };

  const loadJitsiScript = (): Promise<void> => {
    if ((window as any).JitsiMeetExternalAPI) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('jitsi-external-api');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi')));
        return;
      }
      const script = document.createElement('script');
      script.id = 'jitsi-external-api';
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi'));
      document.body.appendChild(script);
    });
  };

  // Actually connects real audio — this used to be a separate "Start Video
  // Call" step a user had to discover on their own; now it's what "Join
  // Voice Channel" does immediately. Starts with camera off (audio-only);
  // Jitsi's own native in-call toolbar (fully functional, unlike the fake
  // header buttons this replaces) lets the user turn video on from there.
  const connectJitsi = async (channel: Channel) => {
    setIsConnectingVoice(true);
    try {
      await loadJitsiScript();
    } catch {
      toast({ title: 'Voice call unavailable', description: 'Could not load the call — check your connection and try again.', variant: 'destructive' });
      setIsConnectingVoice(false);
      await handleLeaveVoice(channel);
      return;
    }
    if (!jitsiContainerRef.current || jitsiApiRef.current) {
      // Was a silent bail — isInVoice/the presence row stayed "connected"
      // with nothing actually running, an empty pane with no explanation.
      setIsConnectingVoice(false);
      await handleLeaveVoice(channel);
      return;
    }
    // Full channel.id (not the first 8 hex chars — only 32 bits, and this
    // is a public meet.jit.si room name, not a secret) plus stripping
    // everything except alphanumerics/hyphens, not just whitespace — a
    // channel named "Team A/B" previously produced a `/` in the room
    // name, which changes the Jitsi URL path and can collide with an
    // unrelated room.
    const roomName = `hackathon-${channel.name.replace(/[^a-zA-Z0-9]+/g, '-')}-${channel.id}`;
    let api: any;
    try {
      api = new (window as any).JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: { displayName: userName },
        // prejoinPageEnabled/join-leave notifications were both explicitly
        // suppressed before — on a platform for teen participants, that
        // meant no in-call awareness at all if someone unexpected entered.
        // community_channels' name/id are public (SELECT USING(true)), so
        // the room name above is derivable by anyone with the anon key
        // regardless of this app's UI — restoring Jitsi's own join/leave
        // announcements is the one mitigation available without a bigger
        // server-issued-room-token redesign (not attempted here — a
        // lobby needs a real "who becomes moderator" story that's easy to
        // get wrong and lock legitimate students out).
        configOverwrite: { startWithVideoMuted: true },
        interfaceConfigOverwrite: {},
      });
    } catch (e) {
      console.error('Jitsi failed to initialize:', e);
      toast({ title: 'Voice call unavailable', description: 'Could not start the call — try again in a moment.', variant: 'destructive' });
      setIsConnectingVoice(false);
      await handleLeaveVoice(channel);
      return;
    }
    jitsiApiRef.current = api;
    // Covers leaving via Jitsi's OWN native hang-up button — without this,
    // our presence row and isInVoice state would stay stuck "connected"
    // forever, the same phantom-participant bug fixed for tab-close and
    // channel-switch, just via a third path we hadn't closed yet.
    api.addListener('readyToClose', () => { handleLeaveVoice(channel); });

    // Previously nothing ever listened for whether the call actually
    // CONNECTED — setIsConnectingVoice(false) ran the instant the
    // constructor above returned, which only proves the iframe was
    // created, not that the WebRTC/XMPP media connection behind it
    // actually succeeded. A school firewall that allows HTTPS (so the
    // script loads fine) but blocks the UDP/TURN traffic Jitsi's actual
    // media connection needs — a real scenario for school-issued devices —
    // used to make FORGE's "Connecting to voice…" overlay disappear
    // almost immediately while the call itself silently never joined,
    // with zero FORGE-level explanation either way. Now the overlay only
    // clears on a real videoConferenceJoined confirmation, a genuine
    // connectionFailed/conferenceFailed is reported clearly, and a
    // timeout catches the case where neither ever fires at all.
    // 45s, not something tighter — Jitsi's own prejoin screen (letting a
    // student choose camera/mic settings before actually entering) means
    // videoConferenceJoined legitimately doesn't fire until THEY click
    // through it, which is real user deliberation time, not a stuck
    // connection. Long enough to not false-positive on that, short enough
    // to not leave someone staring at a truly broken connection forever.
    let settled = false;
    // Stored in a ref (not just a local const) so disposeJitsi — called
    // from a manual Disconnect click, not just the three paths below — can
    // cancel it too. A local-only timer had no way for an external
    // disconnect to reach in and clear it.
    connectTimeoutRef.current = setTimeout(() => {
      if (settled) return;
      settled = true;
      connectTimeoutRef.current = null;
      console.error('Jitsi connection timed out — videoConferenceJoined never fired');
      toast({ title: 'Could not connect to voice', description: 'The call never connected — this can happen on school/work networks that block video call traffic. Try a different network, or try again.', variant: 'destructive' });
      disposeJitsi();
      setIsConnectingVoice(false);
      handleLeaveVoice(channel);
    }, 45000);
    api.addListener('videoConferenceJoined', () => {
      if (settled) return;
      settled = true;
      if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null; }
      setIsConnectingVoice(false);
    });
    api.addListener('connectionFailed', () => {
      if (settled) return;
      settled = true;
      if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null; }
      toast({ title: 'Could not connect to voice', description: 'The connection failed — check your network and try again.', variant: 'destructive' });
      disposeJitsi();
      setIsConnectingVoice(false);
      handleLeaveVoice(channel);
    });
  };

  // connectJitsi needs jitsiContainerRef.current to already be in the DOM,
  // which only exists once `isInVoice` is true and React has committed that
  // render — calling it directly from handleJoinVoice would race the ref
  // (still null at that point, since state updates don't apply mid-function).
  // An effect fires after commit, so the container is guaranteed mounted.
  useEffect(() => {
    if (isInVoice && activeChannel?.channel_type === 'voice' && !jitsiApiRef.current) {
      connectJitsi(activeChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInVoice, activeChannel]);

  const handleJoinVoice = async () => {
    // The button had no in-flight guard — a fast double-click (easy on
    // mobile) fired two overlapping inserts against the unique
    // (channel_id, participant_email) constraint. The first succeeded and
    // connected real audio; the second hit a duplicate-key error and showed
    // "Could not join, try again" right after a real success.
    if (!activeChannel || isJoiningVoice) return;
    setIsJoiningVoice(true);

    // Routed through an RPC (not a raw insert) so joining as someone else's
    // email requires the same device token messages/reactions do — the old
    // USING(true) policy let anyone insert a fake "in voice" row for anyone.
    const { data, error } = await supabase.rpc('join_voice_room', {
      p_channel_id: activeChannel.id,
      p_participant_email: userEmail,
      p_participant_name: userName,
      p_device_token: deviceToken || null,
    });
    const result = Array.isArray(data) ? data[0] : data;

    if (error || !result?.ok) {
      setIsJoiningVoice(false);
      toast({ title: 'Could not join', description: result?.message || 'Something went wrong joining this voice channel — try again.', variant: 'destructive' });
      return;
    }
    if (result.new_device_token) setDeviceToken(result.new_device_token);
    // Set together so the very first render showing the Jitsi container
    // already shows the "Connecting…" spinner too, instead of a blank
    // frame before the effect below fires and flips this on.
    setIsConnectingVoice(true);
    setIsInVoice(true);
    setIsJoiningVoice(false);
    toast({ title: '🎤 Joined Voice', description: `You joined ${activeChannel.name}` });
  };

  const handleLeaveVoice = async (channel?: Channel) => {
    const target = channel ?? activeChannel;
    if (!target) return;

    // Set synchronously, before the RPC call — voicePresenceRef is
    // otherwise only kept in sync by a separate effect that flushes AFTER
    // isInVoice's setState below actually commits. The cross-tab-eviction
    // check in fetchAllVoiceParticipants reads this ref the instant any
    // realtime change lands, including the DELETE this very call is about
    // to cause — without updating it here first, a normal, intentional
    // Disconnect (or a channel switch) could race that realtime echo and
    // show a confusing "disconnected from another device" toast for a
    // disconnect the user just triggered themselves.
    voicePresenceRef.current = { ...voicePresenceRef.current, inVoice: false };
    disposeJitsi();
    // leave_voice_room now returns (ok, message) instead of RETURNS VOID —
    // it used to do a bare, no-error RETURN on a device-token mismatch
    // (the exact scenario named below: an early voice join before any
    // token has been minted), which meant checking `{ error }` alone could
    // never actually detect that failure. Checking `result.ok` instead.
    const { data, error } = await supabase.rpc('leave_voice_room', {
      p_channel_id: target.id,
      p_participant_email: userEmail,
      p_device_token: deviceToken || null,
    });
    const result = Array.isArray(data) ? data[0] : data;

    // Flipping this regardless of the result was exactly the phantom-
    // participant class the comments around this function already fixed
    // three other ways (beforeunload beacon, channel-switch cleanup,
    // dispose-on-unmount) — a failed RPC call here (network blip, or a
    // device-token mismatch) left the local UI saying "not in voice" while
    // the row lived on, showing this person as permanently connected to
    // everyone else.
    if (error || !result?.ok) {
      toast({ title: 'Could not leave voice cleanly', description: 'Refresh if you still show as connected to others.', variant: 'destructive' });
    }
    setIsInVoice(false);
  };

  // Clicking a different channel while connected to a voice room previously
  // left `isInVoice` true and never removed the voice_room_participants row
  // for the channel actually joined — the new channel's lobby would then
  // show "Disconnect" controls that delete a row that doesn't exist there,
  // leaving a phantom "in voice" participant behind in the old channel
  // forever (same class of bug as the tab-close leak fixed earlier, just
  // triggered by in-app navigation instead of unmount/close).
  const handleSelectChannel = async (channel: Channel) => {
    if (isInVoice && activeChannel && activeChannel.channel_type === 'voice' && activeChannel.id !== channel.id) {
      await handleLeaveVoice(activeChannel);
    }
    setActiveChannel(channel);
    setMobileSidebarOpen(false);
  };

  // The sidebar's "+" buttons used to be pure decoration — no click handler
  // at all, implying a feature (creating a channel) that never existed
  // anywhere in the app, admin panel included.
  const handleCreateChannel = async () => {
    if (!createChannelType || !newChannelName.trim()) return;
    setIsCreatingChannel(true);
    try {
      await callAdminAction('create_community_channel', {
        name: newChannelName.trim(),
        description: newChannelDescription.trim() || null,
        channel_type: createChannelType,
      });
      toast({ title: `#${newChannelName.trim()} created` });
      setCreateChannelType(null);
      setNewChannelName('');
      setNewChannelDescription('');
      fetchChannels();
    } catch (e: any) {
      toast({ title: 'Could not create channel', description: e.message || 'Something went wrong — try again.', variant: 'destructive' });
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const textChannels = channels.filter(c => c.channel_type === 'text');
  const voiceChannels = channels.filter(c => c.channel_type === 'voice');
  const announcementChannels = channels.filter(c => c.channel_type === 'announcement');
  // mutedUntil is only re-fetched on join, so a live time comparison (not
  // mere presence) matters — otherwise the composer would stay disabled
  // forever after the mute actually expires, until the next full reload.
  const isCurrentlyMuted = !!mutedUntil && new Date(mutedUntil) > new Date();

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

  const renderMessageContent = (content: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    for (const match of content.matchAll(MESSAGE_TOKEN_RE)) {
      const idx = match.index ?? 0;
      if (idx > lastIndex) nodes.push(content.slice(lastIndex, idx));
      const g = match.groups!;
      if (g.mentionName) {
        nodes.push(
          <span
            key={key++}
            className={`rounded px-1 font-medium ${g.mentionEmail === userEmail ? 'bg-[hsl(var(--discord-yellow)/0.25)] text-[hsl(var(--discord-yellow))]' : 'bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))]'}`}
          >
            @{g.mentionName}
          </span>
        );
      } else if (g.url) {
        nodes.push(
          <a key={key++} href={g.url} target="_blank" rel="noreferrer" className="text-[hsl(var(--discord-blurple))] hover:underline break-all">
            {g.url}
          </a>
        );
      } else if (g.bold) {
        nodes.push(<strong key={key++}>{g.bold}</strong>);
      } else if (g.code) {
        nodes.push(
          <code key={key++} className="bg-[hsl(var(--discord-dark))] px-1 py-0.5 rounded text-[0.85em] font-mono">
            {g.code}
          </code>
        );
      } else if (g.italic) {
        nodes.push(<em key={key++}>{g.italic}</em>);
      }
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < content.length) nodes.push(content.slice(lastIndex));
    return nodes;
  };

  const renderMessageBody = (message: Message) => {
    if (editingMessageId === message.id) {
      return (
        <div className="space-y-1.5">
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
              if (e.key === 'Escape') handleCancelEdit();
            }}
            autoFocus
            className="min-h-[60px] bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleSaveEdit} disabled={isSavingEdit || !editingContent.trim()}>
              {isSavingEdit ? 'Saving…' : 'Save'}
            </Button>
            <button onClick={handleCancelEdit} className="text-[11px] text-[hsl(var(--discord-text-muted))] hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      );
    }
    // whitespace-pre-wrap — without it, default white-space:normal collapsed
    // real newlines (now easy to type since the composer became a
    // multi-line Textarea with working Shift+Enter) into one run-on line
    // for every viewer. The DB always stored them correctly; this was
    // purely a display bug.
    return (
      <p className="text-[hsl(var(--discord-text))] break-words whitespace-pre-wrap leading-relaxed">
        {renderMessageContent(message.content)}
        {message.edited_at && (
          <span className="text-[10px] text-[hsl(var(--discord-text-muted))] ml-1">(edited)</span>
        )}
      </p>
    );
  };

  // Takes priority over the join screen below — otherwise a first-time
  // visitor arriving via invite link sees a flash of the empty join form
  // before their identity auto-fills from the (async) redeem call.
  if (isRedeemingInvite) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--discord-dark))] text-white p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 0 24px rgba(255,215,0,0.25)' }}
          >
            <Crown className="w-6 h-6 text-[#FFD700]" />
          </motion.div>
          <p className="text-sm font-medium text-white mb-1">Verifying your staff invite…</p>
          <p className="text-xs text-[hsl(var(--discord-text-muted))]">This only takes a second.</p>
        </motion.div>
      </div>
    );
  }

  // Join screen — full page now, not a modal
  if (!isJoined) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--discord-dark))] text-white p-4">
        <div className="w-full max-w-[420px] rounded-xl border border-[hsl(var(--discord-light))] bg-[hsl(var(--discord-darker))] p-6">
          <div className="flex items-center gap-3 text-white text-xl font-semibold mb-1">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--discord-blurple))] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            Join Hackathon Community
          </div>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-6">
            Enter your details to join the community chat.
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="community-join-name" className="text-sm font-medium text-[hsl(var(--discord-text))]">Display Name</label>
              <Input
                id="community-join-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="How others will see you"
                className="h-11 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:border-[hsl(var(--discord-blurple))] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="community-join-email" className="text-sm font-medium text-[hsl(var(--discord-text))]">Email Address</label>
              <Input
                id="community-join-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="your@email.com"
                className="h-11 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:border-[hsl(var(--discord-blurple))] transition-colors"
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
        </div>
      </div>
    );
  }

  // Profile setup — shown once, right after joining, only once we've
  // confirmed (via localStorage or the server check above) this email
  // genuinely doesn't have one yet. Skipped entirely for anyone who already
  // set one, including on a return visit.
  if (isJoined && !profileChecked) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--discord-dark))]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--discord-text-muted))]" />
      </div>
    );
  }
  if (isJoined && profileChecked && !(userUsername && userAvatarEmoji)) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--discord-dark))] text-white p-4">
        <div className="w-full max-w-[420px] rounded-xl border border-[hsl(var(--discord-light))] bg-[hsl(var(--discord-darker))] p-6">
          <div className="flex items-center gap-3 text-white text-xl font-semibold mb-1">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--discord-blurple))] flex items-center justify-center overflow-hidden">
              {profileAvatarInput && !failedAvatarSeeds.has(profileAvatarInput) ? (
                <img src={profileAvatarUrl(profileAvatarInput)} alt="" className="w-full h-full" onError={() => markAvatarSeedFailed(profileAvatarInput)} />
              ) : (
                <span className="text-lg">👤</span>
              )}
            </div>
            Set Up Your Profile
          </div>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-6">
            Pick a username and avatar — this is what other participants will see.
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="community-profile-username" className="text-sm font-medium text-[hsl(var(--discord-text))]">Username</label>
              <Input
                id="community-profile-username"
                value={profileUsernameInput}
                onChange={(e) => setProfileUsernameInput(e.target.value)}
                placeholder="3-20 letters, numbers, underscores"
                maxLength={20}
                className="h-11 bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:border-[hsl(var(--discord-blurple))] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-[hsl(var(--discord-text))]" id="community-profile-avatar-label">Avatar</span>
              <div className="grid grid-cols-6 gap-2" role="group" aria-labelledby="community-profile-avatar-label">
                {PROFILE_AVATAR_OPTIONS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setProfileAvatarInput(seed)}
                    title={seed}
                    className={`h-12 rounded-lg flex items-center justify-center overflow-hidden border transition-colors ${
                      profileAvatarInput === seed
                        ? 'bg-[hsl(var(--discord-blurple)/0.3)] border-[hsl(var(--discord-blurple))]'
                        : 'bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] hover:border-[hsl(var(--discord-blurple)/0.5)]'
                    }`}
                  >
                    {failedAvatarSeeds.has(seed) ? (
                      <span className="text-sm font-bold text-[hsl(var(--discord-text-muted))]">{firstChar(seed).toUpperCase()}</span>
                    ) : (
                      <img src={profileAvatarUrl(seed, 48)} alt={seed} loading="lazy" className="w-9 h-9" onError={() => markAvatarSeedFailed(seed)} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSetProfile}
                disabled={savingProfile}
                className="w-full h-11 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.85)] text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[hsl(var(--discord-dark))] text-white overflow-hidden flex flex-col">
        <div className="flex h-full relative">
          {/* Mobile sidebar backdrop */}
          {mobileSidebarOpen && (
            <div className="md:hidden absolute inset-0 z-30 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          )}

          {/* Channels Sidebar */}
          <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex w-64 flex-shrink-0 absolute md:relative inset-y-0 left-0 z-40 md:z-auto bg-[hsl(var(--discord-darker))] flex-col border-r border-[hsl(var(--discord-light)/0.15)]`}>
            {/* Server Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-darker))]">
              <h3 className="font-bold text-white truncate">Hackathon Hub</h3>
              <button onClick={() => setMobileSidebarOpen(false)} title="Close sidebar" aria-label="Close sidebar" className="md:hidden text-[hsl(var(--discord-text-muted))] hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {/* Online Status */}
                <div className="px-2 py-3 mb-2">
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text-muted))]">
                    <Circle className="w-2 h-2 fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))]" />
                    <span>{onlineCount || 1} online</span>
                  </div>
                  {isOrganizer && (
                    <button
                      onClick={openMutedUsersDialog}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors"
                    >
                      <VolumeX className="w-3 h-3" /> Muted users
                    </button>
                  )}
                </div>

                {/* Text Channels */}
                <div className="mb-4">
                  <div className="px-2 mb-1 flex items-center justify-between group">
                    <p className="text-[10px] font-bold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide">
                      Text Channels
                    </p>
                    {isOrganizer && (
                      <button
                        onClick={() => setCreateChannelType('text')}
                        title="Create text channel" aria-label="Create text channel"
                        // opacity-100 on mobile (no md: prefix) — hover has no
                        // touch equivalent, so a purely hover-gated button was
                        // technically tappable but invisible/undiscoverable on
                        // a touchscreen. md:opacity-0 restores the clean
                        // hover-to-reveal behavior on desktop, and
                        // group-focus-within covers keyboard users tabbing to it.
                        className="text-[hsl(var(--discord-text-muted))] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {textChannels.map((channel) => {
                    const Icon = getChannelIcon(channel.channel_type);
                    const isActive = activeChannel?.id === channel.id;
                    return (
                      <motion.button
                        key={channel.id}
                        onClick={() => handleSelectChannel(channel)}
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
                  <div className="px-2 mb-1 flex items-center justify-between group">
                    <p className="text-[10px] font-bold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide">
                      Voice Channels
                    </p>
                    {isOrganizer && (
                      <button
                        onClick={() => setCreateChannelType('voice')}
                        title="Create voice channel" aria-label="Create voice channel"
                        // opacity-100 on mobile (no md: prefix) — hover has no
                        // touch equivalent, so a purely hover-gated button was
                        // technically tappable but invisible/undiscoverable on
                        // a touchscreen. md:opacity-0 restores the clean
                        // hover-to-reveal behavior on desktop, and
                        // group-focus-within covers keyboard users tabbing to it.
                        className="text-[hsl(var(--discord-text-muted))] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {voiceChannels.map((channel) => {
                    const channelParticipants = voiceParticipants.filter(p => p.channel_id === channel.id);
                    const isActive = activeChannel?.id === channel.id;
                    return (
                      <div key={channel.id}>
                        <motion.button
                          onClick={() => handleSelectChannel(channel)}
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
                                {firstChar(participant.participant_name).toUpperCase()}
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
                          onClick={() => handleSelectChannel(channel)}
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
                    {firstChar(userName).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[hsl(var(--discord-green))] border-2 border-[hsl(var(--discord-dark))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-[10px] text-[hsl(var(--discord-text-muted))] truncate">Online</p>
                </div>
                <button
                  onClick={async () => {
                    // Switching identity while still connected to voice
                    // used to leave the call fully orphaned: this component
                    // doesn't unmount on setIsJoined(false) (it's an early
                    // `return` inside the same instance), so none of the
                    // unmount/channel-change cleanup that normally disposes
                    // Jitsi and removes the presence row ever ran. The
                    // outgoing person stayed "connected" forever, and the
                    // next person to join on this device inherited a dead
                    // Jitsi container with no actual call — leaveVoice
                    // handles both (disposeJitsi + the presence delete).
                    if (isInVoice) await handleLeaveVoice();
                    // Same shared-device reasoning as the credentials below
                    // — a push subscription bound to the outgoing person's
                    // email would keep delivering THEIR mention
                    // notifications (name + message preview) to whoever
                    // has the device next.
                    if (isSubscribedPush) await unsubscribeFromPush();
                    // The staff token AND the regular device token are both
                    // bearer credentials now (unlike the old PIN, which
                    // naturally expired with sessionStorage on tab close) —
                    // on a shared/kiosk device, leaving either behind would
                    // let the next person type this participant's email,
                    // land on the join screen still prefilled with it, and
                    // inherit full posting/edit/delete rights (or a staff
                    // badge) with zero proof of identity. Every identity-
                    // scoped key needs clearing here, not just the staff one.
                    setStaffToken('');
                    setDeviceToken('');
                    localStorage.removeItem('forge-student-name');
                    localStorage.removeItem('forge-student-email');
                    localStorage.removeItem('forge-student-username');
                    localStorage.removeItem('forge-student-avatar');
                    setUserName('');
                    setUserEmail('');
                    setUserUsername('');
                    setUserAvatarEmoji('');
                    setProfileChecked(false);
                    setIsJoined(false);
                  }}
                  title="Not you? Switch identity" aria-label="Switch identity"
                  className="p-1 text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors"
                >
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
                    <button onClick={() => setShowQuests(false)} title="Close quests panel" aria-label="Close quests panel" className="text-[hsl(var(--discord-text-muted))] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {quests.length === 0 && questsLoading && (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--discord-text-muted))]" />
                        </div>
                      )}
                      {quests.length === 0 && !questsLoading && questsError && (
                        <p className="text-xs text-[hsl(var(--discord-red))] text-center py-8 flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Couldn't load quests — try reopening this panel.
                        </p>
                      )}
                      {quests.length === 0 && !questsLoading && !questsError && (
                        <p className="text-xs text-[hsl(var(--discord-text-muted))] text-center py-8">No quests available right now.</p>
                      )}
                      {quests.map((quest) => {
                        const myStatus = myQuestStatus[quest.id];
                        const done = myStatus?.status === 'approved';
                        const pending = myStatus?.status === 'pending';
                        const rejected = myStatus?.status === 'rejected';
                        return (
                          <div key={quest.id} className={`rounded-lg p-3 border ${
                            done ? 'bg-[hsl(var(--discord-green)/0.1)] border-[hsl(var(--discord-green)/0.3)]'
                            : pending ? 'bg-[hsl(var(--discord-yellow)/0.08)] border-[hsl(var(--discord-yellow)/0.25)]'
                            : rejected ? 'bg-[hsl(var(--discord-red)/0.08)] border-[hsl(var(--discord-red)/0.25)]'
                            : 'bg-[hsl(var(--discord-light)/0.08)] border-[hsl(var(--discord-light)/0.2)]'
                          }`}>
                            <div className="flex items-start gap-2">
                              <span className="text-xl leading-none">{quest.badge_emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{quest.title}</p>
                                <p className="text-[11px] text-[hsl(var(--discord-text-muted))] mt-0.5">{quest.description}</p>
                                {/* chat_action quests are verified server-side
                                    by checking for a real post in
                                    action_channel_name (claim_community_quest)
                                    — but which channel that is used to appear
                                    NOWHERE on the card itself, only in the
                                    rejection message after a student clicked
                                    "I've done this" and failed. They had to
                                    guess, get rejected, then read the error
                                    to find out where to actually post. */}
                                {quest.quest_type === 'chat_action' && quest.action_channel_name && !done && (
                                  <p className="text-[11px] text-[hsl(var(--discord-blurple))] mt-0.5">
                                    Post in #{quest.action_channel_name} to complete this
                                  </p>
                                )}
                                {rejected && (
                                  <p className="text-[11px] text-[hsl(var(--discord-red))] mt-0.5">
                                    Not approved{myStatus?.rejection_reason ? `: ${myStatus.rejection_reason}` : ''} — try uploading a clearer screenshot.
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {done ? (
                                <span className="text-[11px] font-bold text-[hsl(var(--discord-green))] flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> {quest.badge_label} earned
                                </span>
                              ) : pending ? (
                                <span className="text-[11px] font-bold text-[hsl(var(--discord-yellow))] flex items-center gap-1">
                                  <Loader2 className="w-3.5 h-3.5" /> Waiting for organizer review
                                </span>
                              ) : (
                                <>
                                  {quest.quest_type === 'self_report' && quest.action_url && (
                                    <a href={quest.action_url} target="_blank" rel="noreferrer"
                                      aria-label={`Open link for ${quest.title}`}
                                      className="text-[11px] text-[hsl(var(--discord-blurple))] hover:underline">
                                      Open link →
                                    </a>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (quest.quest_type === 'proof_upload') {
                                        setProofUploadQuestId(quest.id);
                                        proofFileInputRef.current?.click();
                                      } else {
                                        handleClaimQuest(quest);
                                      }
                                    }}
                                    disabled={claimingQuestId === quest.id}
                                    aria-label={quest.quest_type === 'proof_upload' ? `Upload proof for ${quest.title}` : `Claim quest: ${quest.title}`}
                                    className="h-7 text-[11px] ml-auto"
                                  >
                                    {claimingQuestId === quest.id
                                      ? (quest.quest_type === 'proof_upload' ? 'Uploading...' : 'Checking...')
                                      : quest.quest_type === 'chat_action' ? "I've done this"
                                      : quest.quest_type === 'proof_upload' ? (rejected ? 'Try again' : 'Upload screenshot')
                                      : "I did this!"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  {/* Shared by every proof_upload quest card — see
                      handleProofFileSelected/proofUploadQuestId. */}
                  <input
                    ref={proofFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleProofFileSelected}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Channel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-dark))]">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setMobileSidebarOpen(true); setShowQuests(false); }} title="Open channel list" aria-label="Open channel list" className="md:hidden text-[hsl(var(--discord-text-muted))] hover:text-white flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </button>
                {activeChannel && (
                  <>
                    {(() => {
                      const Icon = getChannelIcon(activeChannel.channel_type);
                      return <Icon className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />;
                    })()}
                    {/* truncate + min-w-0 — channel names have no length
                        cap (server only rejects empty/whitespace-only), so
                        an organizer-created long name used to overflow this
                        header's justify-between row uncontained, unlike the
                        sidebar item and the description right next to this,
                        which both already truncate. */}
                    <span className="font-semibold text-white truncate min-w-0">{activeChannel.name}</span>
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
                {activeChannel && activeChannel.channel_type !== 'voice' && pinnedMessages.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[hsl(var(--discord-yellow))] hover:bg-[hsl(var(--discord-light)/0.15)] transition-colors">
                        <Pin className="w-4 h-4" />
                        {pinnedMessages.length}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 p-0 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))]"
                      side="bottom"
                      align="end"
                    >
                      <div className="px-3 py-2 border-b border-[hsl(var(--discord-light)/0.2)] text-xs font-bold uppercase tracking-wide text-[hsl(var(--discord-text-muted))]">
                        Pinned Messages
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {pinnedMessages.map((pm) => (
                          <div key={pm.id} className="px-3 py-2 border-b border-[hsl(var(--discord-light)/0.1)] last:border-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-white">{pm.sender_name}</span>
                              {isOrganizer && (
                                <button
                                  onClick={() => handleTogglePin(pm)}
                                  disabled={pinningMessageId === pm.id}
                                  className="text-[10px] text-[hsl(var(--discord-text-muted))] hover:text-white flex-shrink-0"
                                >
                                  Unpin
                                </button>
                              )}
                            </div>
                            {/* Through renderMessageContent, not raw text —
                                this was the one render path in the whole
                                file that skipped it, so a pinned message
                                containing an @mention showed the literal
                                "@[Name](email)" markup instead of the
                                highlighted pill every other view renders. */}
                            <p className="text-xs text-[hsl(var(--discord-text))] break-words whitespace-pre-wrap line-clamp-3">{renderMessageContent(pm.content)}</p>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {isPushSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleNotifications}
                    disabled={isSubscribingPush}
                    title={isSubscribedPush ? "Notifications on — click to turn off" : "Get notified about community activity"}
                    aria-label={isSubscribedPush ? "Turn off notifications" : "Turn on notifications"}
                    className={`${isSubscribedPush ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white`}
                  >
                    {isSubscribedPush ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => { setShowQuests(s => !s); setMobileSidebarOpen(false); }}
                  title="Community Quests" aria-label="Toggle Community Quests panel"
                  className={`${showQuests ? 'text-[hsl(var(--discord-yellow))]' : 'text-[hsl(var(--discord-text-muted))]'} hover:text-white gap-1.5 px-2.5`}
                >
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Quests</span>
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {activeChannel?.channel_type === 'voice' ? (
              // Voice Channel — real audio via Jitsi's External API, connected
              // the moment you join (not a separate, easy-to-miss step), with
              // Jitsi's own native mute/camera/hangup controls inside the
              // embed (fully functional, unlike the fake header buttons this
              // replaced).
              <div className="flex-1 flex flex-col">
                {isInVoice ? (
                  <div className="flex-1 relative">
                    <div ref={jitsiContainerRef} className="w-full h-full" />
                    {isConnectingVoice && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[hsl(var(--discord-dark))]">
                        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--discord-text-muted))]" />
                        <p className="text-sm text-[hsl(var(--discord-text-muted))]">Connecting to voice…</p>
                      </div>
                    )}
                    <Button
                      onClick={() => handleLeaveVoice()}
                      className="absolute top-4 right-4 bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)]"
                      size="sm"
                    >
                      <PhoneOff className="w-4 h-4 mr-1" />
                      Disconnect
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
                              {firstChar(participant.participant_name).toUpperCase()}
                            </div>
                            <span className="text-sm text-white mt-2">{participant.participant_name}</span>
                            {participant.participant_email === userEmail && (
                              <span className="text-[10px] text-[hsl(var(--discord-green))]">(you)</span>
                            )}
                          </motion.div>
                        ))}
                    </div>

                    {/* Mute used to only ever disable the text composer —
                        join_voice_room had no mute check at all, so a
                        muted participant could freely join and talk over
                        real Jitsi audio with nothing telling them mute was
                        text-only. Now enforced server-side too; this
                        proactively shows why instead of letting them click
                        through to a rejection toast. */}
                    {isCurrentlyMuted && !isStaffEmail ? (
                      <p className="text-sm text-[hsl(var(--discord-text-muted))]">
                        You're muted until {new Date(mutedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — this includes voice channels.
                        {mutedReason ? ` Reason: ${mutedReason}` : ''}
                      </p>
                    ) : (
                      <Button
                        onClick={handleJoinVoice}
                        disabled={isJoiningVoice}
                        className="bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] px-8 py-6 text-lg disabled:opacity-60"
                      >
                        {isJoiningVoice ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Phone className="w-5 h-5 mr-2" />}
                        {isJoiningVoice ? 'Joining…' : 'Join Voice Channel'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Text Channel
              <>
                <ScrollArea className="flex-1" ref={scrollRootRef}>
                  {/* pt-6 instead of p-4's default top — the reaction toolbar
                      pops up `-top-3` above whichever message it's attached
                      to, which for the very first message in the list had
                      barely any clearance before the scroll viewport's edge. */}
                  <div className="p-4 pt-6 pb-0">
                    {/* Load earlier messages — previously there was no way to
                        see anything before the newest page at all. */}
                    {hasMoreMessages && (
                      <div className="flex justify-center pb-4">
                        <button
                          onClick={loadOlderMessages}
                          disabled={isLoadingOlder}
                          className="text-xs font-medium text-[hsl(var(--discord-text-muted))] hover:text-white px-3 py-1.5 rounded-full border border-[hsl(var(--discord-light)/0.3)] hover:bg-[hsl(var(--discord-light)/0.15)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isLoadingOlder && <Loader2 className="w-3 h-3 animate-spin" />}
                          {isLoadingOlder ? 'Loading…' : 'Load earlier messages'}
                        </button>
                      </div>
                    )}
                    {/* Loading / error / genuinely-empty — these three used
                        to render identically once a failure toast faded,
                        showing an inviting "be the first to post!" message
                        over a channel whose history just failed to load. */}
                    {messages.length === 0 && isLoadingMessages && (
                      <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--discord-text-muted))]" />
                      </div>
                    )}
                    {messages.length === 0 && !isLoadingMessages && messagesLoadError && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Couldn't load messages</h3>
                        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto">
                          Switch to another channel and back, or refresh the page to try again.
                        </p>
                      </motion.div>
                    )}
                    {messages.length === 0 && !isLoadingMessages && !messagesLoadError && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <div className="w-16 h-16 rounded-full bg-[hsl(var(--discord-light)/0.3)] flex items-center justify-center mx-auto mb-4">
                          {activeChannel?.channel_type === 'announcement'
                            ? <Megaphone className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
                            : <Hash className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Welcome to #{activeChannel?.name || 'channel'}!</h3>
                        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto">
                          {activeChannel?.channel_type === 'announcement'
                            ? 'No announcements yet — check back here for official updates from the organizers.'
                            : `This is the start of the #${activeChannel?.name || 'channel'} channel. Say hello to your fellow hackers!`}
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
                        // Matches the RLS policy exactly (see the edit/delete
                        // migration) — staff-authored messages are excluded
                        // even if sender_email happens to equal the viewer's,
                        // since editing/deleting those has to go through the
                        // same verified path they were sent through, not this.
                        const isOwnEditableMessage = message.sender_email === userEmail && !staffByEmail[message.sender_email];

                        return (
                          <motion.div
                            key={message.id}
                            data-message-id={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onMouseEnter={() => setHoveredMessage(message.id)}
                            onMouseLeave={() => setHoveredMessage(null)}
                            // The edit/delete/pin/mute/remove toolbar below
                            // only exists in the DOM at all when
                            // hoveredMessage matches — mouse-only before
                            // this, since nothing here was focusable and
                            // the toolbar couldn't appear without a hover
                            // event a keyboard user never generates. tabIndex
                            // makes each message itself a tab stop; focusing
                            // it reveals the toolbar the same way hovering
                            // does, and the next Tab press lands on its
                            // first real button. onBlur only hides it once
                            // focus has left the WHOLE message subtree
                            // (not just moved from one toolbar button to
                            // the next), same "focus-within" logic
                            // :focus-within CSS would give for free.
                            onFocus={() => setHoveredMessage(message.id)}
                            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoveredMessage(null); }}
                            tabIndex={0}
                            className={`group relative ${showHeader ? 'mt-4 pt-1' : 'py-0.5'} hover:bg-[hsl(var(--discord-light)/0.05)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--discord-blurple))] px-2 -mx-2 rounded`}
                          >
                            {showHeader ? (
                              <div className="flex items-start gap-4">
                                {profileByEmail[message.sender_email]?.avatar_emoji && !failedAvatarSeeds.has(profileByEmail[message.sender_email].avatar_emoji) ? (
                                  <div
                                    className={`w-10 h-10 rounded-full overflow-hidden bg-[hsl(var(--discord-darker))] flex-shrink-0 ${staffByEmail[message.sender_email] ? 'ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[hsl(var(--discord-dark))]' : ''}`}
                                  >
                                    <img src={profileAvatarUrl(profileByEmail[message.sender_email].avatar_emoji, 40)} alt="" className="w-full h-full" loading="lazy" onError={() => markAvatarSeedFailed(profileByEmail[message.sender_email].avatar_emoji)} />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${staffByEmail[message.sender_email] ? 'ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[hsl(var(--discord-dark))]' : ''}`}
                                    style={{ backgroundColor: getAvatarColor(message.sender_name) }}
                                  >
                                    {firstChar(message.sender_name).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-white">
                                      {profileByEmail[message.sender_email]?.username || message.sender_name}
                                    </span>
                                    {staffByEmail[message.sender_email] && (
                                      // perspective on the wrapper, tilt on the
                                      // badge itself — same split needed for
                                      // any CSS 3D transform to foreshorten
                                      // instead of just squashing flat. Only
                                      // on hover (not an idle loop) since this
                                      // repeats once per staff message group —
                                      // an always-animating badge per message
                                      // would be noisy in a busy channel.
                                      <span style={{ perspective: 300 }} className="inline-block">
                                        <motion.span
                                          whileHover={{ rotateX: -12, rotateY: 14, scale: 1.08 }}
                                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700]/25 to-[#F7941D]/25 text-[#FFD700] border border-[#FFD700]/40 flex items-center gap-1"
                                        >
                                          {staffByEmail[message.sender_email].badge_emoji} {staffByEmail[message.sender_email].role_label}
                                        </motion.span>
                                      </span>
                                    )}
                                    {(badgesByEmail[message.sender_email] || []).map((badge, bi) => (
                                      <motion.span
                                        key={bi}
                                        title={badge.label}
                                        className="text-xs inline-block"
                                        whileHover={{ scale: 1.5, rotate: [0, -10, 10, 0] }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                                      >
                                        {badge.emoji}
                                      </motion.span>
                                    ))}
                                    <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">
                                      {formatTime(message.created_at)}
                                    </span>
                                    {message.pinned_at && (
                                      <span title="Pinned message" className="flex items-center gap-0.5 text-[10px] text-[hsl(var(--discord-yellow))]">
                                        <Pin className="w-3 h-3" /> Pinned
                                      </span>
                                    )}
                                  </div>
                                  {renderMessageBody(message)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-4">
                                <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">{renderMessageBody(message)}</div>
                              </div>
                            )}

                            {/* Reactions — the hover toolbar below (desktop-only, since
                                touch has no hover) is the only way to add a NEW reaction;
                                without this mobile-only button, phones could toggle an
                                existing reaction but could never be first to add one. */}
                            <div className="flex items-center gap-1 mt-1 ml-14">
                                {reactions.map((reaction) => (
                                  <motion.button
                                    key={reaction.emoji}
                                    layout
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    whileHover={{ scale: 1.12 }}
                                    whileTap={{ scale: 0.88 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                    title={reaction.names.join(', ')}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                      reaction.emails.includes(userEmail)
                                        ? 'bg-[hsl(var(--discord-blurple)/0.3)] border border-[hsl(var(--discord-blurple))]'
                                        : 'bg-[hsl(var(--discord-light)/0.3)] hover:bg-[hsl(var(--discord-light)/0.5)]'
                                    }`}
                                  >
                                    {/* Discord/Slack's own signature reaction-hover
                                        move — a little wiggle-bounce, not just a
                                        static emoji sitting there. */}
                                    <motion.span whileHover={{ scale: 1.35, rotate: [0, -12, 12, -6, 0] }} transition={{ duration: 0.4 }}>
                                      {reaction.emoji}
                                    </motion.span>
                                    <AnimatePresence mode="popLayout">
                                      <motion.span
                                        key={reaction.count}
                                        initial={{ y: -6, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 6, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-[hsl(var(--discord-text))]"
                                      >
                                        {reaction.count}
                                      </motion.span>
                                    </AnimatePresence>
                                  </motion.button>
                                ))}
                                <button
                                  onClick={() => setHoveredMessage(prev => prev === message.id ? null : message.id)}
                                  className="md:hidden p-1 rounded-full text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                                  aria-label="Add reaction"
                                >
                                  <SmilePlus className="w-3.5 h-3.5" />
                                </button>
                              </div>

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
                                    <motion.button
                                      key={emoji}
                                      whileHover={{ scale: 1.4, rotate: [0, -12, 12, -6, 0], transition: { duration: 0.4 } }}
                                      whileTap={{ scale: 0.85 }}
                                      onClick={() => handleReaction(message.id, emoji)}
                                      className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors text-sm"
                                    >
                                      {emoji}
                                    </motion.button>
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
                                          <motion.button
                                            key={emoji}
                                            whileHover={{ scale: 1.4, rotate: [0, -12, 12, -6, 0], transition: { duration: 0.4 } }}
                                            whileTap={{ scale: 0.85 }}
                                            onClick={() => handleReaction(message.id, emoji)}
                                            className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] rounded transition-colors text-lg"
                                          >
                                            {emoji}
                                          </motion.button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {isOwnEditableMessage && (
                                    <>
                                      <div className="w-px h-4 bg-[hsl(var(--discord-light)/0.3)] mx-0.5" />
                                      <button
                                        onClick={() => handleStartEdit(message)}
                                        title="Edit message" aria-label="Edit message"
                                        className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))]" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(message.id)}
                                        disabled={deletingMessageId === message.id}
                                        title="Delete message" aria-label="Delete message"
                                        className="p-1.5 hover:bg-[hsl(var(--discord-red)/0.2)] transition-colors"
                                      >
                                        {deletingMessageId === message.id
                                          ? <Loader2 className="w-3.5 h-3.5 text-[hsl(var(--discord-red))] animate-spin" />
                                          : <Trash2 className="w-3.5 h-3.5 text-[hsl(var(--discord-red))]" />}
                                      </button>
                                    </>
                                  )}
                                  {/* Organizer moderation. Pin and Remove both
                                      apply to ANY message including
                                      announcements (a typo'd announcement was
                                      otherwise permanent — pin_community_message/
                                      delete_community_message place no
                                      channel-type restriction server-side, this
                                      whole block used to gate the entire
                                      toolbar on channel_type !== 'announcement'
                                      regardless, contradicting its own old
                                      comment that "pinning applies to any
                                      message"). Mute stays excluded for
                                      announcements specifically — the sender
                                      is the synthetic team@forge.internal
                                      account, not a real muteable participant. */}
                                  {isOrganizer && (
                                    <>
                                      <div className="w-px h-4 bg-[hsl(var(--discord-light)/0.3)] mx-0.5" />
                                      {/* Announcements are always sender_email
                                          ='team@forge.internal', so
                                          isOwnEditableMessage above is never
                                          true for them — without this, fixing
                                          a typo meant deleting and reposting,
                                          which re-fires the full announcement
                                          push AND a duplicate mention notify,
                                          and loses any existing pin. */}
                                      {activeChannel?.channel_type === 'announcement' && (
                                        <button
                                          onClick={() => handleStartEdit(message)}
                                          title="Edit announcement" aria-label="Edit announcement"
                                          className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))]" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleTogglePin(message)}
                                        disabled={pinningMessageId === message.id}
                                        title={message.pinned_at ? 'Unpin message' : 'Pin message'} aria-label={message.pinned_at ? 'Unpin message' : 'Pin message'}
                                        className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                                      >
                                        {pinningMessageId === message.id
                                          ? <Loader2 className="w-3.5 h-3.5 text-[hsl(var(--discord-yellow))] animate-spin" />
                                          : message.pinned_at
                                            ? <PinOff className="w-3.5 h-3.5 text-[hsl(var(--discord-yellow))]" />
                                            : <Pin className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))]" />}
                                      </button>
                                      {!isOwnEditableMessage && (
                                        <>
                                          {/* Muting only ever blocked send_community_message —
                                              send_staff_message has never checked
                                              community_muted_users (a verified staff
                                              credential carries its own accountability).
                                              The button previously still rendered and
                                              "succeeded" for a staff-authored message,
                                              giving the organizer a false "Muted {name}"
                                              toast while that person kept posting
                                              immediately through their staff path. */}
                                          {activeChannel?.channel_type !== 'announcement' && !staffByEmail[message.sender_email] && (
                                            <button
                                              onClick={() => setMutingMessage(message)}
                                              title={`Mute ${message.sender_name}`} aria-label={`Mute ${message.sender_name}`}
                                              className="p-1.5 hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                                            >
                                              <VolumeX className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))]" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleDeleteAnyMessage(message.id)}
                                            disabled={deletingAnyMessageId === message.id}
                                            title="Remove message (organizer)" aria-label="Remove message (organizer)"
                                            className="p-1.5 hover:bg-[hsl(var(--discord-red)/0.2)] transition-colors"
                                          >
                                            {deletingAnyMessageId === message.id
                                              ? <Loader2 className="w-3.5 h-3.5 text-[hsl(var(--discord-red))] animate-spin" />
                                              : <ShieldAlert className="w-3.5 h-3.5 text-[hsl(var(--discord-red))]" />}
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
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
                    <span className="font-semibold">{typingUsers.join(', ')}</span> {typingUsers.length > 1 ? 'are' : 'is'} typing...
                  </div>
                )}

                {/* Mute banner — the disabled composer + its placeholder text
                    ("Muted until...") were previously the ONLY signal a
                    muted participant got, visually indistinguishable from
                    any other disabled state, and never explained WHY. A
                    persistent, visible banner (with the organizer's actual
                    reason, when they gave one) beats a teen having to infer
                    the reason entirely on their own from a countdown. */}
                {isCurrentlyMuted && !isStaffEmail && (
                  <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-[hsl(var(--discord-red)/0.1)] border border-[hsl(var(--discord-red)/0.25)] px-3 py-2 text-xs text-[hsl(var(--discord-red))]">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      You're muted until {new Date(mutedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                      {mutedReason ? ` Reason: ${mutedReason}` : ''}
                    </span>
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
                    staffToken ? (
                      <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#FFD700]/80">
                        <Crown className="w-3.5 h-3.5" /> Verified — your messages here show your staff badge
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg px-3 py-2 text-xs text-[hsl(var(--discord-text-muted))]">
                        <Crown className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                        This email is registered as staff — open your one-time invite link (ask your organizer) to unlock chatting with your badge.
                      </div>
                    )
                  )}
                  <div className="relative flex items-center gap-2 bg-[hsl(var(--discord-lighter))] rounded-lg px-4 py-3">
                    {/* @mention autocomplete — typing "@" used to just be a
                        literal character, with no way to address someone
                        specifically in a busy channel. */}
                    {mentionQuery !== null && mentionCandidates.length > 0 && (
                      <div
                        role="listbox"
                        id="mention-candidate-list"
                        aria-label="Mention suggestions"
                        className="absolute bottom-full left-0 mb-2 w-56 bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.3)] rounded-md shadow-lg overflow-hidden z-10"
                      >
                        {mentionCandidates.map((c, i) => (
                          <button
                            key={c.email}
                            id={`mention-option-${i}`}
                            role="option"
                            aria-selected={i === mentionActiveIndex}
                            onClick={() => handleSelectMention(c)}
                            onMouseEnter={() => setMentionActiveIndex(i)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${i === mentionActiveIndex ? 'bg-[hsl(var(--discord-blurple)/0.3)]' : 'hover:bg-[hsl(var(--discord-light)/0.15)]'}`}
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(c.name) }}
                            >
                              {firstChar(c.name).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white truncate leading-tight">{c.name}</p>
                              {/* Display names are self-asserted with no
                                  uniqueness check (see handleJoin) — showing
                                  the email is the only way to tell two
                                  same-named people apart in this dropdown. */}
                              <p className="text-[10px] text-[hsl(var(--discord-text-muted))] truncate leading-tight">{c.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Emoji Picker */}
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <button title="Add emoji" aria-label="Add emoji" className="text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-text))] transition-colors">
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

                    {/* Was a single-line <Input> — the onKeyDown handler's
                        own "!e.shiftKey" check on Enter implied Shift+Enter
                        should insert a newline, but a native <input> can't
                        hold newlines at all, so Shift+Enter silently did
                        nothing. A <Textarea> actually supports that,
                        matching Discord/Slack's own composer this UI
                        otherwise imitates closely. rows={1} + a capped
                        max-height keeps the common case (a short message)
                        looking identical to the old single-line box; it
                        only grows for genuinely multi-line content, then
                        scrolls internally past ~5 lines instead of growing
                        forever. */}
                    <Textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={handleMessageInputChange}
                      role={mentionQuery !== null && mentionCandidates.length > 0 ? 'combobox' : undefined}
                      aria-expanded={mentionQuery !== null && mentionCandidates.length > 0}
                      aria-controls={mentionQuery !== null && mentionCandidates.length > 0 ? 'mention-candidate-list' : undefined}
                      aria-activedescendant={mentionQuery !== null && mentionCandidates.length > 0 ? `mention-option-${mentionActiveIndex}` : undefined}
                      onKeyDown={(e) => {
                        if (mentionQuery !== null && mentionCandidates.length > 0) {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setMentionActiveIndex(i => (i + 1) % mentionCandidates.length); return; }
                          if (e.key === 'ArrowUp') { e.preventDefault(); setMentionActiveIndex(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length); return; }
                          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleSelectMention(mentionCandidates[mentionActiveIndex]); return; }
                          if (e.key === 'Escape') { setMentionQuery(null); return; }
                        }
                        // preventDefault matters here now in a way it didn't
                        // on a single-line <input> — without it, Enter both
                        // sends AND inserts a newline into the textarea a
                        // moment before it's cleared.
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                      }}
                      // The dropdown used to only ever close via the regex
                      // ceasing to match (more typing), Escape, or actually
                      // selecting a candidate — clicking the emoji-picker
                      // button, Send, a message bubble, or anywhere else
                      // left it visibly stuck open. A short delay (not an
                      // immediate close) lets a click ON a dropdown item
                      // (handleSelectMention, triggered by onClick) still
                      // register first — blur fires before click completes
                      // when moving focus by mouse, so closing instantly
                      // here would occasionally beat the selection to it.
                      onBlur={() => { setTimeout(() => setMentionQuery(null), 150); }}
                      disabled={isCurrentlyMuted && !isStaffEmail}
                      placeholder={isCurrentlyMuted && !isStaffEmail ? `Muted until ${new Date(mutedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : activeChannel?.channel_type === 'announcement' ? 'Post an announcement...' : `Message #${activeChannel?.name || 'channel'}`}
                      maxLength={MAX_MESSAGE_LENGTH}
                      rows={1}
                      className="flex-1 bg-transparent border-none text-white placeholder:text-[hsl(var(--discord-text-muted))] focus-visible:ring-0 resize-none min-h-0 max-h-32 py-1.5 leading-snug"
                    />
                    {/* Previously no client-side cap or counter at all — a
                        student only discovered the server's 4000-char limit
                        after hitting Send, via a generic rejection toast,
                        with no warning as they approached it. maxLength
                        above guarantees the server never rejects for length;
                        this counter only appears once it's actually close
                        enough to matter, not on every keystroke. */}
                    {newMessage.length > MAX_MESSAGE_LENGTH - 200 && (
                      <span className={`text-[10px] flex-shrink-0 tabular-nums ${newMessage.length >= MAX_MESSAGE_LENGTH ? 'text-[hsl(var(--discord-red))]' : 'text-[hsl(var(--discord-text-muted))]'}`}>
                        {newMessage.length}/{MAX_MESSAGE_LENGTH}
                      </span>
                    )}

                    <motion.button
                      onClick={handleSendMessage}
                      disabled={isSending || isPostingAnnouncement || !newMessage.trim()}
                      title="Send message" aria-label="Send message"
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

        {/* Create Channel — the sidebar's "+" buttons used to have no
            backing feature at all anywhere in the app; this is what makes
            them real. */}
        <Dialog open={!!createChannelType} onOpenChange={(open: boolean) => { if (!open) setCreateChannelType(null); }}>
          <DialogContent className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
            <DialogHeader>
              <DialogTitle>Create {createChannelType === 'voice' ? 'voice' : 'text'} channel</DialogTitle>
              <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
                Visible to everyone in the community immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label htmlFor="community-new-channel-name" className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  id="community-new-channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={createChannelType === 'voice' ? 'Study Room' : 'off-topic'}
                  maxLength={50}
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white"
                />
              </div>
              <div>
                <label htmlFor="community-new-channel-description" className="text-sm font-medium mb-1 block">Description (optional)</label>
                <Input
                  id="community-new-channel-description"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="What's this channel for?"
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateChannelType(null)}>Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={isCreatingChannel || !newChannelName.trim()}>
                {isCreatingChannel ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mute — previously an organizer had no way to stop a disruptive
            participant from continuing to post beyond removing their
            entire staff badge (which doesn't even apply to regular
            participants, who never had one to begin with). */}
        <Dialog open={!!mutingMessage} onOpenChange={(open: boolean) => { if (!open) setMutingMessage(null); }}>
          <DialogContent className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
            <DialogHeader>
              <DialogTitle>Mute {mutingMessage?.sender_name}</DialogTitle>
              <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
                They won't be able to post in any channel until the mute expires.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label htmlFor="community-mute-minutes" className="text-sm font-medium mb-1 block">Duration (minutes)</label>
                <Input
                  id="community-mute-minutes"
                  type="number"
                  min="1"
                  value={muteMinutes}
                  onChange={(e) => setMuteMinutes(e.target.value)}
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white"
                />
              </div>
              <div>
                <label htmlFor="community-mute-reason" className="text-sm font-medium mb-1 block">Reason (optional)</label>
                <Input
                  id="community-mute-reason"
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  placeholder="Spam, harassment, etc."
                  className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMutingMessage(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleMuteUser} disabled={isMuting}>
                {isMuting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Mute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Muted users roster — the other half of moderation that had no UI
            at all: mute_community_user could put someone in timeout, but
            nothing showed who was currently muted or let an organizer lift
            it early short of re-muting for 1 minute as a workaround. */}
        <Dialog open={mutedUsersDialogOpen} onOpenChange={setMutedUsersDialogOpen}>
          <DialogContent className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
            <DialogHeader>
              <DialogTitle>Muted Users</DialogTitle>
              <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
                Currently muted participants across all channels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {loadingMutedUsers ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--discord-text-muted))]" /></div>
              ) : mutedUsersList.length === 0 ? (
                <p className="text-sm text-[hsl(var(--discord-text-muted))] text-center py-6">No one is currently muted.</p>
              ) : (
                mutedUsersList.map(m => (
                  <div key={m.participant_email} className="flex items-center justify-between gap-2 p-2 rounded bg-[hsl(var(--discord-dark))]">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{m.participant_email}</p>
                      <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                        Until {new Date(m.muted_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.reason ? ` — ${m.reason}` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" disabled={unmutingEmail === m.participant_email} onClick={() => handleUnmute(m.participant_email)}>
                      {unmutingEmail === m.participant_email ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unmute'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};
