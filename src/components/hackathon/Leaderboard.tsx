import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Trophy, Medal, Star, Users, Crown, Award, Flame, CheckCircle2, Circle, ShieldCheck, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

// Scoring criteria derived from project fields
const SCORING_CRITERIA = [
  { key: 'system_message', points: 10, tier: 1, label: 'System Message Quality', icon: '🧠', desc: 'Clear, well-crafted system prompt (code length > 200 chars)' },
  { key: 'knowledge_accuracy', points: 10, tier: 2, label: 'Knowledge Accuracy', icon: '📚', desc: 'Project is published & deployed' },
  { key: 'conversation_quality', points: 5, tier: 2, label: 'Conversation Quality', icon: '💬', desc: 'Project has a description' },
  { key: 'creativity', points: 5, tier: 3, label: 'Creativity & Personality', icon: '🎨', desc: 'Project has a demo URL' },
  { key: 'judge_score', points: 70, tier: 4, label: 'Judge Score', icon: '⭐', desc: 'Scored by judges' },
] as const;

type ScoringKey = typeof SCORING_CRITERIA[number]['key'];

const TIER_META = [
  { tier: 1, name: 'System Message', max: 10, textColor: 'text-cyan-400', bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/30' },
  { tier: 2, name: 'Knowledge & Conversation', max: 15, textColor: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30' },
  { tier: 3, name: 'Creativity', max: 5, textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30' },
  { tier: 4, name: 'Judge Score', max: 70, textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30' },
];

const MAX_SCORE = 100;

interface ParticipantScore {
  email: string;
  name: string;
  projectName: string;
  demoUrl: string | null;
  points: number;
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  achieved: Set<ScoringKey>;
  rank: number;
}

function scoreProject(project: any, judgePoints: number): Omit<ParticipantScore, 'rank'> {
  const achieved = new Set<ScoringKey>();
  let tier1 = 0, tier2 = 0, tier3 = 0, tier4 = 0;

  // 🧠 System Message Quality: code is substantial (>200 chars)
  if (project.code && project.code.length > 200) {
    achieved.add('system_message');
    tier1 = 10;
  }
  // 📚 Knowledge Accuracy: project is published
  if (project.is_published) {
    achieved.add('knowledge_accuracy');
    tier2 += 10;
  }
  // 💬 Conversation Quality: has a description
  if (project.description && project.description.trim().length > 0) {
    achieved.add('conversation_quality');
    tier2 += 5;
  }
  // 🎨 Creativity & Personality: has a demo URL
  if (project.demo_url && project.demo_url.trim().length > 0) {
    achieved.add('creativity');
    tier3 = 5;
  }
  // ⭐ Judge Score
  if (judgePoints > 0) {
    achieved.add('judge_score');
    tier4 = Math.min(judgePoints, 70);
  }

  const points = tier1 + tier2 + tier3 + tier4;
  const displayName = (project.author_name && !project.author_name.startsWith('Student-'))
    ? project.author_name
    : project.author_email.split('@')[0].replace(/^student-/, '');

  return {
    email: project.author_email,
    name: displayName,
    projectName: project.project_name,
    demoUrl: project.demo_url || null,
    points,
    tier1,
    tier2,
    tier3,
    tier4,
    achieved,
  };
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
      const [projectsRes, judgeEventsRes] = await Promise.all([
        supabase
          .from('ai_projects')
          .select('id, author_email, author_name, project_name, code, description, is_published, demo_url')
          .limit(500),
        supabase
          .from('point_events')
          .select('participant_email, points, metadata')
          .eq('event_type', 'judge_score')
          .limit(500),
      ]);

      if (!isMountedRef.current) return;

      if (projectsRes.error) {
        console.error('ai_projects fetch error:', projectsRes.error);
        setError('Failed to load leaderboard data');
        return;
      }

      // Build judge score map keyed by project_id (most recent/highest per project)
      // Falls back to email-keyed map for legacy events without project_id in metadata
      const judgeByProject = new Map<string, number>(); // project_id -> points
      const judgeByEmail = new Map<string, number>();   // email -> points (fallback)
      (judgeEventsRes.data || []).forEach((evt: any) => {
        const projectId = evt.metadata?.project_id;
        if (projectId) {
          const prev = judgeByProject.get(projectId) || 0;
          if (evt.points > prev) judgeByProject.set(projectId, evt.points);
        } else {
          const prev = judgeByEmail.get(evt.participant_email) || 0;
          if (evt.points > prev) judgeByEmail.set(evt.participant_email, evt.points);
        }
      });

      // One entry per author (keep best project if multiple submitted)
      const authorMap = new Map<string, ParticipantScore>();
      (projectsRes.data || []).forEach((project: any) => {
        // Prefer project-linked score, fall back to email-linked score
        const judgePoints = judgeByProject.get(project.id) ?? judgeByEmail.get(project.author_email) ?? 0;
        const scored = scoreProject(project, judgePoints);
        const existing = authorMap.get(project.author_email);
        if (!existing || scored.points > existing.points) {
          authorMap.set(project.author_email, { ...scored, rank: 0 });
        }
      });

      const sorted = Array.from(authorMap.values())
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .map((p, i) => ({ ...p, rank: i + 1 }));

      if (isMountedRef.current) setParticipants(sorted);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_projects' }, () => debouncedFetch())
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
      {participant.projectName && (
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text-muted))] mb-1">
          <span className="text-white font-medium truncate">{participant.projectName}</span>
          {participant.demoUrl && (
            <a href={participant.demoUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[hsl(var(--discord-blurple))] hover:underline flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" /> Demo
            </a>
          )}
        </div>
      )}
      {TIER_META.map(tier => {
        const tierPts = tier.tier === 1 ? participant.tier1 : tier.tier === 2 ? participant.tier2 : tier.tier === 3 ? participant.tier3 : participant.tier4;
        const pct = Math.round((tierPts / tier.max) * 100);
        const tierCriteria = SCORING_CRITERIA.filter(c => c.tier === tier.tier);
        return (
          <div key={tier.tier} className={`rounded-lg p-3 border ${tier.bgColor} ${tier.borderColor}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${tier.textColor}`}>TIER {tier.tier} — {tier.name}</span>
              <span className={`text-xs font-mono font-bold ${tier.textColor}`}>{tierPts}/{tier.max}</span>
            </div>
            <Progress value={pct} className="h-1.5 mb-2" />
            <div className="space-y-1">
              {tierCriteria.map(criterion => {
                const isAchieved = participant.achieved.has(criterion.key);
                return (
                  <div key={criterion.key} className="flex items-center gap-2 text-xs">
                    {isAchieved
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <Circle className="w-3.5 h-3.5 text-[hsl(var(--discord-text-muted))] flex-shrink-0" />
                    }
                    <span className={isAchieved ? 'text-white' : 'text-[hsl(var(--discord-text-muted))]'}>
                      {criterion.icon} {criterion.label}
                    </span>
                    <span className="ml-auto text-[hsl(var(--discord-text-muted))]">+{criterion.points}</span>
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
    <div ref={ref} className="h-full">
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
                    <p className="text-[10px] text-[hsl(var(--discord-text-muted))] truncate">{p.projectName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.achieved.has('system_message') && <span className="text-[10px]">🧠</span>}
                      {p.achieved.has('knowledge_accuracy') && <span className="text-[10px]">📚</span>}
                      {p.achieved.has('conversation_quality') && <span className="text-[10px]">💬</span>}
                      {p.achieved.has('creativity') && <span className="text-[10px]">🎨</span>}
                      {p.achieved.has('judge_score') && <span className="text-[10px]">⭐</span>}
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
          {SCORING_CRITERIA.map(criterion => (
            <div key={criterion.key} className="flex items-center justify-between">
              <span>{criterion.icon} {criterion.label}</span>
              <span className="font-mono">+{criterion.points} pts</span>
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
});

Leaderboard.displayName = 'Leaderboard';
