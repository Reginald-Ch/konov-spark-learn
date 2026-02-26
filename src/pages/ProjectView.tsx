import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Code, User, Calendar, Trophy, ExternalLink, Copy, Check, Send, MessageSquare, Loader2 } from 'lucide-react';
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

// Token-based Python syntax highlighter (same as ProjectEditor)
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

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('ai_projects')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();
      if (!error && data) setProject(data as Project);
      setIsLoading(false);
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const systemPrompt = useMemo(() => {
    if (!project) return 'You are a helpful AI assistant.';
    const match = project.code.match(/SYSTEM_PROMPT\s*=\s*["'](.*)["']/);
    return match ? match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 'You are a helpful AI assistant.';
  }, [project]);

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

  const handleChatSend = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setIsStreaming(true);

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
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
            messages: history.slice(0, -1), // exclude current user msg (it's in code)
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
    } catch {
      setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '❌ Failed to get a response. Please try again.' }]);
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

  const typeEmoji = project.template_id === 'chatbot' ? '🤖' : project.template_id === 'voice-assistant' ? '🎙️' : project.template_id === 'agent' ? '🧠' : '💻';
  const codeLines = project.code.split('\n');

  return (
    <div className="min-h-screen bg-ide-bg">
      <SEO title={`${project.project_name} - AI Project`} description={project.description || 'An AI project built on the hackathon platform'} />

      {/* Header */}
      <div className="border-b border-ide-border bg-ide-bg-deep">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/hackathons" className="flex items-center gap-2 text-ide-text-muted hover:text-ide-text transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to FORGE
          </Link>
          <div className="flex items-center gap-2">
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="h-8 text-xs bg-ide-green text-ide-bg-deep">
                  <ExternalLink className="w-3 h-3 mr-1" /> Live Demo
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handleCopy} variant="outline" className="h-8 text-xs border-ide-border text-ide-text">
              {copied ? <Check className="w-3 h-3 mr-1 text-ide-green" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ide-text flex items-center gap-3 mb-2">
            <span className="text-4xl">{typeEmoji}</span>
            {project.project_name}
          </h1>
          {project.description && (
            <p className="text-ide-text-muted text-lg max-w-2xl">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-ide-text-muted">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {project.author_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(project.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 text-ide-yellow"><Trophy className="w-4 h-4" /> {project.points_earned} pts</span>
          </div>
        </div>

        {/* Two-column: Code + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Code View */}
          <div className="lg:col-span-3 rounded-xl border border-ide-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-ide-bg-deep border-b border-ide-border">
              <Code className="w-4 h-4 text-ide-accent" />
              <span className="text-xs font-mono text-ide-text-muted">main.py</span>
            </div>
            <div className="flex bg-ide-editor overflow-x-auto max-h-[600px] overflow-y-auto">
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
          </div>

          {/* Live Demo Chat */}
          <div className="lg:col-span-2 rounded-xl border border-ide-border overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center gap-2 px-4 py-2 bg-ide-bg-deep border-b border-ide-border">
              <MessageSquare className="w-4 h-4 text-ide-green" />
              <span className="text-xs font-semibold text-ide-text">Try this AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ide-green/20 text-ide-green ml-auto">Live</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-ide-text-muted/40" />
                  <p className="text-sm text-ide-text-muted">Send a message to try this AI project</p>
                  <p className="text-xs text-ide-text-muted/60 mt-1">The AI will respond using the student's system prompt</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-ide-accent text-white rounded-br-sm'
                      : 'bg-ide-sidebar text-ide-text rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
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
            <div className="border-t border-ide-border p-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Type a message..."
                disabled={isStreaming}
                className="h-9 text-sm border-0 bg-ide-editor text-ide-text focus-visible:ring-1 focus-visible:ring-ide-accent"
              />
              <Button size="sm" onClick={handleChatSend} disabled={isStreaming || !chatInput.trim()}
                className="h-9 px-3 bg-ide-accent text-ide-bg-deep hover:bg-ide-accent/90">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;
