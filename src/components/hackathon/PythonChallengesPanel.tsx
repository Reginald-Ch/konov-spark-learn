import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeEditor } from './CodeEditor';
import { CoinIcon } from './CoinIcon';
import { Lock, CheckCircle2, Loader2, Code2, ChevronLeft, PlayCircle, Send, XCircle, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Challenge {
  id: string;
  order_index: number;
  title: string;
  slug: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  function_name: string;
  starter_code: string;
  coin_reward: number;
}

interface Attempt {
  challenge_id: string;
  attempts: number;
  best_passed_count: number;
  total_tests: number;
  passed: boolean;
}

interface VisibleResult {
  index: number;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
}

interface GradeResponse {
  ok: boolean;
  passedCount?: number;
  total?: number;
  results?: VisibleResult[];
  bonusCoinsAwarded?: number;
  passed?: boolean;
  errorType?: string;
  errorMessage?: string;
}

const DIFFICULTY_META: Record<Challenge['difficulty'], { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#22C55E' },
  medium: { label: 'Medium', color: '#F7941D' },
  hard: { label: 'Hard', color: '#C70110' },
};

// No shared-rate-limit concern here (unlike fetchAIEndpoint, which exists
// specifically to smooth bursts against the shared Lovable AI gateway) —
// this edge function only ever runs the interpreter, no external API calls,
// so a plain fetch is the right tool, not that jitter/retry wrapper.
async function callGradeFunction(body: Record<string, unknown>): Promise<GradeResponse> {
  try {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-challenge-grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => null);
    if (!data) return { ok: false, errorMessage: 'Unexpected response from the grading server.' };
    return data as GradeResponse;
  } catch {
    return { ok: false, errorMessage: 'Could not reach the grading server — check your connection and try again.' };
  }
}

export const PythonChallengesPanel = () => {
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  const [editingIdentity, setEditingIdentity] = useState(!(localStorage.getItem('forge-student-name') && localStorage.getItem('forge-student-email')));

  const [gateChecked, setGateChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lessonsPassed, setLessonsPassed] = useState(0);
  const [lessonsTotal, setLessonsTotal] = useState(0);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<GradeResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<GradeResponse | null>(null);

  // Same staleness-guard pattern LessonsPanel uses — captures its own id so
  // a slow, superseded fetch can never clobber a newer one's result.
  const fetchAllRequestRef = useRef(0);

  // Deliberately independent of LessonsPanel — a small duplicated fetch
  // (lesson count + progress) rather than lifting LessonsPanel's state up
  // to a shared parent. Lessons is a live, proven feature; this keeps the
  // unlock check fully isolated so nothing here can ever regress it.
  const fetchAll = useCallback(async () => {
    const requestId = ++fetchAllRequestRef.current;
    if (!email.trim()) { setIsLoading(false); setGateChecked(true); return; }
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    const [{ data: lessonRows }, { data: progressRows }] = await Promise.all([
      supabase.from('lessons').select('id').eq('is_published', true),
      supabase.rpc('get_my_lesson_progress', { p_participant_email: normalizedEmail }),
    ]);
    if (requestId !== fetchAllRequestRef.current) return;
    const total = lessonRows?.length || 0;
    const passed = ((progressRows as any[]) || []).filter(p => p.passed).length;
    setLessonsTotal(total);
    setLessonsPassed(passed);
    const isUnlocked = total > 0 && passed >= total;
    setUnlocked(isUnlocked);
    setGateChecked(true);

    if (!isUnlocked) { setIsLoading(false); return; }

    const [{ data: challengeRows }, { data: attemptRows }] = await Promise.all([
      supabase
        .from('python_challenges')
        .select('id, order_index, title, slug, prompt, difficulty, function_name, starter_code, coin_reward')
        .eq('is_published', true)
        .order('order_index', { ascending: true }),
      supabase.rpc('get_my_python_challenge_progress', { p_participant_email: normalizedEmail }),
    ]);
    if (requestId !== fetchAllRequestRef.current) return;
    setChallenges((challengeRows as Challenge[]) || []);
    const map: Record<string, Attempt> = {};
    ((attemptRows as any[]) || []).forEach(a => { map[a.challenge_id] = a; });
    setAttempts(map);
    setIsLoading(false);
  }, [email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openChallenge = (challenge: Challenge) => {
    setActiveChallenge(challenge);
    setRunResult(null);
    setSubmitResult(null);
    const saved = localStorage.getItem(`forge-python-challenge:${challenge.id}`);
    setCode(saved ?? challenge.starter_code);
  };

  const closeChallenge = () => {
    setActiveChallenge(null);
    setRunResult(null);
    setSubmitResult(null);
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    if (activeChallenge) {
      try { localStorage.setItem(`forge-python-challenge:${activeChallenge.id}`, next); } catch { /* private browsing / storage full */ }
    }
  };

  const handleRun = async () => {
    if (!activeChallenge || !email.trim()) return;
    setRunning(true);
    setRunResult(null);
    const result = await callGradeFunction({
      participant_email: email.trim().toLowerCase(),
      challenge_id: activeChallenge.id,
      code,
      mode: 'run',
    });
    setRunResult(result);
    setRunning(false);
  };

  const handleSubmit = async () => {
    if (!activeChallenge || !email.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    const result = await callGradeFunction({
      participant_email: email.trim().toLowerCase(),
      challenge_id: activeChallenge.id,
      code,
      mode: 'submit',
    });
    setSubmitResult(result);
    setSubmitting(false);
    if (result.ok) {
      if ((result.bonusCoinsAwarded ?? 0) > 0) toast.success(`+${result.bonusCoinsAwarded} Forge Coins — challenge passed! 🎉`);
      else if (!result.passed) toast.error(`${result.passedCount}/${result.total} tests passed — keep going, no penalty for retrying`);
      fetchAll();
    } else {
      toast.error(result.errorMessage || 'Something went wrong grading your code.');
    }
  };

  if (!gateChecked || isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>;
  }

  if (editingIdentity) {
    return (
      <div className="rounded-lg p-5 border border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-darker))] max-w-md mx-auto">
        <h3 className="text-white font-semibold mb-3">Enter your details to check Python Challenges</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
            className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
        </div>
        <Button
          size="sm"
          disabled={!name.trim() || !email.trim()}
          onClick={() => {
            const trimmedName = name.trim();
            const normalizedEmail = email.trim().toLowerCase();
            localStorage.setItem('forge-student-name', trimmedName);
            localStorage.setItem('forge-student-email', normalizedEmail);
            setName(trimmedName);
            setEmail(normalizedEmail);
            setEditingIdentity(false);
          }}
          className="w-full h-8 text-xs"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="rounded-lg p-6 border border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-darker))] text-center max-w-md mx-auto">
        <Lock className="w-8 h-8 mx-auto mb-3 text-white/30" />
        <h3 className="text-white font-semibold mb-1">Python Challenges — Locked</h3>
        <p className="text-sm text-white/60 mb-3">
          Finish all Lessons to unlock this advanced track — real Python, really executed, graded against hidden tests.
        </p>
        <p className="text-xs text-white/40">{lessonsPassed}/{lessonsTotal} lessons complete</p>
      </div>
    );
  }

  if (activeChallenge) {
    const meta = DIFFICULTY_META[activeChallenge.difficulty];
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={closeChallenge} className="flex items-center gap-1 text-xs text-white/50 hover:text-white mb-3 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to challenges
        </button>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>
            {meta.label}
          </span>
          <h2 className="text-lg font-bold text-white">{activeChallenge.title}</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 font-semibold">
            <CoinIcon size={12} /> {activeChallenge.coin_reward}
          </span>
        </div>

        <p className="text-sm text-white/70 whitespace-pre-line mb-4">{activeChallenge.prompt}</p>

        <CodeEditor value={code} onChange={handleCodeChange} disabled={running || submitting} minRows={8} />

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={handleRun} disabled={running || submitting} className="flex-1">
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            Run (visible tests)
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={running || submitting} className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Submit
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {(runResult || submitResult) && (
            <motion.div
              key={submitResult ? 'submit' : 'run'}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-darker))] p-3"
            >
              {(() => {
                const result = submitResult ?? runResult!;
                const isSubmit = !!submitResult;
                if (!result.ok) {
                  return (
                    <p className="text-sm text-red-400">
                      {result.errorType === 'unsupported_syntax' ? '⚠ ' : result.errorType === 'timeout' ? '⏱ ' : '✕ '}
                      {result.errorMessage}
                    </p>
                  );
                }
                return (
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${isSubmit && result.passed ? 'text-green-400' : 'text-white/80'}`}>
                      {isSubmit
                        ? (result.passed ? '✅ Challenge passed!' : `${result.passedCount}/${result.total} tests passed`)
                        : `${result.passedCount}/${result.total} visible tests passed`}
                    </p>
                    <div className="space-y-1.5">
                      {(result.results || []).map(r => (
                        <div key={r.index} className={`text-xs rounded p-2 border ${r.passed ? 'bg-green-500/10 border-green-500/25' : 'bg-red-500/10 border-red-500/25'}`}>
                          <div className="flex items-center gap-1.5">
                            {r.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                            <span className="font-mono text-white/70">{activeChallenge.function_name}({r.input.map(a => JSON.stringify(a)).join(', ')})</span>
                          </div>
                          {!r.passed && (
                            <p className="text-white/50 mt-1 ml-5">expected <span className="font-mono">{JSON.stringify(r.expected)}</span>, got <span className="font-mono">{JSON.stringify(r.actual)}</span></p>
                          )}
                        </div>
                      ))}
                    </div>
                    {isSubmit && (
                      <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Some tests are hidden — only the visible ones show detail above.
                      </p>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Code2 className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
        <h3 className="text-lg font-bold text-white">Python Challenges</h3>
      </div>
      <p className="text-xs text-white/50 mb-4">Real Python, really executed, graded against hidden tests you can't see.</p>

      {challenges.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-8">No challenges published yet — check back soon.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {challenges.map(c => {
            const attempt = attempts[c.id];
            const meta = DIFFICULTY_META[c.difficulty];
            return (
              <button
                key={c.id}
                onClick={() => openChallenge(c)}
                className={`text-left rounded-lg p-3 border transition-all ${
                  attempt?.passed
                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                    : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple)/0.5)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {attempt?.passed ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Code2 className="w-4 h-4 text-[hsl(var(--discord-blurple))] flex-shrink-0" />}
                  <span className="text-sm font-medium text-white truncate flex-1">{c.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><CoinIcon size={10} /> {c.coin_reward}</span>
                  {attempt && !attempt.passed && (
                    <span className="text-[10px] text-white/40 ml-auto">{attempt.best_passed_count}/{attempt.total_tests} best</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
