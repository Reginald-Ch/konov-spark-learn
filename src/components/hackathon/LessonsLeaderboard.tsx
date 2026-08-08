import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Crown, Medal, Users } from 'lucide-react';
import { CoinIcon } from './CoinIcon';

interface RankedLearner {
  email: string;
  name: string;
  coins: number;
  lessonsPassed: number;
  rank: number;
}

// Mirrors SPLeaderboard's structure exactly, but ranks by lesson_coin
// totals instead of daily_challenge_sp — kept as a separate leaderboard on
// purpose rather than folded into either SPLeaderboard or the main
// project-quality Leaderboard, since "how much of the course have you
// done" is a different axis from "how good is your submitted project" or
// "how many daily challenges have you cleared." Each of the three tracks
// its own point_events event_type independently.
export const LessonsLeaderboard = ({ hackathonId }: { hackathonId: string | null }) => {
  const [learners, setLearners] = useState<RankedLearner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!hackathonId) { setLearners([]); setIsLoading(false); return; }
    try {
      // The coins query is deliberately NOT scoped to hackathonId — lesson
      // coins are a lifetime learning total (matching lesson_progress,
      // which has never been per-event), not a per-event competition score
      // like SP or Project Score. Only WHO shows up on this board is
      // event-scoped (this event's registered participants); each of
      // their coin totals reflects everything they've ever earned.
      const [coinRes, regRes] = await Promise.all([
        supabase.from('point_events').select('participant_email, points').eq('event_type', 'lesson_coin'),
        supabase.from('hackathon_registrations').select('participant_email, participant_name').eq('hackathon_id', hackathonId),
      ]);

      if (!isMountedRef.current) return;

      const nameMap = new Map<string, string>();
      (regRes.data || []).forEach((r: any) => nameMap.set(r.participant_email, r.participant_name));

      const coinMap = new Map<string, number>();
      const countMap = new Map<string, number>();
      (coinRes.data || []).forEach((row: any) => {
        if (!nameMap.has(row.participant_email)) return; // not registered for this event
        coinMap.set(row.participant_email, (coinMap.get(row.participant_email) || 0) + row.points);
        countMap.set(row.participant_email, (countMap.get(row.participant_email) || 0) + 1);
      });

      const ranked = [...coinMap.keys()]
        .map(email => ({
          email,
          name: nameMap.get(email) || email.split('@')[0],
          coins: coinMap.get(email) || 0,
          lessonsPassed: countMap.get(email) || 0,
          rank: 0,
        }))
        .sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name))
        .map((p, i) => ({ ...p, rank: i + 1 }));

      if (isMountedRef.current) setLearners(ranked);
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
      .channel(`lessons-leaderboard-${hackathonId}`)
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
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Learning Leaderboard</h2>
            <p className="text-[hsl(var(--discord-text-muted))] text-sm">Ranked by lesson coins — 10 per lesson passed. Lifetime total, not just this event.</p>
          </div>
        </div>
      </div>

      {!hackathonId ? (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
          <p className="text-[hsl(var(--discord-text-muted))]">No hackathon is live right now — the leaderboard will populate once one starts.</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)] inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
            <span className="text-sm text-white font-semibold">{learners.length}</span>
            <span className="text-xs text-[hsl(var(--discord-text-muted))]">ranked</span>
          </div>
        </div>
      )}

      <ScrollArea className="h-[420px] pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : learners.length === 0 ? (
          hackathonId && (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
              <p className="text-[hsl(var(--discord-text-muted))]">No lessons passed yet today — finish one in the AI &amp; ML Academy to get on the board!</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {learners.map((p, index) => (
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
                    <p className="text-[11px] text-[hsl(var(--discord-text-muted))]">{p.lessonsPassed} lesson{p.lessonsPassed === 1 ? '' : 's'} passed</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 flex-shrink-0">
                    <CoinIcon size={14} />
                    <span className="font-bold">{p.coins}</span>
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
