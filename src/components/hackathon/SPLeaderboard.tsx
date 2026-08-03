import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown, Medal, Flame, Users } from 'lucide-react';
import { ParticipantStatsPanel } from './ParticipantStatsPanel';

interface RankedParticipant {
  email: string;
  name: string;
  sp: number;
  badges: { gold: number; silver: number; bronze: number };
  rank: number;
}

const BADGE_ICON: Record<'gold' | 'silver' | 'bronze', string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export const SPLeaderboard = ({ hackathonId }: { hackathonId: string | null }) => {
  const [participants, setParticipants] = useState<RankedParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!hackathonId) { setParticipants([]); setIsLoading(false); return; }
    try {
      const [spRes, badgeRes, regRes] = await Promise.all([
        supabase.from('point_events').select('participant_email, points').eq('hackathon_id', hackathonId).eq('event_type', 'daily_challenge_sp'),
        supabase.from('point_events').select('participant_email, metadata').eq('hackathon_id', hackathonId).eq('event_type', 'badge_award'),
        supabase.from('hackathon_registrations').select('participant_email, participant_name').eq('hackathon_id', hackathonId),
      ]);

      if (!isMountedRef.current) return;

      const nameMap = new Map<string, string>();
      (regRes.data || []).forEach((r: any) => nameMap.set(r.participant_email, r.participant_name));

      const spMap = new Map<string, number>();
      (spRes.data || []).forEach((row: any) => {
        spMap.set(row.participant_email, (spMap.get(row.participant_email) || 0) + row.points);
      });

      const badgeMap = new Map<string, { gold: number; silver: number; bronze: number }>();
      (badgeRes.data || []).forEach((row: any) => {
        const tier = row.metadata?.tier as 'gold' | 'silver' | 'bronze';
        if (!tier) return;
        const existing = badgeMap.get(row.participant_email) || { gold: 0, silver: 0, bronze: 0 };
        existing[tier] += 1;
        badgeMap.set(row.participant_email, existing);
      });

      const emails = new Set([...spMap.keys(), ...badgeMap.keys()]);
      const ranked = [...emails]
        .map(email => ({
          email,
          name: nameMap.get(email) || email.split('@')[0],
          sp: spMap.get(email) || 0,
          badges: badgeMap.get(email) || { gold: 0, silver: 0, bronze: 0 },
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
    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hackathonId, fetchLeaderboard, debouncedFetch]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1: return <Medal className="w-5 h-5 text-slate-200" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-[hsl(var(--discord-text-muted))] font-medium w-5 text-center text-sm">#{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500/20 border-yellow-500/30';
      case 1: return 'bg-gray-400/15 border-gray-400/25';
      case 2: return 'bg-amber-600/20 border-amber-600/30';
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
              <p className="text-[hsl(var(--discord-text-muted))]">No SP earned yet today — complete a daily challenge to get on the board!</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {participants.map((p, index) => (
                <motion.div
                  key={p.email}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`rounded-lg border p-3 flex items-center gap-3 ${getRankBg(index)}`}
                >
                  <div className="flex-shrink-0">{getRankIcon(index)}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{
                    background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#5865F2'
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate text-sm">{p.name}</h4>
                    {(p.badges.gold + p.badges.silver + p.badges.bronze) > 0 && (
                      <p className="text-[11px] text-[hsl(var(--discord-text-muted))]">
                        {p.badges.gold > 0 && `${BADGE_ICON.gold}×${p.badges.gold} `}
                        {p.badges.silver > 0 && `${BADGE_ICON.silver}×${p.badges.silver} `}
                        {p.badges.bronze > 0 && `${BADGE_ICON.bronze}×${p.badges.bronze}`}
                      </p>
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
