import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Users, Zap, Crown, Award, TrendingUp, Flame, Target, CheckCircle2, Circle, ShieldCheck, Rocket, Bug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

// ── Scoring Tiers ──────────────────────────────────────────────
// Tier 1 — Foundation (20 pts)
//   team_formed        10 pts   (all members joined)
//   project_setup      10 pts   (wizard completed / first template load)
// Tier 2 — Execution (30 pts)
//   first_run_success  10 pts   (code executes cleanly)
//   project_deployed   20 pts   (Go Live confirmed)
// Tier 3 — Quality (25 pts)
//   submitted_on_time   5 pts   (submitted before deadline)
//   app_runs_live      20 pts   (live URL tested OK)
// ────────────────────────────────────────────────────────────────

const SCORING_CONFIG = {
  // Tier 1 – Foundation
  team_formed:       { points: 10, tier: 1, label: 'Team Formed',        icon: '👥', desc: 'All members joined' },
  project_setup:     { points: 10, tier: 1, label: 'Project Setup',      icon: '⚙️', desc: 'Template loaded & configured' },
  // Tier 2 – Execution
  first_run_success: { points: 10, tier: 2, label: 'First Successful Run', icon: '▶️', desc: 'Code executed cleanly' },
  project_deployed:  { points: 20, tier: 2, label: 'Project Deployed',   icon: '🚀', desc: 'Live URL confirmed' },
  // Tier 3 – Quality
  submitted_on_time: { points: 5,  tier: 3, label: 'Submitted On Time',  icon: '⏰', desc: 'Before deadline' },
  app_runs_live:     { points: 20, tier: 3, label: 'App Runs Live',      icon: '✅', desc: 'Tested without crashing' },
  // Judge Score (up to 25 pts)
  judge_score:       { points: 25, tier: 4, label: 'Judge Score',        icon: '⭐', desc: 'Scored by judges' },
} as const;

type ScoringEvent = keyof typeof SCORING_CONFIG;

const TIER_META = [
  { tier: 1, name: 'Foundation', max: 20, color: 'from-blue-500 to-cyan-400', textColor: 'text-cyan-400', bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/30' },
  { tier: 2, name: 'Execution',  max: 30, color: 'from-amber-500 to-orange-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30' },
  { tier: 3, name: 'Quality',    max: 25, color: 'from-emerald-500 to-green-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30' },
  { tier: 4, name: 'Judge Score', max: 25, color: 'from-yellow-500 to-amber-400', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30' },
];

const MAX_SCORE = 100;

interface ParticipantScore {
  email: string;
  name: string;
  points: number;
  tier1: number;
  tier2: number;
  tier3: number;
  events: Set<string>;
  rank: number;
}

export const Leaderboard = () => {
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantScore | null>(null);

  useEffect(() => {
    fetchLeaderboardData();

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_events' }, () => fetchLeaderboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_projects' }, () => fetchLeaderboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);

    const { data: pointEventsData } = await supabase
      .from('point_events')
      .select('participant_email, points, event_type, metadata') as any;

    // Also pull names from ai_projects
    const { data: projectsData } = await supabase
      .from('ai_projects')
      .select('author_email, author_name');

    const nameMap = new Map<string, string>();
    (projectsData || []).forEach((p: any) => { if (p.author_name) nameMap.set(p.author_email, p.author_name); });

    const participantMap = new Map<string, ParticipantScore>();

    (pointEventsData || []).forEach((evt: any) => {
      const config = SCORING_CONFIG[evt.event_type as ScoringEvent];
      if (!config) return; // skip legacy events

      let p = participantMap.get(evt.participant_email);
      if (!p) {
        p = {
          email: evt.participant_email,
          name: nameMap.get(evt.participant_email) || evt.participant_email.split('@')[0],
          points: 0, tier1: 0, tier2: 0, tier3: 0,
          events: new Set<string>(),
          rank: 0,
        };
        participantMap.set(evt.participant_email, p);
      }

      // Deduplicate: each event type counts once
      if (!p.events.has(evt.event_type)) {
        p.events.add(evt.event_type);
        const pts = config.points;
        p.points += pts;
        if (config.tier === 1) p.tier1 += pts;
        else if (config.tier === 2) p.tier2 += pts;
        else p.tier3 += pts;
      }
    });

    // Also give names from nameMap
    participantMap.forEach((p) => {
      if (nameMap.has(p.email)) p.name = nameMap.get(p.email)!;
    });

    const sorted = Array.from(participantMap.values())
      .sort((a, b) => b.points - a.points)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    setParticipants(sorted);
    setIsLoading(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1: return <Medal className="w-5 h-5 text-gray-300" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-[hsl(var(--discord-text-muted))] font-medium w-5 text-center text-sm">#{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
      case 1: return 'bg-gradient-to-r from-gray-400/15 to-transparent border-gray-400/25';
      case 2: return 'bg-gradient-to-r from-amber-600/20 to-transparent border-amber-600/30';
      default: return 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)]';
    }
  };

  const TierBreakdown = ({ participant }: { participant: ParticipantScore }) => (
    <div className="space-y-3 mt-3">
      {TIER_META.map(tier => {
        const tierPts = tier.tier === 1 ? participant.tier1 : tier.tier === 2 ? participant.tier2 : participant.tier3;
        const pct = Math.round((tierPts / tier.max) * 100);
        const tierEvents = Object.entries(SCORING_CONFIG).filter(([_, c]) => c.tier === tier.tier);
        return (
          <div key={tier.tier} className={`rounded-lg p-3 border ${tier.bgColor} ${tier.borderColor}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${tier.textColor}`}>TIER {tier.tier} — {tier.name}</span>
              <span className={`text-xs font-mono font-bold ${tier.textColor}`}>{tierPts}/{tier.max}</span>
            </div>
            <Progress value={pct} className="h-1.5 mb-2" />
            <div className="space-y-1">
              {tierEvents.map(([key, config]) => {
                const achieved = participant.events.has(key);
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {achieved
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <Circle className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))] flex-shrink-0" />
                    }
                    <span className={achieved ? 'text-white' : 'text-[hsl(var(--discord-text-muted))]'}>
                      {config.icon} {config.label}
                    </span>
                    <span className="ml-auto text-[hsl(var(--discord-text-muted))]">+{config.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)'
          }}>
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-[hsl(var(--discord-text-muted))] text-sm">Automated scoring · {MAX_SCORE} pts max</p>
          </div>
        </div>
      </div>

      {/* Scoring Tiers Legend */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {TIER_META.map(tier => (
          <div key={tier.tier} className={`rounded-lg p-2.5 border ${tier.bgColor} ${tier.borderColor}`}>
            <div className={`text-[10px] font-bold ${tier.textColor} mb-0.5`}>TIER {tier.tier}</div>
            <div className="text-white text-sm font-semibold">{tier.name}</div>
            <div className={`text-xs ${tier.textColor} font-mono`}>{tier.max} pts</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <Users className="w-4 h-4" /><span className="text-xs">Participants</span>
          </div>
          <p className="text-xl font-bold text-white">{participants.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <ShieldCheck className="w-4 h-4" /><span className="text-xs">Perfect Scores</span>
          </div>
          <p className="text-xl font-bold text-white">{participants.filter(p => p.points >= MAX_SCORE).length}</p>
        </motion.div>
      </div>

      {/* Rankings */}
      <ScrollArea className="h-[420px] pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
              <Star className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
            </div>
            <p className="text-[hsl(var(--discord-text-muted))]">No scores yet. Start building to earn points!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {participants.map((p, index) => (
                <motion.div
                  key={p.email}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-lg border transition-all cursor-pointer ${getRankBg(index)} ${selectedParticipant?.email === p.email ? 'ring-1 ring-[hsl(var(--discord-blurple))]' : ''}`}
                  onClick={() => setSelectedParticipant(selectedParticipant?.email === p.email ? null : p)}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-shrink-0">{getRankIcon(index)}</div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                      background: `linear-gradient(135deg, ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#4752C4'} 0%, ${index === 0 ? '#F7941D' : index === 1 ? '#A9A9A9' : index === 2 ? '#8B4513' : '#5865F2'} 100%)`
                    }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate text-sm">{p.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {/* Tier dots */}
                        {p.tier1 >= 20 && <span className="text-[10px]">🔵</span>}
                        {p.tier2 >= 30 && <span className="text-[10px]">🟠</span>}
                        {p.tier3 >= 25 && <span className="text-[10px]">🟢</span>}
                        {p.points >= MAX_SCORE && <span className="text-[10px]">⭐</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{p.points}</span>
                        <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">/{MAX_SCORE}</span>
                      </div>
                      <Progress value={(p.points / MAX_SCORE) * 100} className="h-1 w-16 mt-1" />
                    </div>
                  </div>
                  {/* Expanded tier breakdown */}
                  {selectedParticipant?.email === p.email && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3"
                    >
                      <TierBreakdown participant={p} />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Scoring Reference */}
      <div className="mt-4 p-4 bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)]">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
          How Scoring Works
        </h4>
        <div className="space-y-1.5 text-xs text-[hsl(var(--discord-text-muted))]">
          {Object.entries(SCORING_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center justify-between">
              <span>{config.icon} {config.label}</span>
              <span className="font-mono">+{config.points} pts</span>
            </div>
          ))}
          <div className="border-t border-[hsl(var(--discord-light)/0.2)] pt-1.5 mt-1.5 flex items-center justify-between text-white font-bold">
            <span>Total Possible</span>
            <span className="font-mono">{MAX_SCORE} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
