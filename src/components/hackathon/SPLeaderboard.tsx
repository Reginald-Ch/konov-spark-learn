import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown, Medal, Flame, Users } from 'lucide-react';
import { ParticipantStatsPanel } from './ParticipantStatsPanel';
import { MedalIcon } from './MedalIcon';
import { toast } from 'sonner';

interface RankedParticipant {
  key: string;
  name: string;
  sp: number;
  badges: { gold: number; silver: number; bronze: number };
  onTimeCount: number;
  rank: number;
}

export const SPLeaderboard = ({ hackathonId }: { hackathonId: string | null }) => {
  const [participants, setParticipants] = useState<RankedParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const fetchErrorShownRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!hackathonId) { setParticipants([]); setIsLoading(false); return; }
    try {
      // Routed through SECURITY DEFINER RPCs instead of raw table selects —
      // point_events/hackathon_registrations/challenge_submissions all have
      // an open public SELECT policy, so a direct client-side select here
      // handed every visitor every registrant's real email address. Each
      // RPC returns md5(lower(trim(email))) instead — the client can still
      // join rows together by key, it just never sees the address itself.
      const [spRes, badgeRes, regRes, onTimeRes] = await Promise.all([
        supabase.rpc('get_hackathon_sp_events', { p_hackathon_id: hackathonId }),
        supabase.rpc('get_hackathon_badge_events', { p_hackathon_id: hackathonId }),
        supabase.rpc('get_hackathon_registered_participants', { p_hackathon_id: hackathonId }),
        // On Time badge count — replaces the old Boost Token currency. Reads
        // the timeliness component that's already part of auto_score instead
        // of tracking a separate reward, so it can't double-count SP.
        supabase.rpc('get_hackathon_ontime_submissions', { p_hackathon_id: hackathonId }),
      ]);

      if (!isMountedRef.current) return;

      // None of these four .error fields were ever checked — a failed RPC
      // rendered indistinguishably from a genuinely empty leaderboard.
      // Deduped so a persistent failure across repeated polls doesn't
      // stack a toast every cycle, matching the pattern already used for
      // the same issue in Leaderboard.tsx.
      const firstError = spRes.error || badgeRes.error || regRes.error || onTimeRes.error;
      if (firstError) {
        console.error('SPLeaderboard fetch error:', firstError);
        if (!fetchErrorShownRef.current) {
          fetchErrorShownRef.current = true;
          toast.error('Could not load the leaderboard.', { id: 'sp-leaderboard-fetch-error' });
        }
      } else if (fetchErrorShownRef.current) {
        fetchErrorShownRef.current = false;
        toast.dismiss('sp-leaderboard-fetch-error');
      }

      const nameMap = new Map<string, string>();
      (regRes.data || []).forEach((r: any) => nameMap.set(r.participant_key, r.participant_name));

      const spMap = new Map<string, number>();
      (spRes.data || []).forEach((row: any) => {
        spMap.set(row.participant_key, (spMap.get(row.participant_key) || 0) + row.points);
      });

      const badgeMap = new Map<string, { gold: number; silver: number; bronze: number }>();
      (badgeRes.data || []).forEach((row: any) => {
        const tier = row.metadata?.tier as 'gold' | 'silver' | 'bronze';
        if (!tier) return;
        const existing = badgeMap.get(row.participant_key) || { gold: 0, silver: 0, bronze: 0 };
        existing[tier] += 1;
        badgeMap.set(row.participant_key, existing);
      });

      const onTimeMap = new Map<string, number>();
      (onTimeRes.data || []).forEach((row: any) => {
        if (row.timeliness !== 10) return;
        onTimeMap.set(row.participant_key, (onTimeMap.get(row.participant_key) || 0) + 1);
      });

      const keys = new Set([...spMap.keys(), ...badgeMap.keys(), ...onTimeMap.keys()]);
      const ranked = [...keys]
        .map(key => ({
          key,
          name: nameMap.get(key) || 'A FORGE Builder',
          sp: spMap.get(key) || 0,
          badges: badgeMap.get(key) || { gold: 0, silver: 0, bronze: 0 },
          onTimeCount: onTimeMap.get(key) || 0,
          rank: 0,
        }))
        .sort((a, b) => b.sp - a.sp || a.name.localeCompare(b.name))
        .map((p, i) => ({ ...p, rank: i + 1 }));

      if (isMountedRef.current) setParticipants(ranked);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [hackathonId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeaderboard(), 800);
  }, [fetchLeaderboard]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLeaderboard();
    if (!hackathonId) return;
    const channel = supabase
      .channel(`sp-leaderboard-${hackathonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_events', filter: `hackathon_id=eq.${hackathonId}` }, () => debouncedFetch())
      .subscribe();
    // point_events lost all anon/authenticated table privileges in a later
    // security fix (20260903000001) — Supabase Realtime evaluates each row
    // against the connecting role's own grants before ever broadcasting
    // it, so with zero privileges this subscription silently stopped
    // delivering events entirely. Same bug class already fixed this
    // session in Leaderboard.tsx/DailyChallengePanel.tsx via the same 20s
    // polling fallback.
    const pollId = setInterval(() => fetchLeaderboard(), 20000);
    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      clearInterval(pollId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hackathonId, fetchLeaderboard, debouncedFetch]);

  // No dedicated silver/bronze token exists in this app's discord-* palette
  // — gold/silver/bronze map onto the three progressively dimmer tones
  // actually available (yellow/text/text-muted), matching the identical
  // substitution already made in Leaderboard.tsx.
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <><Crown className="w-5 h-5 text-[hsl(var(--discord-yellow))]" /><span className="sr-only">1st place</span></>;
      case 1: return <><Medal className="w-5 h-5 text-[hsl(var(--discord-text))]" /><span className="sr-only">2nd place</span></>;
      case 2: return <><Medal className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" /><span className="sr-only">3rd place</span></>;
      default: return <span className="text-[hsl(var(--discord-text-muted))] font-medium w-5 text-center text-sm">#{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-[hsl(var(--discord-yellow)/0.2)] border-[hsl(var(--discord-yellow)/0.3)]';
      case 1: return 'bg-[hsl(var(--discord-text)/0.15)] border-[hsl(var(--discord-text)/0.25)]';
      case 2: return 'bg-[hsl(var(--discord-text-muted)/0.2)] border-[hsl(var(--discord-text-muted)/0.3)]';
      default: return 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)]';
    }
  };

  return (
    <div className="h-full">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-[hsl(var(--discord-text-muted))] text-sm">Daily Challenge SP · accumulates every day of the event</p>
          </div>
        </div>
      </div>

      <ParticipantStatsPanel hackathonId={hackathonId} />

      {!hackathonId ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
          <p className="text-[hsl(var(--discord-text-muted))]">No hackathon is live right now — the leaderboard will populate once one starts.</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)] inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
            <span className="text-sm text-white font-semibold">{participants.length}</span>
            <span className="text-xs text-[hsl(var(--discord-text-muted))]">ranked</span>
          </div>
        </div>
      )}

      <ScrollArea className="h-[420px] pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : participants.length === 0 ? (
          hackathonId && (
            <div className="text-center py-12">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
              <p className="text-[hsl(var(--discord-text-muted))]">No SP earned yet — complete a daily challenge to get on the board!</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {participants.map((p, index) => (
                <motion.div
                  key={p.key}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`rounded-lg border p-3 flex items-center gap-3 ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">{getRankIcon(index)}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{
                    background: index === 0 ? 'hsl(var(--discord-yellow))' : index === 1 ? 'hsl(var(--discord-text))' : index === 2 ? 'hsl(var(--discord-text-muted))' : 'hsl(var(--discord-blurple))'
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate text-sm">{p.name}</h4>
                    {(p.badges.gold + p.badges.silver + p.badges.bronze + p.onTimeCount) > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--discord-text-muted))]">
                        {p.badges.gold > 0 && <span className="inline-flex items-center gap-0.5"><MedalIcon tier="gold" size={11} />×{p.badges.gold}</span>}
                        {p.badges.silver > 0 && <span className="inline-flex items-center gap-0.5"><MedalIcon tier="silver" size={11} />×{p.badges.silver}</span>}
                        {p.badges.bronze > 0 && <span className="inline-flex items-center gap-0.5"><MedalIcon tier="bronze" size={11} />×{p.badges.bronze}</span>}
                        {p.onTimeCount > 0 && <span className="inline-flex items-center gap-0.5">⚡×{p.onTimeCount}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))] flex-shrink-0">
                    <Flame className="w-4 h-4" />
                    <span className="font-bold">{p.sp}</span>
                    <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">SP</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
