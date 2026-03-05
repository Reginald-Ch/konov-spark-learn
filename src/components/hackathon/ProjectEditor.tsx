import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PublishModal } from './PublishModal';
import { supabase } from '@/integrations/supabase/client';
import {
  Code, Play, Sparkles, Send, X, Copy, Check, Trash2,
  Rocket, Loader2, Save, Bot, Brain, Clock,
  MessageSquare, Lightbulb, Settings, FileCode, FileJson, FileText,
  Circle, TestTube, Terminal, ChevronUp, ChevronDown, Eye,
  PanelRightClose, PanelRightOpen, HelpCircle, Database, Palette, Plus, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

import { ProjectType, PROJECT_SCAFFOLDS, CAPABILITY_OPTIONS } from './projectScaffolds';
export type { ProjectType } from './projectScaffolds';

interface ProjectEditorProps {
  initialType?: ProjectType;
  initialCode?: string;
  hackathonStartDate?: string | null;
  hackathonStatus?: 'upcoming' | 'live' | 'ended' | null;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface QAPair {
  q: string;
  a: string;
}

// Scaffolds imported from ./projectScaffolds

// Theme options for student customization
const THEMES = [
  { id: 'default', name: 'Default', accent: '#5865F2', bg: '#0d1117', chat: '#161b22' },
  { id: 'ocean', name: 'Ocean', accent: '#00B4D8', bg: '#0a1628', chat: '#0f2035' },
  { id: 'forest', name: 'Forest', accent: '#22C55E', bg: '#0a1a0f', chat: '#0f2614' },
  { id: 'sunset', name: 'Sunset', accent: '#F97316', bg: '#1a0f0a', chat: '#26140f' },
  { id: 'purple', name: 'Neon', accent: '#A855F7', bg: '#0f0a1a', chat: '#140f26' },
  { id: 'rose', name: 'Rose', accent: '#F43F5E', bg: '#1a0a0f', chat: '#260f14' },
];

const KEYWORDS = new Set(['import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'with', 'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'yield', 'lambda', 'global', 'nonlocal', 'assert', 'del', 'True', 'False', 'None', 'async', 'await']);

interface Token {
  type: 'keyword' | 'builtin' | 'string' | 'comment' | 'decorator' | 'number' | 'operator' | 'module' | 'function_name' | 'text';
  value: string;
}

const BUILTINS = new Set(['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'input', 'open', 'super', 'self', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'any', 'all', 'abs', 'max', 'min']);

const tokenizeLine = (line: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '#') { tokens.push({ type: 'comment', value: line.slice(i) }); break; }
    if (line[i] === '@' && (i === 0 || /\s/.test(line[i - 1]))) {
      let end = i + 1;
      while (end < line.length && /[\w.]/.test(line[end])) end++;
      tokens.push({ type: 'decorator', value: line.slice(i, end) }); i = end; continue;
    }
    if ((line[i] === '"' || line[i] === "'")) {
      const quote = line[i];
      const triple = line.slice(i, i + 3) === quote.repeat(3);
      const delim = triple ? quote.repeat(3) : quote;
      let end = i + delim.length;
      while (end < line.length) {
        if (line[end] === '\\') { end += 2; continue; }
        if (line.slice(end, end + delim.length) === delim) { end += delim.length; break; }
        end++;
      }
      tokens.push({ type: 'string', value: line.slice(i, end) }); i = end; continue;
    }
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i - 1]))) {
      let end = i;
      while (end < line.length && /[\d.eExXoObBa-fA-F_]/.test(line[end])) end++;
      tokens.push({ type: 'number', value: line.slice(i, end) }); i = end; continue;
    }
    if (/[a-zA-Z_]/.test(line[i])) {
      let end = i;
      while (end < line.length && /[\w.]/.test(line[end])) end++;
      const word = line.slice(i, end);
      const prevTokens = tokens.map(t => t.value.trim()).filter(Boolean);
      const lastKeyword = prevTokens.length > 0 ? prevTokens[prevTokens.length - 1] : '';
      const isAfterImport = lastKeyword === 'from' || lastKeyword === 'import';
      if (word.includes('.') && isAfterImport) {
        tokens.push({ type: 'module', value: word });
      } else if (KEYWORDS.has(word)) tokens.push({ type: 'keyword', value: word });
      else if (BUILTINS.has(word)) tokens.push({ type: 'builtin', value: word });
      else if (end < line.length && line[end] === '(') tokens.push({ type: 'function_name', value: word });
      else tokens.push({ type: 'text', value: word });
      i = end; continue;
    }
    if ('=+-*/<>!&|%^~:'.includes(line[i])) { tokens.push({ type: 'operator', value: line[i] }); i++; continue; }
    tokens.push({ type: 'text', value: line[i] }); i++;
  }
  return tokens;
};

const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: 'text-ide-purple',
  builtin: 'text-ide-yellow',
  string: 'text-ide-green',
  comment: 'text-ide-text-muted italic',
  decorator: 'text-ide-red',
  number: 'text-ide-orange',
  operator: 'text-ide-cyan',
  module: 'text-ide-cyan',
  function_name: 'text-ide-yellow',
  text: 'text-ide-text',
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Extract all config variables from the student's Python code
// Supports both SCREAMING_CASE and snake_case variable names — pure function at module scope
const extractConfigFromCode = (code: string) => {
  const extract = (fallback: string, ...varNames: string[]) => {
    for (const name of varNames) {
      const tripleMatch = code.match(new RegExp(`${name}\\s*=\\s*"""([\\s\\S]*?)"""`));
      if (tripleMatch) return tripleMatch[1].trim();
      const tripleMatch2 = code.match(new RegExp(`${name}\\s*=\\s*'''([\\s\\S]*?)'''`));
      if (tripleMatch2) return tripleMatch2[1].trim();
      const match = code.match(new RegExp(`${name}\\s*=\\s*["'](.*)["']`));
      if (match) return match[1];
    }
    return fallback;
  };
  const extractNumber = (fallback: number, ...varNames: string[]) => {
    for (const name of varNames) {
      const match = code.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`));
      if (match) return parseFloat(match[1]);
    }
    return fallback;
  };
  const extractBool = (fallback: boolean, ...varNames: string[]) => {
    for (const name of varNames) {
      const match = code.match(new RegExp(`${name}\\s*=\\s*(True|False)`));
      if (match) return match[1] === 'True';
    }
    return fallback;
  };
  const extractList = (...varNames: string[]): string[] => {
    for (const name of varNames) {
      const match = code.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
      if (!match) continue;
      const items: string[] = [];
      const regex = /["']([^"']+)["']/g;
      let m;
      while ((m = regex.exec(match[1])) !== null) items.push(m[1]);
      return items;
    }
    return [];
  };
  const extractDict = (...varNames: string[]): Record<string, string> => {
    for (const name of varNames) {
      const match = code.match(new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\}`));
      if (!match) continue;
      const result: Record<string, string> = {};
      const regex = /["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
      let m;
      while ((m = regex.exec(match[1])) !== null) result[m[1]] = m[2];
      return result;
    }
    return {};
  };
  const extractQAPairs = (): Array<{q: string; a: string}> => {
    const match = code.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*\[([\s\S]*?)\]/);
    if (!match) return [];
    const pairs: Array<{q: string; a: string}> = [];
    const regex = /\{\s*["']q["']\s*:\s*["']([^"']+)["']\s*,\s*["']a["']\s*:\s*["']([^"']+)["']\s*\}/g;
    let m;
    while ((m = regex.exec(match[1])) !== null) pairs.push({ q: m[1], a: m[2] });
    return pairs;
  };

  return {
    botName: extract('AI Bot', 'BOT_NAME', 'bot_name', 'AGENT_NAME'),
    botEmoji: extract('🤖', 'BOT_EMOJI', 'bot_emoji'),
    greeting: extract('', 'AI_MESSAGE', 'greeting', 'GREETING_MESSAGE'),
    creatorName: extract('', 'CREATOR_NAME', 'creator'),
    temperature: extractNumber(0.7, 'TEMPERATURE', 'temperature'),
    responseStyle: extract('Balanced', 'RESPONSE_STYLE', 'response_style'),
    maxResponseLength: extract('medium', 'MAX_RESPONSE_LENGTH', 'max_response_length'),
    responseFormat: extract('', 'RESPONSE_FORMAT', 'response_format'),
    conversationRules: extractList('RULES', 'rules', 'CONVERSATION_RULES'),
    conversationStarters: extractList('CONVERSATION_STARTERS', 'conversation_starters'),
    easterEggs: extractDict('EASTER_EGGS', 'easter_eggs'),
    catchphrases: extractList('CATCHPHRASES', 'catchphrases'),
    blockedTopics: extractList('BLOCKED_TOPICS', 'blocked_topics'),
    followUpQuestions: extractBool(true, 'FOLLOW_UP_QUESTIONS', 'follow_up_questions'),
    rememberName: extractBool(true, 'MEMORY_ENABLED', 'memory_enabled', 'REMEMBER_NAME'),
    errorMessage: extract('', 'ERROR_MESSAGE', 'error_message'),
    knowledgeBaseFromCode: extract('', 'KNOWLEDGE_BASE', 'knowledge_base'),
    qaPairsFromCode: extractQAPairs(),
    showReasoning: extractBool(true, 'SHOW_REASONING', 'show_reasoning'),
    maxThinkingSteps: extractNumber(5, 'MAX_THINKING_STEPS', 'max_thinking_steps'),
    tools: extractDict('TOOLS', 'tools'),
    toolInstructions: extractDict('TOOL_INSTRUCTIONS', 'tool_instructions'),
    forbiddenWords: extractList('FORBIDDEN_WORDS', 'forbidden_words'),
    mood: extract('neutral', 'MOOD', 'mood'),
    examples: extractList('FEW_SHOT_EXAMPLES', 'few_shot_examples', 'EXAMPLES'),
    languageStyle: extract('casual', 'LANGUAGE_STYLE', 'language_style'),
    signOff: extract('', 'SIGN_OFF', 'sign_off'),
    systemMessage: extract('', 'SYSTEM_MESSAGE', 'SYSTEM_PROMPT', 'system_prompt', 'system_message'),
  };
};

type FileTab = 'main.py' | 'config.json' | 'requirements.txt';
type BottomTab = 'terminal' | 'ai-mentor';
type ConfigTab = 'settings' | 'knowledge' | 'theme';

const ONBOARDING_STEPS = [
  { target: 'config', title: '⚙️ Configure', description: 'Set your project type, system prompt, and capabilities. The system prompt controls how your AI responds.' },
  { target: 'editor', title: '💻 Write Code', description: 'Edit your Python code here. The syntax highlighter shows your code in color. Switch between files using the tabs.' },
  { target: 'preview', title: '💬 Test Your AI', description: 'Chat with your AI in real-time! Your system prompt controls how it responds. Try changing it and see the difference.' },
  { target: 'knowledge', title: '📚 Add Knowledge', description: 'Add custom text and Q&A pairs to make your bot smarter! Your bot will reference this data when answering.' },
  { target: 'actions', title: '🚀 Save & Deploy', description: 'Run Tests to check your code, Save Checkpoint to keep your work, and Go Live to publish with a shareable URL!' },
];

const CountdownWidget = ({ hackathonStartDate, hackathonStatus }: { hackathonStartDate?: string | null; hackathonStatus?: 'upcoming' | 'live' | 'ended' | null }) => {
  const [elapsed, setElapsed] = useState({ h: 0, m: 0, s: 0 });
  const [frozen, setFrozen] = useState(false);
  
  useEffect(() => {
    // If event ended, freeze the timer
    if (hackathonStatus === 'ended') {
      setFrozen(true);
      return;
    }
    setFrozen(false);

    // Use hackathon start_date from DB as single source of truth
    let startTime: number;
    if (hackathonStartDate) {
      startTime = new Date(hackathonStartDate).getTime();
      // Sanity: if start_date is in the future, show 00:00:00
      if (startTime > Date.now()) {
        setElapsed({ h: 0, m: 0, s: 0 });
        return;
      }
    } else {
      // Fallback to localStorage only if no hackathon data
      const stored = localStorage.getItem('forge-session-start');
      if (stored) {
        startTime = parseInt(stored);
        if (Date.now() - startTime > 24 * 60 * 60 * 1000) {
          startTime = Date.now();
          localStorage.setItem('forge-session-start', startTime.toString());
        }
      } else {
        startTime = Date.now();
        localStorage.setItem('forge-session-start', startTime.toString());
      }
    }
    
    const tick = () => {
      const diff = Math.max(0, Date.now() - startTime);
      setElapsed({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hackathonStartDate, hackathonStatus]);

  const totalSec = elapsed.h * 3600 + elapsed.m * 60 + elapsed.s;
  const isLong = totalSec > 5400; // > 90 min
  const isMedium = totalSec > 2700 && !isLong; // > 45 min

  return (
    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
      frozen ? 'bg-red-500/25 border-red-400/50 text-red-300'
      : isLong ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' 
      : isMedium ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
      : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{String(elapsed.h).padStart(2,'0')}:{String(elapsed.m).padStart(2,'0')}:{String(elapsed.s).padStart(2,'0')}</span>
      {frozen && <span className="text-[9px] opacity-70">ENDED</span>}
    </div>
  );
};

export const ProjectEditor = ({ initialType, initialCode, hackathonStartDate, hackathonStatus }: ProjectEditorProps) => {
  const isMobile = useIsMobile();
  const [projectType, setProjectType] = useState<ProjectType>(initialType || 'chatbot');
  const [projectName, setProjectName] = useState('My AI Project');
  const [systemPrompt, setSystemPrompt] = useState(PROJECT_SCAFFOLDS[initialType || 'chatbot'].systemPrompt);
  const [capabilities, setCapabilities] = useState<string[]>(PROJECT_SCAFFOLDS[initialType || 'chatbot'].capabilities);
  const [showConfig, setShowConfig] = useState(() => !isMobile && window.innerWidth >= 1024);
  const [showPreview, setShowPreview] = useState(!isMobile);
  const [configTab, setConfigTab] = useState<ConfigTab>('settings');

  // Knowledge base state
  const [knowledgeBase, setKnowledgeBase] = useState(() => localStorage.getItem('forge-knowledge-base') || '');
  const [qaData, setQaData] = useState<QAPair[]>(() => {
    try { const stored = localStorage.getItem('forge-qa-data'); return stored ? JSON.parse(stored) : []; }
    catch { return []; }
  });

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const stored = localStorage.getItem('forge-theme');
    if (stored) { try { return JSON.parse(stored); } catch {} }
    return THEMES[0];
  });
  const [welcomeMessage, setWelcomeMessage] = useState(() => localStorage.getItem('forge-welcome-msg') || 'Hi! Ask me anything.');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('forge-logo-url') || '');
  const [quickReplies, setQuickReplies] = useState<string[]>(() => {
    try { const stored = localStorage.getItem('forge-quick-replies'); return stored ? JSON.parse(stored) : ['Hello!', 'What can you do?', 'Help me with something']; }
    catch { return ['Hello!', 'What can you do?', 'Help me with something']; }
  });
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(['welcome', 'branding', 'codeview']);

  // File state
  const [activeFile, setActiveFile] = useState<FileTab>('main.py');
  const [files, setFiles] = useState({
    'main.py': initialCode || PROJECT_SCAFFOLDS[initialType || 'chatbot'].main,
    'config.json': PROJECT_SCAFFOLDS[initialType || 'chatbot'].config,
    'requirements.txt': PROJECT_SCAFFOLDS[initialType || 'chatbot'].requirements,
  });

  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(() => ({
    'main.py': initialCode || PROJECT_SCAFFOLDS[initialType || 'chatbot'].main,
    'config.json': PROJECT_SCAFFOLDS[initialType || 'chatbot'].config,
    'requirements.txt': PROJECT_SCAFFOLDS[initialType || 'chatbot'].requirements,
  }));
  const isDirty = useMemo(() => {
    return Object.keys(files).some(key => files[key as FileTab] !== savedFiles[key]);
  }, [files, savedFiles]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '⚡ Project initialized. Click "Run Tests" or type a message to test your AI.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [authorEmail, setAuthorEmail] = useState(() => {
    const stored = localStorage.getItem('forge-student-email');
    if (stored) return stored;
    const generated = `student-${Math.random().toString(36).slice(2, 8)}@forge.local`;
    localStorage.setItem('forge-student-email', generated);
    return generated;
  });
  const [authorName, setAuthorName] = useState(() => {
    const stored = localStorage.getItem('forge-student-name');
    if (stored) return stored;
    const generated = `Student-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('forge-student-name', generated);
    return generated;
  });
  const [aiCallCount, setAiCallCount] = useState(0);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');

  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
  const [mentorInput, setMentorInput] = useState('');
  const [mentorHistory, setMentorHistory] = useState<{ role: string; content: string }[]>([]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    const seen = localStorage.getItem('buildstudio-onboarded');
    return seen ? null : 0;
  });

  const [showPromptHelp, setShowPromptHelp] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSaveRef = useRef<() => void>(() => {});
  const handleRunRef = useRef<() => void>(() => {});

  // Persist knowledge/QA/theme to localStorage AND sync to code
  useEffect(() => { localStorage.setItem('forge-knowledge-base', knowledgeBase); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('forge-qa-data', JSON.stringify(qaData)); }, [qaData]);
  useEffect(() => { localStorage.setItem('forge-theme', JSON.stringify(selectedTheme)); }, [selectedTheme]);
  useEffect(() => { localStorage.setItem('forge-welcome-msg', welcomeMessage); }, [welcomeMessage]);
  useEffect(() => { localStorage.setItem('forge-logo-url', logoUrl); }, [logoUrl]);
  useEffect(() => { localStorage.setItem('forge-quick-replies', JSON.stringify(quickReplies)); }, [quickReplies]);

  // Sync sidebar Knowledge Base text → code's KNOWLEDGE_BASE variable
  const prevKnowledgeRef = useRef(knowledgeBase);
  useEffect(() => {
    if (prevKnowledgeRef.current === knowledgeBase) return;
    prevKnowledgeRef.current = knowledgeBase;
    setFiles(prev => {
      const code = prev['main.py'];
      const tripleRegex = /(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*"""([\s\S]*?)"""/;
      const singleRegex = /(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*["'](.*)["']/;
      const varName = code.match(/KNOWLEDGE_BASE\s*=/) ? 'KNOWLEDGE_BASE' : 'knowledge_base';
      if (tripleRegex.test(code)) {
        return { ...prev, 'main.py': code.replace(tripleRegex, `${varName} = """${knowledgeBase}"""`) };
      } else if (singleRegex.test(code)) {
        if (knowledgeBase.includes('\n')) {
          return { ...prev, 'main.py': code.replace(singleRegex, `${varName} = """${knowledgeBase}"""`) };
        } else {
          const escaped = knowledgeBase.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return { ...prev, 'main.py': code.replace(singleRegex, `${varName} = "${escaped}"`) };
        }
      }
      return prev;
    });
  }, [knowledgeBase]);

  // Read knowledge base from code when code changes
  useEffect(() => {
    const code = files['main.py'];
    const tripleMatch = code.match(/(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*"""([\s\S]*?)"""/);
    const singleMatch = code.match(/(?:KNOWLEDGE_BASE|knowledge_base)\s*=\s*["'](.*)["']/);
    const match = tripleMatch || singleMatch;
    if (match && match[1] !== prevKnowledgeRef.current) {
      prevKnowledgeRef.current = match[1];
      setKnowledgeBase(match[1]);
    }
  }, [files['main.py']]);

  // Sync sidebar Q&A pairs → code's QA_PAIRS variable
  const prevQARef = useRef(JSON.stringify(qaData));
  useEffect(() => {
    const serialized = JSON.stringify(qaData);
    if (prevQARef.current === serialized) return;
    prevQARef.current = serialized;
    const validPairs = qaData.filter(p => p.q.trim() && p.a.trim());
    setFiles(prev => {
      const code = prev['main.py'];
      const qaRegex = /(?:QA_PAIRS|qa_pairs)\s*=\s*\[[\s\S]*?\]/;
      const varName = code.match(/QA_PAIRS\s*=/) ? 'QA_PAIRS' : 'qa_pairs';
      if (qaRegex.test(code)) {
        const pairsStr = validPairs.length === 0 
          ? '[]' 
          : '[\n' + validPairs.map(p => `    {"q": "${p.q.replace(/"/g, '\\"')}", "a": "${p.a.replace(/"/g, '\\"')}"}`).join(',\n') + '\n]';
        return { ...prev, 'main.py': code.replace(qaRegex, `${varName} = ${pairsStr}`) };
      }
      return prev;
    });
  }, [qaData]);

  // Read Q&A pairs from code when code changes
  useEffect(() => {
    const code = files['main.py'];
    const match = code.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*\[([\s\S]*?)\]/);
    if (!match) return;
    const pairs: QAPair[] = [];
    const regex = /\{\s*["']q["']\s*:\s*["']([^"']+)["']\s*,\s*["']a["']\s*:\s*["']([^"']+)["']\s*\}/g;
    let m;
    while ((m = regex.exec(match[1])) !== null) pairs.push({ q: m[1], a: m[2] });
    const newSerialized = JSON.stringify(pairs);
    if (newSerialized !== prevQARef.current) {
      prevQARef.current = newSerialized;
      setQaData(pairs);
    }
  }, [files['main.py']]);

  // Sync theme selection to code's APP_THEME variable
  const themeSyncRef = useRef(selectedTheme.id);
  useEffect(() => {
    if (themeSyncRef.current === selectedTheme.id) return;
    themeSyncRef.current = selectedTheme.id;
    setFiles(prev => {
      const code = prev['main.py'];
      const regex = /(?:APP_THEME|app_theme)\s*=\s*["']([^"']*)["']/;
      if (regex.test(code)) {
        const varName = code.match(/APP_THEME\s*=/) ? 'APP_THEME' : 'app_theme';
        const updated = code.replace(regex, `${varName} = "${selectedTheme.id}"`);
        if (updated !== code) return { ...prev, 'main.py': updated };
      }
      return prev;
    });
  }, [selectedTheme.id]);

  // Read theme from code when code changes
  useEffect(() => {
    const code = files['main.py'];
    const match = code.match(/(?:APP_THEME|app_theme)\s*=\s*["']([^"']*)["']/);
    if (match && match[1] && match[1] !== themeSyncRef.current) {
      const found = THEMES.find(t => t.id === match[1]);
      if (found) {
        themeSyncRef.current = found.id;
        setSelectedTheme(found);
      }
    }
  }, [files['main.py']]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const prevSystemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    if (prevSystemPromptRef.current !== systemPrompt) {
      setFiles(prev => {
        const code = prev['main.py'];
        // Support SYSTEM_MESSAGE, system_message, SYSTEM_PROMPT
        const tripleRegex = /(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*"""([\s\S]*?)"""/;
        const singleRegex = /(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*["'](.*)["']/;
        const varName = code.match(/SYSTEM_MESSAGE\s*=/) ? 'SYSTEM_MESSAGE' : code.match(/SYSTEM_PROMPT\s*=/) ? 'SYSTEM_PROMPT' : 'system_message';
        if (tripleRegex.test(code)) {
          const updated = code.replace(tripleRegex, `${varName} = """${systemPrompt}"""`);
          return { ...prev, 'main.py': updated };
        } else if (singleRegex.test(code)) {
          const needsTriple = systemPrompt.includes('\n');
          if (needsTriple) {
            const updated = code.replace(singleRegex, `${varName} = """${systemPrompt}"""`);
            return { ...prev, 'main.py': updated };
          } else {
            const escaped = systemPrompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const updated = code.replace(singleRegex, `${varName} = "${escaped}"`);
            return { ...prev, 'main.py': updated };
          }
        }
        return prev;
      });
      prevSystemPromptRef.current = systemPrompt;
    }
  }, [systemPrompt]);

  useEffect(() => {
    const code = files['main.py'];
    const tripleMatch = code.match(/(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*"""([\s\S]*?)"""/);
    const singleMatch = code.match(/(?:SYSTEM_MESSAGE|system_message|SYSTEM_PROMPT)\s*=\s*["'](.*)["']/);
    const match = tripleMatch || singleMatch;
    if (match && match[1] !== systemPrompt) {
      const unescaped = tripleMatch ? match[1] : match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (unescaped !== prevSystemPromptRef.current) {
        prevSystemPromptRef.current = unescaped;
        setSystemPrompt(unescaped);
      }
    }
  }, [files['main.py']]);

  const handleTypeChange = (type: ProjectType) => {
    const scaffold = PROJECT_SCAFFOLDS[type];
    setProjectType(type);
    setSystemPrompt(scaffold.systemPrompt);
    setCapabilities(scaffold.capabilities);
    setFiles({
      'main.py': scaffold.main,
      'config.json': scaffold.config,
      'requirements.txt': scaffold.requirements,
    });
    setChatMessages([
      { role: 'system', content: `⚡ ${scaffold.icon} ${scaffold.name} project loaded. Ready to build!` },
    ]);
    setTerminalOutput([`> Loaded ${scaffold.name} template`, `> 3 files ready`]);
    setShowBottomPanel(true);
    setBottomTab('terminal');
    setAiOutput('');
    setMentorHistory([]);
    setCurrentProjectId(null);
    prevSystemPromptRef.current = scaffold.systemPrompt;
    toast.success(`${scaffold.icon} Switched to ${scaffold.name}`);
    // Tier 1: Project Setup (10 pts, awarded once)
    if (authorEmail) {
      const setupKey = `forge-scored-project_setup-${authorEmail}`;
      if (!localStorage.getItem(setupKey)) {
        localStorage.setItem(setupKey, 'true');
        supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'project_setup', points: 10, metadata: { template: type } }).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
      }
    }
  };

  const toggleCapability = (cap: string) => {
    setCapabilities(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);
  };

  const updateFile = (content: string) => {
    setFiles(prev => ({ ...prev, [activeFile]: content }));
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(files[activeFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  }, [files, activeFile]);

  const highlightedContent = useMemo(() => {
    if (activeFile !== 'main.py') return null;
    const codeLines = files['main.py'].split('\n');
    return codeLines.map((line) => {
      if (!line) return '&nbsp;';
      const tokens = tokenizeLine(line);
      return tokens.map(t => {
        const escaped = escapeHtml(t.value);
        if (t.type === 'text') return escaped;
        return `<span class="${TOKEN_COLORS[t.type]}">${escaped}</span>`;
      }).join('');
    });
  }, [files, activeFile]);

  // Q&A helpers
  const addQA = () => setQaData(prev => [...prev, { q: '', a: '' }]);
  const removeQA = (idx: number) => setQaData(prev => prev.filter((_, i) => i !== idx));
  const updateQA = (idx: number, field: 'q' | 'a', value: string) => {
    setQaData(prev => prev.map((pair, i) => i === idx ? { ...pair, [field]: value } : pair));
  };

  // Stream AI response helper
  const streamFromEdgeFunction = async (body: Record<string, unknown>, onChunk: (text: string) => void): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 401) throw new Error('Authentication error. Please refresh the page.');
        if (resp.status === 429) throw new Error('Too many requests. Wait a moment and try again.');
        if (resp.status === 402) throw new Error('AI credits exhausted. Try again later.');
        throw new Error(err.error || 'AI service error');
      }
      if (!resp.body) throw new Error('No response body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; onChunk(fullText); }
          } catch { /* skip malformed JSON chunk */ }
        }
      }
      setAiCallCount(prev => prev + 1);
      return fullText;
    } finally { clearTimeout(timeout); }
  };

  const handleRun = async () => {
    if (!files['main.py'].trim()) { toast.error('Write some code first!'); return; }
    setIsRunning(true);
    setShowBottomPanel(true);
    setBottomTab('terminal');
    
    // First, do a local config analysis
    const config = extractConfigFromCode(files['main.py']);
    const isAgent = projectType === 'agent';
    const defaultName = isAgent ? 'Research Agent' : 'Spark';
    
    const localChecks = [
      { label: 'BOT_NAME', ok: config.botName !== defaultName && config.botName !== 'AI Bot', val: config.botName },
      { label: 'BOT_EMOJI', ok: config.botEmoji !== '🤖' && config.botEmoji !== '🧠', val: config.botEmoji },
      { label: 'AI_MESSAGE', ok: !!config.greeting, val: config.greeting ? '✓ set' : '✗ default' },
      { label: 'CREATOR_NAME', ok: config.creatorName !== 'A FORGE Builder', val: config.creatorName },
      { label: 'SYSTEM_MESSAGE', ok: systemPrompt.length > 30, val: `${systemPrompt.length} chars` },
      { label: 'KNOWLEDGE_BASE', ok: !!config.knowledgeBaseFromCode.trim(), val: config.knowledgeBaseFromCode ? '✓ loaded' : '✗ empty' },
      { label: 'QA_PAIRS', ok: config.qaPairsFromCode.length > 0, val: `${config.qaPairsFromCode.length} pairs` },
      { label: 'TEMPERATURE', ok: config.temperature !== (isAgent ? 0.3 : 0.7), val: String(config.temperature) },
      { label: 'RESPONSE_STYLE', ok: config.responseStyle !== (isAgent ? 'Professional' : 'Friendly'), val: config.responseStyle },
      { label: 'MAX_RESPONSE_LENGTH', ok: config.maxResponseLength !== 'medium', val: config.maxResponseLength },
      { label: 'RULES', ok: config.conversationRules.length > 3, val: `${config.conversationRules.length} rules` },
      { label: 'CONVERSATION_STARTERS', ok: config.conversationStarters.length > 4, val: `${config.conversationStarters.length} starters` },
      { label: 'EASTER_EGGS', ok: Object.keys(config.easterEggs).length > (isAgent ? 2 : 3), val: `${Object.keys(config.easterEggs).length} eggs` },
      { label: 'CATCHPHRASES', ok: config.catchphrases.length > 3, val: `${config.catchphrases.length} phrases` },
      { label: 'BLOCKED_TOPICS', ok: config.blockedTopics.length > 2, val: `${config.blockedTopics.length} topics` },
      { label: 'FORBIDDEN_WORDS', ok: config.forbiddenWords.length > 0, val: `${config.forbiddenWords.length} words` },
      { label: 'MOOD', ok: config.mood !== 'neutral', val: config.mood },
      { label: 'FEW_SHOT_EXAMPLES', ok: config.examples.length > 0, val: `${config.examples.length} examples` },
      { label: 'LANGUAGE_STYLE', ok: config.languageStyle !== 'casual', val: config.languageStyle },
      { label: 'SIGN_OFF', ok: !!config.signOff, val: config.signOff || '✗ none' },
    ];
    
    const completedCount = localChecks.filter(c => c.ok).length;
    
    setTerminalOutput(prev => [
      ...prev,
      `$ python main.py  [${projectType}]`,
      ``,
      `🔍 FORGE Config Scanner v2.0`,
      `═══════════════════════════════════`,
      `📋 Scanning 20 challenges...`,
      ``,
      ...localChecks.map(c => `  ${c.ok ? '✅' : '⬜'} ${c.label.padEnd(22)} → ${c.val}`),
      ``,
      `═══════════════════════════════════`,
      `📊 Progress: ${completedCount}/20 challenges completed (${Math.round(completedCount / 20 * 100)}%)`,
      `🤖 Bot Name: ${config.botEmoji} ${config.botName}`,
      `🌡️ Temperature: ${config.temperature}`,
      `✍️ Style: ${config.responseStyle} | Length: ${config.maxResponseLength}`,
      completedCount >= 15 ? `🏆 AMAZING! Your bot is highly customized!` : completedCount >= 10 ? `🔥 Great progress! Keep customizing!` : `💡 Tip: Edit more variables in main.py to unlock challenges!`,
      ``,
      `⏳ Running AI simulation...`,
    ]);
    
    setChatMessages(prev => [...prev, { role: 'system', content: '▶ Running tests...' }]);
    try {
      let result = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'run', systemPrompt, projectName, projectType },
        (text) => { 
          result = text; 
          setTerminalOutput(prev => {
            const updated = [...prev];
            const runningIdx = updated.lastIndexOf('⏳ Running AI simulation...');
            if (runningIdx !== -1) {
              updated[runningIdx] = result;
            } else {
              updated[updated.length - 1] = result;
            }
            return updated;
          });
        }
      );
      if (!result) {
        setTerminalOutput(prev => [...prev, '⚠ No output received. Check your code for issues.']);
      } else {
        setTerminalOutput(prev => [...prev, '───────────────────', '✅ All tests passed!']);
      }
      setChatMessages(prev => [...prev, { role: 'system', content: `✅ Tests complete! ${completedCount}/20 challenges done.` }]);
      if (authorEmail) {
        const runKey = `forge-scored-first_run_success-${authorEmail}`;
        if (!localStorage.getItem(runKey)) {
          localStorage.setItem(runKey, 'true');
          supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'first_run_success', points: 10, metadata: { project: projectName } }).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
        }
      }
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `❌ Error: ${e.message}`, '', '💡 Tip: Check your code for syntax errors, or try again in a moment.']);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
    } finally { setIsRunning(false); }
  };

  // Memoized config extraction — single source of truth for the Live Preview
  const liveConfig = useMemo(() => extractConfigFromCode(files['main.py']), [files['main.py']]);

  const handleChatSend = async (directMessage?: string) => {
    const msg = directMessage || chatInput.trim();
    if (!msg || isStreaming) return;
    const userMsg = msg;
    setChatInput('');

    // Use memoized config — always reflects latest code edits
    const config = liveConfig;
    const lowerMsg = userMsg.toLowerCase();

    // 1. Check for easter eggs FIRST (client-side, instant)
    for (const [trigger, response] of Object.entries(config.easterEggs)) {
      if (lowerMsg.includes(trigger.toLowerCase())) {
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: `${response}` },
        ]);
        return;
      }
    }

    // 2. Check for EXACT Q&A matches client-side (most reliable)
    const mergedQA = [
      ...qaData.filter(p => p.q.trim() && p.a.trim()),
      ...config.qaPairsFromCode,
    ];
    for (const pair of mergedQA) {
      const qLower = pair.q.toLowerCase().trim();
      // Match if user message contains the question keywords or is very similar
      if (qLower && (lowerMsg.includes(qLower) || qLower.includes(lowerMsg) || 
          lowerMsg.split(/\s+/).filter(w => w.length > 2).every(word => qLower.includes(word)))) {
        // Build the answer with bot personality
        let answer = pair.a;
        if (config.catchphrases.length > 0) {
          answer += ` ${config.catchphrases[Math.floor(Math.random() * config.catchphrases.length)]}`;
        }
        if (config.signOff) {
          answer += `\n\n${config.signOff}`;
        }
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: answer },
        ]);
        return;
      }
    }

    // 3. Check for blocked topics client-side
    for (const topic of config.blockedTopics) {
      if (lowerMsg.includes(topic.toLowerCase())) {
        let refusal = `I'm sorry, I can't discuss "${topic}". Is there something else I can help you with?`;
        if (config.signOff) refusal += `\n\n${config.signOff}`;
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: refusal },
        ]);
        return;
      }
    }

    // 4. For everything else, send to AI with full config context
    const history = chatMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content !== '...')
      .map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: userMsg });
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    try {
      let assistantReply = '';
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

      const mergedKnowledge = [knowledgeBase, config.knowledgeBaseFromCode].filter(Boolean).join('\n\n');

      await streamFromEdgeFunction(
        { 
          code: userMsg, 
          model: projectType, 
          action: 'test-agent', 
          systemPrompt: config.systemMessage || systemPrompt, 
          messages: history.slice(0, -1),
          knowledgeBase: mergedKnowledge || undefined,
          qaData: mergedQA.length > 0 ? mergedQA : undefined,
          botConfig: {
            botName: config.botName,
            botEmoji: config.botEmoji,
            creatorName: config.creatorName,
            temperature: config.temperature,
            responseStyle: config.responseStyle,
            maxResponseLength: config.maxResponseLength,
            responseFormat: config.responseFormat,
            conversationRules: config.conversationRules,
            catchphrases: config.catchphrases,
            blockedTopics: config.blockedTopics,
            followUpQuestions: config.followUpQuestions,
            rememberName: config.rememberName,
            showReasoning: config.showReasoning,
            toolInstructions: config.toolInstructions,
            forbiddenWords: config.forbiddenWords,
            mood: config.mood,
            examples: config.examples,
            languageStyle: config.languageStyle,
            signOff: config.signOff,
          },
        },
        (text) => {
          assistantReply = text;
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantReply };
            return updated;
          });
        }
      );
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
    } finally { setIsStreaming(false); }
  };

  const executeSave = async (email: string, name?: string) => {
    setIsSaving(true);
    try {
      const codePayload = files['main.py'];
      if (currentProjectId) {
        const { error } = await supabase
          .from('ai_projects')
          .update({ project_name: projectName, description: systemPrompt, code: codePayload, template_id: projectType, author_name: authorName })
          .eq('id', currentProjectId)
          .eq('author_email', email);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description: systemPrompt, code: codePayload, template_id: projectType, author_name: name || authorName || 'Student', author_email: email, is_published: false, points_earned: 0 })
          .select('id')
          .single();
        if (error) throw error;
        setCurrentProjectId(data?.id || null);
      }
      setSavedFiles({ ...files });
      setLastSaved(new Date().toLocaleTimeString());
      setTerminalOutput(prev => [...prev, `● All changes saved`]);
      toast.success('💾 Project saved!');
      // No points for saves — scoring is milestone-based only
    } catch (e) {
      console.error(e);
      toast.error('Failed to save. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleSave = async () => {
    localStorage.setItem('forge-student-email', authorEmail);
    localStorage.setItem('forge-student-name', authorName);
    await executeSave(authorEmail);
  };

  const handleAiAssist = async (action: string) => {
    if (!files['main.py'].trim()) { toast.error('Write some code first!'); return; }
    setIsAiLoading(true);
    setActiveAiAction(action);
    setAiOutput('');
    setShowBottomPanel(true);
    setBottomTab('ai-mentor');
    try {
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action, systemPrompt, projectName, projectType },
        (text) => setAiOutput(text)
      );
      // No points for mentor usage — scoring is milestone-based only
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); setActiveAiAction(null); }
  };

  const handleMentorChat = async () => {
    if (!mentorInput.trim() || isAiLoading) return;
    const question = mentorInput.trim();
    setMentorInput('');
    setIsAiLoading(true);
    setShowBottomPanel(true);
    setBottomTab('ai-mentor');
    
    // Add user message to mentor display
    const newHistory = [...mentorHistory, { role: 'user', content: question }];
    setMentorHistory(newHistory);
    setAiOutput(prev => prev + '\n\n---\n\n**You:** ' + question + '\n\n');
    
    try {
      let assistantReply = '';
      await streamFromEdgeFunction(
        { 
          code: files['main.py'], 
          model: projectType, 
          action: 'mentor-chat', 
          systemPrompt, 
          projectName, 
          projectType,
          messages: newHistory,
        },
        (text) => {
          assistantReply = text;
          setAiOutput(prev => {
            const parts = prev.split('---');
            const lastSection = parts.length > 1 ? parts.slice(0, -1).join('---') + '---\n\n**You:** ' + question + '\n\n' : '**You:** ' + question + '\n\n';
            return lastSection + text;
          });
        }
      );
      // Store actual assistant response for proper conversation context
      setMentorHistory(prev => [...prev, { role: 'assistant', content: assistantReply || 'No response' }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); }
  };

  const handleGoLive = () => {
    localStorage.setItem('forge-student-email', authorEmail);
    localStorage.setItem('forge-student-name', authorName);
    setPublishOpen(true);
  };

  const dismissOnboarding = () => {
    setOnboardingStep(null);
    localStorage.setItem('buildstudio-onboarded', 'true');
  };
  const nextOnboardingStep = () => {
    if (onboardingStep !== null && onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      dismissOnboarding();
    }
  };

  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleRunRef.current = handleRun; });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') { e.preventDefault(); handleSaveRef.current(); }
      if (mod && e.key === 'Enter') { e.preventDefault(); handleRunRef.current(); }
      if (mod && e.key === 'b') { e.preventDefault(); setShowConfig(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const scaffold = PROJECT_SCAFFOLDS[projectType];
  const lines = files[activeFile].split('\n');

  const FILE_TABS: { id: FileTab; icon: React.ElementType; label: string }[] = [
    { id: 'main.py', icon: FileCode, label: 'main.py' },
    { id: 'config.json', icon: FileJson, label: 'config.json' },
    { id: 'requirements.txt', icon: FileText, label: 'requirements.txt' },
  ];

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* ── Onboarding Overlay ── */}
      <AnimatePresence>
        {onboardingStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
            onClick={dismissOnboarding}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-ide-sidebar border border-ide-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-ide-text-muted">Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}</span>
                <button onClick={dismissOnboarding} className="text-ide-text-muted hover:text-ide-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 mb-4">
                {ONBOARDING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= onboardingStep ? 'bg-ide-accent' : 'bg-ide-border'}`} />
                ))}
              </div>
              <h3 className="text-lg font-bold text-ide-text mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h3>
              <p className="text-sm text-ide-text-muted leading-relaxed mb-6">{ONBOARDING_STEPS[onboardingStep].description}</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={dismissOnboarding} className="flex-1 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                  Skip Tour
                </Button>
                <Button onClick={nextOnboardingStep} className="flex-1 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                  {onboardingStep === ONBOARDING_STEPS.length - 1 ? "Let's Build! 🚀" : 'Next →'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-3 h-10 flex-shrink-0 bg-ide-bg-deep border-b border-ide-border-subtle">
        <div className="flex items-center gap-2.5">
          <Code className="w-4 h-4 text-ide-accent" />
          <span className="font-semibold text-sm text-ide-text">FORGE</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-ide-border text-ide-accent border border-ide-border">
            {scaffold.icon} {scaffold.name}
          </span>
          <CountdownWidget hackathonStartDate={hackathonStartDate} hackathonStatus={hackathonStatus} />
        </div>
        <div className="flex items-center gap-1">
          {[
            { action: 'review', icon: Sparkles, label: 'Review', primary: true },
            { action: 'explain', icon: MessageSquare, label: 'Explain', primary: false },
            { action: 'suggest', icon: Lightbulb, label: 'Suggest', primary: false },
          ].map(({ action, icon: Icon, label, primary }) => (
            <Button
              key={action}
              size="sm"
              variant={primary ? 'default' : 'ghost'}
              onClick={() => handleAiAssist(action)}
              disabled={isAiLoading}
              className={`h-7 text-xs font-medium ${primary ? 'bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90' : 'text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50'}`}
            >
              {isAiLoading && activeAiAction === action ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Icon className="w-3 h-3 mr-1" />}
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Config Sidebar */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100%' : 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`overflow-y-auto flex-shrink-0 flex flex-col bg-ide-sidebar border-r border-ide-border ${isMobile ? 'absolute inset-0 z-30' : ''}`}
            >
              {isMobile && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-ide-text-muted">Config</span>
                  <button onClick={() => setShowConfig(false)} className="text-ide-text-muted hover:text-ide-text"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Config Tab Switcher */}
              <div className="flex border-b border-ide-border flex-shrink-0">
                {[
                  { id: 'settings' as ConfigTab, icon: Settings, label: 'Config' },
                  { id: 'knowledge' as ConfigTab, icon: Database, label: 'Knowledge' },
                  { id: 'theme' as ConfigTab, icon: Palette, label: 'Design' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setConfigTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      configTab === tab.id ? 'text-ide-accent border-b-2 border-ide-accent bg-ide-bg' : 'text-ide-text-muted hover:text-ide-text'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-4 flex-1 overflow-y-auto">
                {/* ── Settings Tab ── */}
                {configTab === 'settings' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Name</label>
                      <Input value={projectName} onChange={e => setProjectName(e.target.value)}
                        className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Type</label>
                      <div className="space-y-1">
                        {([
                          { id: 'chatbot' as ProjectType, icon: Bot, label: '🤖 AI Chatbot', cls: 'text-ide-accent' },
                          { id: 'agent' as ProjectType, icon: Brain, label: '🧠 AI Agent', cls: 'text-ide-green' },
                        ]).map(type => (
                          <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={`w-full text-left p-2 rounded-md text-xs transition-all flex items-center gap-2 border ${
                              projectType === type.id
                                ? 'bg-ide-selection border-ide-accent/40 text-ide-text'
                                : 'border-transparent text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text'
                            }`}
                          >
                            <type.icon className={`w-4 h-4 ${type.cls}`} />
                            <span className="font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ide-text-muted">System Prompt</label>
                        <button
                          onClick={() => setShowPromptHelp(!showPromptHelp)}
                          className="text-ide-text-muted hover:text-ide-accent transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {showPromptHelp && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-2"
                          >
                            <div className="text-[10px] leading-relaxed p-2 rounded bg-ide-accent/10 border border-ide-accent/20 text-ide-text">
                              <strong className="text-ide-accent">💡 What is this?</strong><br />
                              This controls how your AI responds in the <strong>Live Preview</strong> chat. It's like giving your AI a personality card.<br /><br />
                              Try changing it to: <em>"You are a math tutor for SHS students"</em> — then test in the preview!
                              <p className="mt-1 text-ide-text-muted">Changes here auto-sync to your code's SYSTEM_PROMPT variable.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4}
                        className="text-xs border-0 resize-none focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Capabilities</label>
                      <div className="space-y-0.5">
                        {CAPABILITY_OPTIONS[projectType].map(cap => (
                          <label key={cap} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors text-ide-text hover:bg-ide-border/30">
                            <input type="checkbox" checked={capabilities.includes(cap)} onChange={() => toggleCapability(cap)}
                              className="rounded accent-ide-accent" />
                            {cap}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ── Mission Progress Bar ── */}
                    {(() => {
                      const config = extractConfigFromCode(files['main.py']);
                      const isAgent = projectType === 'agent';
                      const defaultName = isAgent ? 'Research Agent' : 'Spark';
                      const defaultTemp = isAgent ? 0.3 : 0.7;
                      const defaultStyle = isAgent ? 'Professional' : 'Friendly';
                      const missions = [
                        { emoji: '🏷️', name: 'Bot Name', done: config.botName !== defaultName && config.botName !== 'AI Bot' },
                        { emoji: '😀', name: 'Bot Emoji', done: config.botEmoji !== '🤖' && config.botEmoji !== '🧠' },
                        { emoji: '👋', name: 'Greeting Message', done: config.greeting !== '' },
                        { emoji: '✍️', name: 'Creator Name', done: config.creatorName !== '' && config.creatorName !== 'A FORGE Builder' },
                        { emoji: '🌡️', name: 'Temperature', done: config.temperature !== defaultTemp },
                        { emoji: '📝', name: 'Response Style', done: config.responseStyle !== defaultStyle && config.responseStyle !== 'Balanced' },
                        { emoji: '📏', name: 'Response Length', done: config.maxResponseLength !== 'medium' },
                        { emoji: '📋', name: 'Response Format', done: config.responseFormat !== '' },
                        { emoji: '📜', name: 'Conversation Rules', done: config.conversationRules.length > 0 },
                        { emoji: '💬', name: 'Conversation Starters', done: config.conversationStarters.length > 0 },
                        { emoji: '🥚', name: 'Easter Eggs', done: Object.keys(config.easterEggs).length > 0 },
                        { emoji: '🗣️', name: 'Catchphrases', done: config.catchphrases.length > 0 },
                        { emoji: '🚫', name: 'Blocked Topics', done: config.blockedTopics.length > 0 },
                        { emoji: '❓', name: 'Q&A Pairs', done: config.qaPairsFromCode.length > 0 },
                        { emoji: '📚', name: 'Knowledge Base', done: config.knowledgeBaseFromCode !== '' },
                        { emoji: '🔇', name: 'Forbidden Words', done: config.forbiddenWords.length > 0 },
                        { emoji: '🎭', name: 'Mood', done: config.mood !== 'neutral' },
                        { emoji: '🎨', name: 'Language Style', done: config.languageStyle !== 'casual' },
                        { emoji: '👋', name: 'Sign-off', done: config.signOff !== '' },
                        { emoji: '🧠', name: 'System Message', done: config.systemMessage !== '' },
                      ];
                      const completed = missions.filter(m => m.done).length;
                      const total = missions.length;
                      const pct = Math.round((completed / total) * 100);

                      return (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">
                            🎯 Mission Progress
                          </label>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-2 rounded-full bg-ide-border">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 100
                                    ? 'linear-gradient(90deg, #22C55E, #10B981)'
                                    : pct >= 50
                                    ? 'linear-gradient(90deg, #F7941D, #FFD700)'
                                    : 'linear-gradient(90deg, #5865F2, #7C8AFF)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-ide-accent whitespace-nowrap">
                              {completed}/{total}
                            </span>
                          </div>
                          <div className="space-y-0.5 max-h-40 overflow-y-auto">
                            {missions.map((m, i) => (
                              <div key={i} className={`flex items-center gap-1.5 text-[10px] py-0.5 ${m.done ? 'text-ide-green' : 'text-ide-text-muted'}`}>
                                <span className="w-4 text-center">{m.done ? '✅' : '⬜'}</span>
                                <span>{m.emoji} {m.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Resources Used</label>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-ide-text">
                          <span>AI Calls</span>
                          <span className="font-mono text-ide-accent">{aiCallCount}</span>
                        </div>
                        <div className="flex justify-between text-ide-text">
                          <span>Limit</span>
                          <span className="font-mono text-ide-text-muted">40 / session</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-ide-border mt-1">
                          <div className="h-full rounded-full bg-ide-accent transition-all" style={{ width: `${Math.min((aiCallCount / 40) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Knowledge Base Tab ── */}
                {configTab === 'knowledge' && (
                  <>
                    {/* Explainer card */}
                    <div className="bg-ide-accent/10 rounded-lg p-2.5 border border-ide-accent/20 mb-1">
                      <p className="text-[10px] text-ide-text leading-relaxed">
                        <strong className="text-ide-accent">📚 Teach Your AI</strong> — Add facts, notes, or Q&A pairs below. Your bot will use this data to answer questions in the Live Preview and deployed app.
                      </p>
                    </div>

                    {/* Knowledge Base */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block text-ide-text-muted">Knowledge Base</label>
                      <p className="text-[10px] text-ide-text-muted mb-1.5">Paste any text your bot should know — notes, formulas, facts.</p>
                      <Textarea 
                        value={knowledgeBase} 
                        onChange={e => setKnowledgeBase(e.target.value)} 
                        rows={5}
                        placeholder={"e.g.\nPythagoras theorem: a² + b² = c²\nIt applies to right-angled triangles.\n\nOhm's law: V = IR\nVoltage equals current times resistance."}
                        className="text-xs border-0 resize-none focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" 
                      />
                      {knowledgeBase ? (
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-ide-green">
                            <Check className="w-3 h-3" />
                            <span>{knowledgeBase.split(/\s+/).filter(Boolean).length} words loaded</span>
                          </div>
                          <button onClick={() => setKnowledgeBase('')} className="text-[10px] text-ide-text-muted hover:text-red-400 transition-colors">Clear</button>
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] text-ide-text-muted italic">No knowledge added yet</p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-ide-border/50" />

                    {/* Q&A Pairs */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ide-text-muted">Q&A Pairs</label>
                        <Button size="sm" variant="ghost" onClick={addQA} className="h-5 px-1.5 text-[10px] text-ide-accent hover:bg-ide-border/50">
                          <Plus className="w-3 h-3 mr-0.5" /> Add
                        </Button>
                      </div>
                      <p className="text-[10px] text-ide-text-muted mb-2">Add exact question → answer pairs for precise responses.</p>
                      
                      {qaData.length === 0 && (
                        <button onClick={addQA} className="w-full p-3 rounded-lg border-2 border-dashed border-ide-border text-ide-text-muted text-xs hover:border-ide-accent hover:text-ide-accent transition-colors">
                          + Add your first Q&A pair
                        </button>
                      )}

                      <div className="space-y-2">
                        {qaData.map((pair, idx) => (
                          <div key={idx} className="bg-ide-editor rounded-lg p-2 space-y-1.5 border border-ide-border/50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-ide-accent">Pair {idx + 1}</span>
                              <button onClick={() => removeQA(idx)} className="text-ide-text-muted hover:text-red-400">
                                <Minus className="w-3 h-3" />
                              </button>
                            </div>
                            <Input 
                              value={pair.q} 
                              onChange={e => updateQA(idx, 'q', e.target.value)}
                              placeholder="Q: What is Pythagoras theorem?"
                              className="h-7 text-[11px] border-0 bg-ide-bg text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent" 
                            />
                            <Input 
                              value={pair.a} 
                              onChange={e => updateQA(idx, 'a', e.target.value)}
                              placeholder="A: a² + b² = c² for right triangles"
                              className="h-7 text-[11px] border-0 bg-ide-bg text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status summary */}
                    {(knowledgeBase || qaData.some(p => p.q.trim())) && (
                      <div className="bg-ide-green/10 rounded-lg p-2.5 border border-ide-green/20">
                        <p className="text-[10px] text-ide-green font-medium">
                          ✅ Your bot has custom knowledge: {knowledgeBase ? `${knowledgeBase.split(/\s+/).filter(Boolean).length} words` : ''}
                          {knowledgeBase && qaData.filter(p => p.q.trim()).length > 0 ? ' + ' : ''}
                          {qaData.filter(p => p.q.trim()).length > 0 ? `${qaData.filter(p => p.q.trim()).length} Q&A pairs` : ''}
                        </p>
                        <p className="text-[10px] text-ide-text-muted mt-0.5">Test it in the Live Preview panel →</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Theme & Design Tab ── */}
                {configTab === 'theme' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block text-ide-text-muted">🎨 App Theme</label>
                      <p className="text-[10px] text-ide-text-muted mb-3">Choose a color theme for your deployed AI app.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {THEMES.map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme)}
                            className={`p-2 rounded-lg border-2 transition-all ${
                              selectedTheme.id === theme.id ? 'border-ide-accent' : 'border-ide-border hover:border-ide-text-muted'
                            }`}
                          >
                            <div className="w-full h-6 rounded-md mb-1" style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent}40)` }} />
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                            <span className="text-[9px] text-ide-text-muted mt-1 block">{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">📝 App Title</label>
                      <Input 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="My AI Assistant"
                        className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">👋 Welcome Message</label>
                      <Textarea 
                        value={welcomeMessage} 
                        onChange={e => setWelcomeMessage(e.target.value)}
                        rows={2}
                        placeholder="Hi! I'm your AI assistant. Ask me anything!"
                        className="text-xs border-0 resize-none focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">🖼️ Logo</label>
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Input 
                            value={logoUrl} 
                            onChange={e => setLogoUrl(e.target.value)}
                            placeholder="Paste URL or upload below"
                            className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent flex-1" 
                          />
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 500 * 1024) { toast.error('Logo must be under 500KB'); return; }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                setLogoUrl(dataUrl);
                                toast.success('Logo uploaded!');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => logoInputRef.current?.click()}
                            className="h-7 px-2 text-[10px] text-ide-accent hover:bg-ide-border/50"
                          >
                            Upload
                          </Button>
                        </div>
                        {logoUrl && (
                          <div className="flex items-center gap-2">
                            <img src={logoUrl} alt="Logo preview" className="w-8 h-8 rounded object-contain bg-ide-bg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-[10px] text-ide-green">Logo loaded</span>
                            <button onClick={() => setLogoUrl('')} className="text-[10px] text-ide-text-muted hover:text-red-400 ml-auto">Remove</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">💬 Quick Reply Buttons</label>
                      <p className="text-[10px] text-ide-text-muted mb-2">Preset questions visitors can click to start chatting.</p>
                      <div className="space-y-1.5">
                        {quickReplies.map((reply, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Input
                              value={reply}
                              onChange={e => {
                                const updated = [...quickReplies];
                                updated[idx] = e.target.value;
                                setQuickReplies(updated);
                              }}
                              placeholder={`Button ${idx + 1}`}
                              className="h-7 text-[11px] border-0 bg-ide-editor text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent"
                            />
                            <button onClick={() => setQuickReplies(prev => prev.filter((_, i) => i !== idx))} className="text-ide-text-muted hover:text-red-400 p-0.5">
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {quickReplies.length < 5 && (
                          <button onClick={() => setQuickReplies(prev => [...prev, ''])} className="w-full p-1.5 rounded border border-dashed border-ide-border text-ide-text-muted text-[10px] hover:border-ide-accent hover:text-ide-accent transition-colors">
                            + Add button
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block text-ide-text-muted">🧩 UI Widgets</label>
                      <div className="space-y-1.5">
                        {[
                          { id: 'welcome', label: 'Welcome Banner', desc: 'Show greeting at the top' },
                          { id: 'branding', label: 'Custom Header', desc: 'Logo + project name' },
                          { id: 'codeview', label: 'View Source Code', desc: 'Let visitors see your code' },
                        ].map(widget => (
                          <label key={widget.id} className="flex items-start gap-2 text-xs cursor-pointer p-2 rounded transition-colors text-ide-text hover:bg-ide-border/30 bg-ide-editor border border-ide-border/50">
                            <input 
                              type="checkbox" 
                              checked={enabledWidgets.includes(widget.id)}
                              onChange={() => {
                                setEnabledWidgets(prev => 
                                  prev.includes(widget.id) ? prev.filter(w => w !== widget.id) : [...prev, widget.id]
                                );
                              }}
                              className="rounded accent-ide-accent mt-0.5" 
                            />
                            <div>
                              <span className="font-medium block">{widget.label}</span>
                              <span className="text-[10px] text-ide-text-muted">{widget.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="bg-ide-accent/10 rounded-lg p-2.5 border border-ide-accent/20">
                      <p className="text-[10px] text-ide-text leading-relaxed">
                        <strong className="text-ide-accent">💡 Preview:</strong> Theme, welcome message, logo, and quick replies will appear in your deployed app. Go Live to see the result!
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* File Tabs */}
          <div className="flex items-center flex-shrink-0 h-9 bg-ide-sidebar border-b border-ide-border-subtle">
            <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)}
              className="h-8 w-8 ml-1 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
              <Settings className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-90' : ''}`} />
            </Button>
            <div className="h-4 w-px mx-1 bg-ide-border" />
            {FILE_TABS.map(tab => {
              const tabDirty = files[tab.id] !== (savedFiles[tab.id] ?? files[tab.id]);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFile(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors border-b-2 ${
                    activeFile === tab.id
                      ? 'bg-ide-editor text-ide-text border-ide-accent'
                      : 'text-ide-text-muted border-transparent hover:text-ide-text hover:bg-ide-border/30'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tabDirty && <span className="w-2 h-2 rounded-full bg-ide-orange ml-1" />}
                </button>
              );
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-1 pr-2">
              {isDirty ? (
                <>
                  <Circle className="w-2 h-2 fill-ide-orange text-ide-orange" />
                  <span className="text-[10px] text-ide-orange">Modified</span>
                </>
              ) : (
                <>
                  <Circle className="w-2 h-2 fill-ide-green text-ide-green" />
                  <span className="text-[10px] text-ide-text-muted">Ready</span>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleCopy}
                className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
                {copied ? <Check className="w-3 h-3 text-ide-green" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex min-h-0 bg-ide-editor">
            <div ref={lineNumberRef} className="w-12 flex-shrink-0 select-none bg-ide-gutter border-r border-ide-border pt-4" style={{ overflow: 'clip' }}>
              {lines.map((_, i) => (
                <div key={i} className="text-right pr-2 font-mono leading-6 text-[12px] text-ide-text-muted">{i + 1}</div>
              ))}
            </div>

            <div
              className="flex-1 min-w-0 overflow-auto"
              onScroll={(e) => {
                const scrollTop = (e.target as HTMLElement).scrollTop;
                if (lineNumberRef.current) {
                  lineNumberRef.current.style.transform = `translateY(-${scrollTop}px)`;
                }
              }}
            >
              <div className="relative" style={{ display: 'grid', gridTemplate: '"stack" 1fr / 1fr', minWidth: 'max-content' }}>
                {activeFile === 'main.py' && highlightedContent && (
                  <div
                    className="pt-4 pl-4 pr-4 font-mono text-[13px] leading-6 pointer-events-none whitespace-pre text-ide-text"
                    style={{ gridArea: 'stack' }}
                    aria-hidden="true"
                  >
                    {highlightedContent.map((line, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={files[activeFile]}
                  onChange={e => updateFile(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      const value = target.value;
                      const newValue = value.substring(0, start) + '    ' + value.substring(end);
                      updateFile(newValue);
                      requestAnimationFrame(() => {
                        target.selectionStart = target.selectionEnd = start + 4;
                      });
                    }
                  }}
                  spellCheck={false}
                  className={`resize-none font-mono text-[13px] pt-4 pl-4 pr-4 leading-6 focus:outline-none border-0 bg-transparent whitespace-pre ${
                    activeFile === 'main.py' ? 'text-transparent caret-ide-cursor' : 'text-ide-text'
                  }`}
                  style={{ gridArea: 'stack', minHeight: '100%' }}
                  placeholder="# Start coding..."
                />
              </div>
            </div>
          </div>

          {/* ── Combined Bottom Panel (Terminal + AI Mentor) ── */}
          <AnimatePresence>
            {showBottomPanel && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 180 }}
                exit={{ height: 0 }}
                className="overflow-hidden flex-shrink-0 flex flex-col border-t border-ide-border-subtle"
              >
                <div className="flex items-center px-2 bg-ide-sidebar border-b border-ide-border h-7 flex-shrink-0">
                  {[
                    { id: 'terminal' as BottomTab, icon: Terminal, label: 'Terminal', color: 'text-ide-green' },
                    { id: 'ai-mentor' as BottomTab, icon: Brain, label: 'AI Mentor (Pair Programmer)', color: 'text-ide-accent' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                        bottomTab === tab.id ? `${tab.color} bg-ide-bg` : 'text-ide-text-muted hover:text-ide-text'
                      }`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                      {tab.id === 'ai-mentor' && isAiLoading && <Loader2 className="w-3 h-3 animate-spin text-ide-accent" />}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={() => setShowBottomPanel(false)} className="text-ide-text-muted hover:text-ide-text p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 bg-ide-bg">
                  {bottomTab === 'terminal' ? (
                    <div className="font-mono text-xs text-ide-green space-y-0.5">
                      {terminalOutput.map((line, i) => <div key={i}>{line}</div>)}
                      {terminalOutput.length === 0 && <span className="text-ide-text-muted">$ Ready</span>}
                    </div>
                  ) : (
                    <div className="text-sm text-ide-text flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto">
                        {aiOutput ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{aiOutput}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-4 space-y-2">
                            <Brain className="w-8 h-8 mx-auto text-ide-accent/50" />
                            <p className="text-ide-text-muted text-xs">Your AI Mentor can see your code and will guide you — not build for you!</p>
                            <p className="text-ide-text-muted text-[10px] italic">Try: "How do I add a quiz feature?" or click Review above</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t border-ide-border flex-shrink-0">
                        <Input
                          value={mentorInput}
                          onChange={e => setMentorInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleMentorChat()}
                          placeholder="Ask your mentor... (they can see your code!)"
                          disabled={isAiLoading}
                          className="h-7 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent"
                        />
                        <Button size="sm" onClick={handleMentorChat} disabled={isAiLoading || !mentorInput.trim()}
                          className="h-7 px-2 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                          {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Live Preview / Chat */}
        <div className={`w-72 flex-col flex-shrink-0 border-l border-ide-border ${
          showMobilePreview ? 'flex fixed inset-0 z-40 w-full lg:relative lg:w-72' : showPreview ? 'hidden lg:flex' : 'hidden'
        }`} style={{ backgroundColor: selectedTheme.bg }}>
          <div className="px-3 py-2 flex items-center gap-2 border-b border-ide-border h-9 flex-shrink-0" style={{ backgroundColor: selectedTheme.chat }}>
            <Circle className="w-2 h-2" style={{ color: selectedTheme.accent, fill: selectedTheme.accent }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: selectedTheme.accent }}>Live Preview</span>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => { setShowMobilePreview(false); setShowPreview(false); }}
              className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50 lg:hidden">
              <X className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon"
              onClick={() => setChatMessages([{ role: 'system', content: '⚡ Preview cleared.' }])}
              className="h-6 w-6 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {(() => {
            const cfg = liveConfig;
            const codeKB = cfg.knowledgeBaseFromCode;
            const codeQA = cfg.qaPairsFromCode;
            const totalRules = cfg.conversationRules.length;
            const totalEggs = Object.keys(cfg.easterEggs).length;
            const totalStarters = cfg.conversationStarters.length;
            const totalCatchphrases = cfg.catchphrases.length;
            const totalBlocked = cfg.blockedTopics.length;
            const mergedQACount = qaData.filter(p => p.q.trim()).length + codeQA.length;
            
            // Type-aware defaults
            const isAgent = projectType === 'agent';
            const defaultName = isAgent ? 'Research Agent' : 'Spark';
            const defaultTemp = isAgent ? 0.3 : 0.7;
            const defaultStyle = isAgent ? 'Professional' : 'Friendly';
            const defaultPrompt = isAgent 
              ? 'You are an AI agent that can use tools to search the web, run calculations, and generate content.'
              : 'You are a helpful AI assistant that answers questions clearly and concisely.';
            
            const totalChallenges = 20;
            const activeCount = [
              cfg.botName !== defaultName && cfg.botName !== 'AI Bot',
              cfg.botEmoji !== '🤖' && cfg.botEmoji !== '🧠',
              cfg.greeting && cfg.greeting !== (isAgent ? "I'm your research agent. I can search, calculate, and analyse. Give me a task!" : "Hey there! I'm Spark, your AI buddy. Ask me anything!"),
              cfg.creatorName && cfg.creatorName !== 'A FORGE Builder',
              systemPrompt !== defaultPrompt,
              codeKB.trim() && codeKB !== (isAgent ? "Agents use a ReAct loop: Reason, Act, Observe.\nTools extend what an AI can do beyond just chatting.\nFORGE agents can search the web, do math, and look up facts." : "Python was created by Guido van Rossum in 1991.\nAI stands for Artificial Intelligence.\nFORGE is a platform where students build AI projects."),
              codeQA.length > 3,
              cfg.temperature !== defaultTemp,
              cfg.responseStyle !== defaultStyle,
              cfg.maxResponseLength !== 'medium',
              totalRules > 3,
              totalStarters > 4,
              totalEggs > (isAgent ? 2 : 3),
              totalCatchphrases > 3,
              totalBlocked > 2,
              cfg.forbiddenWords.length > 0,
              cfg.mood && cfg.mood !== 'neutral',
              cfg.examples.length > 0,
              cfg.languageStyle && cfg.languageStyle !== 'casual',
              cfg.signOff && cfg.signOff !== '',
            ].filter(Boolean).length;

            return (
              <div className="px-3 py-1.5 border-b border-ide-border/50 space-y-1" style={{ backgroundColor: selectedTheme.chat }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cfg.botEmoji}</span>
                  <span className="text-[11px] text-ide-text font-bold truncate">{cfg.botName}</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${selectedTheme.accent}33`, color: selectedTheme.accent }}>{activeCount}/{totalChallenges} challenges</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {codeKB.trim() && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-green/20 text-ide-green">📚 Knowledge</span>}
                  {mergedQACount > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-cyan/20 text-ide-cyan">💬 {mergedQACount} Q&A</span>}
                  {totalRules > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-yellow/20 text-ide-yellow">📏 {totalRules} rules</span>}
                  {totalEggs > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-purple/20 text-ide-purple">🥚 {totalEggs} eggs</span>}
                  {totalCatchphrases > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-orange/20 text-ide-orange">💬 phrases</span>}
                  {totalBlocked > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-ide-red/20 text-ide-red">🚫 blocked</span>}
                  {cfg.forbiddenWords.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">🚯 words</span>}
                  {cfg.mood && cfg.mood !== 'neutral' && <span className="text-[8px] px-1 py-0.5 rounded bg-pink-500/20 text-pink-400">🎭 {cfg.mood}</span>}
                  {cfg.examples.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-teal-500/20 text-teal-400">📝 examples</span>}
                  <span className="text-[8px] px-1 py-0.5 rounded bg-ide-border text-ide-text-muted">🌡️ {cfg.temperature}</span>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-ide-border text-ide-text-muted">✍️ {cfg.responseStyle}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length <= 1 && (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-ide-accent/10 flex items-center justify-center">
                  <span className="text-2xl">{liveConfig.botEmoji}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-ide-text mb-1">{liveConfig.botName}</p>
                  <p className="text-[10px] text-ide-text-muted">{liveConfig.greeting || 'Edit your code to configure this chatbot!'}</p>
                </div>
                <div className="space-y-1.5">
                  {(liveConfig.conversationStarters.length > 0
                    ? liveConfig.conversationStarters.slice(0, 4)
                    : ['Hello, who are you?', 'What can you help me with?', 'Tell me a fun fact']
                  ).map((example, index) => (
                    <button
                      key={`${example}-${index}`}
                      onClick={() => { handleChatSend(example); }}
                      className="block w-full text-left text-[11px] px-3 py-1.5 rounded bg-ide-border/30 text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'system'
                    ? 'bg-ide-border text-ide-text-muted italic'
                    : ''
                }`} style={
                  msg.role === 'user' 
                    ? { backgroundColor: selectedTheme.accent, color: '#fff' }
                    : msg.role === 'assistant'
                    ? { backgroundColor: `${selectedTheme.accent}18`, border: `1px solid ${selectedTheme.accent}30`, color: '#e2e8f0' }
                    : undefined
                }>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-xs max-w-none [&_p]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && chatMessages[chatMessages.length - 1]?.content === '...' && (
              <div className="flex justify-start">
                <div className="bg-ide-editor rounded-lg px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-ide-border space-y-2">
            <div className="flex gap-2">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Type a message..."
                disabled={isStreaming}
                className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
              <Button size="sm" onClick={() => handleChatSend()} disabled={isStreaming || !chatInput.trim()}
                className="h-8 px-3 flex-shrink-0 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <div className="pt-1 border-t border-ide-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ide-text-muted">Submit</span>
              <div className="flex gap-1.5 mt-1.5">
                <Button size="sm" variant="ghost"
                  onClick={handleGoLive}
                  className="h-6 flex-1 text-[10px] font-bold uppercase bg-gradient-to-r from-ide-green/20 to-ide-accent/20 text-ide-green hover:text-white hover:from-ide-green/40 hover:to-ide-accent/40 border border-ide-green/30">
                  <Send className="w-3 h-3 mr-1" /> Submit Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status / Action Bar ── */}
      <div className="flex items-center justify-between px-3 h-8 flex-shrink-0 bg-ide-sidebar border-t border-ide-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Circle className={`w-1.5 h-1.5 ${isDirty ? 'fill-ide-orange text-ide-orange' : 'fill-ide-green text-ide-green'}`} />
            <span className="text-[10px] font-mono text-ide-text-muted">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
          </div>
          <span className="text-[10px] font-mono text-ide-text-muted">{lines.length} lines</span>
          <span className="text-[10px] font-mono text-ide-text-muted">•</span>
          <span className="text-[10px] font-mono text-ide-text-muted">{activeFile}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => { setShowBottomPanel(v => !v); setBottomTab('terminal'); }}
            variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            <Terminal className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Terminal</span>
          </Button>
          <Button size="sm" onClick={() => { setTerminalOutput([]); toast.success('Terminal cleared'); }}
            variant="ghost" className="h-6 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50"
            title="Clear terminal">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={() => { setShowMobilePreview(true); setShowPreview(true); }}
            variant="ghost" className="h-6 text-[10px] lg:hidden text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={() => setShowPreview(v => !v)}
            variant="ghost" className="h-6 text-[10px] hidden lg:flex text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            {showPreview ? <PanelRightClose className="w-3 h-3 mr-1" /> : <PanelRightOpen className="w-3 h-3 mr-1" />}
            Preview
          </Button>
          <Button size="sm" onClick={handleRun} disabled={isRunning}
            className="h-6 text-[10px] font-bold uppercase tracking-wide bg-ide-border text-ide-text hover:bg-ide-selection border border-ide-border">
            {isRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <TestTube className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">Run Tests</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}
            className="h-6 text-[10px] font-bold uppercase tracking-wide bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
            {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">Save Checkpoint</span>
          </Button>
          <Button size="sm" onClick={handleGoLive}
            className="h-6 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-ide-green to-ide-accent text-ide-bg-deep hover:opacity-90">
            <Rocket className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Go Live</span>
          </Button>
        </div>
      </div>

      <PublishModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        code={files['main.py']}
        templateId={projectType}
        projectName={projectName}
        description={systemPrompt}
        prefillEmail={authorEmail}
        prefillAuthorName={authorName}
        currentProjectId={currentProjectId}
        onProjectIdUpdate={(id) => setCurrentProjectId(id)}
      />
    </div>
  );
};
