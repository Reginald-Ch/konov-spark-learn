import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Trophy, Medal, Star, Users, Crown, Award, Flame, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

const SCORING_CONFIG = {
  team_formed:       { points: 10, tier: 1, label: 'Team Formed',        icon: '👥', desc: 'All members joined' },
  project_setup:     { points: 10, tier: 1, label: 'Project Setup',      icon: '⚙️', desc: 'Template loaded & configured' },
  first_run_success: { points: 10, tier: 2, label: 'First Successful Run', icon: '▶️', desc: 'Code executed cleanly' },
  project_deployed:  { points: 20, tier: 2, label: 'Project Deployed',   icon: '🚀', desc: 'Live URL confirmed' },
  submitted_on_time: { points: 5,  tier: 3, label: 'Submitted On Time',  icon: '⏰', desc: 'Before deadline' },
  app_runs_live:     { points: 20, tier: 3, label: 'App Runs Live',      icon: '✅', desc: 'Tested without crashing' },
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
  tier4: number;
  events: Set<string>;
  rank: number;
}

export const Leaderboard = forwardRef<HTMLDivElement>((_, ref) => {
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      const [pointEventsRes, projectsRes, registrationsRes] = await Promise.all([
        supabase.from('point_events').select('participant_email, points, event_type, metadata').limit(1000),
        supabase.from('ai_projects').select('author_email, author_name').limit(500),
        supabase.from('hackathon_registrations').select('participant_email, participant_name').limit(500),
      ]);

      if (!isMountedRef.current) return;

      if (pointEventsRes.error) {
        console.error('point_events fetch error:', pointEventsRes.error);
        setError('Failed to load leaderboard data');
        return;
      }

      const nameMap = new Map<string, string>();
      (registrationsRes.data || []).forEach((r: any) => { if (r.participant_name) nameMap.set(r.participant_email, r.participant_name); });
      (projectsRes.data || []).forEach((p: any) => { if (p.author_name && !p.author_name.startsWith('Student-')) nameMap.set(p.author_email, p.author_name); });

      const participantMap = new Map<string, ParticipantScore>();

      (pointEventsRes.data || []).forEach((evt: any) => {
        const config = SCORING_CONFIG[evt.event_type as ScoringEvent];
        if (!config) return;

        let p = participantMap.get(evt.participant_email);
        if (!p) {
          p = {
            email: evt.participant_email,
            name: nameMap.get(evt.participant_email) || evt.participant_email.split('@')[0].replace(/^student-/, ''),
            points: 0, tier1: 0, tier2: 0, tier3: 0, tier4: 0,
            events: new Set<string>(),
            rank: 0,
          };
          participantMap.set(evt.participant_email, p);
        }

        if (evt.event_type === 'judge_score') {
          const pts = Math.min(evt.points, 25);
          if (pts > p.tier4) {
            p.points = p.points - p.tier4 + pts;
            p.tier4 = pts;
          }
          p.events.add(evt.event_type);
        } else if (!p.events.has(evt.event_type)) {
          p.events.add(evt.event_type);
          const pts = config.points;
          p.points += pts;
          if (config.tier === 1) p.tier1 += pts;
          else if (config.tier === 2) p.tier2 += pts;
          else if (config.tier === 3) p.tier3 += pts;
        }
      });

      // Apply resolved names
      participantMap.forEach((p) => {
        if (nameMap.has(p.email)) p.name = nameMap.get(p.email)!;
      });

      const sorted = Array.from(participantMap.values())
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .map((p, i) => ({ ...p, rank: i + 1 }));

      if (isMountedRef.current) {
        setParticipants(sorted);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      if (isMountedRef.current) setError('Failed to load leaderboard');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeaderboardData(), 800);
  }, [fetchLeaderboardData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLeaderboardData();

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_events' }, () => debouncedFetch())
      .subscribe();

    return () => { 
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchLeaderboardData, debouncedFetch]);

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
        const tierPts = tier.tier === 1 ? participant.tier1 : tier.tier === 2 ? participant.tier2 : tier.tier === 3 ? participant.tier3 : participant.tier4;
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

  const stats = useMemo(() => ({
    total: participants.length,
    perfect: participants.filter(p => p.points >= MAX_SCORE).length,
  }), [participants]);

  return (
    <div className="h-full">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {TIER_META.map(tier => (
          <div key={tier.tier} className={`rounded-lg p-2.5 border ${tier.bgColor} ${tier.borderColor}`}>
            <div className={`text-[10px] font-bold ${tier.textColor} mb-0.5`}>TIER {tier.tier}</div>
            <div className="text-white text-sm font-semibold">{tier.name}</div>
            <div className={`text-xs ${tier.textColor} font-mono`}>{tier.max} pts</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <Users className="w-4 h-4" /><span className="text-xs">Participants</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <ShieldCheck className="w-4 h-4" /><span className="text-xs">Perfect Scores</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.perfect}</p>
        </div>
      </div>

      <ScrollArea className="h-[420px] pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-2">{error}</p>
            <button onClick={() => { setIsLoading(true); fetchLeaderboardData(); }} className="text-sm text-[hsl(var(--discord-blurple))] hover:underline">
              Retry
            </button>
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
            {participants.map((p, index) => (
              <div
                key={p.email}
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
                      {p.tier1 >= 20 && <span className="text-[10px]">🔵</span>}
                      {p.tier2 >= 30 && <span className="text-[10px]">🟠</span>}
                      {p.tier3 >= 25 && <span className="text-[10px]">🟢</span>}
                      {p.tier4 > 0 && <span className="text-[10px]">⭐</span>}
                      {p.points >= MAX_SCORE && <span className="text-[10px]">🏆</span>}
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
                {selectedParticipant?.email === p.email && (
                  <div className="px-3 pb-3">
                    <TierBreakdown participant={p} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

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
