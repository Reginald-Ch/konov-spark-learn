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
  PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

export type ProjectType = 'chatbot' | 'voice-assistant' | 'agent';

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
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

if prompt := st.chat_input("Type your message..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    response = chain.predict(input=prompt)
    st.session_state.messages.append({"role": "assistant", "content": response})
    with st.chat_message("assistant"):
        st.write(response)
`,
    config: `{
  "project_type": "chatbot",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "system_prompt": "You are a helpful AI assistant.",
  "capabilities": {
    "web_search": false,
    "citations": false,
    "memory": true
  },
  "max_tokens": 1024
}`,
    requirements: `langchain==0.1.0
openai==1.12.0
streamlit==1.31.0
python-dotenv==1.0.0`,
  },
  'voice-assistant': {
    name: 'Voice Assistant',
    icon: '🎙️',
    systemPrompt: 'You are a voice assistant. Respond in short, spoken-friendly sentences.',
    capabilities: ['Speech-to-Text', 'Text-to-Speech', 'Memory'],
    main: `# 🎙️ Voice Assistant
# Speech-to-text + AI response + text-to-speech pipeline

import whisper
import openai
from gtts import gTTS
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

model = load_whisper()

# --- Streamlit UI ---
st.title("🎙️ Voice Assistant")
st.caption("Upload audio or type to interact")

# Audio upload
audio_file = st.file_uploader("Upload audio", type=["mp3", "wav", "m4a"])

if audio_file:
    # Transcribe
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name

    st.audio(audio_file)
    with st.spinner("Transcribing..."):
        result = model.transcribe(tmp_path)
        transcript = result["text"]

    st.success(f"📝 You said: {transcript}")

    # Get AI response
    with st.spinner("Thinking..."):
        response = openai.ChatCompletion.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript}
            ]
        )
        reply = response.choices[0].message.content

    st.info(f"🤖 Assistant: {reply}")

    # Text-to-speech
    tts = gTTS(text=reply, lang="en")
    tts_path = tmp_path.replace(".mp3", "_reply.mp3")
    tts.save(tts_path)
    st.audio(tts_path)

    os.unlink(tmp_path)
`,
    config: `{
  "project_type": "voice-assistant",
  "whisper_model": "tiny",
  "ai_model": "gpt-3.5-turbo",
  "system_prompt": "You are a voice assistant. Keep responses short.",
  "language": "en",
  "capabilities": {
    "speech_to_text": true,
    "text_to_speech": true,
    "memory": false
  }
}`,
    requirements: `openai-whisper==20231117
openai==1.12.0
gtts==2.5.1
streamlit==1.31.0
python-dotenv==1.0.0`,
  },
  agent: {
    name: 'AI Agent',
    icon: '🧠',
    systemPrompt: 'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    capabilities: ['Web Search', 'Calculator', 'Code Execution', 'Image Gen'],
    main: `# 🧠 AI Agent
# A tool-using agent that can search, calculate, and generate

from langchain.agents import initialize_agent, AgentType, Tool
from langchain.llms import OpenAI
from langchain.tools import DuckDuckGoSearchRun
from langchain.utilities import WikipediaAPIWrapper
import streamlit as st

# --- Configuration ---
MODEL_NAME = "gpt-3.5-turbo"
SYSTEM_PROMPT = "You are a helpful AI agent with access to tools."

# --- Define Tools ---
search = DuckDuckGoSearchRun()
wiki = WikipediaAPIWrapper()

def calculator(expression: str) -> str:
    """
    Evaluate a math expression safely.
    """
    try:
        result = eval(expression, {"__builtins__": {}})
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {str(e)}"

tools = [
    Tool(name="Web Search", func=search.run,
         description="Search the web for current information"),
    Tool(name="Wikipedia", func=wiki.run,
         description="Look up topics on Wikipedia"),
    Tool(name="Calculator", func=calculator,
         description="Calculate math expressions like '2+2' or '100*0.15'"),
]

# --- Initialize Agent ---
llm = OpenAI(model_name=MODEL_NAME, temperature=0)
agent = initialize_agent(
    tools, llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# --- Streamlit UI ---
st.title("🧠 AI Agent")
st.caption("I can search the web, look up Wikipedia, and calculate!")

if prompt := st.chat_input("Ask me to research, calculate, or find info..."):
    with st.spinner("Agent thinking..."):
        result = agent.run(prompt)
    st.write(result)
`,
    config: `{
  "project_type": "agent",
  "model": "gpt-3.5-turbo",
  "temperature": 0,
  "system_prompt": "You are a helpful AI agent with access to tools.",
  "tools": ["web_search", "wikipedia", "calculator"],
  "capabilities": {
    "web_search": true,
    "calculator": true,
    "code_execution": false,
    "image_generation": false
  }
}`,
    requirements: `langchain==0.1.0
openai==1.12.0
duckduckgo-search==4.4.3
wikipedia==1.4.0
streamlit==1.31.0
python-dotenv==1.0.0`,
  },
};

const CAPABILITY_OPTIONS: Record<ProjectType, string[]> = {
  chatbot: ['Web Search', 'Citations', 'Memory', 'Image Gen'],
  'voice-assistant': ['Speech-to-Text', 'Text-to-Speech', 'Memory', 'Translation'],
  agent: ['Web Search', 'Calculator', 'Code Execution', 'Image Gen'],
};

// Token-based Python syntax highlighter
interface Token {
  type: 'keyword' | 'builtin' | 'string' | 'comment' | 'decorator' | 'number' | 'operator' | 'text';
  value: string;
}

const KEYWORDS = new Set(['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'raise', 'pass', 'break', 'continue', 'global', 'async', 'await']);
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
      while (end < line.length && /\w/.test(line[end])) end++;
      const word = line.slice(i, end);
      if (KEYWORDS.has(word)) tokens.push({ type: 'keyword', value: word });
      else if (BUILTINS.has(word)) tokens.push({ type: 'builtin', value: word });
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
  text: 'text-ide-text',
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type FileTab = 'main.py' | 'config.json' | 'requirements.txt';
type BottomTab = 'terminal' | 'ai-mentor';

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
  const [authorEmail, setAuthorEmail] = useState('');
  const [aiCallCount, setAiCallCount] = useState(0);

  // Bottom panel
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');

  // AI mentor
  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);

  // Publish
  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  // Refs for keyboard shortcut handlers (fixes stale closure bug)
  const handleSaveRef = useRef<() => void>(() => {});
  const handleRunRef = useRef<() => void>(() => {});

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
      return fullText;
      setAiCallCount(prev => prev + 1);
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
        (text) => { result = text; }
      );
      setTerminalOutput(prev => [...prev, result]);
      setChatMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `❌ ${e.message}`]);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
      toast.error(e.message);
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
      await streamFromEdgeFunction(
        { code: userMsg, model: projectType, action: 'test-agent', systemPrompt },
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

  const handleSave = async () => {
    let emailToUse = authorEmail;
    if (!emailToUse) {
      emailToUse = prompt('Enter your email to save your project:') || '';
      if (!emailToUse) return;
      setAuthorEmail(emailToUse);
    }
    setIsSaving(true);
    try {
      if (currentProjectId) {
        const { error } = await supabase
          .from('ai_projects')
          .update({ project_name: projectName, description: systemPrompt, code: files['main.py'], template_id: projectType })
          .eq('id', currentProjectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ai_projects')
          .insert({ project_name: projectName, description: systemPrompt, code: files['main.py'], template_id: projectType, author_name: 'Student', author_email: emailToUse, is_published: false, points_earned: 0 })
          .select('id')
          .single();
        if (error) throw error;
        setCurrentProjectId(data?.id || null);
      }
      setSavedFiles({ ...files });
      setLastSaved(new Date().toLocaleTimeString());
      setTerminalOutput(prev => [...prev, `● All changes saved`]);
      toast.success('💾 Project saved!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    } finally { setIsSaving(false); }
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
    } catch (e: any) { toast.error(e.message); }
    finally { setIsAiLoading(false); setActiveAiAction(null); }
  };

  // Keep refs up to date for keyboard shortcuts
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleRunRef.current = handleRun; });

  // Keyboard shortcuts (uses refs to avoid stale closures)
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
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-3 h-10 flex-shrink-0 bg-ide-bg-deep border-b border-ide-border-subtle">
        <div className="flex items-center gap-2.5">
          <Code className="w-4 h-4 text-ide-accent" />
          <span className="font-semibold text-sm text-ide-text">Build Studio</span>
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

                {/* System Prompt */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-ide-text-muted">System Prompt</label>
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

          {/* Editor Area — CSS Grid overlay for synchronized scrolling */}
          <div className="flex-1 flex min-h-0 bg-ide-editor">
            {/* Line Numbers */}
            <div className="w-12 flex-shrink-0 overflow-hidden select-none bg-ide-gutter border-r border-ide-border pt-4">
              <div ref={lineNumberRef}>
                {lines.map((_, i) => (
                  <div key={i} className="text-right pr-2 font-mono leading-6 text-[12px] text-ide-text-muted">{i + 1}</div>
                ))}
              </div>
            </div>

            {/* Code area — grid stack so both layers share one scroll context */}
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
                    className="pt-4 pl-4 pr-4 font-mono text-[13px] leading-6 pointer-events-none whitespace-pre"
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
                    <div className="text-sm text-ide-text">
                      {aiOutput ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{aiOutput}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-ide-text-muted text-xs italic">Click Review, Explain, or Suggest to get AI feedback on your code.</span>
                      )}
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

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length <= 1 && (
              <div className="text-center py-6 space-y-3">
                <Bot className="w-10 h-10 mx-auto text-ide-text-muted opacity-50" />
                <p className="text-xs text-ide-text-muted">Test your AI by typing a message below</p>
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
              <span className="text-[9px] font-bold uppercase tracking-wider text-ide-text-muted">Pitch Controls</span>
              <div className="flex gap-1.5 mt-1.5">
                <Button size="sm" variant="ghost"
                  onClick={() => { toast.success('🔴 Live pitch mode — share your screen!'); }}
                  className="h-6 flex-1 text-[10px] font-bold uppercase bg-ide-red/15 text-ide-red hover:bg-ide-red/25 border border-ide-red/30">
                  <Circle className="w-2 h-2 fill-ide-red mr-1" /> Go Live
                </Button>
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
          <Button size="sm" onClick={() => setPublishOpen(true)}
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
      />
    </div>
  );
};
