import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  GraduationCap, Lock, CheckCircle2, Coins, KeyRound, Loader2, Sparkles,
  Lightbulb, Brain, Wand2, PartyPopper, ChevronRight, ChevronLeft, RotateCcw,
  ArrowRight, ListChecks, Check, X, Terminal, Eraser, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { lintPython } from './editorFeatures';

interface Lesson {
  id: string;
  module_number: number;
  order_index: number;
  title: string;
  slug: string;
  summary: string | null;
  coin_cost: number;
  is_published: boolean;
}

interface VisualStep {
  emoji: string;
  label: string;
  caption?: string;
}

interface VisualDiagram {
  caption?: string;
  steps: VisualStep[];
}

interface PracticeCheck {
  prompt: string;
  options: string[];
  correct_index: number;
  feedback: string;
}

interface CodePractice {
  instructions: string;
  starter: string;
  check_pattern: string;
  success_message: string;
  hint: string;
}

interface LessonContent {
  hook?: string;
  explanation?: string;
  code?: string;
  analogy?: string;
  visual?: VisualDiagram;
  practice?: PracticeCheck;
  code_practice?: CodePractice;
  fun_fact?: string;
  try_it?: string;
}

interface Progress {
  lesson_id: string;
  completed_at: string | null;
  best_score: number;
  attempts: number;
  passed: boolean;
}

interface QuizQuestion {
  id: string;
  order_index: number;
  question: string;
  options: string[];
}

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  key_awarded: boolean;
  correct_flags: boolean[];
  explanations: string[];
}

const MODULE_META: Record<number, { name: string; color: string }> = {
  1: { name: 'AI Foundations', color: '#5865F2' },
  2: { name: 'Machine Learning Fundamentals', color: '#006600' },
  3: { name: 'How Chatbots & LLMs Think', color: '#F7941D' },
  4: { name: 'Code Fundamentals', color: '#FFD43B' },
  5: { name: 'Build Your Own Chatbot', color: '#C70110' },
  6: { name: 'AI Agents & Tools', color: '#9B59B6' },
  7: { name: 'Responsible & Ethical AI', color: '#3498DB' },
};

type Phase = 'content' | 'quiz' | 'results';

export const LessonsPanel = () => {
  const [hackathonId, setHackathonId] = useState<string | null>(null);
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  // Identity is shared app-wide (Community, Daily Challenges, the IDE) — only
  // show editable fields when we don't already know who this is.
  const [editingIdentity, setEditingIdentity] = useState(!(localStorage.getItem('forge-student-name') && localStorage.getItem('forge-student-email')));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [coinBalance, setCoinBalance] = useState(0);
  const [keyBalance, setKeyBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeContent, setActiveContent] = useState<LessonContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('content');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [practicePick, setPracticePick] = useState<number | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const autoCollapsedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);

    // Resolve "this student's" hackathon from their own registration first —
    // NOT just whichever hackathon is currently "live". Otherwise every
    // balance/unlock check silently reads as empty the moment an event ends,
    // since point_events are scoped by hackathon_id and `hackathon_id = NULL`
    // never matches anything in SQL. Only fall back to the live hackathon
    // for a brand-new visitor who hasn't registered/earned anything yet.
    let hId: string | null = null;
    if (email) {
      const { data: reg } = await supabase
        .from('hackathon_registrations')
        .select('hackathon_id')
        .eq('participant_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      hId = reg?.hackathon_id || null;
    }
    if (!hId) {
      const { data: live } = await supabase.from('hackathons').select('id').eq('status', 'live').order('start_date', { ascending: false }).limit(1).maybeSingle();
      hId = live?.id || null;
    }
    setHackathonId(hId);

    const { data: lessonRows, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, module_number, order_index, title, slug, summary, coin_cost, is_published')
      .order('order_index', { ascending: true });
    if (lessonErr) {
      toast.error('Could not load lessons — the database may not be migrated yet.');
      console.error('lessons fetch error:', lessonErr);
    }
    setLessons((lessonRows as Lesson[]) || []);

    if (email) {
      const [{ data: prog }, { data: coinRows }, { data: keyRows }] = await Promise.all([
        supabase.rpc('get_my_lesson_progress', { p_participant_email: email }),
        hId
          ? supabase.from('point_events').select('points').eq('hackathon_id', hId).eq('participant_email', email).in('event_type', ['forge_coin_grant', 'forge_coin_adjust'])
          : Promise.resolve({ data: [] as { points: number }[] }),
        // Forge Keys earned from lessons (every 3rd passed) AND from the hackathon
        // (daily challenges) share the same event_type — summing this ledger is
        // the combined total, which is what certificate-unlock checks need.
        hId
          ? supabase.from('point_events').select('points').eq('hackathon_id', hId).eq('participant_email', email).eq('event_type', 'forge_key')
          : Promise.resolve({ data: [] as { points: number }[] }),
      ]);
      const map: Record<string, Progress> = {};
      (prog || []).forEach((p: any) => { map[p.lesson_id] = p; });
      setProgress(map);
      setCoinBalance((coinRows || []).reduce((s: number, r: any) => s + r.points, 0));
      setKeyBalance((keyRows || []).reduce((s: number, r: any) => s + r.points, 0));
    } else {
      setProgress({});
      setCoinBalance(0);
      setKeyBalance(0);
    }
    setIsLoading(false);
  }, [email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grouped = useMemo(() => {
    const byModule: Record<number, Lesson[]> = {};
    lessons.forEach(l => { (byModule[l.module_number] ||= []).push(l); });
    return byModule;
  }, [lessons]);

  const passedCount = Object.values(progress).filter(p => p.passed).length;

  // Auto-collapse modules the student has already 100% finished — once, on
  // first load only, so a manual toggle afterward is never overridden.
  useEffect(() => {
    if (autoCollapsedRef.current || lessons.length === 0) return;
    autoCollapsedRef.current = true;
    const initial: Record<number, boolean> = {};
    Object.entries(grouped).forEach(([modNumStr, modLessons]) => {
      const modNum = Number(modNumStr);
      const done = modLessons.filter(l => progress[l.id]?.passed).length;
      if (modLessons.length > 0 && done === modLessons.length) initial[modNum] = true;
    });
    setCollapsedModules(initial);
  }, [lessons, progress, grouped]);

  const jumpToModule = (modNum: number) => {
    setCollapsedModules(c => ({ ...c, [modNum]: false }));
    requestAnimationFrame(() => {
      document.getElementById(`module-${modNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openLesson = async (lesson: Lesson) => {
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return; }
    const existing = progress[lesson.id];

    if (!existing) {
      if (!lesson.is_published) { toast.info("This lesson isn't available yet — check back soon!"); return; }
      setUnlockingId(lesson.id);
      const { data, error } = await supabase.rpc('unlock_lesson', {
        p_participant_email: email.trim(),
        p_hackathon_id: hackathonId,
        p_lesson_id: lesson.id,
      });
      setUnlockingId(null);
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        toast.error(result?.message || error?.message || 'Failed to unlock lesson');
        return;
      }
      localStorage.setItem('forge-student-email', email.trim().toLowerCase());
      localStorage.setItem('forge-student-name', name.trim());
      toast.success(`Unlocked "${lesson.title}"!`);
      await fetchAll();
    }

    setActiveLesson(lesson);
    setPhase('content');
    setQuizResult(null);
    setAnswers({});
    setQIdx(0);
    setPracticePick(null);
    setActiveContent(null);
    setContentLoading(true);
    const { data: content, error: contentErr } = await supabase.rpc('get_lesson_content', {
      p_participant_email: email.trim(),
      p_lesson_id: lesson.id,
    });
    setContentLoading(false);
    if (contentErr) {
      toast.error(contentErr.message || 'Failed to load lesson content');
      return;
    }
    setActiveContent((content as LessonContent) || null);
  };

  const startQuiz = async () => {
    if (!activeLesson) return;
    const { data, error } = await supabase.rpc('get_quiz_questions', {
      p_participant_email: email.trim(),
      p_lesson_id: activeLesson.id,
    });
    if (error) { toast.error(error.message || 'Failed to load quiz'); return; }
    setQuizQuestions((data as any as QuizQuestion[]) || []);
    setAnswers({});
    setQIdx(0);
    setPhase('quiz');
  };

  const submitQuiz = async () => {
    if (!activeLesson) return;
    setSubmittingQuiz(true);
    try {
      const answerArray = quizQuestions.map((_, i) => answers[i] ?? -1);
      const { data, error } = await supabase.rpc('submit_lesson_quiz', {
        p_participant_email: email.trim(),
        p_hackathon_id: hackathonId,
        p_lesson_id: activeLesson.id,
        p_answers: answerArray,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setQuizResult(result as QuizResult);
      setPhase('results');
      await fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const closeDialog = () => { setActiveLesson(null); setActiveContent(null); setPhase('content'); setQuizResult(null); };
  const requestCloseDialog = () => {
    if (phase === 'quiz') { setConfirmCloseOpen(true); return; }
    closeDialog();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>;
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg p-5 mb-6 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[hsl(var(--discord-blurple))]">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI &amp; ML Academy</h3>
              <p className="text-xs text-white/70">{lessons.length} lessons — unlock with Forge Coins, pass the quiz, earn a Forge Key every 3 lessons.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30"><Coins className="w-3 h-3" /> {coinBalance}</Badge>
            <Badge className="gap-1 bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]"><KeyRound className="w-3 h-3" /> {keyBalance}</Badge>
            <Badge variant="outline" className="text-white/70">{passedCount}/{lessons.length} lessons</Badge>
          </div>
        </div>
        {editingIdentity ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
            {name.trim() && email.trim() && (
              <Button
                size="sm"
                onClick={() => {
                  localStorage.setItem('forge-student-name', name.trim());
                  localStorage.setItem('forge-student-email', email.trim().toLowerCase());
                  setName(name.trim());
                  setEmail(email.trim().toLowerCase());
                  setEditingIdentity(false);
                }}
                className="col-span-2 h-8 text-xs"
              >
                Continue
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-sm text-white/70">
            <span>Continuing as <span className="text-white font-medium">{name}</span> <span className="text-white/50">({email})</span></span>
            <button onClick={() => setEditingIdentity(true)} className="text-[hsl(var(--discord-blurple))] hover:underline text-xs">Not you?</button>
          </div>
        )}
      </motion.div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {Object.entries(MODULE_META).map(([modNumStr, meta]) => {
          const modNum = Number(modNumStr);
          const modLessons = grouped[modNum] || [];
          const modDone = modLessons.filter(l => progress[l.id]?.passed).length;
          const complete = modLessons.length > 0 && modDone === modLessons.length;
          return (
            <button key={modNum} onClick={() => jumpToModule(modNum)}
              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full text-white transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ backgroundColor: meta.color, opacity: complete ? 0.55 : 1 }}>
              {complete && <CheckCircle2 className="w-3 h-3" />}
              M{modNum}
            </button>
          );
        })}
      </div>

      <div className="space-y-5">
        {Object.entries(MODULE_META).map(([modNumStr, meta]) => {
          const modNum = Number(modNumStr);
          const modLessons = grouped[modNum] || [];
          const modDone = modLessons.filter(l => progress[l.id]?.passed).length;
          const isCollapsed = !!collapsedModules[modNum];
          return (
            <div key={modNum} id={`module-${modNum}`} className="scroll-mt-4">
              <button
                onClick={() => setCollapsedModules(c => ({ ...c, [modNum]: !c[modNum] }))}
                className="flex items-center gap-2 mb-2 w-full text-left"
              >
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>
                  Module {modNum}
                </span>
                <h4 className="font-semibold text-white text-sm">{meta.name}</h4>
                <span className="text-[10px] text-white/50 ml-auto">{modDone}/{modLessons.length}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
              <div className="grid gap-2 md:grid-cols-2">
                {modLessons.map((lesson, i) => {
                  const p = progress[lesson.id];
                  const locked = !p && !lesson.is_published;
                  const unlockable = !p && lesson.is_published;
                  const canAfford = coinBalance >= lesson.coin_cost;
                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openLesson(lesson)}
                      disabled={locked || unlockingId === lesson.id || (unlockable && !canAfford)}
                      title={unlockable && !canAfford ? `You need ${lesson.coin_cost - coinBalance} more Forge Coins` : undefined}
                      className={`text-left rounded-lg p-3 border transition-all ${
                        p?.passed
                          ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                          : locked || (unlockable && !canAfford)
                          ? 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.1)] opacity-60 cursor-not-allowed'
                          : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple)/0.5)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {p?.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : locked ? (
                          <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
                        ) : p ? (
                          <Sparkles className="w-4 h-4 text-[hsl(var(--discord-blurple))] flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-white truncate flex-1">{lesson.order_index}. {lesson.title}</span>
                        {unlockingId === lesson.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />}
                      </div>
                      {lesson.summary && <p className="text-[11px] text-white/50 mt-1 line-clamp-1">{lesson.summary}</p>}
                      <div className="mt-1.5">
                        {p?.passed ? (
                          <span className="text-[10px] font-bold text-green-400">Completed — {p.best_score}/7</span>
                        ) : unlockable && !canAfford ? (
                          <span className="text-[10px] font-bold text-white/40 flex items-center gap-1"><Coins className="w-3 h-3" /> Need {lesson.coin_cost - coinBalance} more coins</span>
                        ) : unlockable ? (
                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><Coins className="w-3 h-3" /> Unlock for {lesson.coin_cost}</span>
                        ) : p ? (
                          <span className="text-[10px] font-bold text-[hsl(var(--discord-blurple))]">Continue →</span>
                        ) : (
                          <span className="text-[10px] text-white/40">Coming soon</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!activeLesson} onOpenChange={(open) => !open && requestCloseDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {activeLesson && phase === 'content' && (
            <>
              <DialogHeader>
                <DialogTitle>{activeLesson.order_index}. {activeLesson.title}</DialogTitle>
                <DialogDescription>{activeLesson.summary}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {contentLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
                ) : activeContent ? (
                  <>
                    <ContentBlock icon={<Lightbulb className="w-4 h-4" />} color="#F7941D" text={activeContent.hook} delay={0} />
                    <ContentBlock icon={<Brain className="w-4 h-4" />} color="#5865F2" text={activeContent.explanation} delay={0.05} />
                    <CodeBlock code={activeContent.code} delay={0.07} />
                    <VisualBlock visual={activeContent.visual} delay={0.08} />
                    <ContentBlock icon={<Wand2 className="w-4 h-4" />} color="#9B59B6" text={activeContent.analogy} label="Think of it like..." delay={0.1} />
                    <PracticeBlock practice={activeContent.practice} picked={practicePick} onPick={setPracticePick} delay={0.13} />
                    {activeContent.code_practice && (
                      <CodePracticeCell key={activeLesson.id} practice={activeContent.code_practice} delay={0.16} />
                    )}
                    <ContentBlock icon={<Sparkles className="w-4 h-4" />} color="#006600" text={activeContent.fun_fact} label="Fun fact" delay={0.15} />
                    <ContentBlock icon={<PartyPopper className="w-4 h-4" />} color="#C70110" text={activeContent.try_it} label="Try it" delay={0.2} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Content coming soon.</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={closeDialog} className="flex-1">Close</Button>
                  <Button onClick={startQuiz} className="flex-1" disabled={!activeContent}>
                    {progress[activeLesson.id]?.passed ? <><RotateCcw className="w-4 h-4 mr-1" /> Retake Quiz</> : <>Take the Quiz <ChevronRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeLesson && phase === 'quiz' && quizQuestions.length > 0 && (
            <QuizStep
              question={quizQuestions[qIdx]}
              index={qIdx}
              total={quizQuestions.length}
              selected={answers[qIdx]}
              onSelect={(i) => setAnswers(a => ({ ...a, [qIdx]: i }))}
              onBack={() => setQIdx(i => Math.max(0, i - 1))}
              onNext={() => setQIdx(i => Math.min(quizQuestions.length - 1, i + 1))}
              onSubmit={submitQuiz}
              submitting={submittingQuiz}
            />
          )}

          {activeLesson && phase === 'results' && quizResult && (
            <ResultsStep result={quizResult} lessonTitle={activeLesson.title} questions={quizQuestions}
              onReview={() => setPhase('content')} onClose={closeDialog} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers so far will not be saved. You can restart the quiz any time — no penalty for retaking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmCloseOpen(false); closeDialog(); }}>Discard & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ContentBlock = ({ icon, color, text, label, delay }: { icon: React.ReactNode; color: string; text?: string; label?: string; delay: number }) => {
  if (!text) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg p-3 border" style={{ background: `${color}10`, borderColor: `${color}30` }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        {label && <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{label}</span>}
      </div>
      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{text}</p>
    </motion.div>
  );
};

const CodeBlock = ({ code, delay }: { code?: string; delay: number }) => {
  if (!code) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg overflow-hidden border border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-500/60" />
        <span className="w-2 h-2 rounded-full bg-amber-500/60" />
        <span className="w-2 h-2 rounded-full bg-green-500/60" />
        <span className="text-[10px] text-white/40 ml-2 font-mono">python</span>
      </div>
      <pre className="bg-[#0d0d0d] p-3 overflow-x-auto"><code className="text-xs font-mono text-[#e6e6e6] leading-relaxed whitespace-pre">{code}</code></pre>
    </motion.div>
  );
};

const VisualBlock = ({ visual, delay }: { visual?: VisualDiagram; delay: number }) => {
  if (!visual || !visual.steps?.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      {visual.caption && (
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2">{visual.caption}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {visual.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + i * 0.08 }}
              className="flex flex-col items-center text-center w-20 rounded-lg p-2 bg-[hsl(var(--discord-blurple)/0.1)] border border-[hsl(var(--discord-blurple)/0.25)]"
            >
              <span className="text-2xl leading-none mb-1">{step.emoji}</span>
              <span className="text-[10px] font-semibold text-white leading-tight">{step.label}</span>
              {step.caption && <span className="text-[9px] text-white/50 leading-tight mt-0.5">{step.caption}</span>}
            </motion.div>
            {i < visual.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const PracticeBlock = ({ practice, picked, onPick, delay }: {
  practice?: PracticeCheck; picked: number | null; onPick: (i: number) => void; delay: number;
}) => {
  if (!practice) return null;
  const revealed = picked !== null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg p-3 border bg-[hsl(var(--discord-blurple)/0.08)] border-[hsl(var(--discord-blurple)/0.3)]">
      <div className="flex items-center gap-2 mb-1.5">
        <ListChecks className="w-4 h-4 text-[hsl(var(--discord-blurple))]" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--discord-blurple))]">Quick practice</span>
      </div>
      <p className="text-sm text-white/90 mb-2">{practice.prompt}</p>
      <div className="space-y-1.5">
        {practice.options.map((opt, i) => {
          const isCorrect = i === practice.correct_index;
          const isPicked = picked === i;
          return (
            <button key={i} onClick={() => !revealed && onPick(i)} disabled={revealed}
              className={`w-full text-left px-2.5 py-2 rounded-md border text-xs flex items-center gap-2 transition-all ${
                revealed
                  ? isCorrect
                    ? 'bg-green-500/15 border-green-500/40 text-white'
                    : isPicked
                    ? 'bg-red-500/15 border-red-500/40 text-white'
                    : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white/50'
                  : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white/80 hover:border-[hsl(var(--discord-blurple)/0.5)]'
              }`}>
              {revealed && isCorrect && <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              {revealed && isPicked && !isCorrect && <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-white/60 mt-2 leading-relaxed">
            {picked === practice.correct_index ? '✅ ' : '💡 '}{practice.feedback}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CodePracticeCell = ({ practice, delay }: { practice: CodePractice; delay: number }) => {
  const [code, setCode] = useState(practice.starter);
  const [checked, setChecked] = useState(false);
  const [passed, setPassed] = useState(false);
  const [lintErrors, setLintErrors] = useState<ReturnType<typeof lintPython>>([]);
  const [showHint, setShowHint] = useState(false);

  const runCheck = () => {
    const errors = lintPython(code);
    setLintErrors(errors);
    let ok = false;
    try { ok = new RegExp(practice.check_pattern, 'i').test(code); } catch { ok = false; }
    setPassed(ok && errors.filter(e => e.severity === 'error').length === 0);
    setChecked(true);
  };

  const reset = () => { setCode(practice.starter); setChecked(false); setPassed(false); setLintErrors([]); setShowHint(false); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg overflow-hidden border border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-white/5">
        <Terminal className="w-3.5 h-3.5 text-[hsl(var(--discord-blurple))]" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Your Turn — Write the Code</span>
      </div>
      <div className="bg-[#0d0d0d] p-3 space-y-2">
        <p className="text-xs text-white/70 leading-relaxed">{practice.instructions}</p>
        <textarea
          value={code}
          onChange={e => { setCode(e.target.value); setChecked(false); }}
          spellCheck={false}
          rows={code.split('\n').length + 1}
          className="w-full bg-[#161616] border border-white/10 rounded-md p-2.5 text-xs font-mono text-[#e6e6e6] leading-relaxed resize-y focus:outline-none focus:border-[hsl(var(--discord-blurple)/0.5)]"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runCheck} className="h-7 text-xs">Check My Code</Button>
          <Button size="sm" variant="ghost" onClick={reset} className="h-7 text-xs"><Eraser className="w-3 h-3 mr-1" /> Reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowHint(h => !h)} className="h-7 text-xs ml-auto">{showHint ? 'Hide Hint' : 'Show Hint'}</Button>
        </div>
        <AnimatePresence>
          {showHint && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="text-xs text-amber-400/90 leading-relaxed">💡 {practice.hint}</motion.p>
          )}
        </AnimatePresence>
        {checked && lintErrors.length > 0 && (
          <div className="space-y-1">
            {lintErrors.map((e, i) => (
              <p key={i} className="text-[11px] text-red-400/90">⚠ Line {e.line + 1}: {e.message}</p>
            ))}
          </div>
        )}
        <AnimatePresence>
          {checked && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`rounded-md px-2.5 py-2 text-xs font-medium ${passed ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'}`}>
              {passed ? `✅ ${practice.success_message}` : "Not quite yet — check the hint above and try again!"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const QuizStep = ({ question, index, total, selected, onSelect, onBack, onNext, onSubmit, submitting }: {
  question: QuizQuestion; index: number; total: number; selected: number | undefined;
  onSelect: (i: number) => void; onBack: () => void; onNext: () => void; onSubmit: () => void; submitting: boolean;
}) => (
  <>
    <DialogHeader>
      <div className="flex items-center gap-1.5 mb-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-[hsl(var(--discord-blurple))]' : 'bg-[hsl(var(--discord-light)/0.2)]'}`} />
        ))}
      </div>
      <DialogTitle>Question {index + 1} of {total}</DialogTitle>
    </DialogHeader>
    <motion.div key={index} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-3 mt-2">
      <p className="text-sm font-medium text-white">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => onSelect(i)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
              selected === i
                ? 'bg-[hsl(var(--discord-blurple)/0.2)] border-[hsl(var(--discord-blurple))] text-white'
                : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white/80 hover:border-[hsl(var(--discord-light)/0.4)]'
            }`}>
            {opt}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack} disabled={index === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex-1" />
        {index < total - 1 ? (
          <Button onClick={onNext} disabled={selected === undefined}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={onSubmit} disabled={selected === undefined || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit Quiz
          </Button>
        )}
      </div>
    </motion.div>
  </>
);

const ResultsStep = ({ result, lessonTitle, questions, onReview, onClose }: {
  result: QuizResult; lessonTitle: string; questions: QuizQuestion[]; onReview: () => void; onClose: () => void;
}) => (
  <div className="text-center py-2">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="text-5xl mb-3">
      {result.passed ? '🎉' : '💪'}
    </motion.div>
    <h3 className="text-xl font-bold text-white mb-1">{result.passed ? 'Lesson Complete!' : 'So Close!'}</h3>
    <p className="text-sm text-white/70 mb-4">{lessonTitle} — you scored {result.score}/{result.total}</p>

    {!result.passed && (
      <p className="text-xs text-amber-400 mb-4">You need 5/7 to pass — review the lesson and try again, no penalty for retaking!</p>
    )}

    <AnimatePresence>
      {result.key_awarded && (
        <motion.div initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
          className="bg-gradient-to-r from-[#FFD700]/15 to-[#F7941D]/15 border border-[#FFD700]/30 rounded-lg p-4 mb-4">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.5 }} className="text-3xl mb-1">🔑</motion.div>
          <p className="text-sm font-bold text-white">Forge Key earned!</p>
          <p className="text-xs text-white/60">3 lessons passed — keys unlock your certificate at the end.</p>
        </motion.div>
      )}
    </AnimatePresence>

    {questions.length > 0 && (
      <div className="text-left space-y-2 mb-4 max-h-56 overflow-y-auto">
        {questions.map((q, i) => {
          const correct = result.correct_flags[i];
          const explanation = result.explanations[i];
          return (
            <motion.div key={q.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-lg p-2.5 border text-xs ${correct ? 'bg-green-500/10 border-green-500/25' : 'bg-red-500/10 border-red-500/25'}`}>
              <div className="flex items-center gap-1.5 font-medium text-white/90">
                <span>{correct ? '✅' : '❌'}</span>
                <span className="line-clamp-1">{q.question}</span>
              </div>
              {explanation && <p className="text-white/60 mt-1 ml-5">{explanation}</p>}
            </motion.div>
          );
        })}
      </div>
    )}

    <div className="flex gap-2">
      <Button variant="ghost" onClick={onReview} className="flex-1">Review Lesson</Button>
      <Button onClick={onClose} className="flex-1">Done</Button>
    </div>
  </div>
);
