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
  GraduationCap, Lock, CheckCircle2, Loader2, PlayCircle,
  Lightbulb, Brain, Puzzle, PartyPopper, ChevronRight, ChevronLeft, RotateCcw,
  ArrowRight, ListChecks, Check, X, Terminal, Eraser, ChevronDown, Eye, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { lintPython } from './editorFeatures';
import { getStoredAdminRole, callAdminAction } from '@/lib/adminClient';
import { MilestoneCelebration } from './ForgeWalkthrough';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import { ensureHackathonRegistration } from '@/lib/identity';
import { CoinIcon } from './CoinIcon';

interface Lesson {
  id: string;
  module_number: number;
  order_index: number;
  title: string;
  slug: string;
  summary: string | null;
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
  video_url?: string;
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
  bonus_coins_awarded: number;
  correct_flags: boolean[];
  explanations: string[];
  new_device_token?: string | null;
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

const CurrencyBadge = ({ icon, value, className }: { icon: React.ReactNode; value: number; className: string }) => {
  const prevValueRef = useRef(value);
  const [pulse, setPulse] = useState<'gain' | 'spend' | false>(false);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const amount = value - prevValueRef.current;
      const kind = amount > 0 ? 'gain' : 'spend';
      setDelta({ amount, id: Date.now() });
      setPulse(kind);
      const t1 = setTimeout(() => setPulse(false), 650);
      const t2 = setTimeout(() => setDelta(null), 1200);
      prevValueRef.current = value;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevValueRef.current = value;
  }, [value]);

  return (
    <motion.div
      className="relative"
      animate={pulse === 'gain' ? { scale: [1, 1.12, 1] } : pulse === 'spend' ? { x: [0, -3, 3, -3, 0] } : { scale: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Badge className={`gap-1 ${className}`}>
        {/* perspective has to live on this wrapper, not the spinning icon
            itself, or rotateY just squashes flat instead of foreshortening
            into an actual coin-toss look — same gotcha as the Mission Bonus
            tilt. */}
        <span className="inline-flex" style={{ perspective: 200 }}>
          <motion.span className="inline-flex" animate={pulse === 'gain' ? { rotateY: [0, 360] } : {}} transition={{ duration: 0.6 }}>
            {icon}
          </motion.span>
        </span>
        {value}
      </Badge>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 2, scale: 0.6 }}
            animate={{ opacity: 1, y: -16, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={`absolute -top-1 -right-1 text-[10px] font-extrabold ${delta.amount > 0 ? 'text-amber-300' : 'text-red-400'}`}
            style={{ textShadow: '0 0 8px currentColor' }}
          >
            {delta.amount > 0 ? '+' : ''}{delta.amount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ProgressRing = ({ value, total, size = 42, stroke = 4, color }: { value: number; total: number; size?: number; stroke?: number; color: string }) => {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 70, damping: 16 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[10px] font-extrabold text-white">{value}/{total}</span>
      </div>
    </div>
  );
};

const MiniBurst = ({ burstId }: { burstId: number }) => (
  <AnimatePresence>
    {burstId > 0 && (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={`${burstId}-${i}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: (Math.random() - 0.5) * 140,
              y: (Math.random() - 0.5) * 100 - 20,
              opacity: 0,
              scale: 1,
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 text-sm"
          >
            {['✨', '⭐', '💫', '🎉'][i % 4]}
          </motion.span>
        ))}
      </div>
    )}
  </AnimatePresence>
);

export const LessonsPanel = () => {
  const [hackathonId, setHackathonId] = useState<string | null>(null);
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  // Same per-email TOFU bearer credential Community Chat/Daily Challenges
  // mint and check — shared localStorage key, so an identity already
  // claimed elsewhere on this browser doesn't need proving twice. Without
  // this, submit_lesson_quiz took a bare self-asserted email and let
  // anyone force-complete lessons (and mint coins) onto someone else's
  // account just by knowing it.
  const [deviceToken, setDeviceTokenState] = useState(() => localStorage.getItem('forge-device-token') || '');
  const setDeviceToken = (value: string) => {
    setDeviceTokenState(value);
    if (value) localStorage.setItem('forge-device-token', value);
    else localStorage.removeItem('forge-device-token');
  };
  // Identity is shared app-wide (Community, Daily Challenges, the IDE) — only
  // show editable fields when we don't already know who this is.
  const [editingIdentity, setEditingIdentity] = useState(!(localStorage.getItem('forge-student-name') && localStorage.getItem('forge-student-email')));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  // Lessons are free now — this is a lifetime-earned total (10 coins per
  // lesson passed), not a spendable balance, so it only ever goes up.
  const [lessonCoinsEarned, setLessonCoinsEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeContent, setActiveContent] = useState<LessonContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('content');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [resultWasRetake, setResultWasRetake] = useState(false);
  const [practicePick, setPracticePick] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<(QuizQuestion & { correct_index: number; explanation: string | null })[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const isOrganizer = getStoredAdminRole() === 'organizer';
  // Bumped every time a lesson/preview/quiz-content fetch starts; each fetch
  // captures its own value and checks it's still current before applying its
  // result. Without this, opening lesson A then quickly opening lesson B
  // before A's content finished loading could let A's late response land
  // AFTER B's and silently overwrite B's dialog with A's content — title
  // and summary would say B, but the body (hook/explanation/code/practice)
  // would be A's.
  const contentRequestRef = useRef(0);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const autoCollapsedRef = useRef(false);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const prevCompleteModulesRef = useRef<Set<number>>(new Set());
  const moduleBaselinedRef = useRef(false);
  // Same staleness problem as contentRequestRef above, but for fetchAll
  // itself — editing the identity fields quickly re-triggers this via the
  // effect below, and an older in-flight call finishing after a newer one
  // could otherwise clobber fresh lessons/progress/lessonCoinsEarned with
  // stale data for whatever email was typed a moment before.
  const fetchAllRequestRef = useRef(0);

  // A single retry after a short delay for exactly the transient case this
  // file's own comments already call out — a network blip, or a device
  // token that's momentarily stale right after a mint racing this fetch —
  // so one of those doesn't read as "your progress is gone."
  const rpcWithRetry = useCallback(async <T,>(fn: () => Promise<{ data: T | null; error: any }>) => {
    const first = await fn();
    if (!first.error) return first;
    await new Promise(r => setTimeout(r, 700));
    return fn();
  }, []);

  const fetchAll = useCallback(async () => {
    const requestId = ++fetchAllRequestRef.current;
    setIsLoading(true);

    // Resolve "this student's" hackathon from their own registration first —
    // NOT just whichever hackathon is currently "live". Otherwise every
    // balance/unlock check silently reads as empty the moment an event ends,
    // since point_events are scoped by hackathon_id and `hackathon_id = NULL`
    // never matches anything in SQL. Only fall back to the live hackathon
    // for a brand-new visitor who hasn't registered/earned anything yet.
    let hId: string | null = null;
    if (email) {
      // Routed through an RPC — hackathon_registrations has a wide-open
      // SELECT policy, so this raw select worked but let the same anon key
      // read any participant's registration, not just the caller's own.
      // p_device_token added (security audit) — this RPC used to trust a
      // bare email with no proof of identity.
      const { data: regs } = await supabase.rpc('get_my_latest_hackathon_registration', { p_participant_email: email, p_device_token: deviceToken || null });
      hId = regs?.[0]?.hackathon_id || null;
    }
    if (!hId) {
      const { data: live } = await supabase.from('hackathons').select('id').eq('status', 'live').order('start_date', { ascending: false }).limit(1).maybeSingle();
      hId = live?.id || null;
    }
    if (!hId) {
      // Last-resort fallback: no registration and no currently-live event
      // (e.g. the gap between one event ending and the next going live).
      // Without this, lesson-coin point_events earned during that gap get
      // hackathon_id = NULL — harmless for this component's own lifetime
      // coin total (deliberately unscoped, see above), but invisible to any
      // admin reporting that filters point_events by hackathon_id. Picking
      // the most recent hackathon regardless of status keeps that linkage
      // intact for everyone except a brand-new install with zero hackathons
      // ever created.
      const { data: any } = await supabase.from('hackathons').select('id').order('start_date', { ascending: false }).limit(1).maybeSingle();
      hId = any?.id || null;
    }
    if (requestId !== fetchAllRequestRef.current) return; // superseded by a newer fetchAll
    setHackathonId(hId);

    const { data: lessonRows, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, module_number, order_index, title, slug, summary, is_published')
      .order('order_index', { ascending: true });
    if (lessonErr) {
      toast.error('Could not load lessons — the database may not be migrated yet.');
      console.error('lessons fetch error:', lessonErr);
    }
    if (requestId !== fetchAllRequestRef.current) return;
    setLessons((lessonRows as Lesson[]) || []);

    if (email) {
      // Deliberately NOT scoped to hId, unlike the balance query this
      // replaced. lesson_progress (what's unlocked/passed) has always been
      // global per participant, with no hackathon_id at all — but coins
      // were still tagged and filtered per-event, so a returning student's
      // earned total silently reset every time they joined a new event
      // even though everything they'd already learned stayed exactly where
      // they left it. Lessons are a learning record, not a per-event
      // competition score (that's what SP and Project Score are for), so
      // the coin total now follows the same lifetime scope progress does.
      const [{ data: prog, error: progErr }, { data: coinRows, error: coinErr }] = await Promise.all([
        // p_device_token added (security audit) — this RPC used to trust a
        // bare email with no proof of identity, letting anyone read any
        // participant's full lesson completion history just by knowing
        // their email. It sat right next to get_my_lesson_coin_points below
        // (already hardened) and was missed in that pass.
        rpcWithRetry(() => supabase.rpc('get_my_lesson_progress', { p_participant_email: email, p_device_token: deviceToken || null })),
        // Same RPC-not-raw-select fix as the registration lookup above —
        // point_events also has a wide-open SELECT policy. p_device_token
        // added (security audit) — no proof of identity existed before.
        rpcWithRetry(() => supabase.rpc('get_my_lesson_coin_points', { p_participant_email: email, p_device_token: deviceToken || null })),
      ]);
      if (requestId !== fetchAllRequestRef.current) return;
      // Both used to be destructured for .data only — a transient failure
      // (network blip, or deviceToken momentarily stale right after a mint)
      // silently fell through to setProgress({}), making a student's whole
      // completion history appear to vanish with zero indication it was a
      // fetch error rather than an actual reset. Now retried once before
      // this fires, and the real Postgrest message/code is logged so a
      // genuine (non-transient) failure is actually diagnosable.
      if (progErr) {
        console.error('lesson progress fetch error:', progErr.message, progErr.code, progErr);
        toast.error('Could not load your lesson progress — try refreshing.');
      }
      if (coinErr) { console.error('lesson coins fetch error:', coinErr.message, coinErr.code, coinErr); }
      const map: Record<string, Progress> = {};
      (prog || []).forEach((p: any) => { map[p.lesson_id] = p; });
      setProgress(map);
      setLessonCoinsEarned((coinRows || []).reduce((s: number, r: any) => s + r.points, 0));
    } else {
      setProgress({});
      setLessonCoinsEarned(0);
    }
    if (requestId === fetchAllRequestRef.current) setIsLoading(false);
  }, [email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grouped = useMemo(() => {
    const byModule: Record<number, Lesson[]> = {};
    lessons.forEach(l => { (byModule[l.module_number] ||= []).push(l); });
    return byModule;
  }, [lessons]);

  const passedCount = Object.values(progress).filter(p => p.passed).length;

  // The one lesson that's always reachable with no progress row at all —
  // matches get_lesson_content/get_quiz_questions's own bootstrap check
  // server-side (lowest order_index among published lessons).
  const firstLessonId = useMemo(() => {
    const published = lessons.filter(l => l.is_published).sort((a, b) => a.order_index - b.order_index);
    return published[0]?.id ?? null;
  }, [lessons]);
  const isLessonAvailable = (lesson: Lesson) => lesson.id === firstLessonId || !!progress[lesson.id];

  // Fires a full-screen celebration the moment a module flips to 100% —
  // but never on initial load (moduleBaselinedRef skips the first pass so
  // returning students don't get "congratulated" for old progress).
  //
  // Gated on !isLoading, not just lessons.length > 0 — fetchAll commits
  // `lessons` and `progress` in two SEPARATE renders (a real await gap sits
  // between them while it fetches progress/coins), so lessons.length > 0
  // used to be true for a render where progress was still {}. That premature
  // render baselined this ref against empty progress, so a returning
  // student's already-completed modules looked "newly done" the moment real
  // progress landed a moment later — a false celebration on every return
  // visit, exactly what this ref exists to prevent.
  useEffect(() => {
    if (isLoading || lessons.length === 0) return;
    const nowComplete = new Set<number>();
    Object.entries(grouped).forEach(([modNumStr, modLessons]) => {
      const modNum = Number(modNumStr);
      const done = modLessons.filter(l => progress[l.id]?.passed).length;
      if (modLessons.length > 0 && done === modLessons.length) nowComplete.add(modNum);
    });
    if (moduleBaselinedRef.current) {
      // All modules that flipped complete since the last check, not just the
      // first — .find() used to silently drop the rest if progress ever
      // jumped by more than one module between two fetches (e.g. an
      // organizer manually granting credit, or several modules finishing in
      // the same batch of quiz submissions).
      const newlyDone = [...nowComplete].filter(m => !prevCompleteModulesRef.current.has(m));
      if (newlyDone.length === 1) {
        setCelebrationMsg(`🚀 Module ${newlyDone[0]} Complete: ${MODULE_META[newlyDone[0]]?.name}!`);
      } else if (newlyDone.length > 1) {
        const names = newlyDone.map(m => MODULE_META[m]?.name).filter(Boolean).join(', ');
        setCelebrationMsg(`🚀 ${newlyDone.length} Modules Complete: ${names}!`);
      }
    } else {
      moduleBaselinedRef.current = true;
    }
    prevCompleteModulesRef.current = nowComplete;
  }, [progress, grouped, lessons.length, isLoading]);

  // Auto-collapse modules the student has already 100% finished — once, on
  // first load only, so a manual toggle afterward is never overridden.
  // Same isLoading gate as above and for the same reason — without it, this
  // one-shot ref got consumed on the premature "lessons loaded, progress
  // still empty" render, so nothing ever got collapsed once real progress
  // arrived a moment later.
  useEffect(() => {
    if (autoCollapsedRef.current || isLoading || lessons.length === 0) return;
    autoCollapsedRef.current = true;
    const initial: Record<number, boolean> = {};
    Object.entries(grouped).forEach(([modNumStr, modLessons]) => {
      const modNum = Number(modNumStr);
      const done = modLessons.filter(l => progress[l.id]?.passed).length;
      if (modLessons.length > 0 && done === modLessons.length) initial[modNum] = true;
    });
    setCollapsedModules(initial);
  }, [lessons, progress, grouped, isLoading]);

  const jumpToModule = (modNum: number) => {
    setCollapsedModules(c => ({ ...c, [modNum]: false }));
    requestAnimationFrame(() => {
      document.getElementById(`module-${modNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openLesson = async (lesson: Lesson) => {
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return; }

    // Lessons are free — access is gated purely by sequence now. The first
    // published lesson is always reachable; every other one only gets a
    // lesson_progress row (making isLessonAvailable true) once
    // submit_lesson_quiz auto-unlocks it on passing the one before it. The
    // card's own disabled state already prevents this in the normal click
    // path; this is just the same check again in case openLesson is ever
    // reached another way.
    if (!isLessonAvailable(lesson)) {
      toast.error(lesson.is_published ? 'Complete the previous lesson to unlock this one.' : "This lesson isn't available yet — check back soon!");
      return;
    }
    localStorage.setItem('forge-student-email', email.trim().toLowerCase());
    localStorage.setItem('forge-student-name', name.trim());

    const requestId = ++contentRequestRef.current;
    setActiveLesson(lesson);
    setPhase('content');
    setQuizResult(null);
    setAnswers({});
    setQIdx(0);
    setPracticePick(null);
    setActiveContent(null);
    setContentLoading(true);
    // p_device_token added (security audit) — this RPC used to trust a bare
    // email with no proof of identity, letting anyone pass a classmate's
    // email to read lesson content for any lesson that email has unlocked.
    // Return shape is now one row wrapping the content (see migration
    // 20260904000000) rather than a bare JSONB blob, so a freshly-minted
    // token has somewhere to travel back to the client.
    const { data, error: contentErr } = await supabase.rpc('get_lesson_content', {
      p_participant_email: email.trim().toLowerCase(),
      p_lesson_id: lesson.id,
      p_device_token: deviceToken || null,
    });
    const row = Array.isArray(data) ? data[0] : data;
    // Captured BEFORE the staleness check below, deliberately. A freshly
    // minted token is already durably committed server-side the instant
    // this RPC succeeds — if this response gets discarded as "superseded"
    // (e.g. a double-click on a lesson card firing openLesson twice before
    // the first reply lands), the mint itself isn't undone, only lost from
    // the client's view of it. With no in-app recovery path, that silently
    // locks the participant out of their own identity on every later call
    // ("already active on another device") with nothing to reset it.
    if (row?.new_device_token) setDeviceToken(row.new_device_token);
    if (requestId !== contentRequestRef.current) return; // superseded by a newer open
    setContentLoading(false);
    if (contentErr) {
      toast.error(contentErr.message || 'Failed to load lesson content');
      return;
    }
    setActiveContent((row?.content as LessonContent) || null);
  };

  // Organizer-only: view a lesson's content and quiz (with answers) without
  // spending coins or needing it unlocked — goes through admin-actions
  // (service role), not the participant unlock/progress path.
  const openPreview = async (lesson: Lesson) => {
    const requestId = ++contentRequestRef.current;
    setActiveLesson(lesson);
    setPreviewMode(true);
    setPhase('content');
    setQuizResult(null);
    setAnswers({});
    setQIdx(0);
    setPracticePick(null);
    setActiveContent(null);
    setPreviewQuiz([]);
    setPreviewLoading(true);
    try {
      const data = await callAdminAction<{ content: LessonContent | null; quiz: (QuizQuestion & { correct_index: number; explanation: string | null })[] }>('preview_lesson', { lesson_id: lesson.id });
      if (requestId !== contentRequestRef.current) return; // superseded by a newer open
      setActiveContent(data.content || null);
      setPreviewQuiz(data.quiz || []);
    } catch (e: any) {
      if (requestId !== contentRequestRef.current) return;
      toast.error(e.message || 'Failed to load preview');
    } finally {
      if (requestId === contentRequestRef.current) setPreviewLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!activeLesson) return;
    const requestId = contentRequestRef.current; // no new "open" here, just piggyback the current one
    setStartingQuiz(true);
    try {
      // p_device_token added (security audit) — same missing-auth pattern as
      // get_lesson_content, letting anyone pass a classmate's email to read
      // quiz questions for any lesson that email has unlocked.
      const { data, error } = await supabase.rpc('get_quiz_questions', {
        p_participant_email: email.trim().toLowerCase(),
        p_lesson_id: activeLesson.id,
        p_device_token: deviceToken || null,
      });
      const rows = (data as any[]) || [];
      // Same reasoning as get_lesson_content above — capture a minted token
      // before the staleness check can discard the response, since the
      // mint is already committed server-side either way.
      const mintedToken = rows[0]?.new_device_token;
      if (mintedToken) setDeviceToken(mintedToken);
      if (requestId !== contentRequestRef.current) return; // the lesson dialog was closed/switched while this was in flight
      if (error) { toast.error(error.message || 'Failed to load quiz'); return; }
      const questions = rows as any as QuizQuestion[];
      // A published, unlockable lesson with no quiz questions authored yet
      // used to still flip phase to 'quiz' here — the render guard requires
      // quizQuestions.length > 0, so nothing in the content/quiz/results
      // blocks matched and the dialog just went blank with no way to close it
      // except Escape, landing on a "Leave the quiz?" confirmation over an
      // empty screen. Stay on the content phase and say so instead.
      if (questions.length === 0) {
        toast.error("This lesson's quiz isn't ready yet — check back soon!");
        return;
      }
      setQuizQuestions(questions);
      setAnswers({});
      setQIdx(0);
      setPhase('quiz');
    } finally {
      if (requestId === contentRequestRef.current) setStartingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeLesson) return;
    setSubmittingQuiz(true);
    // Captured before fetchAll() below refreshes `progress` — after that,
    // progress[lesson]?.passed is true regardless of whether this specific
    // attempt passed (it's sticky once passed once), so this is the only
    // way to tell "retake of an already-completed lesson" apart from
    // "first time attempting this lesson" once the result is in.
    const wasAlreadyPassed = !!progress[activeLesson.id]?.passed;
    try {
      const answerArray = quizQuestions.map((_, i) => answers[i] ?? -1);
      const { data, error } = await supabase.rpc('submit_lesson_quiz', {
        p_participant_email: email.trim().toLowerCase(),
        p_hackathon_id: hackathonId,
        p_lesson_id: activeLesson.id,
        p_answers: answerArray,
        p_device_token: deviceToken || null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if ((result as any)?.new_device_token) setDeviceToken((result as any).new_device_token);
      setQuizResult(result as unknown as QuizResult);
      setResultWasRetake(wasAlreadyPassed);
      setPhase('results');
      if (result?.passed) {
        setCelebrationMsg(
          result.score === result.total
            ? `🏆 Perfect Score! ${activeLesson.title}`
            : `🎉 Lesson Complete! ${activeLesson.title}`
        );
      }
      await fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const closeDialog = () => { setActiveLesson(null); setActiveContent(null); setPhase('content'); setQuizResult(null); setResultWasRetake(false); setPreviewMode(false); setPreviewQuiz([]); };
  const requestCloseDialog = () => {
    if (phase === 'quiz') { setConfirmCloseOpen(true); return; }
    closeDialog();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>;
  }

  return (
    <div>
      <MilestoneCelebration show={!!celebrationMsg} message={celebrationMsg || ''} onComplete={() => setCelebrationMsg(null)} />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-lg p-5 mb-6 border border-[hsl(var(--discord-blurple)/0.3)] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[hsl(var(--discord-blurple)/0.25)] blur-3xl animate-pulse-glow pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-[hsl(var(--discord-blurple))]"
              animate={{ boxShadow: ['0 0 0px hsl(var(--discord-blurple))', '0 0 18px hsl(var(--discord-blurple)/0.7)', '0 0 0px hsl(var(--discord-blurple))'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <GraduationCap className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-white">AI &amp; ML Academy</h3>
              <p className="text-xs text-white/70">{lessons.length} lessons, free and in order — finish one to unlock the next, earn 10 coins per lesson.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CurrencyBadge icon={<CoinIcon size={12} />} value={lessonCoinsEarned} className="bg-[hsl(var(--discord-yellow)/0.2)] text-[hsl(var(--discord-yellow))] border-[hsl(var(--discord-yellow)/0.3)]" />
            <div className="flex items-center gap-1.5">
              <ProgressRing value={passedCount} total={lessons.length} color="#00B894" />
              <span className="text-[9px] text-white/50 uppercase tracking-wide">lessons</span>
            </div>
          </div>
        </div>
        {editingIdentity ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label htmlFor="lessons-name" className="sr-only">Your name</label>
            <Input id="lessons-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
            <label htmlFor="lessons-email" className="sr-only">Your email</label>
            <Input id="lessons-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white h-9 text-sm" />
            {name.trim() && email.trim() && (
              <Button
                size="sm"
                onClick={() => {
                  const trimmedName = name.trim();
                  const normalizedEmail = email.trim().toLowerCase();
                  localStorage.setItem('forge-student-name', trimmedName);
                  localStorage.setItem('forge-student-email', normalizedEmail);
                  setName(trimmedName);
                  setEmail(normalizedEmail);
                  setEditingIdentity(false);
                  // Seeds the organizer's roster (CoinsTab, this leaderboard)
                  // even for students who never opened "Register for
                  // Hackathon" and came straight here instead.
                  ensureHackathonRegistration(normalizedEmail, trimmedName, hackathonId);
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
              aria-label={`Module ${modNum}${complete ? ' — complete' : ''}`}
              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full text-white transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ backgroundColor: meta.color, opacity: complete ? 0.55 : 1 }}>
              {complete && <CheckCircle2 className="w-3 h-3 animate-bounce-in" />}
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
                aria-expanded={!isCollapsed}
                aria-controls={`module-${modNum}-lessons`}
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
              <div id={`module-${modNum}-lessons`} className="grid gap-2 md:grid-cols-2">
                {modLessons.map((lesson, i) => {
                  const p = progress[lesson.id];
                  const available = isLessonAvailable(lesson);
                  return (
                    <div key={lesson.id} className="relative">
                    {isOrganizer && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPreview(lesson); }}
                        title="Preview content (organizer only)"
                        aria-label={`Preview "${lesson.title}" (organizer only)`}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openLesson(lesson)}
                      disabled={!available}
                      title={!available && lesson.is_published ? 'Complete the previous lesson to unlock this one' : undefined}
                      className={`w-full text-left rounded-lg p-3 border transition-all ${
                        p?.passed
                          ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                          : !available
                          ? 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.1)] opacity-60 cursor-not-allowed'
                          : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple)/0.5)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {p?.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 animate-bounce-in" />
                        ) : available ? (
                          <PlayCircle className="w-4 h-4 text-[hsl(var(--discord-blurple))] flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-white truncate flex-1">{lesson.order_index}. {lesson.title}</span>
                      </div>
                      {lesson.summary && <p className="text-[11px] text-white/50 mt-1 line-clamp-1">{lesson.summary}</p>}
                      <div className="mt-1.5">
                        {p?.passed ? (
                          <span className="text-[10px] font-bold text-green-400">Completed — {p.best_score} correct</span>
                        ) : available ? (
                          <span className="text-[10px] font-bold text-[hsl(var(--discord-blurple))] flex items-center gap-1"><CoinIcon size={12} /> {p ? 'Continue →' : 'Start — earn 10 coins →'}</span>
                        ) : lesson.is_published ? (
                          <span className="text-[10px] font-bold text-white/40">🔒 Finish the previous lesson</span>
                        ) : (
                          <span className="text-[10px] text-white/40">Coming soon</span>
                        )}
                      </div>
                    </motion.button>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!activeLesson} onOpenChange={(open) => !open && requestCloseDialog()}>
        {/* The default DialogContent uses bg-background (light theme white),
            but every content block inside (ContentBlock, CodeBlock, etc.)
            hardcodes light/white text meant for a dark background — without
            these overrides the dialog was near-unreadable: pale gray text
            on a near-white background instead of matching the dark theme
            the rest of this page (and every other dialog in the app) uses. */}
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
          {activeLesson && phase === 'content' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {activeLesson.order_index}. {activeLesson.title}
                  {previewMode && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border border-[hsl(var(--discord-blurple)/0.4)]">
                      Preview — no coins spent
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-[hsl(var(--discord-text-muted))]">{activeLesson.summary}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {(previewMode ? previewLoading : contentLoading) ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
                ) : activeContent ? (
                  <>
                    <ContentBlock icon={<Lightbulb className="w-4 h-4" />} color="#F7941D" text={activeContent.hook} delay={0} />
                    <VideoBlock videoUrl={activeContent.video_url} delay={0.03} />
                    <ContentBlock icon={<Brain className="w-4 h-4" />} color="#5865F2" text={activeContent.explanation} delay={0.05} />
                    <CodeBlock code={activeContent.code} delay={0.07} />
                    <VisualBlock visual={activeContent.visual} delay={0.08} />
                    <ContentBlock icon={<Puzzle className="w-4 h-4" />} color="#9B59B6" text={activeContent.analogy} label="Think of it like..." delay={0.1} />
                    <PracticeBlock practice={activeContent.practice} picked={practicePick} onPick={setPracticePick} delay={0.13} />
                    {activeContent.code_practice && (
                      <CodePracticeCell key={activeLesson.id} lessonId={activeLesson.id} practice={activeContent.code_practice} delay={0.16} />
                    )}
                    <ContentBlock icon={<Star className="w-4 h-4" />} color="#006600" text={activeContent.fun_fact} label="Fun fact" delay={0.15} />
                    <ContentBlock icon={<PartyPopper className="w-4 h-4" />} color="#C70110" text={activeContent.try_it} label="Try it" delay={0.2} />
                  </>
                ) : (
                  <p className="text-sm text-[hsl(var(--discord-text-muted))]">Content coming soon.</p>
                )}

                {previewMode && previewQuiz.length > 0 && (
                  <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Quiz preview — {previewQuiz.length} questions</p>
                    {previewQuiz.map((q, qi) => (
                      <div key={q.id} className="text-xs border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
                        <p className="font-medium text-white/90">{qi + 1}. {q.question}</p>
                        <ul className="mt-1 space-y-0.5">
                          {q.options.map((opt, oi) => (
                            <li key={oi} className={oi === q.correct_index ? 'text-green-400 font-semibold' : 'text-white/50'}>
                              {oi === q.correct_index ? '✅ ' : '· '}{opt}
                            </li>
                          ))}
                        </ul>
                        {q.explanation && <p className="text-white/40 mt-1 italic">{q.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={closeDialog} className="flex-1">Close</Button>
                  {!previewMode && (
                    <Button onClick={startQuiz} className="flex-1" disabled={!activeContent || startingQuiz}>
                      {startingQuiz ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Loading...</>
                      ) : progress[activeLesson.id]?.passed ? (
                        <><RotateCcw className="w-4 h-4 mr-1" /> Retake Quiz</>
                      ) : (
                        <>Take the Quiz <ChevronRight className="w-4 h-4 ml-1" /></>
                      )}
                    </Button>
                  )}
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
              wasRetake={resultWasRetake} onReview={() => setPhase('content')} onClose={closeDialog} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        {/* Same fix as the lesson dialog above — default bg-background reads
            as plain white, jarringly inconsistent with the rest of this
            dark-themed page even though its default text color is readable
            against it on its own. */}
        <AlertDialogContent className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the quiz?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--discord-text-muted))]">
              Your answers so far will not be saved. You can restart the quiz any time — no penalty for retaking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* outline variant is bg-transparent + text-foreground (dark
                text) — invisible against this dialog's now-dark background
                without an explicit light override. The solid "Discard &
                Close" button is unaffected (bg-primary is opaque). */}
            <AlertDialogCancel className="text-white border-[hsl(var(--discord-light))] hover:bg-[hsl(var(--discord-light)/0.15)] hover:text-white">Keep Going</AlertDialogCancel>
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

// Optional per-lesson video. getYouTubeEmbedUrl validates the stored
// video_url and returns OUR OWN constructed youtube-nocookie.com embed URL
// (or null) — it never reflects the stored string straight into an iframe
// src, so a malformed/malicious value just makes the block not render
// rather than becoming an XSS or arbitrary-origin-embed vector. No
// autoplay, so a student opening a lesson never gets audio/video starting
// without choosing to press play.
const VideoBlock = ({ videoUrl, delay }: { videoUrl?: string; delay: number }) => {
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  if (!embedUrl) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg overflow-hidden border border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border-b border-white/5">
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wide">📺 Watch</span>
      </div>
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={embedUrl}
          title="Lesson video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
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

// Animates the diagram as a signal traveling node-to-node — an "activation"
// pulse that lights each step in sequence, like data flowing through a
// pipeline (or a neuron firing down a layer), instead of a static row of
// emoji cards. Reuses the same visual.steps content every lesson already
// authors — no schema change, so all existing diagrams get real motion.
const VisualBlock = ({ visual, delay }: { visual?: VisualDiagram; delay: number }) => {
  const [playKey, setPlayKey] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!visual || !visual.steps?.length) return;
    setActiveStep(-1);
    setFinished(false);
    const startMs = delay * 1000 + 250;
    const stepMs = 550;
    const timers = visual.steps.map((_, i) => setTimeout(() => setActiveStep(i), startMs + i * stepMs));
    timers.push(setTimeout(() => setFinished(true), startMs + visual.steps.length * stepMs));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual, playKey]);

  if (!visual || !visual.steps?.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center gap-2 mb-2 min-h-[14px]">
        {visual.caption && (
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">{visual.caption}</p>
        )}
        <AnimatePresence>
          {finished && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPlayKey(k => k + 1)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--discord-blurple))] hover:text-white transition-colors ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Replay
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {visual.steps.map((step, i) => {
          const lit = activeStep >= i;
          const firing = activeStep === i;
          const isLastLit = finished && i === visual.steps.length - 1;
          return (
            <div key={`${playKey}-${i}`} className="flex items-center gap-1.5">
              <motion.div
                animate={{
                  opacity: lit ? 1 : 0.3,
                  scale: firing ? [1, 1.18, 1] : lit ? 1 : 0.88,
                  boxShadow: lit ? '0 0 16px hsl(var(--discord-blurple)/0.6)' : '0 0 0px transparent',
                }}
                transition={{ duration: firing ? 0.5 : 0.3 }}
                className="relative flex flex-col items-center text-center w-20 rounded-lg p-2 border"
                style={{
                  background: lit ? 'hsl(var(--discord-blurple)/0.18)' : 'hsl(var(--discord-blurple)/0.06)',
                  borderColor: lit ? 'hsl(var(--discord-blurple)/0.55)' : 'hsl(var(--discord-blurple)/0.2)',
                }}
              >
                {isLastLit && (
                  <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    animate={{ opacity: [0.25, 0.65, 0.25] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ boxShadow: '0 0 20px hsl(var(--discord-blurple)/0.7)' }}
                  />
                )}
                <span className="text-2xl leading-none mb-1">{step.emoji}</span>
                <span className="text-[10px] font-semibold text-white leading-tight">{step.label}</span>
                {step.caption && <span className="text-[9px] text-white/50 leading-tight mt-0.5">{step.caption}</span>}
              </motion.div>
              {i < visual.steps.length - 1 && (
                <motion.div
                  animate={{ x: firing ? [0, 5, 0] : 0, opacity: activeStep > i ? 1 : 0.25 }}
                  transition={{ duration: 0.5 }}
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--discord-blurple))] flex-shrink-0" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const PracticeBlock = ({ practice, picked, onPick, delay }: {
  practice?: PracticeCheck; picked: number | null; onPick: (i: number) => void; delay: number;
}) => {
  if (!practice) return null;
  const revealed = picked !== null;
  const burstId = revealed && picked === practice.correct_index ? 1 : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="relative rounded-lg p-3 border bg-[hsl(var(--discord-blurple)/0.08)] border-[hsl(var(--discord-blurple)/0.3)]">
      <MiniBurst burstId={burstId} />
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

const CodePracticeCell = ({ practice, lessonId, delay }: { practice: CodePractice; lessonId: string; delay: number }) => {
  // Persisted per-lesson so a student who writes real code here doesn't
  // lose it just by closing the dialog (accidentally or to check another
  // lesson) — this cell was previously reset to the starter every time it
  // remounted, with nothing saved anywhere. Read once on mount (the
  // component remounts via key={activeLesson.id} on every lesson switch,
  // so this correctly picks up the right lesson's saved code each time).
  const storageKey = `forge-code-practice:${lessonId}`;
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(storageKey) || practice.starter; } catch { return practice.starter; }
  });
  const [checked, setChecked] = useState(false);
  const [passed, setPassed] = useState(false);
  const [lintErrors, setLintErrors] = useState<ReturnType<typeof lintPython>>([]);
  const [showHint, setShowHint] = useState(false);
  const [burstId, setBurstId] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(storageKey, code); } catch { /* private browsing / storage full — persistence is a nicety, not required */ }
  }, [code, storageKey]);

  const runCheck = () => {
    const errors = lintPython(code);
    setLintErrors(errors);
    let ok = false;
    try { ok = new RegExp(practice.check_pattern, 'i').test(code); } catch { ok = false; }
    const nowPassed = ok && errors.filter(e => e.severity === 'error').length === 0;
    setPassed(nowPassed);
    setChecked(true);
    if (nowPassed) setBurstId(id => id + 1);
  };

  const reset = () => {
    setCode(practice.starter); setChecked(false); setPassed(false); setLintErrors([]); setShowHint(false);
    try { localStorage.removeItem(storageKey); } catch { /* same as above */ }
  };

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
              className={`relative rounded-md px-2.5 py-2 text-xs font-medium ${passed ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'}`}>
              <MiniBurst burstId={burstId} />
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

const ResultsStep = ({ result, lessonTitle, questions, wasRetake, onReview, onClose }: {
  result: QuizResult; lessonTitle: string; questions: QuizQuestion[]; wasRetake: boolean; onReview: () => void; onClose: () => void;
}) => (
  <div className="text-center py-2">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="text-5xl mb-3">
      {/* Pops in with the spring above, then settles into a small idle
          wobble — a static emoji here reads flat for what's meant to be
          the headline celebration moment of finishing a lesson. */}
      <motion.span
        className="inline-block"
        animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2, delay: 0.6, ease: 'easeInOut' }}
      >
        {result.passed ? '🎉' : '💪'}
      </motion.span>
    </motion.div>
    <h3 className="text-xl font-bold text-white mb-1">{result.passed ? 'Lesson Complete!' : 'So Close!'}</h3>
    <p className="text-sm text-white/70 mb-4">{lessonTitle} — you scored {result.score}/{result.total}</p>

    {!result.passed && (
      <p className="text-xs text-amber-400 mb-4">
        {wasRetake
          ? "This lesson is already marked complete, so nothing's lost here — this was just a practice retake. Review and try again any time!"
          : `You need ${Math.ceil(result.total * 5 / 7)}/${result.total} to pass — review the lesson and try again, no penalty for retaking!`}
      </p>
    )}

    <AnimatePresence>
      {result.bonus_coins_awarded > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
          className="bg-gradient-to-r from-[#FFD700]/15 to-[#F7941D]/15 border border-[#FFD700]/30 rounded-lg p-4 mb-4">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.5 }} className="mb-1 flex justify-center"><CoinIcon size={36} /></motion.div>
          <p className="text-sm font-bold text-white">+{result.bonus_coins_awarded} bonus Forge Coins!</p>
          <p className="text-xs text-white/60">Every lesson you pass for the first time earns a coin bonus — keep going!</p>
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
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: i * 0.05 + 0.15 }}
                >
                  {correct ? '✅' : '❌'}
                </motion.span>
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
