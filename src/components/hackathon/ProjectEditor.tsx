import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PublishModal } from './PublishModal';
import { supabase } from '@/integrations/supabase/client';
import {
  Code, Play, Sparkles, Send, X, Copy, Check, Trash2,
  Rocket, Loader2, Save, Bot, Mic, Brain, ChevronDown,
  MessageSquare, Lightbulb, Settings, FileCode, FileJson, FileText,
  Circle, TestTube
} from 'lucide-react';
import { toast } from 'sonner';

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
    """Evaluate a math expression safely."""
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

// Simple Python syntax highlighting
const highlightPython = (code: string) => {
  const keywords = ['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'raise', 'pass', 'break', 'continue', 'global'];
  const builtins = ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'input', 'open', 'super', 'self'];

  return code.split('\n').map(line => {
    let highlighted = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Comments
    const commentIdx = highlighted.indexOf('#');
    if (commentIdx !== -1) {
      const before = highlighted.slice(0, commentIdx);
      const comment = highlighted.slice(commentIdx);
      highlighted = before + `<span class="text-[hsl(var(--discord-text-muted))] italic">${comment}</span>`;
      return highlighted;
    }

    // Strings (simple)
    highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="text-[hsl(var(--discord-green))]">$&</span>');
    // Keywords
    keywords.forEach(kw => {
      const re = new RegExp(`\\b(${kw})\\b`, 'g');
      highlighted = highlighted.replace(re, '<span class="text-[hsl(var(--discord-blurple))] font-semibold">$1</span>');
    });
    // Builtins
    builtins.forEach(b => {
      const re = new RegExp(`\\b(${b})\\b`, 'g');
      highlighted = highlighted.replace(re, '<span class="text-[hsl(var(--discord-yellow))]">$1</span>');
    });
    // Decorators
    highlighted = highlighted.replace(/(@\w+)/g, '<span class="text-[hsl(var(--discord-red))]">$1</span>');

    return highlighted;
  });
};

type FileTab = 'main.py' | 'config.json' | 'requirements.txt';

export const ProjectEditor = ({ initialType, initialCode }: ProjectEditorProps) => {
  const [projectType, setProjectType] = useState<ProjectType>(initialType || 'chatbot');
  const [projectName, setProjectName] = useState('My AI Project');
  const [systemPrompt, setSystemPrompt] = useState(PROJECT_SCAFFOLDS[initialType || 'chatbot'].systemPrompt);
  const [capabilities, setCapabilities] = useState<string[]>(PROJECT_SCAFFOLDS[initialType || 'chatbot'].capabilities);
  const [showConfig, setShowConfig] = useState(true);

  // File state
  const [activeFile, setActiveFile] = useState<FileTab>('main.py');
  const [files, setFiles] = useState({
    'main.py': initialCode || PROJECT_SCAFFOLDS[initialType || 'chatbot'].main,
    'config.json': PROJECT_SCAFFOLDS[initialType || 'chatbot'].config,
    'requirements.txt': PROJECT_SCAFFOLDS[initialType || 'chatbot'].requirements,
  });

  // Chat / preview state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '⚡ Project initialized. Click "Run Tests" or type a message to test your AI.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI mentor
  const [aiOutput, setAiOutput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);

  // Publish
  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // When project type changes, regenerate all files
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
    setAiOutput('');
    toast.success(`${scaffold.icon} Switched to ${scaffold.name}`);
  };

  const toggleCapability = (cap: string) => {
    setCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
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

  // Stream AI response helper
  const streamFromEdgeFunction = async (body: Record<string, unknown>, onChunk: (text: string) => void): Promise<string> => {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'AI service error' }));
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
          if (content) {
            fullText += content;
            onChunk(fullText);
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
    return fullText;
  };

  // Run Tests
  const handleRun = async () => {
    setIsRunning(true);
    setChatMessages(prev => [...prev, { role: 'system', content: '▶ Running tests...' }]);

    try {
      let result = '';
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action: 'run' },
        (text) => { result = text; }
      );
      setChatMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ ${e.message}` }]);
      toast.error(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Test agent with chat
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
    } finally {
      setIsStreaming(false);
    }
  };

  // Save project
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_projects' as any)
        .insert({
          project_name: projectName,
          description: systemPrompt,
          code: files['main.py'],
          template_id: projectType,
          author_name: 'Anonymous',
          author_email: 'anonymous@hackathon.com',
          is_published: false,
          points_earned: 0,
        });
      if (error) throw error;
      toast.success('💾 Project saved!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // AI mentor actions
  const handleAiAssist = async (action: string) => {
    if (!files['main.py'].trim()) {
      toast.error('Write some code first!');
      return;
    }
    setIsAiLoading(true);
    setActiveAiAction(action);
    setAiOutput('');

    try {
      await streamFromEdgeFunction(
        { code: files['main.py'], model: projectType, action },
        (text) => setAiOutput(text)
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAiLoading(false);
      setActiveAiAction(null);
    }
  };

  const scaffold = PROJECT_SCAFFOLDS[projectType];
  const lines = files[activeFile].split('\n');
  const highlightedLines = activeFile === 'main.py' ? highlightPython(files[activeFile]) : null;

  const FILE_TABS: { id: FileTab; icon: React.ElementType; label: string }[] = [
    { id: 'main.py', icon: FileCode, label: 'main.py' },
    { id: 'config.json', icon: FileJson, label: 'config.json' },
    { id: 'requirements.txt', icon: FileText, label: 'requirements.txt' },
  ];

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--discord-darker))]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--discord-dark))] border-b border-[hsl(var(--discord-light)/0.3)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
          <span className="font-bold text-sm text-white">Build Studio</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border border-[hsl(var(--discord-blurple)/0.3)]">
            {scaffold.icon} {scaffold.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* AI Mentor buttons */}
          <Button size="sm" onClick={() => handleAiAssist('review')} disabled={isAiLoading}
            className="h-7 text-xs bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white">
            {isAiLoading && activeAiAction === 'review' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            Review
          </Button>
          <Button size="sm" onClick={() => handleAiAssist('explain')} disabled={isAiLoading} variant="ghost"
            className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
            {isAiLoading && activeAiAction === 'explain' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
            Explain
          </Button>
          <Button size="sm" onClick={() => handleAiAssist('suggest')} disabled={isAiLoading} variant="ghost"
            className="h-7 text-xs text-[hsl(var(--discord-text))] hover:text-white hover:bg-[hsl(var(--discord-light))]">
            {isAiLoading && activeAiAction === 'suggest' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
            Suggest
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Configuration Sidebar */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-dark))] overflow-y-auto flex-shrink-0 flex flex-col"
            >
              <div className="p-3 space-y-4">
                {/* Project Name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-1.5 block">
                    Project Name
                  </label>
                  <Input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="h-8 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
                  />
                </div>

                {/* Project Type */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-1.5 block">
                    Project Type
                  </label>
                  <div className="space-y-1">
                    {([
                      { id: 'chatbot' as ProjectType, icon: Bot, label: '🤖 AI Chatbot', color: '#5865F2' },
                      { id: 'voice-assistant' as ProjectType, icon: Mic, label: '🎙️ Voice Assistant', color: '#F7941D' },
                      { id: 'agent' as ProjectType, icon: Brain, label: '🧠 AI Agent', color: '#00B894' },
                    ]).map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeChange(type.id)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                          projectType === type.id
                            ? 'bg-[hsl(var(--discord-blurple)/0.2)] border border-[hsl(var(--discord-blurple)/0.4)] text-white'
                            : 'hover:bg-[hsl(var(--discord-light)/0.4)] text-[hsl(var(--discord-text-muted))] border border-transparent'
                        }`}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="font-semibold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-1.5 block">
                    System Prompt
                  </label>
                  <Textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={4}
                    className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white resize-none"
                  />
                </div>

                {/* Capabilities */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] mb-1.5 block">
                    Capabilities
                  </label>
                  <div className="space-y-1">
                    {CAPABILITY_OPTIONS[projectType].map(cap => (
                      <label key={cap} className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text))] cursor-pointer hover:bg-[hsl(var(--discord-light)/0.2)] p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={capabilities.includes(cap)}
                          onChange={() => toggleCapability(cap)}
                          className="rounded border-[hsl(var(--discord-light))] accent-[hsl(var(--discord-blurple))]"
                        />
                        {cap}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File Tabs */}
          <div className="flex items-center bg-[hsl(var(--discord-dark)/0.5)] border-b border-[hsl(var(--discord-light)/0.2)] flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConfig(!showConfig)}
              className="h-8 w-8 text-[hsl(var(--discord-text-muted))] hover:text-white ml-1"
            >
              <Settings className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-90' : ''}`} />
            </Button>
            <div className="h-4 w-px bg-[hsl(var(--discord-light)/0.2)] mx-1" />
            {FILE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFile(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors border-b-2 ${
                  activeFile === tab.id
                    ? 'text-white border-[hsl(var(--discord-blurple))] bg-[hsl(var(--discord-darker))]'
                    : 'text-[hsl(var(--discord-text-muted))] border-transparent hover:text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)]'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-1 pr-2">
              <Circle className="w-2 h-2 fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))]" />
              <span className="text-[10px] text-[hsl(var(--discord-text-muted))]">Ready</span>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6 text-[hsl(var(--discord-text-muted))] hover:text-white">
                {copied ? <Check className="w-3 h-3 text-[hsl(var(--discord-green))]" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Editor Area with Line Numbers */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden">
            {/* Line Numbers */}
            <div className="w-12 bg-[hsl(var(--discord-darker))] border-r border-[hsl(var(--discord-light)/0.1)] overflow-hidden flex-shrink-0">
              <div className="p-2 pt-4">
                {lines.map((_, i) => (
                  <div key={i} className="text-[11px] font-mono text-[hsl(var(--discord-text-muted)/0.4)] text-right pr-2 leading-6 select-none">
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Highlighted Code (background layer) */}
            {activeFile === 'main.py' && highlightedLines && (
              <div
                className="absolute left-12 top-0 right-0 p-4 font-mono text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre"
                aria-hidden="true"
              >
                {highlightedLines.map((line, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                ))}
              </div>
            )}

            {/* Textarea (input layer) */}
            <textarea
              ref={textareaRef}
              value={files[activeFile]}
              onChange={e => updateFile(e.target.value)}
              spellCheck={false}
              className={`flex-1 resize-none bg-[hsl(var(--discord-darker))] font-mono text-sm p-4 leading-6 focus:outline-none placeholder:text-[hsl(var(--discord-text-muted)/0.5)] ${
                activeFile === 'main.py' ? 'text-transparent caret-white' : 'text-[hsl(var(--discord-text))]'
              }`}
              placeholder="// Start coding..."
            />
          </div>

          {/* AI Output Panel (below editor when active) */}
          <AnimatePresence>
            {aiOutput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 200, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-dark))] overflow-hidden"
              >
                <div className="px-3 py-1.5 text-[10px] font-mono text-[hsl(var(--discord-text-muted))] border-b border-[hsl(var(--discord-light)/0.1)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-[hsl(var(--discord-blurple))]" />
                    AI Mentor
                    {isAiLoading && <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--discord-blurple))]" />}
                  </div>
                  <button onClick={() => setAiOutput('')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3 overflow-y-auto h-[calc(100%-28px)] text-sm text-[hsl(var(--discord-text))]">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{aiOutput}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Live Preview / Chat */}
        <div className="w-80 border-l border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-dark))] flex flex-col flex-shrink-0 hidden lg:flex">
          <div className="px-3 py-2 border-b border-[hsl(var(--discord-light)/0.2)] flex items-center gap-2">
            <Play className="w-4 h-4 text-[hsl(var(--discord-green))]" />
            <span className="text-xs font-bold text-white">Live Preview</span>
            <div className="flex-1" />
            <Button
              variant="ghost" size="icon"
              onClick={() => setChatMessages([{ role: 'system', content: '⚡ Preview cleared.' }])}
              className="h-6 w-6 text-[hsl(var(--discord-text-muted))] hover:text-white"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === 'user'
                    ? 'bg-[hsl(var(--discord-blurple))] text-white'
                    : msg.role === 'system'
                    ? 'bg-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text-muted))] italic'
                    : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text))]'
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

          {/* Chat Input */}
          <div className="p-3 border-t border-[hsl(var(--discord-light)/0.2)]">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Ask your AI something..."
                disabled={isStreaming}
                className="h-8 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white"
              />
              <Button
                size="icon"
                onClick={handleChatSend}
                disabled={isStreaming || !chatInput.trim()}
                className="h-8 w-8 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] flex-shrink-0"
              >
                {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--discord-dark))] border-t border-[hsl(var(--discord-light)/0.3)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="h-8 text-xs font-bold bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1.5" />}
            Run Tests
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-bold bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Project
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="h-8 text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}
        >
          <Rocket className="w-3.5 h-3.5 mr-1.5" />
          Deploy to Production
        </Button>
      </div>

      {/* Publish Modal */}
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
