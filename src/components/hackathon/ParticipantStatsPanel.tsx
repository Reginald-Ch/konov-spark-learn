import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Gift, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { CoinIcon } from './CoinIcon';
import { MedalIcon } from './MedalIcon';

// Forge Keys and Boost Tokens were both cut from the reward system —
// confirmed earn-only with zero spend/redeem mechanic anywhere in the app,
// pure dead weight. Keys were merged into bonus Forge Coins (see the
// lesson-milestone/challenge-completion RPCs); "on time" is still reflected
// in the score itself via the timeliness component, just not as a
// separate currency.
interface Stats {
  sp: number;
  coins: number;
  badges: { tier: 'gold' | 'silver' | 'bronze'; challenge_id: string }[];
}

interface UnopenedBox {
  id: string;
  box_type: 'issue' | 'mission';
  contents_label: string | null;
}

const emptyStats: Stats = { sp: 0, coins: 0, badges: [] };

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

const StatTile = ({ icon, label, value, color, variant = 'flip' }: { icon: React.ReactNode; label: string; value: number; color: string; variant?: 'flip' | 'zap' }) => {
  const animated = useCountUp(value);
  const prevValueRef = useRef(value);
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);

  useEffect(() => {
    if (value > prevValueRef.current) {
      const amount = value - prevValueRef.current;
      setDelta({ amount, id: Date.now() });
      setPulse(true);
      const t1 = setTimeout(() => setPulse(false), 650);
      const t2 = setTimeout(() => setDelta(null), 1200);
      prevValueRef.current = value;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevValueRef.current = value;
  }, [value]);

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative bg-[hsl(var(--discord-darker))] rounded-lg p-3 border flex items-center gap-3 overflow-hidden transition-colors duration-300"
      style={{ borderColor: pulse ? color : 'hsl(var(--discord-light)/0.2)', boxShadow: pulse ? `0 0 18px ${color}4d` : 'none' }}
    >
      <div className="relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
        {variant === 'zap' ? (
          <>
            {!pulse && (
              <motion.span
                className="absolute inset-0 rounded-lg"
                animate={{ boxShadow: [`0 0 0px ${color}00`, `0 0 8px ${color}80`, `0 0 0px ${color}00`] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {pulse && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${color}` }}
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            )}
            <motion.div animate={pulse ? { opacity: [1, 0.2, 1, 0.4, 1], scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.45 }}>
              {icon}
            </motion.div>
          </>
        ) : (
          <motion.div animate={pulse ? { rotateY: [0, 360] } : {}} transition={{ duration: 0.6 }}>
            {icon}
          </motion.div>
        )}
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-none">{animated}</p>
        <p className="text-[10px] text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mt-0.5">{label}</p>
      </div>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 4, scale: 0.6 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute top-1.5 right-2 text-xs font-extrabold"
            style={{ color, textShadow: `0 0 8px ${color}` }}
          >
            +{delta.amount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BADGE_META: Record<string, { label: string; color: string }> = {
  gold: { label: 'Gold', color: '#FFD700' },
  silver: { label: 'Silver', color: '#C0C0C0' },
  bronze: { label: 'Bronze', color: '#CD7F32' },
};

const REVEAL_PARTICLES = Array.from({ length: 12 });

const RewardRevealOverlay = ({ box, onDismiss }: { box: UnopenedBox; onDismiss: () => void }) => {
  const isMission = box.box_type === 'mission';
  const accent = isMission ? '#FFD700' : '#F7941D';

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.6, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative text-center rounded-2xl p-8 max-w-xs w-full overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, hsl(var(--discord-darker)), #14141c)',
          border: `1px solid ${accent}55`,
          boxShadow: `0 0 60px ${accent}33`,
        }}
      >
        {REVEAL_PARTICLES.map((_, i) => {
          const angle = (i / REVEAL_PARTICLES.length) * Math.PI * 2;
          const dist = 80 + (i % 3) * 20;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-[38%] text-base pointer-events-none"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 1.1 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
            >
              {isMission ? '✨' : '⭐'}
            </motion.span>
          );
        })}

        <motion.div
          initial={{ scale: 0.4, rotate: -15 }}
          animate={{ scale: [0.4, 1.2, 1], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.7 }}
          className="text-5xl mb-3 relative z-10"
        >
          {isMission ? '🎁' : '📦'}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs uppercase tracking-widest font-semibold mb-1 relative z-10"
          style={{ color: accent }}
        >
          {isMission ? 'Mission Bonus unlocked' : 'Issue Box unlocked'}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-bold text-white mb-2 relative z-10"
        >
          {box.contents_label || 'A surprise reward'}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-[hsl(var(--discord-text-muted))] mb-4 relative z-10"
        >
          Ping an organizer to claim it if it's physical merchandise.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={onDismiss}
          className="px-4 py-2 rounded-md text-xs font-bold text-black relative z-10"
          style={{ background: `linear-gradient(135deg, ${accent}, #F7941D)` }}
        >
          Nice!
        </motion.button>
      </motion.div>
    </motion.div>
  );
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
      setTimeout(() => setJustOpened(null), 4500);
    } else {
      // The RPC now raises a real, specific error instead of silently
      // no-op'ing on a mismatch — surface it instead of failing silent.
      toast.error(error.message || 'Could not open this reward box.');
      fetchStats();
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
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatTile icon={<Trophy className="w-4 h-4" />} label="SP Points" value={stats.sp} color="#F7941D" />
        <StatTile icon={<CoinIcon size={16} />} label="Forge Coins" value={stats.coins} color="#FFD700" />
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
                whileHover={{ scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: i * 0.05 }}
                className="relative w-7 h-7 rounded-full flex items-center justify-center border-2 overflow-hidden"
                style={{ background: `${meta.color}20`, borderColor: meta.color }}
                title={`${meta.label} — Day badge`}
              >
                <MedalIcon tier={b.tier} size={14} className="relative z-10" />
                {b.tier === 'gold' && (
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)' }}
                    animate={{ x: ['-100%', '150%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {unopenedBoxes.map(box => {
          const isMission = box.box_type === 'mission';
          return (
            <motion.div
              key={box.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-2"
              // perspective must live on this wrapper, not the tilting card
              // itself — CSS only projects a 3D transform of an element's
              // CHILDREN, not its own, so the tilt below needs an ancestor
              // that declares the perspective distance to foreshorten into.
              style={isMission ? { perspective: 700 } : undefined}
            >
              <motion.div
                animate={isMission ? { rotateX: [0, 5, -4, 0], rotateY: [0, -8, 8, 0] } : undefined}
                transition={isMission ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
                className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-[#FFD700]/10 to-[#F7941D]/10 border border-[#FFD700]/30 rounded-lg p-3 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 15% 50%, rgba(255,215,0,0.18), transparent 65%)' }}
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
                {isMission && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)' }}
                    animate={{ x: ['-120%', '160%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                  />
                )}
                <div className="flex items-center gap-2 relative z-10">
                  <motion.div
                    animate={
                      openingBoxId === box.id
                        ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1] }
                        : isMission
                        ? {}
                        : { rotate: [0, -6, 6, -6, 0] }
                    }
                    transition={openingBoxId === box.id ? { duration: 0.4, repeat: Infinity } : { duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }}
                  >
                    {isMission ? <Medal className="w-5 h-5 text-[#FFD700]" /> : <Gift className="w-5 h-5 text-[#F7941D]" />}
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-white">{isMission ? 'Mission Bonus unlocked!' : 'Issue Box unlocked!'}</p>
                    <p className="text-xs text-[hsl(var(--discord-text-muted))]">Tap to open</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenBox(box)}
                  disabled={openingBoxId === box.id}
                  className="relative z-10 px-3 py-1.5 rounded-md text-xs font-bold text-black"
                  style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}
                >
                  {openingBoxId === box.id ? 'Opening…' : 'Open'}
                </button>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {justOpened && <RewardRevealOverlay box={justOpened} onDismiss={() => setJustOpened(null)} />}
      </AnimatePresence>
    </div>
  );
};
