import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Rocket, Brain, Code, Zap, GraduationCap, Palette, Target, Smile, CheckCircle2, Circle, Timer, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface LearnTabProps {
  onNavigateToBuild: () => void;
  onNavigateToTemplates: () => void;
  currentCode?: string;
  projectType?: 'chatbot' | 'agent';
}

// Validation rules for each variable
interface ChallengeValidation {
  name: string;
  desc: string;
  example: string;
  validate: (code: string) => boolean;
  points: number;
}

const createValidator = (varName: string, type: 'string' | 'number' | 'list' | 'dict' | 'triple-string', defaults: string[] = [], minCount?: number): ((code: string) => boolean) => {
  return (code: string) => {
    if (type === 'triple-string') {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*"""([\\s\\S]*?)"""`)) ||
                    code.match(new RegExp(`${varName}\\s*=\\s*'''([\\s\\S]*?)'''`));
      if (!match) return false;
      const val = match[1].trim();
      return val.length > 10 && !defaults.includes(val);
    }
    if (type === 'string') {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*["'](.+?)["']`));
      if (!match) return false;
      return !defaults.includes(match[1]) && match[1].length > 0;
    }
    if (type === 'number') {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*([\\d.]+)`));
      if (!match) return false;
      const val = parseFloat(match[1]);
      return !defaults.some(d => parseFloat(d) === val);
    }
    if (type === 'list') {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
      if (!match) return false;
      if (!/["'][^"']+["']/.test(match[1])) return false;
      // If minCount specified, count items and require MORE than that threshold
      if (minCount !== undefined) {
        const items: string[] = [];
        const regex = /["']([^"']+)["']/g;
        let m;
        while ((m = regex.exec(match[1])) !== null) items.push(m[1]);
        return items.length > minCount;
      }
      return true;
    }
    if (type === 'dict') {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*\\{([\\s\\S]*?)\\}`));
      if (!match) return false;
      if (!/["'][^"']+["']\s*:\s*["'][^"']+["']/.test(match[1])) return false;
      // If minCount specified, count entries and require MORE than that threshold
      if (minCount !== undefined) {
        const entries: string[] = [];
        const regex = /["'][^"']+["']\s*:\s*["'][^"']+["']/g;
        let m;
        while ((m = regex.exec(match[1])) !== null) entries.push(m[0]);
        return entries.length > minCount;
      }
      return true;
    }
    return false;
  };
};

// Agent template defaults — used to ensure pre-filled values don't count as "completed"
const AGENT_KB_DEFAULT = "Agents use a ReAct loop: Reason, Act, Observe.\nTools extend what an AI can do beyond just chatting.\nFORGE agents can search the web, do math, and look up facts.";

const buildChallengeSteps = (isAgent: boolean): Array<{
  step: number;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  challenges: ChallengeValidation[];
  tip: string;
  badExample?: string;
  goodExample?: string;
  timeLimit?: number;
}> => [
  {
    step: 1,
    title: "Give Your Bot an Identity",
    subtitle: "Challenges 1–4 — Takes 2 minutes",
    icon: Target,
    color: "#F7941D",
    timeLimit: 3,
    challenges: [
      { name: 'BOT_NAME', desc: 'The name shown in the header', example: 'BOT_NAME = "GhanaFreedom Guide"', points: 5, validate: createValidator('BOT_NAME', 'string', ['AI Bot', 'Spark', 'Research Agent']) },
      { name: 'BOT_EMOJI', desc: 'The emoji avatar next to messages', example: 'BOT_EMOJI = "🇬🇭"', points: 5, validate: createValidator('BOT_EMOJI', 'string', ['🤖', '🧠']) },
      { name: 'AI_MESSAGE', desc: 'First message users see', example: 'AI_MESSAGE = "Akwaaba! Welcome!"', points: 5, validate: createValidator('AI_MESSAGE', 'string', ["Hey there! I'm Spark, your AI buddy. Ask me anything!", "I'm your research agent. I can search, calculate, and analyse. Give me a task!"]) },
      { name: 'CREATOR_NAME', desc: 'Your name as creator', example: 'CREATOR_NAME = "Your Name"', points: 5, validate: createValidator('CREATOR_NAME', 'string', ['', 'A FORGE Builder']) },
    ],
    tip: 'After saving, your bot name and emoji appear in Live Preview immediately.',
  },
  {
    step: 2,
    title: "The System Message — Most Important!",
    subtitle: "Challenge 5 — Spend the most time here",
    icon: Brain,
    color: "#C70110",
    timeLimit: 10,
    challenges: [
      { name: 'SYSTEM_MESSAGE', desc: 'Your bot\'s personality, expertise, and rules — this IS your bot', example: '"""You are GhanaFreedom Guide — a passionate educator on Ghana independence..."""', points: 15, validate: (code: string) => {
        // Accept both single-line and triple-quoted system messages
        const defaults = [
          'You are a helpful AI assistant.',
          'You are a helpful AI assistant that answers questions clearly and concisely.',
          'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
        ];
        const tripleMatch = code.match(/SYSTEM_MESSAGE\s*=\s*"""([\s\S]*?)"""/);
        const singleMatch = code.match(/SYSTEM_MESSAGE\s*=\s*["'](.+?)["']/);
        const match = tripleMatch || singleMatch;
        if (!match) return false;
        const val = match[1].trim();
        return val.length > 20 && !defaults.includes(val);
      } },
    ],
    tip: 'Formula: WHO (name, role) + HOW (tone) + WHAT (topics) + RULES (special instructions). Judges score this highest!',
    badExample: 'SYSTEM_MESSAGE = "You are a helpful AI assistant."',
    goodExample: 'SYSTEM_MESSAGE = """You are GhanaFreedom Guide — a passionate, proud educator. Use Akwaaba, Medaase. Ask a follow-up each time."""',
  },
  {
    step: 3,
    title: "Give Your Bot Knowledge",
    subtitle: "Challenges 6 & 7 — The smarter your bot, the better it scores",
    icon: BookOpen,
    color: "#006600",
    timeLimit: 8,
    challenges: [
      { name: 'KNOWLEDGE_BASE', desc: 'Paste facts here — the more specific, the smarter', example: 'KNOWLEDGE_BASE = """DATES: March 6 1957: Independence..."""', points: 10, validate: createValidator('KNOWLEDGE_BASE', 'triple-string', isAgent ? [AGENT_KB_DEFAULT] : []) },
      { name: 'QA_PAIRS', desc: 'Guaranteed exact answers for specific questions', example: 'QA_PAIRS = [{"q": "When did Ghana gain independence?", "a": "March 6, 1957!"}]', points: 10, validate: (code: string) => {
        const match = code.match(/QA_PAIRS\s*=\s*\[([\s\S]*?)\]/);
        if (!match) return false;
        if (!/\{\s*["']q["']\s*:\s*["'][^"']+["']/.test(match[1])) return false;
        // Agent has 3 default pairs — require more than 3
        const pairRegex = /\{\s*["']q["']\s*:\s*["'][^"']+["']/g;
        const pairs: string[] = [];
        let m;
        while ((m = pairRegex.exec(match[1])) !== null) pairs.push(m[0]);
        return pairs.length > (isAgent ? 3 : 0);
      }},
    ],
    tip: 'KNOWLEDGE_BASE gives the AI info to draw from. QA_PAIRS gives EXACT answers word for word — the AI doesn\'t need to think.',
  },
  {
    step: 4,
    title: "Control Bot Behaviour",
    subtitle: "Challenges 8–10 — Write Python lists from scratch",
    icon: Rocket,
    color: "#5865F2",
    timeLimit: 10,
    challenges: [
      { name: 'TEMPERATURE', desc: 'Type a float: 0.0 (strict) to 1.0 (creative)', example: 'TEMPERATURE = 0.6', points: 5, validate: createValidator('TEMPERATURE', 'number', ['0.7', '0.3']) },
      { name: 'RULES', desc: 'Write a Python list of rule strings from scratch', example: 'RULES = ["Use emojis", "Ask follow-up questions", "Stay on topic"]', points: 8, validate: createValidator('RULES', 'list', [], 3) },
      { name: 'CONVERSATION_STARTERS', desc: 'Write a list of button strings from scratch', example: 'CONVERSATION_STARTERS = ["Tell me about yourself"]', points: 5, validate: createValidator('CONVERSATION_STARTERS', 'list', [], 4) },
    ],
    tip: isAgent
      ? 'The agent template includes starter values — add MORE items to complete these challenges!'
      : 'These variables start EMPTY — you must type proper Python list syntax: ["item1", "item2"]',
  },
  {
    step: 5,
    title: "Guardrails & Safety",
    subtitle: "Challenges 11–12 — Content filtering & topic control",
    icon: Smile,
    color: "#9B59B6",
    timeLimit: 6,
    challenges: [
      { name: 'FORBIDDEN_WORDS', desc: 'Words your bot must NEVER use — AI finds alternatives', example: 'FORBIDDEN_WORDS = ["stupid", "dumb", "boring"]', points: 5, validate: createValidator('FORBIDDEN_WORDS', 'list') },
      { name: 'BLOCKED_TOPICS', desc: 'Topics your bot refuses to discuss entirely', example: 'BLOCKED_TOPICS = ["homework answers", "violence"]', points: 5, validate: createValidator('BLOCKED_TOPICS', 'list', [], 2) },
    ],
    tip: 'FORBIDDEN_WORDS = bot finds alternatives. BLOCKED_TOPICS = bot refuses completely. Different safety levels!',
  },
  {
    step: 6,
    title: "Teach & Surprise",
    subtitle: "Challenges 13–14 — Few-shot examples + secret triggers",
    icon: Rocket,
    color: "#3498DB",
    timeLimit: 10,
    challenges: [
      { name: 'FEW_SHOT_EXAMPLES', desc: 'Write a list of {"input": ..., "output": ...} dicts', example: 'FEW_SHOT_EXAMPLES = [{"input": "Tell me about 1957", "output": "On March 6, 1957..."}]', points: 8, validate: (code: string) => {
        const match = code.match(/FEW_SHOT_EXAMPLES\s*=\s*\[([\s\S]*?)\]/);
        if (!match) return false;
        return /["']input["']\s*:\s*["'][^"']+["']/.test(match[1]) && /["']output["']\s*:\s*["'][^"']+["']/.test(match[1]);
      } },
      { name: 'SECRET_RESPONSES', desc: 'Dict of EXACT trigger phrases → instant fun replies', example: 'SECRET_RESPONSES = {"secret": "🎉 Found it!", "magic": "✨"}', points: 8, validate: createValidator('SECRET_RESPONSES', 'dict', [], isAgent ? 2 : undefined) },
    ],
    tip: 'FEW_SHOT teaches HOW to answer. SECRET_RESPONSES are fun easter eggs — EXACT phrase triggers only (unlike Q&A keyword matching).',
  },
  {
    step: 7,
    title: "Polish & Style",
    subtitle: "Challenges 15–20 — Fine-tune your bot's personality",
    icon: Palette,
    color: "#E67E22",
    timeLimit: 8,
    challenges: [
      { name: 'MOOD_RESPONSES', desc: 'Dictionary mapping user moods → bot behavior instructions', example: 'MOOD_RESPONSES = {"happy": "Be enthusiastic! 🎉", "confused": "Break it down simply"}', points: 5, validate: (code: string) => {
        const match = code.match(/MOOD_RESPONSES\s*=\s*\{([\s\S]*?)\}/);
        if (!match) return false;
        const entries = match[1].match(/["'][^"']+["']\s*:\s*["'][^"']+["']/g);
        return entries ? entries.length > (isAgent ? 3 : 0) : false;
      }},
      { name: 'MAX_RESPONSE_LENGTH', desc: 'short, medium, or long', example: 'MAX_RESPONSE_LENGTH = "short"', points: 3, validate: createValidator('MAX_RESPONSE_LENGTH', 'string', ['medium']) },
      { name: 'MAX_TOKENS', desc: 'Token limit — try 50 to see cut-off!', example: 'MAX_TOKENS = 200', points: 5, validate: createValidator('MAX_TOKENS', 'number', ['512']) },
      { name: 'MOOD', desc: 'cheerful, serious, sarcastic, mysterious, energetic, calm', example: 'MOOD = "energetic"', points: 3, validate: createValidator('MOOD', 'string', ['neutral']) },
      { name: 'RESPONSE_TONE', desc: 'If/elif conditional — tone changes based on TIME_OF_DAY!', example: 'if TIME_OF_DAY == "morning":\n    RESPONSE_TONE = "energetic"', points: 5, validate: (code: string) => {
        // Check that student has customized the if/elif RESPONSE_TONE values
        const defaults = ['energetic and cheerful', 'sharp and analytical'];
        const match = code.match(/if\s+TIME_OF_DAY\s*==.*\n\s*RESPONSE_TONE\s*=\s*["']([^"']+)["']/);
        if (!match) return false;
        return !defaults.includes(match[1]);
      }},
      { name: 'CATCHPHRASES', desc: 'Signature phrases woven into every response', example: 'CATCHPHRASES = ["Fun fact!", "Pro tip:"]', points: 3, validate: createValidator('CATCHPHRASES', 'list', [], isAgent ? 3 : undefined) },
    ],
    tip: 'MOOD_RESPONSES uses a Python dictionary to route behavior — like a lookup table! RESPONSE_TONE uses if/elif — Python\'s branching logic!',
  },
  {
    step: 8,
    title: "Voice & Beyond",
    subtitle: "Challenges 21–24 — Make your bot speak!",
    icon: Rocket,
    color: "#00B4D8",
    timeLimit: 5,
    challenges: [
      { name: 'VOICE_ENABLED', desc: 'Set to True to make your bot speak responses aloud', example: 'VOICE_ENABLED = True', points: 5, validate: (code: string) => {
        const match = code.match(/VOICE_ENABLED\s*=\s*(True|False)/);
        return match ? match[1] === 'True' : false;
      }},
      { name: 'VOICE_MODE', desc: '"push-to-talk" or "hands-free" — choose interaction style', example: 'VOICE_MODE = "hands-free"', points: 5, validate: createValidator('VOICE_MODE', 'string', ['push-to-talk']) },
      { name: 'WAKE_WORD', desc: 'Set a trigger phrase like "Hey Bot" for hands-free mode', example: 'WAKE_WORD = "Hey Spark"', points: 5, validate: createValidator('WAKE_WORD', 'string', ['']) },
      { name: 'VOICE_GENDER', desc: '"female", "male", or "default" — pick your bot\'s voice', example: 'VOICE_GENDER = "female"', points: 5, validate: createValidator('VOICE_GENDER', 'string', ['default']) },
    ],
    tip: 'VOICE_ENABLED is a Feature Flag — a real technique developers use to turn features on/off! WAKE_WORD makes it feel like Siri or Alexa!',
  },
];

// These are now computed inside the component based on projectType
const TOTAL_POINTS = 155; // Fixed: sum of all challenge points (same for both templates)

const RESOURCES = [
  { title: 'Python for AI Beginners', description: 'Learn Python basics: variables, loops, functions, and data structures for AI.', icon: Code, color: '#006600', link: 'https://www.learnpython.org/', level: 'Beginner' },
  { title: 'Introduction to Machine Learning', description: 'Understand what ML is, how models learn, and supervised vs unsupervised learning.', icon: Brain, color: '#5865F2', link: 'https://developers.google.com/machine-learning/crash-course', level: 'Beginner' },
  { title: 'Build a Chatbot with LangChain', description: 'Step-by-step guide to building a conversational AI chatbot using LangChain.', icon: Rocket, color: '#F7941D', link: 'https://python.langchain.com/docs/tutorials/', level: 'Intermediate' },
  { title: 'Streamlit: Build AI Demos Fast', description: 'Create interactive web apps for your AI projects in minutes — no frontend code needed.', icon: Rocket, color: '#C70110', link: 'https://docs.streamlit.io/get-started', level: 'Beginner' },
  { title: 'Hugging Face Transformers', description: 'Access thousands of pre-trained AI models for text, image, and audio tasks.', icon: Zap, color: '#9B59B6', link: 'https://huggingface.co/docs/transformers', level: 'Intermediate' },
  { title: 'AI Agents with Tools', description: 'Learn to build AI agents that search the web, calculate, and interact with APIs.', icon: GraduationCap, color: '#3498DB', link: 'https://python.langchain.com/docs/how_to/#agents', level: 'Advanced' },
];

const LEVEL_COLORS: Record<string, string> = { Beginner: '#006600', Intermediate: '#F7941D', Advanced: '#C70110' };

export const LearnTab = ({ onNavigateToBuild, onNavigateToTemplates, currentCode, projectType }: LearnTabProps) => {
  const [showTutorial, setShowTutorial] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [timerActive, setTimerActive] = useState<number | null>(null); // step number
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read code from localStorage if not passed as prop
  const codeToValidate = currentCode || localStorage.getItem('forge-editor-code') || '';

  // Detect project type: use prop, or auto-detect from code
  const isAgent = projectType === 'agent' || (!projectType && /SHOW_REASONING\s*=/.test(codeToValidate));

  // Build template-aware challenge steps
  const CHALLENGE_STEPS = useMemo(() => buildChallengeSteps(isAgent), [isAgent]);
  const ALL_CHALLENGES = useMemo(() => CHALLENGE_STEPS.flatMap(s => s.challenges), [CHALLENGE_STEPS]);

  // Read code from localStorage if not passed as prop

  // Validate all challenges against the current code
  const validationResults = ALL_CHALLENGES.map(ch => ({
    name: ch.name,
    passed: codeToValidate ? ch.validate(codeToValidate) : false,
    points: ch.points,
  }));

  const completedCount = validationResults.filter(v => v.passed).length;
  const earnedPoints = validationResults.filter(v => v.passed).reduce((s, v) => s + v.points, 0);

  // Step-level completion
  const stepResults = CHALLENGE_STEPS.map(step => {
    const stepValidations = step.challenges.map(ch => ({
      passed: codeToValidate ? ch.validate(codeToValidate) : false,
      points: ch.points,
    }));
    const allPassed = stepValidations.every(v => v.passed);
    const completedInStep = stepValidations.filter(v => v.passed).length;
    return { allPassed, completedInStep, total: stepValidations.length };
  });

  // Timer logic
  const startTimer = useCallback((stepNum: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(stepNum);
    setTimerSeconds(0);
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(null);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto-stop timer when step is completed
  useEffect(() => {
    if (timerActive !== null) {
      const stepIdx = timerActive - 1;
      if (stepResults[stepIdx]?.allPassed) {
        stopTimer();
      }
    }
  }, [timerActive, stepResults, stopTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimeLimitSeconds = (step: typeof CHALLENGE_STEPS[0]) => (step.timeLimit || 5) * 60;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Challenge Guide</h2>
          <p className="text-white text-sm">Complete all 24 challenges to build your AI bot</p>
        </div>
      </div>

      {/* Score Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 rounded-lg p-4 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'hsl(var(--discord-blurple) / 0.1)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{completedCount}<span className="text-lg text-white/60">/20</span></div>
              <div className="text-[10px] text-white uppercase tracking-wider">Challenges</div>
            </div>
            <div className="w-px h-10 bg-[hsl(var(--discord-light)/0.2)]" />
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: earnedPoints >= TOTAL_POINTS ? '#22C55E' : '#F7941D' }}>
                {earnedPoints}<span className="text-lg text-white/60">/{TOTAL_POINTS}</span>
              </div>
              <div className="text-[10px] text-white uppercase tracking-wider">Points</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completedCount === 20 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                <Trophy className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-green-400">All Complete! 🎉</span>
              </motion.div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-[hsl(var(--discord-dark))]">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / 20) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{
              background: completedCount === 20
                ? '#22C55E'
                : completedCount >= 10
                ? '#F7941D'
                : '#5865F2',
            }}
          />
        </div>
        {!codeToValidate && (
          <p className="text-[10px] text-white mt-2 italic">
            💡 Open the Build tab and start coding to see your progress here in real-time!
          </p>
        )}
      </motion.div>

      {/* Challenge Tutorial */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between p-4 rounded-t-lg border border-[hsl(var(--discord-blurple)/0.3)]"
          style={{ background: 'hsl(var(--discord-blurple) / 0.15)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">All 24 Challenges — Step by Step</h3>
              <p className="text-xs text-white">Follow this guide to complete every variable in main.py</p>
            </div>
          </div>
          <span className={`text-[hsl(var(--discord-text-muted))] transition-transform ${showTutorial ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showTutorial && (
          <div className="border border-t-0 border-[hsl(var(--discord-blurple)/0.3)] rounded-b-lg bg-[hsl(var(--discord-darker))]">
            {/* Overview */}
            <div className="p-4 border-b border-[hsl(var(--discord-light)/0.1)]">
              <div className="bg-[hsl(var(--discord-dark)/0.6)] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.15)]">
                <p className="text-[11px] text-white leading-relaxed">
                  💡 <strong className="text-white">Think of FORGE like a car:</strong> the engine is already built. You just choose the colour, the music, and where to drive it. Edit the 20 variables in <code className="text-[hsl(var(--discord-blurple))]">main.py</code> — no AI or coding knowledge needed!
                </p>
              </div>
            </div>

            {/* Steps accordion */}
            <div className="divide-y divide-[hsl(var(--discord-light)/0.1)]">
              {CHALLENGE_STEPS.map((step, stepIdx) => {
                const Icon = step.icon;
                const isExpanded = expandedStep === step.step;
                const sr = stepResults[stepIdx];
                const isTimerRunning = timerActive === step.step;
                const timeLimitSec = getTimeLimitSeconds(step);
                const isOverTime = isTimerRunning && timerSeconds > timeLimitSec;

                return (
                  <div key={step.step}>
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-[hsl(var(--discord-light)/0.05)] transition-colors text-left"
                    >
                      {/* Completion indicator */}
                      <div className="flex-shrink-0">
                        {sr.allPassed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[hsl(var(--discord-light)/0.3)] flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{sr.completedInStep}/{sr.total}</span>
                          </div>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${step.color}20`, border: `2px solid ${step.color}40` }}>
                        <Icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: step.color }}>
                            Step {step.step}
                          </span>
                          <h4 className="font-semibold text-white text-sm truncate">{step.title}</h4>
                        </div>
                        <p className="text-[11px] text-white">{step.subtitle}</p>
                      </div>
                      <span className={`text-[hsl(var(--discord-text-muted))] transition-transform text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4">
                        {/* Timer bar */}
                        {step.timeLimit && (
                          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[hsl(var(--discord-dark)/0.6)] border border-[hsl(var(--discord-light)/0.1)]">
                            <Timer className={`w-4 h-4 ${isTimerRunning ? (isOverTime ? 'text-red-400' : 'text-green-400') : 'text-[hsl(var(--discord-text-muted))]'}`} />
                            {isTimerRunning ? (
                              <>
                                <span className={`text-sm font-mono font-bold ${isOverTime ? 'text-red-400' : 'text-green-400'}`}>
                                  {formatTime(timerSeconds)}
                                </span>
                                <span className="text-[10px] text-white">/ {step.timeLimit}:00 target</span>
                                <div className="flex-1" />
                                {sr.allPassed && (
                                  <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Completed!
                                  </span>
                                )}
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); stopTimer(); }}
                                  className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                  Stop
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-white">Target: {step.timeLimit} min</span>
                                <div className="flex-1" />
                                {sr.allPassed ? (
                                  <span className="text-[10px] font-bold text-green-400">✅ Done</span>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); startTimer(step.step); }}
                                    className="h-6 text-[10px] text-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.1)]">
                                    <Timer className="w-3 h-3 mr-1" /> Start Timer
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className="space-y-2 mb-3">
                          {step.challenges.map(ch => {
                            const passed = codeToValidate ? ch.validate(codeToValidate) : false;
                            return (
                              <div key={ch.name} className={`rounded-md p-3 border transition-all ${
                                passed 
                                  ? 'bg-green-500/5 border-green-500/20' 
                                  : 'bg-[hsl(var(--discord-dark)/0.6)] border-[hsl(var(--discord-light)/0.1)]'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  {passed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-white/40 flex-shrink-0" />
                                  )}
                                  <code className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: step.color, backgroundColor: `${step.color}15` }}>
                                    {ch.name}
                                  </code>
                                  <span className="text-[11px] text-white">{ch.desc}</span>
                                  <div className="flex-1" />
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    passed ? 'bg-green-500/20 text-green-400' : 'bg-[hsl(var(--discord-light)/0.1)] text-white/60'
                                  }`}>
                                    {passed ? `+${ch.points}` : `${ch.points} pts`}
                                  </span>
                                </div>
                                <div className="bg-[hsl(var(--discord-darker))] rounded p-2 mt-1.5 ml-6">
                                  <code className="text-[10px] text-white font-mono">{ch.example}</code>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {step.badExample && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-red-500/10 rounded-md p-2.5 border border-red-500/20">
                              <span className="text-[10px] font-bold text-red-400">❌ BAD</span>
                              <code className="text-[10px] block mt-1 text-red-300/80 font-mono">{step.badExample}</code>
                            </div>
                            <div className="bg-green-500/10 rounded-md p-2.5 border border-green-500/20">
                              <span className="text-[10px] font-bold text-green-400">✅ GOOD</span>
                              <code className="text-[10px] block mt-1 text-green-300/80 font-mono break-all">{step.goodExample}</code>
                            </div>
                          </div>
                        )}

                        <div className="bg-[hsl(var(--discord-blurple)/0.1)] rounded-md p-2.5 border border-[hsl(var(--discord-blurple)/0.2)]">
                          <span className="text-[10px] font-bold" style={{ color: step.color }}>💡 TIP:</span>
                          <p className="text-[10px] text-white mt-0.5">{step.tip}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 p-4 justify-center border-t border-[hsl(var(--discord-light)/0.1)]">
              <Button size="sm" onClick={onNavigateToTemplates}
                className="bg-primary hover:bg-primary/90">
                <Rocket className="w-3.5 h-3.5 mr-1" />
                Start Building Now!
              </Button>
              <Button size="sm" variant="outline" onClick={onNavigateToBuild}
                className="border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]">
                <Code className="w-3.5 h-3.5 mr-1" />
                Open IDE
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Resources */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-lg p-5 mb-8 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}>
        <h3 className="text-lg font-semibold text-white mb-2">📚 Learning Resources</h3>
        <p className="text-sm text-white mb-3">Deepen your AI skills with these curated tutorials and guides.</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((resource, index) => (
          <motion.a key={resource.title} href={resource.link} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.05 }}
            className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] rounded-lg p-4 hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all group block">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${resource.color}20`, border: `1px solid ${resource.color}40` }}>
                <resource.icon className="w-5 h-5" style={{ color: resource.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm group-hover:text-[hsl(var(--discord-blurple))] transition-colors truncate">{resource.title}</h4>
                  <ExternalLink className="w-3 h-3 text-[hsl(var(--discord-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: `${LEVEL_COLORS[resource.level]}20`, color: LEVEL_COLORS[resource.level],
                }}>{resource.level}</span>
              </div>
            </div>
            <p className="text-xs text-white line-clamp-2">{resource.description}</p>
          </motion.a>
        ))}
      </div>
    </div>
  );
};
