import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { fetchAIEndpoint } from '@/lib/aiFetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { ArrowLeft, Code, User, Calendar, Trophy, ExternalLink, Copy, Check, Send, MessageSquare, Loader2, Bot, ChevronDown, ChevronUp, Share2, Globe, Mic, Volume2, VolumeX, Radio, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { codeDefinesRespond, describeMicError } from '@/components/hackathon/editorFeatures';

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  code: string;
  author_name: string;
  template_id: string | null;
  created_at: string;
  demo_url: string | null;
  points_earned: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  _id?: number;
  // Neither of these existed on the published page at all — the
  // "🐍 Answered by your Python code" / "🐍 Python error" badges Live
  // Preview shows were entirely absent here, so a bot's own creator
  // checking their published page had no way to tell whether their real
  // respond() function was actually running versus silently crashing and
  // falling back to the AI every single message.
  usedRealPython?: boolean;
  pythonErrorType?: string;
  pythonErrorMessage?: string;
}

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

const THEMES = [
  { id: 'default', name: 'Default', accent: '#5865F2', bg: '#0d1117', chat: '#161b22' },
  { id: 'ocean', name: 'Ocean', accent: '#00B4D8', bg: '#0a1628', chat: '#0f2035' },
  { id: 'forest', name: 'Forest', accent: '#22C55E', bg: '#0a1a0f', chat: '#0f2614' },
  { id: 'sunset', name: 'Sunset', accent: '#F97316', bg: '#1a0f0a', chat: '#26140f' },
  { id: 'purple', name: 'Neon', accent: '#A855F7', bg: '#0f0a1a', chat: '#140f26' },
  { id: 'rose', name: 'Rose', accent: '#F43F5E', bg: '#1a0a0f', chat: '#260f14' },
];

const ProjectView = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // A transient fetch failure (network blip, DB error) used to render
  // identically to "this project doesn't exist" — on the app's highest-
  // traffic public page, a judge or family member opening a shared link
  // during a momentary hiccup would see a false "not found" with no way
  // to tell it apart from a genuinely broken/missing link.
  const [fetchError, setFetchError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceConversationMode, setVoiceConversationMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const handleChatSendRef = useRef<(msg?: string) => void>(() => {});
  const wakeWordRef = useRef<string>('');
  // Ref mirror of isSpeaking — recognition.onresult below is registered
  // once per listening session, not re-created every render, so it'd
  // otherwise see whatever isSpeaking was at registration time forever.
  const isSpeakingRef = useRef(false);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  // Same "which utterance can still touch isSpeaking" tracking Build
  // Studio's own speakText uses — without it, a cancelled utterance's
  // stale onend fires after a newer one already started and incorrectly
  // clears isSpeaking mid-playback.
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(false);
    try {
      // Explicit column list — author_email is the app's entire ownership
      // credential for the save/delete/publish RPCs, so it must never be
      // sent to this public, unauthenticated page.
      const { data, error } = await supabase
        .from('ai_projects')
        .select('id, project_name, description, code, author_name, template_id, created_at, demo_url, points_earned')
        .eq('id', id)
        .eq('is_published', true)
        .single();
      // PGRST116 = no row matched (genuinely doesn't exist / unpublished) —
      // expected and not an error. Anything else (network blip, a real DB
      // error) sets fetchError instead of silently falling through to the
      // same "not found" state as a truly missing project.
      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch project:', error);
        setFetchError(true);
      } else if (data) {
        setProject(data as Project);
      }
      // No fallback "check if it exists but is unpublished" query here —
      // ai_projects' SELECT policy is is_published=true only, so that
      // query would always return nothing for a genuinely-private
      // project regardless of whether it exists. It can't distinguish
      // "doesn't exist" from "exists but private" any more than this
      // query already can't, so it was silently dead code — every visit
      // to an unpublished link showed generic "not found" already, this
      // just stops pretending otherwise. Not distinguishing the two
      // cases is also the more privacy-preserving default anyway.
    } catch (e) {
      console.error('Failed to fetch project:', e);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cap chat messages separately to avoid re-render loop
  useEffect(() => {
    if (chatMessages.length > 100) {
      setChatMessages(prev => prev.length > 100 ? prev.slice(-80) : prev);
    }
  }, [chatMessages.length]);

  // Strips `#` comments (reusing the same string/triple-quote-aware
  // tokenizeLine already used for syntax highlighting above) before any
  // config extraction below runs. Every FORGE scaffold shows a commented
  // teaching example of each variable's assignment ABOVE the real one
  // (e.g. the chatbot template's Challenge 5 comment shows an unescaped
  // `SYSTEM_MESSAGE = """..."""` example right above the real, single-quoted
  // assignment) — without stripping comments first, a published bot whose
  // author never deleted that comment serves garbled placeholder text
  // (Chef Kofi's example prompt, literal "#" characters and all) to real
  // visitors instead of the system prompt the student actually wrote.
  const stripComments = (raw: string): string => {
    const lines = raw.split('\n');
    let inMultiLineString = false;
    let multiLineDelim = '"""';
    return lines.map((line) => {
      if (inMultiLineString) {
        const closeIdx = line.indexOf(multiLineDelim);
        if (closeIdx === -1) return line;
        inMultiLineString = false;
        const stringPart = line.slice(0, closeIdx + multiLineDelim.length);
        const rest = line.slice(closeIdx + multiLineDelim.length);
        const restStripped = tokenizeLine(rest).filter(t => t.type !== 'comment').map(t => t.value).join('');
        return stringPart + restStripped;
      }
      const strippedLine = tokenizeLine(line).filter(t => t.type !== 'comment').map(t => t.value).join('');
      const tripleDoubleCount = (strippedLine.match(/"""/g) || []).length;
      const tripleSingleCount = (strippedLine.match(/'''/g) || []).length;
      if (tripleDoubleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = '"""'; }
      else if (tripleSingleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = "'''"; }
      return strippedLine;
    }).join('\n');
  };

  // Locates the opening bracket (openChar) immediately after `fromIndex`
  // and its correctly-matching closing bracket, skipping over quoted-string
  // contents — used instead of a lazy \[...\] regex, which stops at the
  // first literal closing bracket anywhere, including one sitting inside an
  // item's own text, silently truncating or emptying the extracted list/dict.
  const findBalancedBracket = (text: string, openChar: string, closeChar: string, fromIndex: number): { start: number; end: number } | null => {
    const openIdx = text.indexOf(openChar, fromIndex);
    if (openIdx === -1) return null;
    let depth = 0;
    let i = openIdx;
    let inString: string | null = null;
    while (i < text.length) {
      const ch = text[i];
      if (inString) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inString) inString = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") { inString = ch; i++; continue; }
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) return { start: openIdx, end: i };
      }
      i++;
    }
    return null;
  };

  const unescapeQuoted = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // Extract all config variables from the student's Python code
  // Supports both SCREAMING_CASE and snake_case variable names
  const extractConfigFromCode = (rawCode: string) => {
    const code = stripComments(rawCode);
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
        const match = code.match(new RegExp(`${name}\\s*=\\s*["']?(-?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?)["']?`));
        if (match) return parseFloat(match[1]);
      }
      return fallback;
    };
    const extractBool = (fallback: boolean, ...varNames: string[]) => {
      for (const name of varNames) {
        const match = code.match(new RegExp(`${name}\\s*=\\s*(True|False)`, 'i'));
        if (match) return match[1].toLowerCase() === 'true';
      }
      return fallback;
    };
    const extractList = (...varNames: string[]): string[] => {
      for (const name of varNames) {
        const varMatch = code.match(new RegExp(`${name}\\s*=\\s*`));
        if (!varMatch || varMatch.index === undefined) continue;
        const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
        if (!bracket) continue;
        const inner = code.slice(bracket.start + 1, bracket.end);
        const items: string[] = [];
        const regex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
        let m;
        while ((m = regex.exec(inner)) !== null) items.push(unescapeQuoted(m[1] ?? m[2]));
        return items;
      }
      return [];
    };
    const extractDict = (...varNames: string[]): Record<string, string> => {
      for (const name of varNames) {
        const varMatch = code.match(new RegExp(`${name}\\s*=\\s*`));
        if (!varMatch || varMatch.index === undefined) continue;
        const bracket = findBalancedBracket(code, '{', '}', varMatch.index + varMatch[0].length);
        if (!bracket) continue;
        const inner = code.slice(bracket.start + 1, bracket.end);
        const result: Record<string, string> = {};
        const regex = /(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
        let m;
        while ((m = regex.exec(inner)) !== null) result[unescapeQuoted(m[1] ?? m[2])] = unescapeQuoted(m[3] ?? m[4]);
        return result;
      }
      return {};
    };
    const extractQAPairs = (): Array<{q: string; a: string}> => {
      const varMatch = code.match(/(?:QA_PAIRS|qa_pairs)\s*=\s*/);
      if (!varMatch || varMatch.index === undefined) return [];
      const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
      if (!bracket) return [];
      const inner = code.slice(bracket.start + 1, bracket.end);
      const pairs: Array<{q: string; a: string}> = [];
      const regex = /\{\s*["']q["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*["']a["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;
      let m;
      while ((m = regex.exec(inner)) !== null) pairs.push({ q: unescapeQuoted(m[1] ?? m[2]), a: unescapeQuoted(m[3] ?? m[4]) });
      return pairs;
    };
    const extractFewShotExamples = (): Array<{input: string; output: string}> => {
      const varMatch = code.match(/(?:FEW_SHOT_EXAMPLES|few_shot_examples)\s*=\s*/);
      if (!varMatch || varMatch.index === undefined) return [];
      const bracket = findBalancedBracket(code, '[', ']', varMatch.index + varMatch[0].length);
      if (!bracket) return [];
      const inner = code.slice(bracket.start + 1, bracket.end);
      const examples: Array<{input: string; output: string}> = [];
      const regex = /\{\s*["']input["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*["']output["']\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\}/g;
      let m;
      while ((m = regex.exec(inner)) !== null) examples.push({ input: unescapeQuoted(m[1] ?? m[2]), output: unescapeQuoted(m[3] ?? m[4]) });
      return examples;
    };
    // Extract if/elif/else conditional blocks that set a target variable
    const extractConditionalVar = (targetVar: string): Record<string, string> => {
      const result: Record<string, string> = {};
      const blockRegex = new RegExp(
        `(?:if|elif)\\s+\\w+\\s*==\\s*["']([^"']+)["'][^:]*:[\\s\\S]{0,300}?\\n\\s*${targetVar}\\s*=\\s*["']([^"']+)["']`,
        'g'
      );
      let m;
      while ((m = blockRegex.exec(code)) !== null) {
        result[m[1]] = m[2];
      }
      const elseRegex = new RegExp(`else\\s*:[\\s\\S]{0,300}?\\n\\s*${targetVar}\\s*=\\s*["']([^"']+)["']`);
      const elseMatch = code.match(elseRegex);
      if (elseMatch) result['__else__'] = elseMatch[1];
      return result;
    };

    return {
      botName: extract('AI Bot', 'BOT_NAME', 'bot_name', 'AGENT_NAME'),
      botEmoji: extract('🤖', 'BOT_EMOJI', 'bot_emoji'),
      greeting: extract('', 'AI_MESSAGE', 'greeting', 'GREETING_MESSAGE'),
      creatorName: extract('', 'CREATOR_NAME', 'creator'),
      systemPrompt: extract('You are a helpful AI assistant.', 'SYSTEM_MESSAGE', 'system_message', 'SYSTEM_PROMPT', 'system_prompt'),
      temperature: extractNumber(0.7, 'TEMPERATURE', 'temperature'),
      responseStyle: extract('Balanced', 'RESPONSE_STYLE', 'response_style'),
      maxResponseLength: extract('medium', 'MAX_RESPONSE_LENGTH', 'max_response_length'),
      responseFormat: extract('', 'RESPONSE_FORMAT', 'response_format'),
      conversationRules: extractList('RULES', 'rules', 'CONVERSATION_RULES'),
      conversationStarters: extractList('CONVERSATION_STARTERS', 'conversation_starters'),
      secretResponses: extractDict('SECRET_RESPONSES', 'secret_responses', 'EASTER_EGGS', 'easter_eggs'),
      catchphrases: extractList('CATCHPHRASES', 'catchphrases'),
      blockedTopics: extractList('BLOCKED_TOPICS', 'blocked_topics'),
      followUpQuestions: extractBool(true, 'FOLLOW_UP_QUESTIONS', 'follow_up_questions'),
      rememberName: extractBool(true, 'MEMORY_ENABLED', 'memory_enabled', 'REMEMBER_NAME'),
      errorMessage: extract('', 'ERROR_MESSAGE', 'error_message'),
      knowledgeBase: extract('', 'KNOWLEDGE_BASE', 'knowledge_base'),
      qaPairs: extractQAPairs(),
      showReasoning: extractBool(false, 'SHOW_REASONING', 'show_reasoning'),
      tools: extractDict('TOOLS', 'tools'),
      toolInstructions: extractDict('TOOL_INSTRUCTIONS', 'tool_instructions'),
      forbiddenWords: extractList('FORBIDDEN_WORDS', 'forbidden_words'),
      mood: extract('neutral', 'MOOD', 'mood'),
      fewShotExamples: extractFewShotExamples(),
      languageStyle: extract('casual', 'LANGUAGE_STYLE', 'language_style'),
      signOff: extract('', 'SIGN_OFF', 'sign_off'),
      maxTokens: extractNumber(512, 'MAX_TOKENS', 'max_tokens'),
      appTheme: extract('default', 'APP_THEME', 'app_theme'),
      voiceEnabled: extractBool(false, 'VOICE_ENABLED', 'voice_enabled'),
      voiceMode: extract('push-to-talk', 'VOICE_MODE', 'voice_mode'),
      wakeWord: extract('', 'WAKE_WORD', 'wake_word'),
      voiceGender: extract('default', 'VOICE_GENDER', 'voice_gender'),
      moodResponses: extractDict('MOOD_RESPONSES', 'mood_responses'),
      responseTone: extract('', 'RESPONSE_TONE', 'response_tone'),
      responseToneConditional: extractConditionalVar('RESPONSE_TONE'),
      timeOfDay: extract('', 'TIME_OF_DAY', 'time_of_day'),
    };
  };

  const config = useMemo(() => {
    if (!project) return null;
    return extractConfigFromCode(project.code);
  }, [project]);

  // Send greeting as first message when config loads or after reset
  // Delay slightly so the welcome screen with conversation starters is visible
  useEffect(() => {
    if (!config) return;
    if (chatMessages.length > 0) return;
    const greeting = config.greeting || `Hi! I'm ${config.botName}. How can I help you?`;
    const timer = setTimeout(() => {
      setChatMessages(prev => {
        // Only add greeting if still empty (user may have clicked a starter)
        if (prev.length > 0) return prev;
        return [{ role: 'assistant', content: greeting }];
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [config, chatMessages.length]);

  const theme = useMemo(() => {
    if (!config) return THEMES[0];
    return THEMES.find(t => t.id === config.appTheme) || THEMES[0];
  }, [config]);

  const systemPrompt = config?.systemPrompt || 'You are a helpful AI assistant.';

  const projectTitle = useMemo(() => {
    if (!project) return '';
    return config?.botName && config.botName !== 'AI Bot' ? config.botName : project.project_name;
  }, [project, config]);

  const highlightedLines = useMemo(() => {
    if (!project) return [];
    return project.code.split('\n').map(line => {
      if (!line) return '&nbsp;';
      return tokenizeLine(line).map(t => {
        const escaped = escapeHtml(t.value);
        if (t.type === 'text') return escaped;
        return `<span class="${TOKEN_COLORS[t.type]}">${escaped}</span>`;
      }).join('');
    });
  }, [project]);

  const handleCopy = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  };

  // ── Voice Helpers ──
  const stripMarkdown = (text: string) => text.replace(/[*_`#\[\]()>~|]/g, '').replace(/\n+/g, ' ').trim();

  const speakText = useCallback((text: string, voiceGender?: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (voiceGender && voiceGender !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const genderKeywords = voiceGender === 'female' ? ['female', 'woman', 'zira', 'samantha', 'karen', 'fiona', 'moira', 'tessa', 'victoria'] : ['male', 'man', 'david', 'daniel', 'james', 'alex', 'fred', 'thomas'];
      const match = voices.find(v => genderKeywords.some(k => v.name.toLowerCase().includes(k)));
      if (match) utterance.voice = match;
    }
    currentUtteranceRef.current = utterance;
    setIsSpeaking(true);
    utterance.onend = () => {
      if (currentUtteranceRef.current === utterance) setIsSpeaking(false);
      // Recognition is in continuous mode — no need to restart
    };
    utterance.onerror = () => {
      if (currentUtteranceRef.current === utterance) setIsSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const [waitingForWakeWord, setWaitingForWakeWord] = useState(false);
  const waitingForWakeWordRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const startListeningOnce = useCallback((wakeWord?: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Speech recognition not supported in this browser'); return; }
    if (!voiceModeRef.current) return;
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    const isWakeWordMode = !!wakeWord;
    if (isWakeWordMode) { setWaitingForWakeWord(true); waitingForWakeWordRef.current = true; }
    setIsListening(true);
    retryCountRef.current = 0;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = last[0].transcript.trim();
      if (!transcript) return;
      // Recognition is continuous and stays live while the bot's reply
      // plays through the speakers — without this, an unsuspecting
      // visitor (no headphones) has the still-open mic transcribe the
      // bot's OWN spoken reply and fire it right back as a new question,
      // which the bot answers aloud again, which the mic picks up again.
      // This never self-terminates; it's a live, unauthenticated loop
      // burning the shared AI-gateway key for as long as the tab stays
      // open. Build Studio's own Live Preview already guards this the
      // same way — this page never got the fix.
      if (isSpeakingRef.current) return;
      // Reset on every real transcript, not just once at listening-start —
      // Chrome ends continuous recognition on routine silence timeouts
      // even during normal, working use, so without this a completely
      // healthy conversation burns through MAX_RETRIES in about a minute
      // and hands-free dies with no further recovery.
      retryCountRef.current = 0;

      if (isWakeWordMode && waitingForWakeWordRef.current) {
        if (transcript.toLowerCase().includes(wakeWord!.toLowerCase())) {
          waitingForWakeWordRef.current = false;
          setWaitingForWakeWord(false);
          toast.success(`🎤 "${wakeWord}" detected! Listening...`);
        }
        return;
      }
      handleChatSendRef.current(transcript);
      if (isWakeWordMode) {
        waitingForWakeWordRef.current = true;
        setWaitingForWakeWord(true);
      }
    };

    recognition.onend = () => {
      if (voiceModeRef.current && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        try { recognition.start(); } catch { setIsListening(false); }
        return;
      }
      // voiceModeRef.current still true here means retries ran out while
      // the visitor never asked hands-free to stop — used to leave the
      // toggle showing "on" over a genuinely dead mic with no explanation.
      // (If it's already false, they turned it off themselves and that
      // handler already did its own state updates — nothing extra to say.)
      if (voiceModeRef.current) {
        voiceModeRef.current = false;
        setVoiceConversationMode(false);
        toast.error('Hands-free mode stopped listening — tap the mic to turn it back on.');
      }
      setIsListening(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow mic access in browser settings and try again.');
        voiceModeRef.current = false;
        setIsListening(false);
        setWaitingForWakeWord(false);
        waitingForWakeWordRef.current = false;
        return;
      }
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (retryCountRef.current >= MAX_RETRIES) {
        toast.error(describeMicError(e.error));
        setIsListening(false);
        setWaitingForWakeWord(false);
        waitingForWakeWordRef.current = false;
      }
    };

    try {
      recognition.start();
    } catch (err) {
      toast.error('Could not start microphone. Check browser permissions.');
      setIsListening(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      voiceModeRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      setIsListening(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      voiceModeRef.current = true;
      startListeningOnce();
    }
  }, [isListening, startListeningOnce]);

  const toggleVoiceConversation = useCallback(() => {
    const newMode = !voiceConversationMode;
    setVoiceConversationMode(newMode);
    voiceModeRef.current = newMode;
    if (newMode) {
      toast.success('🎙️ Hands-free mode ON');
      const ww = config?.wakeWord || '';
      wakeWordRef.current = ww;
      startListeningOnce(ww || undefined);
    } else {
      toast.info('Hands-free mode OFF');
      wakeWordRef.current = '';
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      window.speechSynthesis?.cancel();
      setIsListening(false);
      setIsSpeaking(false);
      setWaitingForWakeWord(false);
      waitingForWakeWordRef.current = false;
    }
  }, [voiceConversationMode, startListeningOnce, config]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleShareUrl = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: project?.project_name, text: `Try my AI app: ${project?.project_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

    const handleChatSend = async (directMessage?: string) => {
    const msg = directMessage || chatInput.trim();
    if (!msg || isStreaming || !config || !project) return;
    const userMsg = msg;
    setChatInput('');
    const lowerMsg = userMsg.toLowerCase();

    // Skipped entirely when the project defines a real respond() — see
    // codeDefinesRespond's own comment. Was previously unconditional here
    // AND used looser matching than Build Studio's own Live Preview (exact-
    // only trigger match, first-match-wins/no-stop-words Q&A, raw substring
    // blocked-topic match, no forbidden-word scrubbing on canned answers) —
    // both fixed below to share the exact same rules the preview already
    // uses, so testing in Build Studio reliably predicts what ships here.
    const hasRespond = codeDefinesRespond(project.code || '');
    const normalizeTrigger = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '');
    const normalizedMsg = normalizeTrigger(userMsg);
    const scrubForbidden = (text: string) => (config.forbiddenWords || []).reduce((acc: string, word: string) => {
      const w = word.trim();
      if (!w) return acc;
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return acc.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '***');
    }, text);

    // 1. Check for secret responses (client-side, near-exact match)
    if (!hasRespond) for (const [trigger, response] of Object.entries(config.secretResponses)) {
      if (normalizedMsg === normalizeTrigger(trigger)) {
        const reply = scrubForbidden(String(response));
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: reply }]);
        if (config.voiceEnabled && ttsEnabled) speakText(reply, config.voiceGender);
        return;
      }
    }

    // 2. Client-side Q&A matching — best match wins, not first match
    if (!hasRespond) {
      const QA_STOP_WORDS = new Set(['can', 'you', 'the', 'and', 'for', 'are', 'that', 'this', 'with', 'what', 'how', 'does', 'did', 'was', 'were', 'have', 'has', 'just', 'please', 'your', 'like', 'want', 'need', 'tell', 'know', 'get', 'got', 'not', 'but', 'all', 'any', 'out', 'who', 'why', 'when', 'where', 'about', 'me']);
      const userWords = lowerMsg.split(/\s+/).filter(w => w.length > 2 && !QA_STOP_WORDS.has(w));
      let bestQA: { pair: (typeof config.qaPairs)[number]; score: number } | null = null;
      for (const pair of config.qaPairs) {
        const qLower = pair.q.toLowerCase().trim();
        if (!qLower) continue;
        const isSupersetOfQ = lowerMsg.includes(qLower);
        const isGenericSubstringOfQ = userWords.length >= 2 && qLower.includes(lowerMsg);
        if (isSupersetOfQ || isGenericSubstringOfQ) {
          const score = 1000 + qLower.length;
          if (!bestQA || score > bestQA.score) bestQA = { pair, score };
          continue;
        }
        const qWords = qLower.split(/\s+/).filter(w => w.length > 2 && !QA_STOP_WORDS.has(w));
        const userInQ = qWords.length > 0 ? userWords.filter(w => qLower.includes(w)).length / qWords.length : 0;
        const qInUser = userWords.length > 0 ? qWords.filter(w => lowerMsg.includes(w)).length / userWords.length : 0;
        if (userWords.length >= 2 && userInQ >= 0.6 && qInUser >= 0.6) {
          const score = userInQ + qInUser;
          if (!bestQA || score > bestQA.score) bestQA = { pair, score };
        }
      }
      if (bestQA) {
        let answer = bestQA.pair.a;
        if (config.catchphrases.length > 0) {
          answer += ` ${config.catchphrases[Math.floor(Math.random() * config.catchphrases.length)]}`;
        }
        if (config.signOff) answer += `\n\n${config.signOff}`;
        const reply = scrubForbidden(answer);
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: reply }]);
        if (config.voiceEnabled && ttsEnabled) speakText(reply, config.voiceGender);
        return;
      }
    }

    // 3. Blocked topics (client-side) — word-boundary match, not raw
    // substring (a blocked topic like "sex" used to also trip on "Sussex").
    if (!hasRespond) {
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const topic of config.blockedTopics) {
        const t = topic.trim();
        if (t.length > 0 && new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(userMsg)) {
          let refusal = `I'm sorry, I can't discuss "${topic}". Is there something else I can help you with?`;
          if (config.signOff) refusal += `\n\n${config.signOff}`;
          setChatMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: refusal }]);
          if (config.voiceEnabled && ttsEnabled) speakText(refusal, config.voiceGender);
          return;
        }
      }
    }

    // 4. AI-powered response for everything else
    let newMessages: ChatMessage[] = [];
    setChatMessages(prev => {
      newMessages = [...prev, { role: 'user', content: userMsg }];
      return newMessages;
    });
    setIsStreaming(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const placeholderId = Date.now();

    try {
      // config.rememberName gates this in Build Studio's own Live Preview
      // (ProjectEditor.tsx) — this always sent full history regardless, so
      // a project with MEMORY_ENABLED = False tested as forgetful in
      // preview but remembered everything once published, the same
      // preview≠published gap already fixed for the interceptors above.
      const history = config.rememberName
        ? newMessages.filter(m => m.content !== '...').map(m => ({ role: m.role, content: m.content }))
        : [];
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...', _id: placeholderId }]);

      const mergedQA = config.qaPairs.length > 0 ? config.qaPairs : undefined;
      const mergedKnowledge = config.knowledgeBase || undefined;

      // 429 means the shared 10-slot ai_gateway_slots pool (or the upstream
      // gateway's own rate limit) was momentarily full — not that anything
      // is broken. Retry a few times with backoff before surfacing a hard
      // error, same as Build Studio's own Live Preview, instead of a
      // student's very first "busy" moment reading as "the bot is broken."
      const requestBody = JSON.stringify({
        code: userMsg,
        model: project.template_id || 'chatbot',
        action: 'test-agent',
        systemPrompt,
        messages: history.slice(0, -1),
        knowledgeBase: mergedKnowledge,
        qaData: mergedQA,
        // The published bot's real main.py — if it defines a real
        // respond() that returns a string, the edge function uses that
        // directly. Same fallback-safe contract as the editor's own
        // test chat: anything else falls straight through to the
        // existing AI behavior, unchanged.
        studentCode: project.code,
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
          tools: config.tools,
          toolInstructions: config.toolInstructions,
          forbiddenWords: config.forbiddenWords,
          mood: config.mood,
          fewShotExamples: config.fewShotExamples,
          languageStyle: config.languageStyle,
          signOff: config.signOff,
          maxTokens: config.maxTokens,
          moodResponses: config.moodResponses,
          responseTone: config.responseTone,
          responseToneConditional: config.responseToneConditional,
          errorMessage: config.errorMessage,
          timeOfDay: config.timeOfDay,
          greeting: config.greeting,
        },
      });
      // fetchAIEndpoint already retries on 429 internally (up to 3 times,
      // with backoff) — this used to be wrapped in a SECOND, identical
      // retry loop here, so one 429 could trigger up to 3 outer × (1 + 3
      // inner) = 16 real fetches against the shared gateway slot pool,
      // amplifying load hardest on exactly the congestion this was meant
      // to smooth. onRetry is the utility's own intended hook for the
      // "busy, retrying..." toast, not a second retry mechanism.
      const resp = await fetchAIEndpoint(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: requestBody,
          signal: controller.signal,
          onRetry: () => toast.info('This app is busy — retrying automatically...', { id: 'ai-busy-retry' }),
        }
      );

      if (!resp.ok || !resp.body) throw new Error('AI service error');

      // Neither of these was ever read on the published page — the
      // "🐍 Answered by your Python code" / "🐍 Python error" badges Live
      // Preview shows were entirely absent here, so a bot's own creator
      // had no way to tell, from their published page, whether their real
      // respond() function was actually running or silently crashing.
      const pyStatus = resp.headers.get('X-Python-Status');
      const usedRealPython = pyStatus === 'handled';
      const pythonErrorType = pyStatus === 'error' ? (resp.headers.get('X-Python-Error-Type') || 'error') : undefined;
      const rawPyErrorMsg = resp.headers.get('X-Python-Error-Message');
      // A malformed percent-encoding here used to throw inside the same
      // try block that reads the (already successful) response stream
      // below — the generic catch would then discard a valid answer that
      // was sitting unread, showing "Failed to get a response" instead.
      let pythonErrorMessage: string | undefined;
      if (rawPyErrorMsg) {
        try { pythonErrorMessage = decodeURIComponent(rawPyErrorMsg); }
        catch { pythonErrorMessage = rawPyErrorMsg; }
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setChatMessages(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m._id === placeholderId);
                const targetIdx = idx !== -1 ? idx : updated.length - 1;
                updated[targetIdx] = { role: 'assistant', content: fullText, _id: placeholderId, usedRealPython, pythonErrorType, pythonErrorMessage };
                return updated;
              });
            }
          } catch { /* partial JSON */ }
        }
      }
      // Flush remaining buffer
      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setChatMessages(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m._id === placeholderId);
                const targetIdx = idx !== -1 ? idx : updated.length - 1;
                updated[targetIdx] = { role: 'assistant', content: fullText, _id: placeholderId, usedRealPython, pythonErrorType, pythonErrorMessage };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
      // A completed stream that never emitted a single content delta (an
      // empty respond() return, or the provider legitimately completing
      // with zero tokens) left the '...' placeholder in chatMessages with
      // nothing to ever replace it — the render-time skip below only hides
      // '...' while isStreaming is true, so once this request finished
      // (isStreaming -> false in the finally block) it started rendering
      // as a literal, permanent "..." bubble instead of the loading dots.
      if (!fullText) {
        const fallback = config?.errorMessage || "I don't have a response for that — try asking something else.";
        setChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m._id === placeholderId);
          const targetIdx = idx !== -1 ? idx : updated.length - 1;
          if (targetIdx >= 0) updated[targetIdx] = { role: 'assistant', content: fallback, _id: placeholderId, usedRealPython, pythonErrorType, pythonErrorMessage };
          return updated;
        });
      }
      // TTS: Speak the response if voice is enabled
      if (fullText && config?.voiceEnabled && ttsEnabled) {
        speakText(fullText, config?.voiceGender);
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      const isTimeout = e?.name === 'AbortError';
      const errorMsg = isTimeout
        ? '⏱️ Response timed out. Please try again.'
        : (config?.errorMessage || '❌ Failed to get a response. Please try again.');
      // Remove placeholder and replace with error — find by _id for robustness
      setChatMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex((m: any) => m._id === placeholderId);
        if (idx !== -1) {
          updated[idx] = { role: 'assistant', content: errorMsg };
        } else if (updated.length > 0 && updated[updated.length - 1].content === '...') {
          updated[updated.length - 1] = { role: 'assistant', content: errorMsg };
        } else {
          updated.push({ role: 'assistant', content: errorMsg });
        }
        return updated;
      });
    } finally {
      clearTimeout(timeout);
      setIsStreaming(false);
    }
  };
  handleChatSendRef.current = handleChatSend;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ide-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-ide-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-ide-bg flex items-center justify-center text-center p-6">
        <div>
          <h1 className="text-2xl font-bold text-ide-text mb-2">Couldn't load this project</h1>
          <p className="text-ide-text-muted mb-4">
            Something went wrong loading this page — this isn't the same as the project not existing. Try again.
          </p>
          <Button onClick={() => fetchProject()} className="bg-ide-accent text-ide-bg-deep">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-ide-bg flex items-center justify-center text-center p-6">
        <div>
          <h1 className="text-2xl font-bold text-ide-text mb-2">Project not found</h1>
          <p className="text-ide-text-muted mb-4">
            This project may not exist, the link is incorrect, or it hasn't been published yet — ask the author to click "Submit Project" if it's theirs.
          </p>
          <Link to="/hackathons">
            <Button className="bg-ide-accent text-ide-bg-deep">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to FORGE
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeEmoji = project.template_id === 'chatbot' ? '🤖' : project.template_id === 'agent' ? '🧠' : '💻';
  const codeLines = project.code.split('\n');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* noindex: this page shows a minor's real name (project.author_name
          below) — nothing about a student project needs to be searchable,
          and there's no reason that name should be crawlable/indexed. */}
      <SEO title={`${project.project_name} - AI App`} description={project.description || 'An AI app built by a student'} canonical={`/projects/${id}`} noindex />

      {/* ── App-like Header ── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 border-b"
        style={{ backgroundColor: theme.chat, borderColor: `${theme.accent}20` }}
      >
        {/* min-w-0 on the title cluster + truncate on the title itself —
            without it, a long project_name had nothing forcing it to wrap
            or shrink, so on a narrow phone this whole justify-between row
            overflowed the viewport and pushed Share/FORGE off-screen
            instead of the title just truncating. */}
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${theme.accent}20` }}>
              {config?.botEmoji || typeEmoji}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">{projectTitle}</h1>
              <p className="text-[11px] text-ide-text-muted flex items-center gap-1.5 truncate">
                <User className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{project.author_name}</span>
                <span className="text-ide-border flex-shrink-0">•</span>
                <Trophy className="w-3 h-3 text-[#FFD700] flex-shrink-0" /> <span className="flex-shrink-0">{project.points_earned} pts</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={handleShareUrl} className="h-8 text-xs text-ide-text-muted hover:text-white hover:bg-white/10">
              <Share2 className="w-3.5 h-3.5 mr-1" /> Share
            </Button>
            <Link to="/hackathons">
              <Button size="sm" variant="ghost" className="h-8 text-xs text-ide-text-muted hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> FORGE
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Main: Full-Screen App Experience ── */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Description */}
        {project.description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="px-4 py-3 border-b"
            style={{ borderColor: `${theme.accent}15` }}
          >
            <p className="text-sm text-ide-text-muted">{project.description}</p>
          </motion.div>
        )}

        {/* ── Chat UI — THE APP ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {/* Chat Header */}
          <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: `${theme.accent}15` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Live AI Demo</span>
            {chatMessages.length > 0 && (
              <button onClick={() => setChatMessages([])} title="Reset conversation"
                className="text-ide-text-muted hover:text-white transition-colors ml-1">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto"
              style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
              Online
            </span>
          </div>

          {/* Messages */}
          <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: '400px' }}>
            {chatMessages.length === 0 && config && (
              <div className="text-center py-12 space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: `${theme.accent}15` }}
                >
                  <span className="text-4xl">{config.botEmoji}</span>
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{projectTitle}</h2>
                  <p className="text-sm text-ide-text-muted max-w-sm mx-auto">
                    {config.greeting || project.description || 'Send a message to start using this AI app!'}
                  </p>
                </div>
              </div>
            )}
            {/* Was inside the block above, gated on chatMessages.length === 0
                — the auto-greeting effect below adds an assistant message
                ~1.5s after load specifically so this welcome screen (and
                these starter buttons) would be visible for a moment first,
                but that same greeting landing is what set length to 1 and
                unmounted this block. A visitor saw Challenge 10's starter
                buttons flash for about a second, then permanently vanish
                before there was any real chance to read or click one.
                Decoupled from the header above and now keyed on "no real
                reply from the visitor yet" instead — persists through the
                auto-greeting, disappears once they've actually engaged. */}
            {!chatMessages.some(m => m.role === 'user') && config && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 mb-2">
                {(config.conversationStarters.length > 0
                  ? config.conversationStarters.slice(0, 4)
                  : ['Hello! What can you do?', 'Help me with something', 'Tell me about yourself']
                ).map((example, i) => (
                  <button
                    key={`${example}-${i}`}
                    onClick={() => { handleChatSend(example); }}
                    className="text-xs px-3 py-2 rounded-full text-ide-text-muted hover:text-white transition-all"
                    style={{ backgroundColor: `${theme.accent}10`, border: `1px solid ${theme.accent}25` }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
            {chatMessages.map((msg, i) => {
              // Skip rendering the placeholder bubble entirely during streaming
              if (msg.content === '...' && isStreaming && msg.role === 'assistant') return null;
              return (
                <motion.div
                  key={msg._id || `chat-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
                    style={
                      msg.role === 'user'
                        ? { backgroundColor: theme.accent, color: '#fff', borderBottomRightRadius: '4px' }
                        : { backgroundColor: `${theme.accent}18`, border: `1px solid ${theme.accent}30`, color: '#e2e8f0', borderBottomLeftRadius: '4px' }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        {/* Live Preview (ProjectEditor.tsx) has shown these
                            badges for a while — the published page never
                            read the X-Python-* headers at all, so a bot's
                            own creator had no way to tell, from their
                            published page, whether their real respond()
                            was actually answering or silently crashing. */}
                        {msg.usedRealPython && (
                          <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-400 mb-1" title="main.py's respond() answered this message directly — the AI wasn't called.">
                            🐍 Answered by your Python code
                          </div>
                        )}
                        {msg.pythonErrorType && (
                          <div className="text-[9px] font-bold uppercase tracking-wide text-amber-400 mb-1" title={msg.pythonErrorMessage || `respond() didn't run (${msg.pythonErrorType}) — the AI answered instead.`}>
                            🐍 {msg.pythonErrorMessage ? `Python error: ${msg.pythonErrorMessage}` : `Python error (${msg.pythonErrorType})`} — AI answered instead
                          </div>
                        )}
                        <div className={`prose prose-invert prose-sm max-w-none [&_p]:mb-1 [&_p]:mt-0 ${
                          project.template_id === 'agent' && msg.content.includes('**🤔 Thought:**')
                            ? '[&_strong]:text-ide-cyan [&_p:has(strong)]:border-l-2 [&_p:has(strong)]:border-ide-accent/40 [&_p:has(strong)]:pl-2 [&_p:has(strong)]:py-0.5'
                            : ''
                        }`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : msg.content}
                  </div>
                </motion.div>
              );
            })}
            {isStreaming && (() => {
              const lastMsg = chatMessages[chatMessages.length - 1];
              return lastMsg?.role === 'assistant' && (lastMsg.content === '...' || lastMsg.content === '');
            })() && (
              <div className="flex gap-1 pl-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accent, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 space-y-2" style={{ borderColor: `${theme.accent}20`, backgroundColor: theme.chat }}>
            {isListening && (
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="relative">
                  <Mic className="w-4 h-4 text-red-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full animate-ping" />
                </div>
                <span className="text-xs text-red-400 font-medium animate-pulse">
                  {waitingForWakeWord && config?.wakeWord ? `Say "${config.wakeWord}"...` : 'Listening...'}
                </span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2 py-1">
                <Volume2 className="w-4 h-4 animate-pulse" style={{ color: theme.accent }} />
                <span className="text-xs font-medium" style={{ color: theme.accent }}>Speaking...</span>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder={isListening ? '🎤 Listening...' : 'Type a message...'}
                disabled={isStreaming || isListening}
                maxLength={2000}
                className="h-10 text-sm border-0 text-white rounded-full px-4 focus-visible:ring-1"
                style={{ backgroundColor: `${theme.accent}10`, boxShadow: `0 0 0 0px ${theme.accent}` }}
              />
              {config?.voiceEnabled && (
                <>
                  <Button onClick={toggleListening} disabled={isStreaming}
                    title={isListening ? 'Stop listening' : 'Tap to speak'} aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
                    className={`h-10 w-10 rounded-full flex-shrink-0 p-0 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-white hover:opacity-90'}`}
                    style={!isListening ? { backgroundColor: `${theme.accent}30` } : undefined}>
                    <Mic className="w-4 h-4" />
                  </Button>
                  {config.voiceMode === 'hands-free' && (
                    <Button onClick={toggleVoiceConversation} disabled={isStreaming}
                      title={voiceConversationMode ? 'Stop hands-free' : 'Start hands-free mode'} aria-label={voiceConversationMode ? 'Stop hands-free' : 'Start hands-free mode'}
                      className={`h-10 w-10 rounded-full flex-shrink-0 p-0 ${voiceConversationMode ? 'text-white' : 'text-white hover:opacity-90'}`}
                      style={{ backgroundColor: voiceConversationMode ? theme.accent : `${theme.accent}30` }}>
                      <Radio className="w-4 h-4" />
                    </Button>
                  )}
                  <Button onClick={() => { setTtsEnabled(v => !v); if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); } }}
                    title={ttsEnabled ? 'Mute voice' : 'Unmute voice'} aria-label={ttsEnabled ? 'Mute voice' : 'Unmute voice'}
                    className="h-10 w-10 rounded-full flex-shrink-0 p-0 text-white hover:opacity-90"
                    style={{ backgroundColor: `${theme.accent}30` }}>
                    {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </>
              )}
              <Button onClick={() => handleChatSend()} disabled={isStreaming || !chatInput.trim()}
                title="Send message" aria-label="Send message"
                className="h-10 w-10 rounded-full flex-shrink-0 text-white hover:opacity-90 p-0"
                style={{ backgroundColor: theme.accent }}>
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Collapsible Code Section ── */}
        <div className="border-t border-ide-border">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowCode(!showCode)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCode(!showCode); } }}
            aria-expanded={showCode}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-ide-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="font-medium">View Source Code</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-ide-sidebar text-ide-text-muted">{codeLines.length} lines</span>
            </div>
            <div className="flex items-center gap-2">
              {showCode && (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className="h-7 text-[10px] text-ide-text-muted hover:text-white">
                  {copied ? <Check className="w-3 h-3 mr-1 text-[#00CC66]" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
              {showCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="flex bg-ide-editor max-h-[400px] overflow-auto border-t border-ide-border">
                <div className="py-4 pr-2 select-none border-r border-ide-border flex-shrink-0">
                  {codeLines.map((_, i) => (
                    <div key={i} className="text-right pr-2 pl-4 font-mono text-[12px] leading-6 text-ide-text-muted">{i + 1}</div>
                  ))}
                </div>
                <pre className="p-4 flex-1 min-w-0">
                  <code className="text-[13px] font-mono leading-6 whitespace-pre">
                    {highlightedLines.map((line, i) => (
                      <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                  </code>
                </pre>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 text-center border-t border-ide-border/50">
          <p className="text-[11px] text-ide-text-muted">
            Built with <span className="font-bold text-ide-accent">FORGE</span> — 
            <Link to="/hackathons" className="text-ide-accent hover:underline ml-1">Build your own AI app →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;
