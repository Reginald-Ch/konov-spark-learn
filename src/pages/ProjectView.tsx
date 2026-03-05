import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { ArrowLeft, Code, User, Calendar, Trophy, ExternalLink, Copy, Check, Send, MessageSquare, Loader2, Bot, ChevronDown, ChevronUp, Share2, Globe } from 'lucide-react';
import { toast } from 'sonner';

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

const ProjectView = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_projects')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single();
        if (!error && data) setProject(data as Project);
      } catch (e) {
        console.error('Failed to fetch project:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Extract all config variables from the student's Python code
  const extractConfigFromCode = (code: string) => {
    const extract = (varName: string, fallback: string = '') => {
      const tripleMatch = code.match(new RegExp(`${varName}\\s*=\\s*"""([\\s\\S]*?)"""`));
      if (tripleMatch) return tripleMatch[1].trim();
      const tripleMatch2 = code.match(new RegExp(`${varName}\\s*=\\s*'''([\\s\\S]*?)'''`));
      if (tripleMatch2) return tripleMatch2[1].trim();
      const match = code.match(new RegExp(`${varName}\\s*=\\s*["'](.*)["']`));
      return match ? match[1] : fallback;
    };
    const extractNumber = (varName: string, fallback: number) => {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*([\\d.]+)`));
      return match ? parseFloat(match[1]) : fallback;
    };
    const extractBool = (varName: string, fallback: boolean) => {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*(True|False)`));
      return match ? match[1] === 'True' : fallback;
    };
    const extractList = (varName: string): string[] => {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
      if (!match) return [];
      const items: string[] = [];
      const regex = /["']([^"']+)["']/g;
      let m;
      while ((m = regex.exec(match[1])) !== null) items.push(m[1]);
      return items;
    };
    const extractDict = (varName: string): Record<string, string> => {
      const match = code.match(new RegExp(`${varName}\\s*=\\s*\\{([\\s\\S]*?)\\}`));
      if (!match) return {};
      const result: Record<string, string> = {};
      const regex = /["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
      let m;
      while ((m = regex.exec(match[1])) !== null) result[m[1]] = m[2];
      return result;
    };
    const extractQAPairs = (): Array<{q: string; a: string}> => {
      const match = code.match(/QA_PAIRS\s*=\s*\[([\s\S]*?)\]/);
      if (!match) return [];
      const pairs: Array<{q: string; a: string}> = [];
      const regex = /\{\s*["']q["']\s*:\s*["']([^"']+)["']\s*,\s*["']a["']\s*:\s*["']([^"']+)["']\s*\}/g;
      let m;
      while ((m = regex.exec(match[1])) !== null) pairs.push({ q: m[1], a: m[2] });
      return pairs;
    };

    return {
      botName: extract('BOT_NAME', extract('AGENT_NAME', 'AI Bot')),
      botEmoji: extract('BOT_EMOJI', extract('AGENT_EMOJI', '🤖')),
      greeting: extract('GREETING_MESSAGE', ''),
      creatorName: extract('CREATOR_NAME', ''),
      systemPrompt: extract('SYSTEM_PROMPT', 'You are a helpful AI assistant.'),
      temperature: extractNumber('TEMPERATURE', 0.7),
      responseStyle: extract('RESPONSE_STYLE', 'Balanced'),
      maxResponseLength: extract('MAX_RESPONSE_LENGTH', 'medium'),
      responseFormat: extract('RESPONSE_FORMAT', ''),
      conversationRules: extractList('CONVERSATION_RULES'),
      conversationStarters: extractList('CONVERSATION_STARTERS'),
      easterEggs: extractDict('EASTER_EGGS'),
      catchphrases: extractList('CATCHPHRASES'),
      blockedTopics: extractList('BLOCKED_TOPICS'),
      followUpQuestions: extractBool('FOLLOW_UP_QUESTIONS', true),
      rememberName: extractBool('REMEMBER_NAME', true),
      errorMessage: extract('ERROR_MESSAGE', ''),
      knowledgeBase: extract('KNOWLEDGE_BASE', ''),
      qaPairs: extractQAPairs(),
      showReasoning: extractBool('SHOW_REASONING', true),
      toolInstructions: extractDict('TOOL_INSTRUCTIONS'),
    };
  };

  const config = useMemo(() => {
    if (!project) return null;
    return extractConfigFromCode(project.code);
  }, [project]);

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

  const handleShareUrl = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: project?.project_name, text: `Try my AI app: ${project?.project_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setIsStreaming(true);

    try {
      const history = newMessages
        .filter(m => m.content !== '...')
        .map(m => ({ role: m.role, content: m.content }));
      setChatMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            code: userMsg,
            action: 'test-agent',
            systemPrompt,
            messages: history.slice(0, -1),
          }),
        }
      );

      if (!resp.ok || !resp.body) throw new Error('AI service error');

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
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullText };
                return updated;
              });
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '❌ Failed to get a response. Please try again.' };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ide-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-ide-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-ide-bg flex items-center justify-center text-center p-6">
        <div>
          <h1 className="text-2xl font-bold text-ide-text mb-2">Project not found</h1>
          <p className="text-ide-text-muted mb-4">This project may not exist or hasn't been published yet.</p>
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
    <div className="min-h-screen bg-ide-bg flex flex-col">
      <SEO title={`${project.project_name} - AI App`} description={project.description || 'An AI app built by a student'} />

      {/* ── App-like Header ── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 border-b border-ide-border bg-ide-bg-deep"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, rgba(88,101,242,0.2), rgba(0,204,102,0.2))' }}>
              {typeEmoji}
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{projectTitle}</h1>
              <p className="text-[11px] text-ide-text-muted flex items-center gap-1.5">
                <User className="w-3 h-3" /> {project.author_name}
                <span className="text-ide-border">•</span>
                <Trophy className="w-3 h-3 text-[#FFD700]" /> {project.points_earned} pts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
            className="px-4 py-3 border-b border-ide-border/50"
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
          <div className="px-4 py-2.5 border-b border-ide-border/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00CC66] animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Live AI Demo</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00CC66]/15 text-[#00CC66] border border-[#00CC66]/30 ml-auto">Online</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: '400px' }}>
            {chatMessages.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(88,101,242,0.15), rgba(0,204,102,0.15))' }}
                >
                  <Bot className="w-10 h-10 text-ide-accent" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{projectTitle}</h2>
                  <p className="text-sm text-ide-text-muted max-w-sm mx-auto">
                    {project.description || 'Send a message to start using this AI app!'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['Hello! What can you do?', 'Help me with something', 'Tell me about yourself'].map(example => (
                    <button
                      key={example}
                      onClick={() => { setChatInput(example); }}
                      className="text-xs px-3 py-2 rounded-full bg-ide-sidebar border border-ide-border text-ide-text-muted hover:text-white hover:border-ide-accent transition-all"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-ide-accent text-white rounded-br-md'
                    : 'bg-ide-sidebar text-ide-text rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-1 [&_p]:mt-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </motion.div>
            ))}
            {isStreaming && chatMessages[chatMessages.length - 1]?.content === '...' && (
              <div className="flex gap-1 pl-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-ide-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-ide-border p-3 flex gap-2 bg-ide-bg-deep">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              placeholder="Type a message..."
              disabled={isStreaming}
              className="h-10 text-sm border-0 bg-ide-sidebar text-white rounded-full px-4 focus-visible:ring-1 focus-visible:ring-ide-accent"
            />
            <Button onClick={handleChatSend} disabled={isStreaming || !chatInput.trim()}
              className="h-10 w-10 rounded-full flex-shrink-0 bg-ide-accent text-white hover:bg-ide-accent/90 p-0">
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </motion.div>

        {/* ── Collapsible Code Section ── */}
        <div className="border-t border-ide-border">
          <button
            onClick={() => setShowCode(!showCode)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-ide-text-muted hover:text-white transition-colors"
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
          </button>

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
