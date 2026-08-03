import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Coins, KeyRound, Zap, Trophy, Gift, Sparkles, Medal } from 'lucide-react';

interface Stats {
  sp: number;
  coins: number;
  keys: number;
  boostTokens: number;
  badges: { tier: 'gold' | 'silver' | 'bronze'; challenge_id: string }[];
}

interface UnopenedBox {
  id: string;
  box_type: 'issue' | 'mission';
  contents_label: string | null;
}

const emptyStats: Stats = { sp: 0, coins: 0, keys: 0, boostTokens: 0, badges: [] };

const useCountUp = (target: number, durationMs = 800) => {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    let raf: number;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
};

const StatTile = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => {
  const animated = useCountUp(value);
  return (
    <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)] flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-none">{animated}</p>
        <p className="text-[10px] text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  );
};

const BADGE_META: Record<string, { label: string; color: string }> = {
  gold: { label: 'Gold', color: '#FFD700' },
  silver: { label: 'Silver', color: '#C0C0C0' },
  bronze: { label: 'Bronze', color: '#CD7F32' },
};

export const ParticipantStatsPanel = ({ hackathonId }: { hackathonId: string | null }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [unopenedBoxes, setUnopenedBoxes] = useState<UnopenedBox[]>([]);
  const [openingBoxId, setOpeningBoxId] = useState<string | null>(null);
  const [justOpened, setJustOpened] = useState<UnopenedBox | null>(null);

  useEffect(() => {
    setEmail(localStorage.getItem('forge-student-email'));
  }, []);

  const fetchStats = useCallback(async () => {
    if (!email || !hackathonId) return;
    const [pointsRes, boxesRes] = await Promise.all([
      supabase.from('point_events').select('event_type, points, metadata').eq('hackathon_id', hackathonId).eq('participant_email', email),
      // reward_boxes has no public SELECT policy (a participant could otherwise
      // list everyone's boxes and open them) — this RPC is scoped to the
      // caller's own claimed email server-side.
      supabase.rpc('get_my_reward_boxes', { p_participant_email: email, p_hackathon_id: hackathonId }),
    ]);

    const next: Stats = { ...emptyStats, badges: [] };
    (pointsRes.data || []).forEach((row: any) => {
      if (row.event_type === 'daily_challenge_sp') next.sp += row.points;
      else if (row.event_type === 'forge_coin_grant' || row.event_type === 'forge_coin_adjust') next.coins += row.points;
      else if (row.event_type === 'forge_key') next.keys += row.points;
      else if (row.event_type === 'boost_token') next.boostTokens += row.points;
      else if (row.event_type === 'badge_award') next.badges.push({ tier: row.metadata?.tier, challenge_id: row.metadata?.challenge_id });
    });
    setStats(next);
    setUnopenedBoxes(((boxesRes.data as any[]) || []).filter(b => b.status === 'unopened'));
  }, [email, hackathonId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // point_events is still publicly readable (it's what drives the visible
  // leaderboard), so realtime push still works for SP/coins/keys/tokens.
  // reward_boxes is now private, which means Realtime (governed by the same
  // RLS) can no longer push box changes to an anon client — poll for those
  // instead, on a light interval, rather than relying on a push we can't get.
  useEffect(() => {
    if (!email || !hackathonId) return;
    const channel = supabase
      .channel(`participant-stats-${email}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_events', filter: `participant_email=eq.${email}` }, () => fetchStats())
      .subscribe();
    const pollId = setInterval(fetchStats, 20000);
    return () => { supabase.removeChannel(channel); clearInterval(pollId); };
  }, [email, hackathonId, fetchStats]);

  const handleOpenBox = async (box: UnopenedBox) => {
    if (!email) return;
    setOpeningBoxId(box.id);
    const { error } = await supabase.rpc('open_reward_box', { p_box_id: box.id, p_participant_email: email });
    setOpeningBoxId(null);
    if (!error) {
      setUnopenedBoxes(prev => prev.filter(b => b.id !== box.id));
      setJustOpened(box);
      setTimeout(() => setJustOpened(null), 3200);
    }
  };

  if (!hackathonId) return null;

  if (!email) {
    return (
      <div className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] p-4 text-center text-sm text-[hsl(var(--discord-text-muted))] mb-5">
        Register or publish a project to start tracking your Forge stats.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <StatTile icon={<Trophy className="w-4 h-4" />} label="SP Points" value={stats.sp} color="#F7941D" />
        <StatTile icon={<Coins className="w-4 h-4" />} label="Forge Coins" value={stats.coins} color="#FFD700" />
        <StatTile icon={<KeyRound className="w-4 h-4" />} label="Forge Keys" value={stats.keys} color="#5865F2" />
        <StatTile icon={<Zap className="w-4 h-4" />} label="Boost Tokens" value={stats.boostTokens} color="#57F287" />
      </div>

      {stats.badges.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {stats.badges.map((b, i) => {
            const meta = BADGE_META[b.tier];
            if (!meta) return null;
            return (
              <motion.div
                key={`${b.challenge_id}-${i}`}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: i * 0.05 }}
                className="w-7 h-7 rounded-full flex items-center justify-center border-2"
                style={{ background: `${meta.color}20`, borderColor: meta.color }}
                title={`${meta.label} — Day badge`}
              >
                <Medal className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {unopenedBoxes.map(box => (
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#FFD700]/10 to-[#F7941D]/10 border border-[#FFD700]/30 rounded-lg p-3 mb-2"
          >
            <div className="flex items-center gap-2">
              {box.box_type === 'mission' ? <Sparkles className="w-5 h-5 text-[#FFD700]" /> : <Gift className="w-5 h-5 text-[#F7941D]" />}
              <div>
                <p className="text-sm font-semibold text-white">{box.box_type === 'mission' ? 'Mission Bonus unlocked!' : 'Issue Box unlocked!'}</p>
                <p className="text-xs text-[hsl(var(--discord-text-muted))]">Tap to open</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenBox(box)}
              disabled={openingBoxId === box.id}
              className="px-3 py-1.5 rounded-md text-xs font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}
            >
              {openingBoxId === box.id ? 'Opening…' : 'Open'}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {justOpened && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="text-center bg-[hsl(var(--discord-darker))] border border-[#FFD700]/40 rounded-lg p-4 mb-2"
          >
            <motion.div
              initial={{ rotate: -10, scale: 0.5 }}
              animate={{ rotate: [0, -8, 8, 0], scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-3xl mb-1"
            >
              🎉
            </motion.div>
            <p className="text-sm font-bold text-white">{justOpened.contents_label || 'A surprise reward'}</p>
            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Ping an organizer to claim it if it's physical merchandise.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
