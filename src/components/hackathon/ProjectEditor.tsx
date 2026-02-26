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
  Rocket, Loader2, Save, Bot, Mic, Brain,
  MessageSquare, Lightbulb, Settings, FileCode, FileJson, FileText,
  Circle, TestTube, Terminal, ChevronUp, ChevronDown, Eye,
  PanelRightClose, PanelRightOpen, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

export type ProjectType = 'chatbot' | 'agent';

interface ProjectEditorProps {
  initialType?: ProjectType;
  initialCode?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const PROJECT_SCAFFOLDS: Record<ProjectType, { main: string; config: string; requirements: string; name: string; icon: string; systemPrompt: string; capabilities: string[] }> = {
  chatbot: {
    name: 'AI Chatbot',
    icon: '🤖',
    systemPrompt: 'You are a helpful AI assistant that answers questions clearly and concisely.',
    capabilities: ['Web Search', 'Citations', 'Memory'],
    main: `# 🤖 AI Chatbot
# A conversational AI that answers questions on any topic

from langchain.llms import OpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
import streamlit as st

# --- Configuration ---
MODEL_NAME = "gpt-3.5-turbo"
TEMPERATURE = 0.7
SYSTEM_PROMPT = "You are a helpful AI assistant."

# --- Initialize AI ---
llm = OpenAI(model_name=MODEL_NAME, temperature=TEMPERATURE)
memory = ConversationBufferMemory()
chain = ConversationChain(llm=llm, memory=memory)

# --- Streamlit UI ---
st.title("🤖 My AI Chatbot")
st.caption("Ask me anything!")

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

if prompt := st.chat_input("Type your message..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)
    
    response = chain.run(prompt)
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.chat_message("assistant").write(response)`,
    config: `{
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 500,
  "capabilities": ["web_search", "citations", "memory"]
}`,
    requirements: `streamlit>=1.28.0
langchain>=0.1.0
openai>=1.0.0`,
  },
  'voice-assistant': {
    name: 'Voice Assistant',
    icon: '🎙️',
    systemPrompt: 'You are a voice assistant. Respond in short, spoken-friendly sentences.',
    capabilities: ['Speech-to-Text', 'Text-to-Speech', 'Memory'],
    main: `# 🎙️ Voice Assistant
# A voice-powered AI assistant

import whisper
import openai
from gtts import gTTS
from pydub import AudioSegment
import streamlit as st
import tempfile
import os

# --- Configuration ---
WHISPER_MODEL = "tiny"
AI_MODEL = "gpt-3.5-turbo"
SYSTEM_PROMPT = "You are a voice assistant. Keep responses short and conversational."

# --- Load Whisper model ---
@st.cache_resource
def load_whisper():
    return whisper.load_model(WHISPER_MODEL)

# --- Streamlit UI ---
st.title("🎙️ Voice Assistant")
st.caption("Speak to interact with AI")

model = load_whisper()

audio_file = st.file_uploader("Upload audio", type=["wav", "mp3", "m4a"])

if audio_file:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name
    
    st.audio(audio_file)
    st.info("Transcribing...")
    
    result = model.transcribe(tmp_path)
    user_text = result["text"]
    st.write(f"**You said:** {user_text}")
    
    response = openai.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text}
        ]
    )
    
    ai_text = response.choices[0].message.content
    st.write(f"**AI:** {ai_text}")
    
    tts = gTTS(text=ai_text, lang='en')
    tts_path = tmp_path.replace('.wav', '_response.mp3')
    tts.save(tts_path)
    st.audio(tts_path)
    
    os.unlink(tmp_path)
    os.unlink(tts_path)`,
    config: `{
  "whisper_model": "tiny",
  "ai_model": "gpt-3.5-turbo",
  "language": "en",
  "capabilities": ["speech_to_text", "text_to_speech", "memory"]
}`,
    requirements: `streamlit>=1.28.0
openai>=1.0.0
openai-whisper>=20230918
gtts>=2.3.2
pydub>=0.25.1`,
  },
  agent: {
    name: 'AI Agent',
    icon: '🧠',
    systemPrompt: 'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    capabilities: ['Web Search', 'Calculator', 'Code Execution'],
    main: `# 🧠 AI Agent
# An autonomous AI agent with tool-use capabilities

from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
from langchain.tools import DuckDuckGoSearchResults, PythonREPLTool
from langchain.utilities import WikipediaAPIWrapper
import streamlit as st

# --- Configuration ---
MODEL_NAME = "gpt-3.5-turbo"
SYSTEM_PROMPT = "You are a helpful AI agent with access to tools."

# --- Define Tools ---
tools_list = [
    DuckDuckGoSearchResults(name="Web Search"),
    PythonREPLTool(name="Python Calculator"),
]

# --- Initialize Agent ---
llm = OpenAI(model_name=MODEL_NAME, temperature=0)
agent = initialize_agent(
    tools=tools_list,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    handle_parsing_errors=True,
)

# --- Streamlit UI ---
st.title("🧠 AI Agent")
st.caption("I can search the web, calculate, and more!")

if "history" not in st.session_state:
    st.session_state.history = []

for item in st.session_state.history:
    st.chat_message(item["role"]).write(item["content"])

if task := st.chat_input("Give me a task..."):
    st.session_state.history.append({"role": "user", "content": task})
    st.chat_message("user").write(task)
    
    with st.spinner("Thinking..."):
        result = agent.run(task)
    
    st.session_state.history.append({"role": "assistant", "content": result})
    st.chat_message("assistant").write(result)`,
    config: `{
  "model": "gpt-3.5-turbo",
  "temperature": 0,
  "agent_type": "zero_shot_react_description",
  "capabilities": ["web_search", "calculator", "code_execution"]
}`,
    requirements: `streamlit>=1.28.0
langchain>=0.1.0
openai>=1.0.0
duckduckgo-search>=3.9.0
wikipedia>=1.4.0`,
  },
};

const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Summarization'],
  'voice-assistant': ['Speech-to-Text', 'Text-to-Speech', 'Memory', 'Translation'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'File Reading'],
};

const KEYWORDS = new Set(['import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'with', 'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'yield', 'lambda', 'global', 'nonlocal', 'assert', 'del', 'True', 'False', 'None', 'async', 'await']);

// Token-based Python syntax highlighter
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

// Onboarding step definitions
const ONBOARDING_STEPS = [
  { target: 'config', title: '⚙️ Configure', description: 'Set your project type, system prompt, and capabilities. The system prompt controls how your AI responds.' },
  { target: 'editor', title: '💻 Write Code', description: 'Edit your Python code here. The syntax highlighter shows your code in color. Switch between files using the tabs.' },
  { target: 'preview', title: '💬 Test Your AI', description: 'Chat with your AI in real-time! Your system prompt controls how it responds. Try changing it and see the difference.' },
  { target: 'actions', title: '🚀 Save & Deploy', description: 'Run Tests to check your code, Save Checkpoint to keep your work, and Go Live to publish with a shareable URL!' },
];

export const ProjectEditor = ({ initialType, initialCode }: ProjectEditorProps) => {
  const isMobile = useIsMobile();
  const [projectType, setProjectType] = useState<ProjectType>(initialType || 'chatbot');
  const [projectName, setProjectName] = useState('My AI Project');
  const [systemPrompt, setSystemPrompt] = useState(PROJECT_SCAFFOLDS[initialType || 'chatbot'].systemPrompt);
  const [capabilities, setCapabilities] = useState<string[]>(PROJECT_SCAFFOLDS[initialType || 'chatbot'].capabilities);
  const [showConfig, setShowConfig] = useState(() => !isMobile && window.innerWidth >= 1024);
  const [showPreview, setShowPreview] = useState(!isMobile);

  // File state
  const [activeFile, setActiveFile] = useState<FileTab>('main.py');
  const [files, setFiles] = useState({
    'main.py': initialCode || PROJECT_SCAFFOLDS[initialType || 'chatbot'].main,
    'config.json': PROJECT_SCAFFOLDS[initialType || 'chatbot'].config,
    'requirements.txt': PROJECT_SCAFFOLDS[initialType || 'chatbot'].requirements,
  });

  // Dirty state tracking
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({});
  const isDirty = useMemo(() => {
    return Object.keys(files).some(key => files[key as FileTab] !== savedFiles[key]);
  }, [files, savedFiles]);

  // Chat / preview state
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

  // Bottom panel
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');

  // AI mentor
  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
  const [mentorInput, setMentorInput] = useState('');

  // Publish
  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Onboarding
  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    const seen = localStorage.getItem('buildstudio-onboarded');
    return seen ? null : 0;
  });

  // System prompt tooltip
  const [showPromptHelp, setShowPromptHelp] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  // Refs for keyboard shortcut handlers
  const handleSaveRef = useRef<() => void>(() => {});
  const handleRunRef = useRef<() => void>(() => {});

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── System Prompt ↔ Code Sync ──
  // When sidebar system prompt changes, update SYSTEM_PROMPT in main.py
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

  // When code SYSTEM_PROMPT changes (user edits code), sync back to sidebar
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
    prevSystemPromptRef.current = scaffold.systemPrompt;
    toast.success(`${scaffold.icon} Switched to ${scaffold.name}`);
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
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
      setAiCallCount(prev => prev + 1);
      return fullText;
    } finally { clearTimeout(timeout); }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setShowBottomPanel(true);
    setBottomTab('terminal');
    setTerminalOutput(prev => [...prev, '> Running tests...']);
    setChatMessages(prev => [...prev, { role: 'system', content: '▶ Running tests...' }]);
    try {
      let result = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'run' },
        (text) => { result = text; setTerminalOutput(prev => { const updated = [...prev]; updated[updated.length - 1] = result; return updated; }); }
      );
      setChatMessages(prev => [...prev, { role: 'system', content: '✅ Tests complete!' }]);
      // Award points for running tests
      if (authorEmail) {
        supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'run_tests', points: 1, metadata: { project: projectName } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
      }
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `❌ ${e.message}`]);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
    } finally { setIsRunning(false); }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    try {
      let assistantReply = '';
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...' }]);
      // Collect conversation history for context
      const history = chatMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      await streamFromEdgeFunction(
        { code: userMsg, model: projectType, action: 'test-agent', systemPrompt, messages: history },
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

  // ── Improved Save: inline email bar instead of prompt() ──
  const executeSave = async (email: string, name?: string) => {
    setIsSaving(true);
    try {
      if (currentProjectId) {
        const { error } = await supabase
          .from('ai_projects')
          .update({ project_name: projectName, description: systemPrompt, code: files['main.py'], template_id: projectType })
          .eq('id', currentProjectId)
          .eq('author_email', email);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description: systemPrompt, code: files['main.py'], template_id: projectType, author_name: name || authorName || 'Student', author_email: email, is_published: false, points_earned: 0 })
          .select('id')
          .single();
        if (error) throw error;
        setCurrentProjectId(data?.id || null);
      }
      setSavedFiles({ ...files });
      setLastSaved(new Date().toLocaleTimeString());
      setTerminalOutput(prev => [...prev, `● All changes saved`]);
      toast.success('💾 Project saved!');
      supabase.from('point_events').insert({ participant_email: email, event_type: 'save_checkpoint', points: 2, metadata: { project: projectName } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
    } catch (e) {
      console.error(e);
      toast.error('Failed to save. Please try again.');
    } finally { setIsSaving(false); }
  };

  const handleSave = async () => {
    // Persist identity to localStorage
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
        { code: files['main.py'], model: projectType, action },
        (text) => setAiOutput(text)
      );
      if (authorEmail) {
        supabase.from('point_events').insert({ participant_email: authorEmail, event_type: 'ai_mentor', points: 3, metadata: { action } } as any).then(({ error }) => { if (error) console.warn('point_events insert failed:', error); });
      }
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
    setAiOutput(prev => prev + '\n\n---\n\n**You:** ' + question + '\n\n');
    try {
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'review', systemPrompt: `The student asks: "${question}"\n\nReview their code and answer their question.` },
        (text) => setAiOutput(prev => {
          const parts = prev.split('---');
          const lastSection = parts.length > 1 ? parts.slice(0, -1).join('---') + '---\n\n**You:** ' + question + '\n\n' : '**You:** ' + question + '\n\n';
          return lastSection + text;
        })
      );
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); }
  };

  const handleGoLive = () => {
    localStorage.setItem('forge-student-email', authorEmail);
    localStorage.setItem('forge-student-name', authorName);
    setPublishOpen(true);
  };

  // Onboarding helpers
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

  // Keep refs up to date for keyboard shortcuts
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleRunRef.current = handleRun; });

  // Keyboard shortcuts
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

      {/* Email bar removed — identity is auto-generated */}

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-3 h-10 flex-shrink-0 bg-ide-bg-deep border-b border-ide-border-subtle">
        <div className="flex items-center gap-2.5">
          <Code className="w-4 h-4 text-ide-accent" />
          <span className="font-semibold text-sm text-ide-text">FORGE</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-ide-border text-ide-accent border border-ide-border">
            {scaffold.icon} {scaffold.name}
          </span>
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
              animate={{ width: isMobile ? '100%' : 220, opacity: 1 }}
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
              <div className="p-3 space-y-4">
                {/* Project Name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Name</label>
                  <Input value={projectName} onChange={e => setProjectName(e.target.value)}
                    className="h-8 text-xs border-0 focus-visible:ring-1 bg-ide-editor text-ide-text focus-visible:ring-ide-accent" />
                </div>

                {/* Project Type */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">Project Type</label>
                  <div className="space-y-1">
                    {([
                      { id: 'chatbot' as ProjectType, icon: Bot, label: '🤖 AI Chatbot', cls: 'text-ide-accent' },
                      { id: 'voice-assistant' as ProjectType, icon: Mic, label: '🎙️ Voice Assistant', cls: 'text-ide-yellow' },
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

                {/* System Prompt with help tooltip */}
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

                {/* Capabilities */}
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

                {/* Resources Used */}
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
            {/* Line Numbers */}
            <div className="w-12 flex-shrink-0 overflow-hidden select-none bg-ide-gutter border-r border-ide-border pt-4">
              <div ref={lineNumberRef}>
                {lines.map((_, i) => (
                  <div key={i} className="text-right pr-2 font-mono leading-6 text-[12px] text-ide-text-muted">{i + 1}</div>
                ))}
              </div>
            </div>

            {/* Code area */}
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
                {/* Highlighted Code Layer */}
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

                {/* Textarea */}
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
                animate={{ height: 160 }}
                exit={{ height: 0 }}
                className="overflow-hidden flex-shrink-0 flex flex-col border-t border-ide-border-subtle"
              >
                {/* Bottom Panel Tabs */}
                <div className="flex items-center px-2 bg-ide-sidebar border-b border-ide-border h-7 flex-shrink-0">
                  {[
                    { id: 'terminal' as BottomTab, icon: Terminal, label: 'Terminal', color: 'text-ide-green' },
                    { id: 'ai-mentor' as BottomTab, icon: Sparkles, label: 'AI Mentor', color: 'text-ide-accent' },
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

                {/* Panel Content */}
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
                          <span className="text-ide-text-muted text-xs italic">Click Review, Explain, or Suggest — or ask a question below.</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t border-ide-border flex-shrink-0">
                        <Input
                          value={mentorInput}
                          onChange={e => setMentorInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleMentorChat()}
                          placeholder="Ask the AI Mentor..."
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

          {/* Active prompt indicator */}
          <div className="px-3 py-1.5 border-b border-ide-border/50 bg-ide-bg-deep">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-ide-accent flex-shrink-0" />
              <span className="text-[10px] text-ide-text-muted truncate">
                Prompt: <span className="text-ide-text italic">"{systemPrompt.slice(0, 50)}{systemPrompt.length > 50 ? '...' : ''}"</span>
              </span>
            </div>
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
            {/* Typing indicator */}
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

          <div className="p-3 border-t border-ide-border space-y-2">
            <div className="flex gap-2">
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
            {/* Pitch Controls */}
            <div className="pt-1 border-t border-ide-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ide-text-muted">Share</span>
              <div className="flex gap-1.5 mt-1.5">
                <Button size="sm" variant="ghost"
                  onClick={() => {
                    const url = currentProjectId ? `${window.location.origin}/projects/${currentProjectId}` : window.location.href;
                    navigator.clipboard.writeText(url);
                    toast.success('Demo URL copied!');
                  }}
                  className="h-6 flex-1 text-[10px] font-bold uppercase bg-ide-border text-ide-text-muted hover:text-ide-text hover:bg-ide-border/70">
                  <Copy className="w-3 h-3 mr-1" /> Copy URL
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
          {/* Mobile preview toggle */}
          <Button size="sm" onClick={() => { setShowMobilePreview(true); setShowPreview(true); }}
            variant="ghost" className="h-6 text-[10px] lg:hidden text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50">
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          {/* Desktop preview toggle */}
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
