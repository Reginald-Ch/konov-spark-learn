import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Crown, Medal, Users } from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { toast } from 'sonner';

interface RankedLearner {
  key: string;
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
  const fetchErrorShownRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!hackathonId) { setLearners([]); setIsLoading(false); return; }
    try {
      // Routed through SECURITY DEFINER RPCs instead of raw table selects —
      // point_events/hackathon_registrations both have an open public
      // SELECT policy, so a direct client-side select here handed every
      // visitor every registrant's real email address. Each RPC returns
      // md5(lower(trim(email))) instead of the address itself.
      //
      // The coins query is deliberately NOT scoped to hackathonId — lesson
      // coins are a lifetime learning total (matching lesson_progress,
      // which has never been per-event), not a per-event competition score
      // like SP or Project Score. Only WHO shows up on this board is
      // event-scoped (this event's registered participants); each of
      // their coin totals reflects everything they've ever earned.
      const [coinRes, regRes] = await Promise.all([
        supabase.rpc('get_lesson_coin_events'),
        supabase.rpc('get_hackathon_registered_participants', { p_hackathon_id: hackathonId }),
      ]);

      if (!isMountedRef.current) return;

      // Neither .error was ever checked — a failed RPC (bad params,
      // transient DB issue) rendered indistinguishably from a genuinely
      // empty leaderboard, with nothing telling a participant or organizer
      // something was actually broken. Deduped so a persistent failure
      // across repeated polls doesn't stack a toast every cycle, matching
      // the pattern already used for the same issue in Leaderboard.tsx.
      if (coinRes.error || regRes.error) {
        console.error('LessonsLeaderboard fetch error:', coinRes.error || regRes.error);
        if (!fetchErrorShownRef.current) {
          fetchErrorShownRef.current = true;
          toast.error('Could not load the learning leaderboard.', { id: 'lessons-leaderboard-fetch-error' });
        }
      } else if (fetchErrorShownRef.current) {
        fetchErrorShownRef.current = false;
        toast.dismiss('lessons-leaderboard-fetch-error');
      }

      const nameMap = new Map<string, string>();
      (regRes.data || []).forEach((r: any) => nameMap.set(r.participant_key, r.participant_name));

      const coinMap = new Map<string, number>();
      const countMap = new Map<string, number>();
      (coinRes.data || []).forEach((row: any) => {
        if (!nameMap.has(row.participant_key)) return; // not registered for this event
        coinMap.set(row.participant_key, (coinMap.get(row.participant_key) || 0) + row.points);
        countMap.set(row.participant_key, (countMap.get(row.participant_key) || 0) + 1);
      });

      const ranked = [...coinMap.keys()]
        .map(key => ({
          key,
          name: nameMap.get(key) || 'A FORGE Builder',
          coins: coinMap.get(key) || 0,
          lessonsPassed: countMap.get(key) || 0,
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
              <p className="text-[hsl(var(--discord-text-muted))]">No lessons passed yet — finish one in the AI &amp; ML Academy to get on the board!</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {learners.map((p, index) => (
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
                    <p className="text-[11px] text-[hsl(var(--discord-text-muted))]">{p.lessonsPassed} lesson{p.lessonsPassed === 1 ? '' : 's'} passed</p>
                  </div>
                  <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))] flex-shrink-0">
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
