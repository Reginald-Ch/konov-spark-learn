import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Trophy, Medal, Star, Users, Crown, Award, Flame, CheckCircle2, Circle, ShieldCheck, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { stripLineComment } from './editorFeatures';
import { isSafeExternalUrl } from '@/lib/utils';

// Scoring criteria derived from project fields.
// "Creativity & Personality" (5 pts, keyed off demo_url) used to live here
// but was structurally unearnable — nothing in the publish flow
// (PublishModal, save_own_project) ever sets demo_url to anything but
// null, so the points — and "Perfect Score" — could never actually be
// achieved through the app. Cut rather than rushed into a new demo-URL
// input + RPC parameter I can't test live, matching how this session
// already handled other reward mechanics with no real way to earn them
// (Forge Keys, Boost Tokens).
const SCORING_CRITERIA = [
  { key: 'system_message', points: 10, tier: 1, label: 'System Message Quality', icon: '🧠', desc: 'Clear, well-crafted system prompt (code length > 200 chars)' },
  { key: 'knowledge_accuracy', points: 10, tier: 2, label: 'Knowledge Accuracy', icon: '📚', desc: 'Project is published & deployed' },
  { key: 'conversation_quality', points: 5, tier: 2, label: 'Conversation Quality', icon: '💬', desc: 'Project has a description' },
  { key: 'judge_score', points: 70, tier: 4, label: 'Judge Score', icon: '⭐', desc: 'Scored by judges' },
] as const;

type ScoringKey = typeof SCORING_CRITERIA[number]['key'];

const TIER_META = [
  { tier: 1, name: 'System Message', max: 10, textColor: 'text-[hsl(var(--discord-blurple))]', bgColor: 'bg-[hsl(var(--discord-blurple)/0.15)]', borderColor: 'border-[hsl(var(--discord-blurple)/0.3)]' },
  { tier: 2, name: 'Knowledge & Conversation', max: 15, textColor: 'text-[hsl(var(--discord-green))]', bgColor: 'bg-[hsl(var(--discord-green)/0.15)]', borderColor: 'border-[hsl(var(--discord-green)/0.3)]' },
  { tier: 4, name: 'Judge Score', max: 70, textColor: 'text-[hsl(var(--discord-yellow))]', bgColor: 'bg-[hsl(var(--discord-yellow)/0.15)]', borderColor: 'border-[hsl(var(--discord-yellow)/0.3)]' },
];

const MAX_SCORE = 95;

interface ParticipantScore {
  authorKey: string;
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

  // 🧠 System Message Quality: code is substantial (>200 meaningful chars).
  // Measuring raw project.code.length let anyone pad with whitespace or
  // comments to clear the bar for free — strip both before measuring so
  // the threshold reflects actual written code, not padding. This used to
  // strip "//" (C-style) comments, but every project here is Python
  // (# comments) — the exploit this was meant to close (pad main.py with
  // filler comment lines) was still wide open. stripLineComment is the
  // same quote-aware stripper the editor's own linter uses, so a "#"
  // inside a string (a hex color, a hashtag) isn't wrongly treated as a
  // comment either.
  const meaningfulCodeLength = project.code
    ? project.code.split('\n').map(stripLineComment).join('\n').replace(/\s+/g, ' ').trim().length
    : 0;
  if (meaningfulCodeLength > 200) {
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
  // ⭐ Judge Score
  if (judgePoints > 0) {
    achieved.add('judge_score');
    tier4 = Math.min(judgePoints, 70);
  }

  const points = tier1 + tier2 + tier3 + tier4;
  // Used to prettify a "Student-XXXX" placeholder name using the local part
  // of author_email, but that email is no longer fetched to the client at
  // all (see get_hackathon_leaderboard_projects) — the placeholder name
  // itself is shown instead, which isn't sensitive.
  const displayName = project.author_name || 'A FORGE Builder';

  return {
    authorKey: project.author_key,
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

interface LeaderboardProps {
  hackathonId?: string | null;
}

export const Leaderboard = forwardRef<HTMLDivElement, LeaderboardProps>(({ hackathonId }, ref) => {
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  // isMountedRef alone isn't enough to stop a stale response: it's reset
  // back to true at the top of every effect run (below), not scoped to a
  // particular hackathonId. hackathonId is a prop that can change while
  // mounted (Hackathons.tsx passes the current live event's id, which
  // shifts as events start/end) — without this, a slow in-flight fetch for
  // the PREVIOUS hackathon could resolve after the effect for the NEW one
  // has already reset isMountedRef to true, and clobber the just-loaded
  // leaderboard with stale data for an event no longer being viewed.
  const latestHackathonIdRef = useRef(hackathonId);
  useEffect(() => { latestHackathonIdRef.current = hackathonId; }, [hackathonId]);

  const fetchLeaderboardData = useCallback(async () => {
    if (!hackathonId) {
      setParticipants([]);
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      // Routed through SECURITY DEFINER RPCs instead of raw table selects —
      // author_email/participant_email never leave the server this way.
      // author_email in particular is the bearer credential every
      // ownership RPC (save/delete/publish) checks, so broadcasting it to
      // every leaderboard viewer would let anyone harvest a classmate's
      // email and hijack their project through those RPCs directly. Both
      // RPCs hash email the same way, so the author_key/participant_key
      // join below still works exactly like the old email-keyed one.
      const [projectsRes, judgeEventsRes] = await Promise.all([
        supabase
          .rpc('get_hackathon_leaderboard_projects', { p_hackathon_id: hackathonId }),
        supabase
          .rpc('get_hackathon_judge_scores', { p_hackathon_id: hackathonId }),
      ]);

      if (!isMountedRef.current || latestHackathonIdRef.current !== hackathonId) return;

      if (projectsRes.error) {
        console.error('ai_projects fetch error:', projectsRes.error);
        setError('Failed to load leaderboard data');
        return;
      }
      // judgeEventsRes.error was never checked — a failure here (network
      // blip, permissions) silently rendered every project with 0 judge
      // points, indistinguishable from "no judges have scored yet" instead
      // of a real fetch failure.
      if (judgeEventsRes.error) {
        console.error('judge scores fetch error:', judgeEventsRes.error);
      }

      // Multiple judges can now independently score the same project (the
      // judge role is shared by several people) — average their scores per
      // project instead of taking the max, so no single lenient judge
      // dominates and no project is penalized for attracting more judges.
      // Falls back to key-keyed map for legacy events without project_id in metadata
      const judgeByProject = new Map<string, number[]>(); // project_id -> points[]
      const judgeByKey = new Map<string, number[]>();     // participant_key -> points[] (fallback)
      (judgeEventsRes.data || []).forEach((evt: any) => {
        const projectId = evt.metadata?.project_id;
        if (projectId) {
          (judgeByProject.get(projectId) || judgeByProject.set(projectId, []).get(projectId)!).push(evt.points);
        } else {
          (judgeByKey.get(evt.participant_key) || judgeByKey.set(evt.participant_key, []).get(evt.participant_key)!).push(evt.points);
        }
      });
      const average = (arr: number[] | undefined) => (arr && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

      // One entry per author (keep best project if multiple submitted)
      const authorMap = new Map<string, ParticipantScore>();
      (projectsRes.data || []).forEach((project: any) => {
        // Prefer project-linked score, fall back to key-linked score
        const judgePoints = average(judgeByProject.get(project.id) ?? judgeByKey.get(project.author_key));
        const scored = scoreProject(project, judgePoints);
        const existing = authorMap.get(project.author_key);
        if (!existing || scored.points > existing.points) {
          authorMap.set(project.author_key, { ...scored, rank: 0 });
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
  }, [hackathonId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeaderboardData(), 800);
  }, [fetchLeaderboardData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLeaderboardData();
    if (!hackathonId) return;

    // Scoped to this hackathon specifically — previously subscribed to
    // every ai_projects/point_events change across every hackathon in the
    // app, triggering a refetch here for activity completely unrelated to
    // whatever event is actually being viewed.
    const channel = supabase
      .channel(`leaderboard-updates-${hackathonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_projects', filter: `hackathon_id=eq.${hackathonId}` }, () => debouncedFetch())
      .subscribe();

    // point_events' own postgres_changes subscription used to live here
    // too, but a later security fix (20260903000001) correctly revoked
    // ALL anon/authenticated privileges on that table — Supabase Realtime
    // evaluates each row against the connecting role's own grants before
    // ever broadcasting it, so with zero privileges that channel silently
    // stopped firing entirely. A judge submitting a score no longer
    // touches ai_projects at all, so without a substitute the leaderboard
    // would only update on a full page reload. Light polling is the same
    // fallback this app already uses elsewhere for the identical RLS-vs-
    // realtime conflict (e.g. ProjectEditor's publish-state check).
    const pollId = setInterval(() => fetchLeaderboardData(), 20000);

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      clearInterval(pollId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchLeaderboardData, debouncedFetch]);

  // Rank was conveyed by icon shape/color alone for the top 3 — a
  // screen-reader user got no indication a row was 1st/2nd/3rd place,
  // unlike rank 4+ which already had a visible "#4" text fallback. sr-only
  // adds the same information as real (if visually hidden) text for every
  // rank, not just the ones already using a number. Also swaps raw
  // Tailwind palette colors (yellow-400/slate-200/amber-600) for this
  // file's own discord-* tokens, which it already uses correctly
  // elsewhere — no bronze/silver token exists in this app's palette, so
  // gold/silver/bronze map onto the three progressively dimmer tones
  // (yellow, text, text-muted) actually available rather than inventing
  // new colors outside the design system.
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

  const TierBreakdown = ({ participant }: { participant: ParticipantScore }) => (
    <div className="space-y-3 mt-3">
      {participant.projectName && (
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text-muted))] mb-1">
          <span className="text-white font-medium truncate">{participant.projectName}</span>
          {participant.demoUrl && isSafeExternalUrl(participant.demoUrl) && (
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
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--discord-green))] flex-shrink-0" />
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
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
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
            <p className="text-[hsl(var(--discord-red))] mb-2">{error}</p>
            <button onClick={() => { setIsLoading(true); fetchLeaderboardData(); }} className="text-sm text-[hsl(var(--discord-blurple))] hover:underline">
              Retry
            </button>
          </div>
        ) : !hackathonId ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
              <Trophy className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
            </div>
            <p className="text-[hsl(var(--discord-text-muted))]">No hackathon is live right now — the leaderboard will populate once one starts.</p>
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
                key={p.authorKey}
                role="button"
                tabIndex={0}
                aria-pressed={selectedKey === p.authorKey}
                aria-label={`${p.name}, rank ${index + 1}`}
                className={`rounded-lg border transition-all cursor-pointer ${getRankBg(index)} ${selectedKey === p.authorKey ? 'ring-1 ring-[hsl(var(--discord-blurple))]' : ''}`}
                onClick={() => setSelectedKey(selectedKey === p.authorKey ? null : p.authorKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedKey(selectedKey === p.authorKey ? null : p.authorKey);
                  }
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-shrink-0">{getRankIcon(index)}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                    background: index === 0 ? 'hsl(var(--discord-yellow))' : index === 1 ? 'hsl(var(--discord-text))' : index === 2 ? 'hsl(var(--discord-text-muted))' : 'hsl(var(--discord-blurple))'
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
                {selectedKey === p.authorKey && (
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
