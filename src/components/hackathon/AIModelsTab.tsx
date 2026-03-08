import { useState, useRef, useCallback, forwardRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Bot, Cpu, Sparkles, Zap, Send, Loader2, CheckCircle2, Code, 
  ChevronRight, ChevronDown, Plus, X, Trash2, Play, MessageSquare,
  User, Shield, BookOpen, Palette, Settings, Wand2, ArrowRight, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AIModelsTabProps {
  onViewCode: (code: string) => void;
}

type BuilderType = 'chatbot' | 'agent' | null;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  fields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'list' | 'dict' | 'qa-list' | 'toggle';
  placeholder?: string;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

// Default config values
const DEFAULT_CHATBOT_CONFIG: Record<string, any> = {
  BOT_NAME: 'Spark',
  BOT_EMOJI: '🤖',
  AI_MESSAGE: "Hey there! I'm Spark, your AI buddy. Ask me anything!",
  CREATOR_NAME: 'A FORGE Builder',
  SYSTEM_MESSAGE: 'You are a helpful AI assistant that answers questions clearly and concisely.',
  KNOWLEDGE_BASE: '',
  QA_PAIRS: [],
  TEMPERATURE: 0.7,
  RULES: [],
  CONVERSATION_STARTERS: ['Tell me about yourself', 'What can you help me with?'],
  FORBIDDEN_WORDS: [],
  BLOCKED_TOPICS: [],
  FEW_SHOT_EXAMPLES: [],
  SECRET_RESPONSES: {},
  RESPONSE_STYLE: 'Friendly',
  MAX_RESPONSE_LENGTH: 'medium',
  MAX_TOKENS: 512,
  MOOD: 'neutral',
  LANGUAGE_STYLE: 'casual',
  CATCHPHRASES: [],
};

const DEFAULT_AGENT_CONFIG: Record<string, any> = {
  BOT_NAME: 'Research Agent',
  BOT_EMOJI: '🧠',
  AI_MESSAGE: "Hi! I'm your Research Agent. I can search, calculate, and look things up!",
  CREATOR_NAME: 'A FORGE Builder',
  SYSTEM_MESSAGE: 'You are a research agent that uses tools to find accurate answers.',
  KNOWLEDGE_BASE: '',
  QA_PAIRS: [
    { q: 'What tools do you have?', a: 'I can search the web, do calculations, and look up Wikipedia!' }
  ],
  TEMPERATURE: 0.3,
  RULES: ['Always cite your sources', 'Use tools before guessing', 'Be precise and factual'],
  CONVERSATION_STARTERS: ['Search for something', 'Calculate a math problem', 'Look up a topic'],
  FORBIDDEN_WORDS: [],
  BLOCKED_TOPICS: [],
  FEW_SHOT_EXAMPLES: [],
  SECRET_RESPONSES: {},
  RESPONSE_STYLE: 'Professional',
  MAX_RESPONSE_LENGTH: 'medium',
  MAX_TOKENS: 512,
  MOOD: 'neutral',
  LANGUAGE_STYLE: 'formal',
  CATCHPHRASES: [],
  TOOLS: ['Search', 'Calculator', 'Wikipedia'],
  MAX_ITERATIONS: 5,
  VERBOSE: true,
};

const CHATBOT_SECTIONS: ConfigSection[] = [
  {
    id: 'identity', title: 'Identity', icon: <User className="w-4 h-4" />, color: '#5865F2',
    fields: [
      { key: 'BOT_NAME', label: 'Bot Name', type: 'text', placeholder: 'Spark' },
      { key: 'BOT_EMOJI', label: 'Avatar Emoji', type: 'text', placeholder: '🤖' },
      { key: 'CREATOR_NAME', label: 'Creator Name', type: 'text', placeholder: 'Your name' },
      { key: 'AI_MESSAGE', label: 'Greeting Message', type: 'textarea', placeholder: 'First message users see...' },
    ]
  },
  {
    id: 'personality', title: 'Personality', icon: <Sparkles className="w-4 h-4" />, color: '#F59E0B',
    fields: [
      { key: 'SYSTEM_MESSAGE', label: 'System Prompt (Personality)', type: 'textarea', placeholder: 'You are a helpful AI that...', hint: 'This is your bot\'s brain — describe who it is and how it behaves' },
      { key: 'MOOD', label: 'Mood', type: 'select', options: ['cheerful', 'serious', 'sarcastic', 'mysterious', 'energetic', 'calm', 'neutral'] },
      { key: 'LANGUAGE_STYLE', label: 'Language Style', type: 'select', options: ['casual', 'formal', 'academic', 'slang', 'poetic', 'storyteller'] },
      { key: 'RESPONSE_STYLE', label: 'Response Style', type: 'select', options: ['Concise', 'Detailed', 'Friendly', 'Professional', 'Balanced'] },
    ]
  },
  {
    id: 'knowledge', title: 'Knowledge & Q&A', icon: <BookOpen className="w-4 h-4" />, color: '#10B981',
    fields: [
      { key: 'KNOWLEDGE_BASE', label: 'Knowledge Base', type: 'textarea', placeholder: 'TOPIC: Python Programming\n- Created by Guido van Rossum\n- Used for AI, web dev, data science', hint: 'Facts your bot should know' },
      { key: 'QA_PAIRS', label: 'Q&A Pairs', type: 'qa-list', hint: 'Exact question-answer pairs' },
      { key: 'FEW_SHOT_EXAMPLES', label: 'Few-Shot Examples', type: 'qa-list', hint: 'Teaching examples (input → output)' },
    ]
  },
  {
    id: 'rules', title: 'Rules & Safety', icon: <Shield className="w-4 h-4" />, color: '#EF4444',
    fields: [
      { key: 'RULES', label: 'Conversation Rules', type: 'list', placeholder: 'Always be friendly and encouraging' },
      { key: 'FORBIDDEN_WORDS', label: 'Forbidden Words', type: 'list', placeholder: 'stupid' },
      { key: 'BLOCKED_TOPICS', label: 'Blocked Topics', type: 'list', placeholder: 'violence' },
    ]
  },
  {
    id: 'style', title: 'Style & Features', icon: <Palette className="w-4 h-4" />, color: '#8B5CF6',
    fields: [
      { key: 'CONVERSATION_STARTERS', label: 'Conversation Starters', type: 'list', placeholder: 'Tell me about yourself' },
      { key: 'CATCHPHRASES', label: 'Catchphrases', type: 'list', placeholder: 'Fun fact!' },
      { key: 'SECRET_RESPONSES', label: 'Secret Responses (Easter Eggs)', type: 'dict', hint: 'Trigger phrase → response' },
    ]
  },
  {
    id: 'settings', title: 'Model Settings', icon: <Settings className="w-4 h-4" />, color: '#6B7280',
    fields: [
      { key: 'TEMPERATURE', label: 'Creativity (Temperature)', type: 'number', min: 0, max: 1, step: 0.1 },
      { key: 'MAX_TOKENS', label: 'Max Tokens', type: 'number', min: 50, max: 2048, step: 50 },
      { key: 'MAX_RESPONSE_LENGTH', label: 'Response Length', type: 'select', options: ['short', 'medium', 'long'] },
    ]
  },
];

const AGENT_SECTIONS: ConfigSection[] = [
  {
    id: 'identity', title: 'Agent Identity', icon: <Cpu className="w-4 h-4" />, color: '#5865F2',
    fields: [
      { key: 'BOT_NAME', label: 'Agent Name', type: 'text', placeholder: 'Research Agent' },
      { key: 'BOT_EMOJI', label: 'Avatar Emoji', type: 'text', placeholder: '🧠' },
      { key: 'CREATOR_NAME', label: 'Creator Name', type: 'text', placeholder: 'Your name' },
      { key: 'AI_MESSAGE', label: 'Greeting Message', type: 'textarea', placeholder: 'First message users see...' },
    ]
  },
  {
    id: 'personality', title: 'Agent Brain', icon: <Brain className="w-4 h-4" />, color: '#F59E0B',
    fields: [
      { key: 'SYSTEM_MESSAGE', label: 'System Prompt (Agent Instructions)', type: 'textarea', placeholder: 'You are a research agent that uses tools to...', hint: 'Describe what your agent does and how it thinks' },
      { key: 'MOOD', label: 'Mood', type: 'select', options: ['cheerful', 'serious', 'sarcastic', 'mysterious', 'energetic', 'calm', 'neutral'] },
      { key: 'LANGUAGE_STYLE', label: 'Language Style', type: 'select', options: ['casual', 'formal', 'academic', 'slang', 'poetic', 'storyteller'] },
      { key: 'RESPONSE_STYLE', label: 'Response Style', type: 'select', options: ['Concise', 'Detailed', 'Friendly', 'Professional', 'Balanced'] },
    ]
  },
  {
    id: 'tools', title: 'Agent Tools', icon: <Wand2 className="w-4 h-4" />, color: '#06B6D4',
    fields: [
      { key: 'TOOLS', label: 'Available Tools', type: 'list', placeholder: 'Search', hint: 'Tools your agent can use (Search, Calculator, Wikipedia, etc.)' },
      { key: 'MAX_ITERATIONS', label: 'Max Reasoning Steps', type: 'number', min: 1, max: 10, step: 1 },
      { key: 'VERBOSE', label: 'Show Thought Process', type: 'toggle' },
    ]
  },
  {
    id: 'knowledge', title: 'Knowledge & Q&A', icon: <BookOpen className="w-4 h-4" />, color: '#10B981',
    fields: [
      { key: 'KNOWLEDGE_BASE', label: 'Knowledge Base', type: 'textarea', placeholder: 'Facts your agent should know...', hint: 'Domain knowledge for your agent' },
      { key: 'QA_PAIRS', label: 'Q&A Pairs', type: 'qa-list', hint: 'Pre-defined question-answer pairs' },
    ]
  },
  {
    id: 'rules', title: 'Rules & Safety', icon: <Shield className="w-4 h-4" />, color: '#EF4444',
    fields: [
      { key: 'RULES', label: 'Agent Rules', type: 'list', placeholder: 'Always cite your sources' },
      { key: 'FORBIDDEN_WORDS', label: 'Forbidden Words', type: 'list', placeholder: 'stupid' },
      { key: 'BLOCKED_TOPICS', label: 'Blocked Topics', type: 'list', placeholder: 'violence' },
    ]
  },
  {
    id: 'style', title: 'Style & Features', icon: <Palette className="w-4 h-4" />, color: '#8B5CF6',
    fields: [
      { key: 'CONVERSATION_STARTERS', label: 'Conversation Starters', type: 'list', placeholder: 'Search for something' },
      { key: 'CATCHPHRASES', label: 'Catchphrases', type: 'list', placeholder: 'Let me think...' },
      { key: 'SECRET_RESPONSES', label: 'Secret Responses', type: 'dict', hint: 'Hidden trigger → response pairs' },
    ]
  },
  {
    id: 'settings', title: 'Model Settings', icon: <Settings className="w-4 h-4" />, color: '#6B7280',
    fields: [
      { key: 'TEMPERATURE', label: 'Creativity (Temperature)', type: 'number', min: 0, max: 1, step: 0.1 },
      { key: 'MAX_TOKENS', label: 'Max Tokens', type: 'number', min: 50, max: 2048, step: 50 },
      { key: 'MAX_RESPONSE_LENGTH', label: 'Response Length', type: 'select', options: ['short', 'medium', 'long'] },
    ]
  },
];

export const AIModelsTab = forwardRef(function AIModelsTab({ onViewCode }: AIModelsTabProps, ref: React.Ref<HTMLDivElement>) {
  const [builderType, setBuilderType] = useState<BuilderType>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identity']));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sections = builderType === 'agent' ? AGENT_SECTIONS : CHATBOT_SECTIONS;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const selectType = (type: BuilderType) => {
    setBuilderType(type);
    setConfig(type === 'agent' ? { ...DEFAULT_AGENT_CONFIG } : { ...DEFAULT_CHATBOT_CONFIG });
    setChatMessages([]);
    setExpandedSections(new Set(['identity']));
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Count completed fields
  const getCompletionCount = () => {
    const defaults = builderType === 'agent' ? DEFAULT_AGENT_CONFIG : DEFAULT_CHATBOT_CONFIG;
    let completed = 0;
    let total = 0;
    for (const section of sections) {
      for (const field of section.fields) {
        total++;
        const val = config[field.key];
        const def = defaults[field.key];
        if (JSON.stringify(val) !== JSON.stringify(def) && val !== undefined && val !== '' && 
            !(Array.isArray(val) && val.length === 0) && !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
          completed++;
        }
      }
    }
    return { completed, total };
  };

  // Build system prompt from config
  const buildSystemPrompt = () => {
    let prompt = config.SYSTEM_MESSAGE || 'You are a helpful AI assistant.';
    if (config.KNOWLEDGE_BASE) prompt += `\n\nKnowledge:\n${config.KNOWLEDGE_BASE}`;
    if (config.RULES?.length) prompt += `\n\nRules:\n${config.RULES.map((r: string) => `- ${r}`).join('\n')}`;
    if (config.MOOD && config.MOOD !== 'neutral') prompt += `\nMood: ${config.MOOD}`;
    if (config.LANGUAGE_STYLE && config.LANGUAGE_STYLE !== 'casual') prompt += `\nStyle: ${config.LANGUAGE_STYLE}`;
    if (config.CATCHPHRASES?.length) prompt += `\nNaturally use these phrases: ${config.CATCHPHRASES.join(', ')}`;
    if (config.FORBIDDEN_WORDS?.length) prompt += `\nNever use these words: ${config.FORBIDDEN_WORDS.join(', ')}`;
    if (config.BLOCKED_TOPICS?.length) prompt += `\nRefuse to discuss: ${config.BLOCKED_TOPICS.join(', ')}`;
    if (config.RESPONSE_STYLE) prompt += `\nResponse style: ${config.RESPONSE_STYLE}`;
    if (config.MAX_RESPONSE_LENGTH) prompt += `\nResponse length: ${config.MAX_RESPONSE_LENGTH}`;
    if (builderType === 'agent' && config.TOOLS?.length) {
      prompt += `\n\nYou are an AI agent with access to these tools: ${config.TOOLS.join(', ')}. Show your reasoning process step by step.`;
    }
    if (config.FEW_SHOT_EXAMPLES?.length) {
      prompt += '\n\nExamples of how to respond:';
      config.FEW_SHOT_EXAMPLES.forEach((ex: any) => {
        prompt += `\nUser: ${ex.q || ex.input}\nAssistant: ${ex.a || ex.output}`;
      });
    }
    return prompt;
  };

  // Chat with the AI using the visual config
  const handleChatSend = async (message?: string) => {
    const text = message || chatInput.trim();
    if (!text || isStreaming) return;
    setChatInput('');

    // Check secret responses first
    if (config.SECRET_RESPONSES) {
      const lower = text.toLowerCase();
      for (const [trigger, response] of Object.entries(config.SECRET_RESPONSES)) {
        if (lower === trigger.toLowerCase()) {
          setChatMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: response as string }]);
          return;
        }
      }
    }

    // Check QA pairs
    if (config.QA_PAIRS?.length) {
      const lower = text.toLowerCase();
      for (const pair of config.QA_PAIRS) {
        if (lower.includes((pair.q || '').toLowerCase()) && (pair.q || '').length > 2) {
          setChatMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: pair.a }]);
          return;
        }
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const history = [...chatMessages, userMsg].map(m => ({
        role: m.role === 'user' ? 'human' : 'assistant',
        content: m.content
      }));

      const resp = await fetch(`${supabaseUrl}/functions/v1/python-ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          action: 'test-agent',
          code: `SYSTEM_MESSAGE = """${buildSystemPrompt()}"""`,
          message: text,
          messages: history,
          config: {
            temperature: config.TEMPERATURE || 0.7,
            max_tokens: config.MAX_TOKENS || 512,
            bot_name: config.BOT_NAME,
          }
        }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error('AI request failed');

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '') continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || parsed.token || parsed.chunk || '';
            if (content) {
              assistantText += content;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText }];
              });
            }
          } catch {
            // If not SSE, treat entire response as text
            if (!assistantText && jsonStr) {
              try {
                const obj = JSON.parse(buffer + line);
                if (obj.response || obj.output) {
                  assistantText = obj.response || obj.output;
                }
              } catch {}
            }
          }
        }
      }

      // Handle non-streaming response
      if (!assistantText && buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          assistantText = obj.response || obj.output || obj.message || buffer;
        } catch {
          assistantText = buffer;
        }
      }

      if (assistantText && !chatMessages.find(m => m.content === assistantText)) {
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') return prev;
          return [...prev, { role: 'assistant', content: assistantText }];
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Try again!' }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  // Generate Python code from the visual config
  const generatePythonCode = () => {
    const isAgent = builderType === 'agent';
    const escapePy = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const listToPy = (arr: any[]) => arr.length === 0 ? '[]' : `[\n${arr.map(i => `    "${escapePy(String(i))}",`).join('\n')}\n]`;
    const dictToPy = (obj: Record<string, string>) => {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      return `{\n${entries.map(([k, v]) => `    "${escapePy(k)}": "${escapePy(v)}",`).join('\n')}\n}`;
    };
    const qaPairsToPy = (pairs: any[]) => {
      if (pairs.length === 0) return '[]';
      return `[\n${pairs.map(p => `    {"q": "${escapePy(p.q || '')}", "a": "${escapePy(p.a || '')}"},`).join('\n')}\n]`;
    };

    let code = `#!/usr/bin/env python3
"""
${isAgent ? '🧠' : '🤖'} FORGE ${isAgent ? 'AI Agent' : 'AI Chatbot'} — Built with Visual Builder
${'='.repeat(50)}
Generated from your visual configuration.
Edit any variable below to customize further!
"""

# ═══════════════ IDENTITY ═══════════════
BOT_NAME = "${escapePy(config.BOT_NAME || '')}"
BOT_EMOJI = "${config.BOT_EMOJI || (isAgent ? '🧠' : '🤖')}"
AI_MESSAGE = "${escapePy(config.AI_MESSAGE || '')}"
CREATOR_NAME = "${escapePy(config.CREATOR_NAME || '')}"

# ═══════════════ PERSONALITY ═══════════════
SYSTEM_MESSAGE = """${config.SYSTEM_MESSAGE || ''}"""
MOOD = "${config.MOOD || 'neutral'}"
LANGUAGE_STYLE = "${config.LANGUAGE_STYLE || 'casual'}"
RESPONSE_STYLE = "${config.RESPONSE_STYLE || 'Friendly'}"

# ═══════════════ KNOWLEDGE ═══════════════
KNOWLEDGE_BASE = """${config.KNOWLEDGE_BASE || ''}"""
QA_PAIRS = ${qaPairsToPy(config.QA_PAIRS || [])}
FEW_SHOT_EXAMPLES = ${qaPairsToPy(config.FEW_SHOT_EXAMPLES || [])}

# ═══════════════ RULES & SAFETY ═══════════════
RULES = ${listToPy(config.RULES || [])}
FORBIDDEN_WORDS = ${listToPy(config.FORBIDDEN_WORDS || [])}
BLOCKED_TOPICS = ${listToPy(config.BLOCKED_TOPICS || [])}

# ═══════════════ STYLE & FEATURES ═══════════════
CONVERSATION_STARTERS = ${listToPy(config.CONVERSATION_STARTERS || [])}
CATCHPHRASES = ${listToPy(config.CATCHPHRASES || [])}
SECRET_RESPONSES = ${dictToPy(config.SECRET_RESPONSES || {})}

# ═══════════════ MODEL SETTINGS ═══════════════
TEMPERATURE = ${config.TEMPERATURE ?? 0.7}
MAX_TOKENS = ${config.MAX_TOKENS ?? 512}
MAX_RESPONSE_LENGTH = "${config.MAX_RESPONSE_LENGTH || 'medium'}"
`;

    if (isAgent) {
      code += `
# ═══════════════ AGENT TOOLS ═══════════════
TOOLS = ${listToPy(config.TOOLS || [])}
MAX_ITERATIONS = ${config.MAX_ITERATIONS ?? 5}
VERBOSE = ${config.VERBOSE ? 'True' : 'False'}
`;
    }

    code += `
# ═══════════════ BONUS ═══════════════
SIGN_OFF = ""
FOLLOW_UP_QUESTIONS = True
MEMORY_ENABLED = True
ERROR_MESSAGE = "Oops! Something went wrong. Try asking differently! 🔄"
APP_THEME = "default"
`;

    return code;
  };

  const { completed, total } = builderType ? getCompletionCount() : { completed: 0, total: 0 };

  // ─── Type Selection Screen ───
  if (!builderType) {
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className="max-w-5xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-purple-600 mx-auto mb-4">
            <Wand2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Visual AI Builder</h1>
          <p className="text-lg text-[hsl(var(--discord-text-muted))] max-w-lg mx-auto">
            Build your AI visually — no code needed. Configure, preview, and export!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Chatbot Card */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => selectType('chatbot')}
            className="group relative p-8 rounded-2xl bg-[hsl(var(--discord-darker))] border-2 border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple))] transition-all text-left overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--discord-blurple)/0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <span className="text-6xl block mb-4">🤖</span>
              <h3 className="text-2xl font-black text-white mb-2">AI Chatbot</h3>
              <p className="text-[hsl(var(--discord-text-muted))] mb-4 leading-relaxed">
                Build a conversational AI with personality, knowledge, and custom rules. Great for customer support, tutors, and fun bots!
              </p>
              <div className="flex flex-wrap gap-2">
                {['Personality', 'Knowledge', 'Q&A Pairs', 'Rules', 'Memory'].map(tag => (
                  <Badge key={tag} className="text-[10px] bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]">{tag}</Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[hsl(var(--discord-blurple))] font-bold group-hover:translate-x-1 transition-transform">
                Start Building <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>

          {/* Agent Card */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => selectType('agent')}
            className="group relative p-8 rounded-2xl bg-[hsl(var(--discord-darker))] border-2 border-[hsl(var(--discord-light)/0.2)] hover:border-purple-500 transition-all text-left overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <span className="text-6xl block mb-4">🧠</span>
              <h3 className="text-2xl font-black text-white mb-2">AI Agent</h3>
              <p className="text-[hsl(var(--discord-text-muted))] mb-4 leading-relaxed">
                Build an autonomous AI that uses tools to search, calculate, and reason. Perfect for research assistants and smart helpers!
              </p>
              <div className="flex flex-wrap gap-2">
                {['Tools', 'ReAct Logic', 'Search', 'Calculator', 'Reasoning'].map(tag => (
                  <Badge key={tag} className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30">{tag}</Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                Start Building <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── Visual Builder ───
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-dark))]">
        <Button variant="ghost" size="sm" onClick={() => setBuilderType(null)} className="text-[hsl(var(--discord-text-muted))] hover:text-white">
          <RotateCcw className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{builderType === 'agent' ? '🧠' : '🤖'}</span>
          <span className="font-bold text-white">{config.BOT_NAME || 'My Bot'}</span>
          <Badge className="text-[10px] bg-[hsl(var(--discord-blurple)/0.2)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]">
            {builderType === 'agent' ? 'Agent' : 'Chatbot'}
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-[hsl(var(--discord-darker))] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[hsl(var(--discord-green))]"
                initial={{ width: 0 }}
                animate={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[hsl(var(--discord-text-muted))]">{completed}/{total}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs ${showPreview ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'}`}
          >
            <MessageSquare className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={() => onViewCode(generatePythonCode())}
            className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold"
          >
            <Code className="w-4 h-4 mr-1" /> Export Code
          </Button>
        </div>
      </div>

      {/* Main Content: Builder + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Config Builder Panel */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-auto p-4 space-y-3 transition-all`}>
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <motion.div
                key={section.id}
                layout
                className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.15)] overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[hsl(var(--discord-light)/0.05)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}20` }}>
                    <div style={{ color: section.color }}>{section.icon}</div>
                  </div>
                  <span className="font-bold text-white flex-1">{section.title}</span>
                  <Badge className="text-[10px] bg-[hsl(var(--discord-light)/0.1)] text-[hsl(var(--discord-text-muted))] border-[hsl(var(--discord-light)/0.2)]">
                    {section.fields.length} fields
                  </Badge>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" /> : <ChevronRight className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {section.fields.map((field) => (
                          <FieldRenderer key={field.key} field={field} value={config[field.key]} onChange={(val) => updateConfig(field.key, val)} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Live Preview Chat Panel */}
        {showPreview && (
          <div className="w-1/2 flex flex-col border-l border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-dark))]">
            {/* Preview Header */}
            <div className="px-4 py-3 border-b border-[hsl(var(--discord-light)/0.15)] flex items-center gap-2">
              <span className="text-lg">{config.BOT_EMOJI || '🤖'}</span>
              <span className="font-bold text-white text-sm">{config.BOT_NAME || 'My Bot'} — Live Preview</span>
              <Badge className="ml-auto text-[10px] bg-[hsl(var(--discord-green)/0.2)] text-[hsl(var(--discord-green))] border-[hsl(var(--discord-green)/0.3)]">
                LIVE
              </Badge>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {/* Greeting */}
              {config.AI_MESSAGE && chatMessages.length === 0 && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] flex items-center justify-center text-sm flex-shrink-0">
                    {config.BOT_EMOJI || '🤖'}
                  </div>
                  <div className="bg-[hsl(var(--discord-darker))] rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]">
                    <p className="text-sm text-white">{config.AI_MESSAGE}</p>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] flex items-center justify-center text-sm flex-shrink-0">
                      {config.BOT_EMOJI || '🤖'}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2 max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-[hsl(var(--discord-blurple))] text-white rounded-tr-sm' 
                      : 'bg-[hsl(var(--discord-darker))] text-white rounded-tl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isStreaming && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--discord-blurple)/0.2)] flex items-center justify-center text-sm flex-shrink-0">
                    {config.BOT_EMOJI || '🤖'}
                  </div>
                  <div className="bg-[hsl(var(--discord-darker))] rounded-2xl rounded-tl-sm px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--discord-blurple))]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Conversation Starters */}
            {chatMessages.length === 0 && config.CONVERSATION_STARTERS?.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {config.CONVERSATION_STARTERS.map((starter: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleChatSend(starter)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[hsl(var(--discord-light)/0.1)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)] transition-colors border border-[hsl(var(--discord-light)/0.2)]"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input */}
            <div className="p-3 border-t border-[hsl(var(--discord-light)/0.15)]">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder={`Message ${config.BOT_NAME || 'your bot'}...`}
                  disabled={isStreaming}
                  className="flex-1 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
                />
                <Button
                  size="icon"
                  onClick={() => handleChatSend()}
                  disabled={!chatInput.trim() || isStreaming}
                  className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] flex-shrink-0"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AIModelsTab.displayName = 'AIModelsTab';

// ─── Field Renderer ───
function FieldRenderer({ field, value, onChange }: { field: ConfigField; value: any; onChange: (val: any) => void }) {
  if (field.type === 'text') {
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white text-sm"
        />
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mt-1">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        <Textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white text-sm resize-none"
        />
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mt-1">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                value === opt
                  ? 'bg-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple))] text-white'
                  : 'bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-[hsl(var(--discord-text-muted))] hover:border-[hsl(var(--discord-blurple)/0.5)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value ?? field.min}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-[hsl(var(--discord-dark))] rounded-full appearance-none cursor-pointer accent-[hsl(var(--discord-blurple))]"
          />
          <span className="text-sm font-mono text-white w-14 text-right">{value ?? field.min}</span>
        </div>
      </div>
    );
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))]">{field.label}</label>
        <button
          onClick={() => onChange(!value)}
          className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[hsl(var(--discord-green))]' : 'bg-[hsl(var(--discord-light))]'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    );
  }

  if (field.type === 'list') {
    const items: string[] = value || [];
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-1.5 mb-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-[hsl(var(--discord-dark))] rounded-lg px-3 py-1.5 group">
              <span className="text-xs text-white flex-1">{item}</span>
              <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <ListAdder placeholder={field.placeholder || 'Add item...'} onAdd={(item) => onChange([...items, item])} />
      </div>
    );
  }

  if (field.type === 'dict') {
    const entries: Record<string, string> = value || {};
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-1.5 mb-2">
          {Object.entries(entries).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 bg-[hsl(var(--discord-dark))] rounded-lg px-3 py-1.5 group">
              <span className="text-xs text-[hsl(var(--discord-blurple))] font-mono">"{k}"</span>
              <span className="text-xs text-[hsl(var(--discord-text-muted))]">→</span>
              <span className="text-xs text-white flex-1 truncate">"{v}"</span>
              <button onClick={() => { const next = { ...entries }; delete next[k]; onChange(next); }} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <DictAdder onAdd={(k, v) => onChange({ ...entries, [k]: v })} />
      </div>
    );
  }

  if (field.type === 'qa-list') {
    const pairs: Array<{ q: string; a: string }> = value || [];
    return (
      <div>
        <label className="text-xs font-medium text-[hsl(var(--discord-text-muted))] mb-1 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-2 mb-2">
          {pairs.map((pair, i) => (
            <div key={i} className="bg-[hsl(var(--discord-dark))] rounded-lg p-2.5 group relative">
              <div className="text-[10px] text-[hsl(var(--discord-blurple))] font-bold mb-0.5">Q:</div>
              <p className="text-xs text-white mb-1">{pair.q}</p>
              <div className="text-[10px] text-[hsl(var(--discord-green))] font-bold mb-0.5">A:</div>
              <p className="text-xs text-white">{pair.a}</p>
              <button
                onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-[hsl(var(--discord-red))]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <QAPairAdder onAdd={(q, a) => onChange([...pairs, { q, a }])} />
      </div>
    );
  }

  return null;
}

// ─── Helper Components ───
function ListAdder({ placeholder, onAdd }: { placeholder: string; onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-1.5">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onAdd(value.trim()); setValue(''); } }}
        placeholder={placeholder}
        className="h-8 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white"
      />
      <Button size="sm" onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
        className="h-8 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

function DictAdder({ onAdd }: { onAdd: (key: string, val: string) => void }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');
  const submit = () => { if (key.trim() && val.trim()) { onAdd(key.trim(), val.trim()); setKey(''); setVal(''); } };
  return (
    <div className="flex gap-1.5">
      <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Trigger..." className="h-8 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white flex-1" />
      <Input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Response..." className="h-8 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white flex-1" />
      <Button size="sm" onClick={submit} className="h-8 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

function QAPairAdder({ onAdd }: { onAdd: (q: string, a: string) => void }) {
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const submit = () => { if (q.trim() && a.trim()) { onAdd(q.trim(), a.trim()); setQ(''); setA(''); } };
  return (
    <div className="space-y-1.5">
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Question..." className="h-8 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white" />
      <div className="flex gap-1.5">
        <Input value={a} onChange={e => setA(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Answer..." className="h-8 text-xs bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.2)] text-white flex-1" />
        <Button size="sm" onClick={submit} className="h-8 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
