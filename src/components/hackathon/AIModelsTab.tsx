import { useState, useRef, useCallback, forwardRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Bot, Cpu, Rocket, Zap, Send, Loader2, CheckCircle2, Code, 
  ChevronRight, ChevronDown, Plus, X, Play, MessageSquare,
  User, Shield, BookOpen, Palette, Settings, Wrench, Blocks, ArrowRight, RotateCcw, Mic, MicOff, Volume2, VolumeX,
  Eye, EyeOff, Copy, Check, Search, Calculator, Globe, Phone, PhoneOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchAIEndpoint } from '@/lib/aiFetch';
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
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  fields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'list' | 'dict' | 'qa-list' | 'toggle' | 'emoji-select' | 'tool-picker';
  placeholder?: string;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

const DEFAULT_CHATBOT_CONFIG: Record<string, any> = {
  BOT_NAME: 'Spark', BOT_EMOJI: '🤖',
  AI_MESSAGE: "Hey there! I'm Spark, your AI buddy. Ask me anything!",
  CREATOR_NAME: 'A FORGE Builder',
  SYSTEM_MESSAGE: 'You are a helpful AI assistant that answers questions clearly and concisely.',
  KNOWLEDGE_BASE: '', QA_PAIRS: [], TEMPERATURE: 0.7, RULES: [],
  CONVERSATION_STARTERS: ['Tell me about yourself', 'What can you help me with?'],
  FORBIDDEN_WORDS: [], BLOCKED_TOPICS: [], FEW_SHOT_EXAMPLES: [],
  SECRET_RESPONSES: {}, RESPONSE_STYLE: 'Friendly', MAX_RESPONSE_LENGTH: 'medium',
  MAX_TOKENS: 512, MOOD: 'neutral', LANGUAGE_STYLE: 'casual', CATCHPHRASES: [],
};

const DEFAULT_AGENT_CONFIG: Record<string, any> = {
  BOT_NAME: 'Research Agent', BOT_EMOJI: '🧠',
  AI_MESSAGE: "Hi! I'm your Research Agent. I can search, calculate, and look things up!",
  CREATOR_NAME: 'A FORGE Builder',
  SYSTEM_MESSAGE: 'You are a research agent that uses tools to find accurate answers.',
  KNOWLEDGE_BASE: '', QA_PAIRS: [{ q: 'What tools do you have?', a: 'I can search the web, do calculations, and look up Wikipedia!' }],
  TEMPERATURE: 0.3, RULES: ['Always cite your sources', 'Use tools before guessing', 'Be precise and factual'],
  CONVERSATION_STARTERS: ['Search for something', 'Calculate a math problem', 'Look up a topic'],
  FORBIDDEN_WORDS: [], BLOCKED_TOPICS: [], FEW_SHOT_EXAMPLES: [],
  SECRET_RESPONSES: {}, RESPONSE_STYLE: 'Professional', MAX_RESPONSE_LENGTH: 'medium',
  MAX_TOKENS: 512, MOOD: 'neutral', LANGUAGE_STYLE: 'formal', CATCHPHRASES: [],
  TOOLS: ['Search', 'Calculator', 'Wikipedia'], MAX_ITERATIONS: 5, VERBOSE: true,
};

const AVAILABLE_TOOLS = [
  { id: 'Search', icon: <Search className="w-3.5 h-3.5" />, label: 'Web Search', color: '#3B82F6' },
  { id: 'Calculator', icon: <Calculator className="w-3.5 h-3.5" />, label: 'Calculator', color: '#10B981' },
  { id: 'Wikipedia', icon: <Globe className="w-3.5 h-3.5" />, label: 'Wikipedia', color: '#8B5CF6' },
];

const CHATBOT_SECTIONS: ConfigSection[] = [
  {
    id: 'identity', title: 'Identity', subtitle: 'Name & appearance', icon: <User className="w-4 h-4" />, color: '#5865F2',
    fields: [
      { key: 'BOT_NAME', label: 'Bot Name', type: 'text', placeholder: 'Spark' },
      { key: 'BOT_EMOJI', label: 'Avatar', type: 'emoji-select', placeholder: '🤖' },
      { key: 'CREATOR_NAME', label: 'Creator Name', type: 'text', placeholder: 'Your name' },
      { key: 'AI_MESSAGE', label: 'Greeting Message', type: 'textarea', placeholder: 'First message users see...' },
    ]
  },
  {
    id: 'personality', title: 'Personality', subtitle: 'How your bot thinks & talks', icon: <Rocket className="w-4 h-4" />, color: '#F59E0B',
    fields: [
      { key: 'SYSTEM_MESSAGE', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful AI that...', hint: "This is your bot's brain — describe who it is and how it behaves" },
      { key: 'MOOD', label: 'Mood', type: 'select', options: ['cheerful', 'serious', 'sarcastic', 'mysterious', 'energetic', 'calm', 'neutral'] },
      { key: 'LANGUAGE_STYLE', label: 'Language Style', type: 'select', options: ['casual', 'formal', 'academic', 'slang', 'poetic', 'storyteller'] },
      { key: 'RESPONSE_STYLE', label: 'Response Style', type: 'select', options: ['Concise', 'Detailed', 'Friendly', 'Professional', 'Balanced'] },
    ]
  },
  {
    id: 'knowledge', title: 'Knowledge', subtitle: 'What your bot knows', icon: <BookOpen className="w-4 h-4" />, color: '#10B981',
    fields: [
      { key: 'KNOWLEDGE_BASE', label: 'Knowledge Base', type: 'textarea', placeholder: 'TOPIC: Python\n- Created by Guido van Rossum\n- Used for AI, web dev', hint: 'Facts your bot should know' },
      { key: 'QA_PAIRS', label: 'Intents', type: 'qa-list', hint: 'Exact trigger phrase → response pairs (like a Rasa "intent")' },
      { key: 'FEW_SHOT_EXAMPLES', label: 'Few-Shot Examples', type: 'qa-list', hint: 'Teaching examples (input → output)' },
    ]
  },
  {
    id: 'rules', title: 'Safety & Rules', subtitle: 'Guardrails & restrictions', icon: <Shield className="w-4 h-4" />, color: '#EF4444',
    fields: [
      { key: 'RULES', label: 'Rules', type: 'list', placeholder: 'Always be friendly' },
      { key: 'FORBIDDEN_WORDS', label: 'Forbidden Words', type: 'list', placeholder: 'stupid' },
      { key: 'BLOCKED_TOPICS', label: 'Blocked Topics', type: 'list', placeholder: 'violence' },
    ]
  },
  {
    id: 'style', title: 'Features', subtitle: 'Starters, easter eggs & more', icon: <Palette className="w-4 h-4" />, color: '#8B5CF6',
    fields: [
      { key: 'CONVERSATION_STARTERS', label: 'Quick Replies', type: 'list', placeholder: 'Tell me about yourself' },
      { key: 'CATCHPHRASES', label: 'Catchphrases', type: 'list', placeholder: 'Fun fact!' },
      { key: 'SECRET_RESPONSES', label: 'Easter Eggs', type: 'dict', hint: 'Secret trigger → hidden response' },
    ]
  },
  {
    id: 'settings', title: 'Tuning', subtitle: 'Model parameters', icon: <Settings className="w-4 h-4" />, color: '#6B7280',
    fields: [
      { key: 'TEMPERATURE', label: 'Creativity', type: 'number', min: 0, max: 1, step: 0.1 },
      { key: 'MAX_TOKENS', label: 'Max Length', type: 'number', min: 50, max: 2048, step: 50 },
      { key: 'MAX_RESPONSE_LENGTH', label: 'Response Size', type: 'select', options: ['short', 'medium', 'long'] },
    ]
  },
];

const AGENT_SECTIONS: ConfigSection[] = [
  {
    id: 'identity', title: 'Identity', subtitle: 'Name & greeting', icon: <Cpu className="w-4 h-4" />, color: '#5865F2',
    fields: [
      { key: 'BOT_NAME', label: 'Agent Name', type: 'text', placeholder: 'Research Agent' },
      { key: 'BOT_EMOJI', label: 'Avatar', type: 'emoji-select', placeholder: '🧠' },
      { key: 'CREATOR_NAME', label: 'Creator Name', type: 'text', placeholder: 'Your name' },
      { key: 'AI_MESSAGE', label: 'Greeting', type: 'textarea', placeholder: 'First message users see...' },
    ]
  },
  {
    id: 'personality', title: 'Brain', subtitle: 'How your agent thinks', icon: <Brain className="w-4 h-4" />, color: '#F59E0B',
    fields: [
      { key: 'SYSTEM_MESSAGE', label: 'System Prompt', type: 'textarea', placeholder: 'You are a research agent that...', hint: 'Describe what your agent does and how it reasons' },
      { key: 'MOOD', label: 'Mood', type: 'select', options: ['cheerful', 'serious', 'sarcastic', 'mysterious', 'energetic', 'calm', 'neutral'] },
      { key: 'LANGUAGE_STYLE', label: 'Language', type: 'select', options: ['casual', 'formal', 'academic', 'slang', 'poetic', 'storyteller'] },
      { key: 'RESPONSE_STYLE', label: 'Style', type: 'select', options: ['Concise', 'Detailed', 'Friendly', 'Professional', 'Balanced'] },
    ]
  },
  {
    id: 'tools', title: 'Tools', subtitle: 'Capabilities & reasoning', icon: <Wrench className="w-4 h-4" />, color: '#06B6D4',
    fields: [
      { key: 'TOOLS', label: 'Available Tools', type: 'tool-picker', hint: 'Select tools your agent can use' },
      { key: 'MAX_ITERATIONS', label: 'Max Reasoning Steps', type: 'number', min: 1, max: 10, step: 1 },
      { key: 'VERBOSE', label: 'Show Reasoning', type: 'toggle' },
    ]
  },
  {
    id: 'knowledge', title: 'Knowledge', subtitle: 'Domain expertise', icon: <BookOpen className="w-4 h-4" />, color: '#10B981',
    fields: [
      { key: 'KNOWLEDGE_BASE', label: 'Knowledge Base', type: 'textarea', placeholder: 'Facts your agent should know...', hint: 'Domain knowledge' },
      { key: 'QA_PAIRS', label: 'Intents', type: 'qa-list', hint: 'Pre-defined answers (like a Rasa "intent")' },
    ]
  },
  {
    id: 'rules', title: 'Safety', subtitle: 'Guardrails', icon: <Shield className="w-4 h-4" />, color: '#EF4444',
    fields: [
      { key: 'RULES', label: 'Rules', type: 'list', placeholder: 'Always cite sources' },
      { key: 'FORBIDDEN_WORDS', label: 'Forbidden Words', type: 'list', placeholder: 'stupid' },
      { key: 'BLOCKED_TOPICS', label: 'Blocked Topics', type: 'list', placeholder: 'violence' },
    ]
  },
  {
    id: 'style', title: 'Features', subtitle: 'Starters & easter eggs', icon: <Palette className="w-4 h-4" />, color: '#8B5CF6',
    fields: [
      { key: 'CONVERSATION_STARTERS', label: 'Quick Replies', type: 'list', placeholder: 'Search for something' },
      { key: 'CATCHPHRASES', label: 'Catchphrases', type: 'list', placeholder: 'Let me think...' },
      { key: 'SECRET_RESPONSES', label: 'Easter Eggs', type: 'dict', hint: 'Hidden trigger → response pairs' },
    ]
  },
  {
    id: 'settings', title: 'Tuning', subtitle: 'Parameters', icon: <Settings className="w-4 h-4" />, color: '#6B7280',
    fields: [
      { key: 'TEMPERATURE', label: 'Creativity', type: 'number', min: 0, max: 1, step: 0.1 },
      { key: 'MAX_TOKENS', label: 'Max Length', type: 'number', min: 50, max: 2048, step: 50 },
      { key: 'MAX_RESPONSE_LENGTH', label: 'Response Size', type: 'select', options: ['short', 'medium', 'long'] },
    ]
  },
];

const EMOJI_OPTIONS = ['🤖', '🧠', '🚀', '💡', '🎯', '📚', '🔬', '💻', '🎨', '🎮', '🌟', '⚡', '🦊', '🐱', '🦄', '👾', '🤓', '😎', '🧙', '🦸', '🎭', '🏆', '💎', '🔮'];

export const AIModelsTab = forwardRef<HTMLDivElement, AIModelsTabProps>(function AIModelsTab({ onViewCode }, ref) {
  const [builderType, setBuilderType] = useState<BuilderType>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['identity']);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceConversationMode, setVoiceConversationMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);

  const sections = useMemo(() => builderType === 'agent' ? AGENT_SECTIONS : CHATBOT_SECTIONS, [builderType]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    voiceModeRef.current = voiceConversationMode;
  }, [voiceConversationMode]);

  const selectType = (type: BuilderType) => {
    setBuilderType(type);
    setConfig(type === 'agent' ? { ...DEFAULT_AGENT_CONFIG } : { ...DEFAULT_CHATBOT_CONFIG });
    setChatMessages([]);
    setExpandedSections(['identity']);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getCompletionCount = () => {
    const defaults = builderType === 'agent' ? DEFAULT_AGENT_CONFIG : DEFAULT_CHATBOT_CONFIG;
    let completed = 0, total = 0;
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

  const getSectionCompletion = (section: ConfigSection) => {
    const defaults = builderType === 'agent' ? DEFAULT_AGENT_CONFIG : DEFAULT_CHATBOT_CONFIG;
    let done = 0;
    for (const field of section.fields) {
      const val = config[field.key];
      const def = defaults[field.key];
      if (JSON.stringify(val) !== JSON.stringify(def) && val !== undefined && val !== '' &&
        !(Array.isArray(val) && val.length === 0) && !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
        done++;
      }
    }
    return { done, total: section.fields.length };
  };

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

  const handleChatSend = async (message?: string) => {
    const text = message || chatInput.trim();
    if (!text || isStreaming) return;
    setChatInput('');

    if (config.SECRET_RESPONSES) {
      const lower = text.toLowerCase();
      for (const [trigger, response] of Object.entries(config.SECRET_RESPONSES)) {
        if (lower === trigger.toLowerCase()) {
          setChatMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: response as string }]);
          return;
        }
      }
    }

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
      const history = [...chatMessages, userMsg].map(m => ({ role: m.role === 'user' ? 'human' : 'assistant', content: m.content }));

      const resp = await fetchAIEndpoint(`${supabaseUrl}/functions/v1/python-ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'test-agent',
          code: `SYSTEM_MESSAGE = """${buildSystemPrompt()}"""`,
          message: text,
          messages: history,
          config: { temperature: config.TEMPERATURE || 0.7, max_tokens: config.MAX_TOKENS || 512, bot_name: config.BOT_NAME },
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
            if (!assistantText && jsonStr) {
              try { const obj = JSON.parse(buffer + line); if (obj.response || obj.output) assistantText = obj.response || obj.output; } catch {}
            }
          }
        }
      }

      if (!assistantText && buffer.trim()) {
        try { const obj = JSON.parse(buffer); assistantText = obj.response || obj.output || obj.message || buffer; } catch { assistantText = buffer; }
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
      // Speak the final assistant response via TTS
      if (voiceEnabled && 'speechSynthesis' in window) {
        setTimeout(() => {
          setChatMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              window.speechSynthesis.cancel();
              const cleaned = last.content.replace(/[*#_`~]/g, '').replace(/\[.*?\]/g, '');
              const utterance = new SpeechSynthesisUtterance(cleaned);
              utterance.rate = 1.05;
              utterance.pitch = 1.1;
              // Auto-restart listening after TTS finishes in voice conversation mode
              utterance.onend = () => {
                if (voiceModeRef.current && !isListening) {
                  // Cannot call recognition.start() here (no gesture context)
                  // Instead, just update state so user knows to click mic again
                  toast.info('🎤 Tap mic to continue speaking');
                }
              };
              window.speechSynthesis.speak(utterance);
            }
            return prev;
          });
        }, 100);
      } else if (voiceModeRef.current) {
        // No TTS but voice mode on — prompt user to tap mic
        toast.info('🎤 Tap mic to continue speaking');
      }
    }
  };

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
"""

# ═══ IDENTITY ═══
BOT_NAME = "${escapePy(config.BOT_NAME || '')}"
BOT_EMOJI = "${config.BOT_EMOJI || (isAgent ? '🧠' : '🤖')}"
AI_MESSAGE = "${escapePy(config.AI_MESSAGE || '')}"
CREATOR_NAME = "${escapePy(config.CREATOR_NAME || '')}"

# ═══ PERSONALITY ═══
SYSTEM_MESSAGE = """${config.SYSTEM_MESSAGE || ''}"""
MOOD = "${config.MOOD || 'neutral'}"
LANGUAGE_STYLE = "${config.LANGUAGE_STYLE || 'casual'}"
RESPONSE_STYLE = "${config.RESPONSE_STYLE || 'Friendly'}"

# ═══ KNOWLEDGE ═══
KNOWLEDGE_BASE = """${config.KNOWLEDGE_BASE || ''}"""
QA_PAIRS = ${qaPairsToPy(config.QA_PAIRS || [])}
FEW_SHOT_EXAMPLES = ${qaPairsToPy(config.FEW_SHOT_EXAMPLES || [])}

# ═══ RULES & SAFETY ═══
RULES = ${listToPy(config.RULES || [])}
FORBIDDEN_WORDS = ${listToPy(config.FORBIDDEN_WORDS || [])}
BLOCKED_TOPICS = ${listToPy(config.BLOCKED_TOPICS || [])}

# ═══ FEATURES ═══
CONVERSATION_STARTERS = ${listToPy(config.CONVERSATION_STARTERS || [])}
CATCHPHRASES = ${listToPy(config.CATCHPHRASES || [])}
SECRET_RESPONSES = ${dictToPy(config.SECRET_RESPONSES || {})}

# ═══ MODEL SETTINGS ═══
TEMPERATURE = ${config.TEMPERATURE ?? 0.7}
MAX_TOKENS = ${config.MAX_TOKENS ?? 512}
MAX_RESPONSE_LENGTH = "${config.MAX_RESPONSE_LENGTH || 'medium'}"
`;
    if (isAgent) {
      code += `
# ═══ AGENT TOOLS ═══
TOOLS = ${listToPy(config.TOOLS || [])}
MAX_ITERATIONS = ${config.MAX_ITERATIONS ?? 5}
VERBOSE = ${config.VERBOSE ? 'True' : 'False'}
`;
    }
    code += `
# ═══ BONUS ═══
SIGN_OFF = ""
FOLLOW_UP_QUESTIONS = True
MEMORY_ENABLED = True
ERROR_MESSAGE = "Oops! Something went wrong. Try asking differently! 🔄"
APP_THEME = "default"
`;
    return code;
  };

  const handleExportCode = () => {
    const code = generatePythonCode();
    onViewCode(code);
    toast.success('Code exported to Build tab! 🚀');
  };


  const startListeningOnce = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setChatInput(transcript);
      if (event.results[event.results.length - 1]?.isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          handleChatSend(transcript.trim());
        }
      }
    };
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow mic access in browser settings.');
        setVoiceConversationMode(false);
        voiceModeRef.current = false;
      }
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch {
      toast.error('Could not start microphone. Check browser permissions.');
      setIsListening(false);
    }
  }, [handleChatSend]);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    startListeningOnce();
  }, [isListening, startListeningOnce]);

  const toggleVoiceConversation = useCallback(() => {
    if (voiceConversationMode) {
      setVoiceConversationMode(false);
      voiceModeRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      window.speechSynthesis?.cancel();
      toast.info('Voice conversation ended');
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Speech recognition not supported in this browser');
        return;
      }
      setVoiceConversationMode(true);
      voiceModeRef.current = true;
      setVoiceEnabled(true);
      setShowPreview(true);
      toast.success('🎙️ Voice conversation mode ON — speak freely!');
      startListeningOnce();
    }
  }, [voiceConversationMode, startListeningOnce]);

  const { completed, total } = builderType ? getCompletionCount() : { completed: 0, total: 0 };

  // ─── Type Selection ───
  if (!builderType) {
    return (
      <div ref={ref} className="max-w-4xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <Blocks className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Visual AI Builder</h1>
          <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto">
            Choose what you want to build — configure everything visually, test it live, then export code
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Chatbot Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectType('chatbot')}
            className="group relative p-8 rounded-2xl bg-[hsl(var(--discord-darker))] border-2 border-[hsl(var(--discord-light)/0.15)] hover:border-[hsl(var(--discord-blurple))] transition-all text-left overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--discord-blurple)/0.06)] to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">AI Chatbot</h3>
              <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-4 leading-relaxed">
                Conversational AI with personality, knowledge base, and custom rules. Perfect for tutors, support bots, and fun companions!
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['Personality', 'Knowledge', 'Intents', 'Rules', 'Memory'].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--discord-blurple)/0.12)] text-[hsl(var(--discord-blurple))] font-medium">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[hsl(var(--discord-blurple))] font-bold text-sm group-hover:gap-3 transition-all">
                Build Chatbot <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>

          {/* Agent Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectType('agent')}
            className="group relative p-8 rounded-2xl bg-[hsl(var(--discord-darker))] border-2 border-[hsl(var(--discord-light)/0.15)] hover:border-purple-500 transition-all text-left overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">AI Agent</h3>
              <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-4 leading-relaxed">
                Autonomous AI that uses tools to search, calculate, and reason step-by-step. Great for research helpers and smart assistants!
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['Tools', 'ReAct', 'Search', 'Calculate', 'Reason'].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/12 text-purple-400 font-medium">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm group-hover:gap-3 transition-all">
                Build Agent <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── Builder View ───
  return (
    <div ref={ref} className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(var(--discord-light)/0.12)] bg-[hsl(var(--discord-dark))]">
        <Button variant="ghost" size="sm" onClick={() => { setBuilderType(null); setShowPreview(false); }} className="text-[hsl(var(--discord-text-muted))] hover:text-white h-8 px-2">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
        <span className="text-lg">{config.BOT_EMOJI || '🤖'}</span>
        <span className="font-bold text-white text-sm">{config.BOT_NAME || 'My Bot'}</span>
        <Badge className="text-[9px] px-1.5 py-0 bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple)/0.3)]">
          {builderType === 'agent' ? 'AGENT' : 'CHATBOT'}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[hsl(var(--discord-text-muted))] font-bold">{completed}/{total} configured</span>
          <div className="w-px h-5 bg-[hsl(var(--discord-light)/0.15)]" />
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className={`h-8 text-xs gap-1.5 ${showPreview ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'}`}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide Chat' : 'Test Chat'}
          </Button>
          <Button
            size="sm"
            onClick={handleExportCode}
            className="h-8 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white font-bold text-xs gap-1.5"
          >
            <Code className="w-3.5 h-3.5" /> Export Code
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Config Cards */}
        <div className={`flex-1 overflow-auto ${showPreview ? 'hidden md:block' : ''}`}>
          <div className="p-4 max-w-2xl mx-auto space-y-3">
            {sections.map((section, i) => {
              const isExpanded = expandedSections.includes(section.id);
              const { done, total: secTotal } = getSectionCompletion(section);
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-[hsl(var(--discord-light)/0.12)] bg-[hsl(var(--discord-dark))] overflow-hidden"
                >
                  {/* Card Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--discord-light)/0.04)] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${section.color}20`, color: section.color }}
                    >
                      {section.icon}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-bold text-white">{section.title}</div>
                      <div className="text-[10px] text-[hsl(var(--discord-text-muted))]">{section.subtitle}</div>
                    </div>
                    {done > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--discord-green)/0.15)] text-[hsl(var(--discord-green))]">
                        {done}/{secTotal}
                      </span>
                    )}
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
                    </motion.div>
                  </button>

                  {/* Card Content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[hsl(var(--discord-light)/0.08)]">
                          {section.fields.map((field) => (
                            <FieldRenderer
                              key={field.key}
                              field={field}
                              value={config[field.key]}
                              onChange={(val) => updateConfig(field.key, val)}
                              builderType={builderType}
                              config={config}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Bottom actions */}
            <div className="flex gap-3 pt-2 pb-6">
              <Button
                onClick={() => setShowPreview(true)}
                className="flex-1 h-11 bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white font-bold gap-2"
              >
                <Play className="w-4 h-4" /> Test Your {builderType === 'agent' ? 'Agent' : 'Chatbot'}
              </Button>
              <Button
                onClick={handleExportCode}
                variant="outline"
                className="flex-1 h-11 font-bold gap-2 border-[hsl(var(--discord-blurple)/0.4)] text-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.1)]"
              >
                <Code className="w-4 h-4" /> Export Code
              </Button>
            </div>
          </div>
        </div>

        {/* Live Preview Chat */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '50%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col border-l border-[hsl(var(--discord-light)/0.12)] bg-[hsl(var(--discord-dark))] overflow-hidden md:max-w-[50%]"
              style={{ minWidth: showPreview ? '320px' : 0 }}
            >
              {/* Preview Header */}
              <div className="px-4 py-2.5 border-b border-[hsl(var(--discord-light)/0.12)] flex items-center gap-2">
                <span className="text-lg">{config.BOT_EMOJI || '🤖'}</span>
                <span className="font-bold text-white text-sm">{config.BOT_NAME || 'My Bot'}</span>
                <Badge className="ml-auto text-[9px] px-1.5 py-0 bg-[hsl(var(--discord-green)/0.15)] text-[hsl(var(--discord-green))] border-[hsl(var(--discord-green)/0.3)]">
                  LIVE
                </Badge>
                <Button
                  variant="ghost" size="sm"
                  onClick={toggleListening}
                  className={`h-7 px-2 gap-1 text-xs font-bold transition-all ${
                    isListening
                      ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                      : 'text-[hsl(var(--discord-text-muted))] hover:text-white'
                  }`}
                  title={isListening ? 'Stop listening' : 'Push to talk'}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isListening ? 'Stop' : 'Mic'}
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setChatMessages([])}
                  className="h-7 px-2 text-[hsl(var(--discord-text-muted))] hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {config.AI_MESSAGE && chatMessages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                      {config.BOT_EMOJI || '🤖'}
                    </div>
                    <div>
                      <div className="text-[10px] text-[hsl(var(--discord-text-muted))] font-bold mb-1">{config.BOT_NAME || 'Bot'}</div>
                      <div className="bg-[hsl(var(--discord-darker))] rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[90%]">
                        <p className="text-sm text-white leading-relaxed">{config.AI_MESSAGE}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                        {config.BOT_EMOJI || '🤖'}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-[hsl(var(--discord-blurple))] text-white rounded-tr-md'
                        : 'bg-[hsl(var(--discord-darker))] text-white rounded-tl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}

                {isStreaming && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                      {config.BOT_EMOJI || '🤖'}
                    </div>
                    <div className="bg-[hsl(var(--discord-darker))] rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-[hsl(var(--discord-blurple))]"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Conversation Starters */}
              {chatMessages.length === 0 && config.CONVERSATION_STARTERS?.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {config.CONVERSATION_STARTERS.map((starter: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleChatSend(starter)}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-[hsl(var(--discord-light)/0.08)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-blurple)/0.15)] hover:text-[hsl(var(--discord-blurple))] transition-colors border border-[hsl(var(--discord-light)/0.15)]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 border-t border-[hsl(var(--discord-light)/0.12)]">
                <div className="flex items-center gap-1.5">
                  {/* Voice toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) window.speechSynthesis?.cancel(); }}
                    className={`flex-shrink-0 h-9 w-9 rounded-xl ${voiceEnabled ? 'text-[hsl(var(--discord-green))]' : 'text-[hsl(var(--discord-text-muted))]'}`}
                    title={voiceEnabled ? 'Mute voice replies' : 'Enable voice replies'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>

                  {/* Mic button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleListening}
                    disabled={isStreaming}
                    className={`flex-shrink-0 h-9 w-9 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-red-500/20 text-red-400 animate-pulse ring-2 ring-red-500/30' 
                        : 'text-[hsl(var(--discord-text-muted))] hover:text-white'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder={isListening ? '🎤 Listening...' : `Message ${config.BOT_NAME || 'your bot'}...`}
                    disabled={isStreaming}
                    className="flex-1 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white placeholder:text-[hsl(var(--discord-text-muted))] h-9 text-sm rounded-xl"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleChatSend()}
                    disabled={!chatInput.trim() || isStreaming}
                    className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] flex-shrink-0 h-9 w-9 rounded-xl"
                  >
                    {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 flex items-center gap-2 text-[10px] text-red-400 font-bold"
                  >
                    <div className="flex gap-0.5">
                      {[0,1,2,3,4].map(i => (
                        <motion.div
                          key={i}
                          className="w-1 bg-red-400 rounded-full"
                          animate={{ height: [4, 12, 4] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                    Speak now — your message will be sent automatically
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

AIModelsTab.displayName = 'AIModelsTab';

// ─── Field Renderer ───
function FieldRenderer({ field, value, onChange, builderType, config }: {
  field: ConfigField; value: any; onChange: (val: any) => void; builderType: BuilderType; config: Record<string, any>
}) {
  if (field.type === 'text') {
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white text-sm rounded-xl h-10"
        />
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mt-1.5">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        <Textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white text-sm resize-none rounded-xl"
        />
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mt-1.5">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'emoji-select') {
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onChange(emoji)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                value === emoji
                  ? 'bg-[hsl(var(--discord-blurple))] ring-2 ring-[hsl(var(--discord-blurple))] ring-offset-1 ring-offset-[hsl(var(--discord-darker))] scale-110'
                  : 'bg-[hsl(var(--discord-darker))] hover:bg-[hsl(var(--discord-light)/0.1)]'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`text-xs px-3.5 py-2 rounded-xl border transition-all font-medium ${
                value === opt
                  ? 'bg-[hsl(var(--discord-blurple))] border-[hsl(var(--discord-blurple))] text-white shadow-md shadow-indigo-500/10'
                  : 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-[hsl(var(--discord-text-muted))] hover:border-[hsl(var(--discord-blurple)/0.4)] hover:text-white'
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
    const pct = field.min !== undefined && field.max !== undefined ? ((value ?? field.min) - field.min) / (field.max - field.min) * 100 : 50;
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))]">{field.label}</label>
          <span className="text-sm font-mono font-bold text-white bg-[hsl(var(--discord-darker))] px-2.5 py-0.5 rounded-lg">{value ?? field.min}</span>
        </div>
        <div className="relative">
          <div className="h-2 bg-[hsl(var(--discord-darker))] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--discord-blurple))] to-purple-500"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value ?? field.min}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[hsl(var(--discord-text-muted))]">{field.min}</span>
          <span className="text-[9px] text-[hsl(var(--discord-text-muted))]">{field.max}</span>
        </div>
      </div>
    );
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between bg-[hsl(var(--discord-darker))] rounded-xl px-4 py-3">
        <label className="text-xs font-bold text-white">{field.label}</label>
        <button
          onClick={() => onChange(!value)}
          className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[hsl(var(--discord-green))]' : 'bg-[hsl(var(--discord-light)/0.3)]'}`}
        >
          <motion.div
            className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5"
            animate={{ x: value ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
    );
  }

  if (field.type === 'tool-picker') {
    const selectedTools: string[] = value || [];
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2.5">{field.hint}</p>}
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_TOOLS.map(tool => {
            const isSelected = selectedTools.includes(tool.id);
            return (
              <motion.button
                key={tool.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (isSelected) onChange(selectedTools.filter(t => t !== tool.id));
                  else onChange([...selectedTools, tool.id]);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-opacity-60 bg-opacity-10'
                    : 'border-[hsl(var(--discord-light)/0.15)] bg-[hsl(var(--discord-darker))] hover:border-opacity-30'
                }`}
                style={{
                  borderColor: isSelected ? tool.color : undefined,
                  backgroundColor: isSelected ? `${tool.color}15` : undefined,
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tool.color}20`, color: tool.color }}>
                  {tool.icon}
                </div>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-[hsl(var(--discord-text-muted))]'}`}>{tool.label}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: tool.color }} />}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-2">
          <ListAdder placeholder="Add custom tool..." onAdd={(item) => onChange([...selectedTools, item])} />
        </div>
      </div>
    );
  }

  if (field.type === 'list') {
    const items: string[] = value || [];
    return (
      <div>
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-1.5 mb-2.5">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-[hsl(var(--discord-darker))] rounded-xl px-3.5 py-2 group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--discord-blurple))] flex-shrink-0" />
              <span className="text-xs text-white flex-1">{item}</span>
              <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-red-400 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
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
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-1.5 mb-2.5">
          {Object.entries(entries).map(([k, v]) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-[hsl(var(--discord-darker))] rounded-xl px-3.5 py-2 group"
            >
              <span className="text-[10px] text-[hsl(var(--discord-blurple))] font-mono font-bold">"{k}"</span>
              <ArrowRight className="w-3 h-3 text-[hsl(var(--discord-light)/0.3)]" />
              <span className="text-xs text-white flex-1 truncate">"{v}"</span>
              <button onClick={() => { const next = { ...entries }; delete next[k]; onChange(next); }} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-red-400 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
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
        <label className="text-xs font-bold text-[hsl(var(--discord-text-muted))] mb-1.5 block">{field.label}</label>
        {field.hint && <p className="text-[10px] text-[hsl(var(--discord-text-muted))] mb-2">{field.hint}</p>}
        <div className="space-y-2 mb-2.5">
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[hsl(var(--discord-darker))] rounded-xl p-3 group relative"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))]">Q</span>
                <p className="text-xs text-white flex-1">{pair.q}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--discord-green)/0.15)] text-[hsl(var(--discord-green))]">A</span>
                <p className="text-xs text-white flex-1">{pair.a}</p>
              </div>
              <button
                onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[hsl(var(--discord-text-muted))] hover:text-red-400 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
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
        className="h-9 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white rounded-xl"
      />
      <Button size="sm" onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
        className="h-9 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] rounded-xl">
        <Plus className="w-3.5 h-3.5" />
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
      <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Trigger..." className="h-9 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white flex-1 rounded-xl" />
      <Input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Response..." className="h-9 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white flex-1 rounded-xl" />
      <Button size="sm" onClick={submit} className="h-9 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] rounded-xl">
        <Plus className="w-3.5 h-3.5" />
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
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Question..." className="h-9 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white rounded-xl" />
      <div className="flex gap-1.5">
        <Input value={a} onChange={e => setA(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Answer..." className="h-9 text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-white flex-1 rounded-xl" />
        <Button size="sm" onClick={submit} className="h-9 px-3 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] rounded-xl">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
