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
  PanelRightClose, PanelRightOpen, HelpCircle, Database, Palette, Plus, Minus, Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

import { ProjectType, PROJECT_SCAFFOLDS, CAPABILITY_OPTIONS } from './projectScaffolds';
import { ChallengeMissions } from './ChallengeMissions';
export type { ProjectType } from './projectScaffolds';

interface ProjectEditorProps {
  initialType?: ProjectType;
  initialCode?: string;
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

const CountdownWidget = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 1, m: 30, s: 0 });
  
  useEffect(() => {
    const stored = localStorage.getItem('forge-session-end');
    let endTime: number;
    if (stored) {
      endTime = parseInt(stored);
    } else {
      endTime = Date.now() + 90 * 60 * 1000;
      localStorage.setItem('forge-session-end', endTime.toString());
    }
    
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = timeLeft.h * 3600 + timeLeft.m * 60 + timeLeft.s;
  const isUrgent = totalSec < 600;
  const isWarning = totalSec < 1800 && !isUrgent;

  return (
    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
      isUrgent ? 'bg-red-500/25 border-red-400/60 text-red-300 animate-pulse' 
      : isWarning ? 'bg-amber-500/25 border-amber-400/50 text-amber-300'
      : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}</span>
    </div>
  );
};

export const ProjectEditor = ({ initialType, initialCode }: ProjectEditorProps) => {
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
    return stored || `student-${Math.random().toString(36).slice(2, 8)}@forge.local`;
  });
  const [authorName, setAuthorName] = useState(() => {
    const stored = localStorage.getItem('forge-student-name');
    return stored || `Student-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
  const [showMissionsModal, setShowMissionsModal] = useState(false);

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

  // Persist knowledge/QA/theme to localStorage
  useEffect(() => { localStorage.setItem('forge-knowledge-base', knowledgeBase); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('forge-qa-data', JSON.stringify(qaData)); }, [qaData]);
  useEffect(() => { localStorage.setItem('forge-theme', JSON.stringify(selectedTheme)); }, [selectedTheme]);
  useEffect(() => { localStorage.setItem('forge-welcome-msg', welcomeMessage); }, [welcomeMessage]);
  useEffect(() => { localStorage.setItem('forge-logo-url', logoUrl); }, [logoUrl]);
  useEffect(() => { localStorage.setItem('forge-quick-replies', JSON.stringify(quickReplies)); }, [quickReplies]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const prevSystemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    if (prevSystemPromptRef.current !== systemPrompt) {
      setFiles(prev => {
        const code = prev['main.py'];
        const regex = /SYSTEM_PROMPT\s*=\s*["'](.*)["']/;
        if (regex.test(code)) {
          const escaped = systemPrompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const updated = code.replace(regex, `SYSTEM_PROMPT = "${escaped}"`);
          return { ...prev, 'main.py': updated };
        }
        return prev;
      });
      prevSystemPromptRef.current = systemPrompt;
    }
  }, [systemPrompt]);

  useEffect(() => {
    const code = files['main.py'];
    const match = code.match(/SYSTEM_PROMPT\s*=\s*["'](.*)["']/);
    if (match && match[1] !== systemPrompt) {
      const unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
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
    prevSystemPromptRef.current = scaffold.systemPrompt;
    toast.success(`${scaffold.icon} Switched to ${scaffold.name}`);
    // Tier 1: Project Setup (10 pts, awarded once)
    if (authorEmail) {
      const setupKey = `forge-scored-project_setup-${authorEmail}`;
      if (!localStorage.getItem(setupKey)) {
        localStorage.setItem(setupKey, 'true');
        supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'project_setup', points: 10, metadata: { template: type } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
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
    setTerminalOutput(prev => [...prev, `$ python main.py  [${projectType}]`, '⏳ Running...']);
    setChatMessages(prev => [...prev, { role: 'system', content: '▶ Running tests...' }]);
    try {
      let result = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'run', systemPrompt, projectName, projectType },
        (text) => { 
          result = text; 
          setTerminalOutput(prev => {
            const updated = [...prev];
            // Replace the last '⏳ Running...' entry with streamed output
            const runningIdx = updated.lastIndexOf('⏳ Running...');
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
        setTerminalOutput(prev => [...prev, '───────────────────', '✅ Run complete']);
      }
      setChatMessages(prev => [...prev, { role: 'system', content: '✅ Tests complete!' }]);
      // Tier 2: First Successful Run (10 pts, awarded once)
      if (authorEmail) {
        const runKey = `forge-scored-first_run_success-${authorEmail}`;
        if (!localStorage.getItem(runKey)) {
          localStorage.setItem(runKey, 'true');
          supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'first_run_success', points: 10, metadata: { project: projectName } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
        }
      }
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `❌ Error: ${e.message}`, '', '💡 Tip: Check your code for syntax errors, or try again in a moment.']);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
    } finally { setIsRunning(false); }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    // Build history from current messages BEFORE adding new ones (to avoid stale closure)
    const history = chatMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content !== '...')
      .map(m => ({ role: m.role, content: m.content }));
    // Add the new user message to history
    history.push({ role: 'user', content: userMsg });
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    try {
      let assistantReply = '';
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...' }]);
      await streamFromEdgeFunction(
        { 
          code: userMsg, model: projectType, action: 'test-agent', systemPrompt, messages: history.slice(0, -1),
          knowledgeBase: knowledgeBase || undefined,
          qaData: qaData.filter(p => p.q.trim() && p.a.trim()).length > 0 ? qaData.filter(p => p.q.trim() && p.a.trim()) : undefined,
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
          .update({ project_name: projectName, description: systemPrompt, code: codePayload, template_id: projectType })
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
          <CountdownWidget />
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
                  { id: 'knowledge' as ConfigTab, icon: Database, label: 'Data' },
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

              <div className="flex-1 overflow-y-auto">

                {/* ── Settings Tab ── */}
                {configTab === 'settings' && (
                  <div className="p-3 space-y-4">
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
                  </div>
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
        <div className={`w-72 flex-col flex-shrink-0 bg-ide-sidebar border-l border-ide-border ${
          showMobilePreview ? 'flex fixed inset-0 z-40 w-full lg:relative lg:w-72' : showPreview ? 'hidden lg:flex' : 'hidden'
        }`}>
          <div className="px-3 py-2 flex items-center gap-2 border-b border-ide-border h-9 flex-shrink-0">
            <Circle className="w-2 h-2 fill-ide-green text-ide-green" />
            <span className="text-xs font-bold uppercase tracking-wider text-ide-text-muted">Live Preview</span>
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

          <div className="px-3 py-1.5 border-b border-ide-border/50 bg-ide-bg-deep">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-ide-accent flex-shrink-0" />
              <span className="text-[10px] text-ide-text-muted truncate">
                Prompt: <span className="text-ide-text italic">"{systemPrompt.slice(0, 50)}{systemPrompt.length > 50 ? '...' : ''}"</span>
              </span>
            </div>
            {(knowledgeBase || qaData.some(p => p.q.trim())) && (
              <div className="flex items-center gap-1 mt-1">
                <Database className="w-3 h-3 text-ide-green flex-shrink-0" />
                <span className="text-[10px] text-ide-green">
                  {knowledgeBase ? `${knowledgeBase.split(/\s+/).length} words` : ''}{knowledgeBase && qaData.some(p => p.q.trim()) ? ' + ' : ''}{qaData.filter(p => p.q.trim()).length > 0 ? `${qaData.filter(p => p.q.trim()).length} Q&A` : ''} loaded
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length <= 1 && (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-ide-accent/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-ide-accent" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ide-text mb-1">Test your AI here</p>
                  <p className="text-[10px] text-ide-text-muted">Your system prompt controls how the AI responds. Change it in Config and see the difference!</p>
                </div>
                <div className="space-y-1.5">
                  {['Hello, who are you?', 'What can you help me with?', 'Tell me a fun fact'].map(example => (
                    <button
                      key={example}
                      onClick={() => { setChatInput(example); }}
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
                  msg.role === 'user'
                    ? 'bg-ide-accent text-ide-bg-deep'
                    : msg.role === 'system'
                    ? 'bg-ide-border text-ide-text-muted italic'
                    : 'bg-ide-editor text-ide-text'
                }`}>
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
            {isStreaming && (
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

          <div className="p-2 border-t border-ide-border">
            <div className="flex gap-2 mb-2">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Type a message..."
                disabled={isStreaming}
                className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
              <Button size="sm" onClick={handleChatSend} disabled={isStreaming || !chatInput.trim()}
                className="h-8 px-3 flex-shrink-0 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Missions Button — below preview */}
          <div className="p-2 border-t border-ide-border flex gap-1.5">
            <Button size="sm" variant="ghost"
              onClick={() => setShowMissionsModal(true)}
              className="flex-1 h-8 text-[11px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 border border-amber-400/30">
              <Trophy className="w-3.5 h-3.5 mr-1.5" /> Missions
            </Button>
            <Button size="sm" variant="ghost"
              onClick={handleGoLive}
              className="flex-1 h-8 text-[11px] font-bold uppercase tracking-wide bg-ide-green/15 text-ide-green hover:bg-ide-green/25 hover:text-white border border-ide-green/30">
              <Send className="w-3.5 h-3.5 mr-1.5" /> Submit
            </Button>
          </div>

          {/* Missions Modal */}
          <AnimatePresence>
            {showMissionsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMissionsModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="w-[90vw] max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-ide-border bg-ide-sidebar shadow-2xl"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Challenge Missions
                    </h2>
                    <button onClick={() => setShowMissionsModal(false)} className="text-white/50 hover:text-white p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ChallengeMissions stages={scaffold.stages} code={files['main.py']} />
                  <div className="px-3 pb-3">
                    <Button size="sm"
                      onClick={() => { setShowMissionsModal(false); handleGoLive(); }}
                      className="w-full h-8 text-[11px] font-bold uppercase bg-gradient-to-r from-ide-green to-ide-accent text-ide-bg-deep hover:opacity-90">
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Project
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
