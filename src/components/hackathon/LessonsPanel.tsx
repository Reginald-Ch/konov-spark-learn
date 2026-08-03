import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  GraduationCap, Lock, CheckCircle2, Coins, KeyRound, Loader2, Sparkles,
  Lightbulb, Brain, Wand2, PartyPopper, ChevronRight, ChevronLeft, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface LessonContent {
  hook?: string;
  explanation?: string;
  analogy?: string;
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
  4: { name: 'Build Your Own Chatbot', color: '#C70110' },
  5: { name: 'AI Agents & Tools', color: '#9B59B6' },
  6: { name: 'Responsible & Ethical AI', color: '#3498DB' },
};

type Phase = 'content' | 'quiz' | 'results';

export const LessonsPanel = () => {
  const [hackathonId, setHackathonId] = useState<string | null>(null);
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [coinBalance, setCoinBalance] = useState(0);
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

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data: live } = await supabase.from('hackathons').select('id').eq('status', 'live').order('start_date', { ascending: false }).limit(1).maybeSingle();
    const hId = live?.id || null;
    setHackathonId(hId);

    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, module_number, order_index, title, slug, summary, coin_cost, is_published')
      .order('order_index', { ascending: true });
    setLessons((lessonRows as Lesson[]) || []);

    if (email) {
      const [{ data: prog }, { data: coinRows }] = await Promise.all([
        supabase.rpc('get_my_lesson_progress', { p_participant_email: email }),
        hId
          ? supabase.from('point_events').select('points').eq('hackathon_id', hId).eq('participant_email', email).in('event_type', ['forge_coin_grant', 'forge_coin_adjust'])
          : Promise.resolve({ data: [] as { points: number }[] }),
      ]);
      const map: Record<string, Progress> = {};
      (prog || []).forEach((p: any) => { map[p.lesson_id] = p; });
      setProgress(map);
      setCoinBalance((coinRows || []).reduce((s: number, r: any) => s + r.points, 0));
    } else {
      setProgress({});
      setCoinBalance(0);
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
      localStorage.setItem('forge-student-email', email.trim());
      localStorage.setItem('forge-student-name', name.trim());
      toast.success(`Unlocked "${lesson.title}"!`);
      await fetchAll();
    }

    setActiveLesson(lesson);
    setPhase('content');
    setQuizResult(null);
    setAnswers({});
    setQIdx(0);
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
              <p className="text-xs text-white/70">30 lessons — unlock with Forge Coins, pass the quiz, earn a Forge Key every 3 lessons.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30"><Coins className="w-3 h-3" /> {coinBalance}</Badge>
            <Badge className="gap-1 bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]"><KeyRound className="w-3 h-3" /> {Math.floor(passedCount / 3)}</Badge>
            <Badge variant="outline" className="text-white/70">{passedCount}/30 lessons</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
            className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
        </div>
      </motion.div>

      <div className="space-y-5">
        {Object.entries(MODULE_META).map(([modNumStr, meta]) => {
          const modNum = Number(modNumStr);
          const modLessons = grouped[modNum] || [];
          const modDone = modLessons.filter(l => progress[l.id]?.passed).length;
          return (
            <div key={modNum}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>
                  Module {modNum}
                </span>
                <h4 className="font-semibold text-white text-sm">{meta.name}</h4>
                <span className="text-[10px] text-white/50 ml-auto">{modDone}/{modLessons.length}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {modLessons.map((lesson, i) => {
                  const p = progress[lesson.id];
                  const locked = !p && !lesson.is_published;
                  const unlockable = !p && lesson.is_published;
                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openLesson(lesson)}
                      disabled={locked || unlockingId === lesson.id}
                      className={`text-left rounded-lg p-3 border transition-all ${
                        p?.passed
                          ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                          : locked
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
            </div>
          );
        })}
      </div>

      <Dialog open={!!activeLesson} onOpenChange={(open) => !open && closeDialog()}>
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
                    <ContentBlock icon={<Wand2 className="w-4 h-4" />} color="#9B59B6" text={activeContent.analogy} label="Think of it like..." delay={0.1} />
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
      <p className="text-sm text-white/90 leading-relaxed">{text}</p>
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
