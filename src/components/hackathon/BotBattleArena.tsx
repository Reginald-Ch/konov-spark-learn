import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Swords, Rocket, ThumbsUp, ThumbsDown, RotateCcw, Trophy, Bot, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_name: string;
  author_name: string;
  code: string;
  template_id: string | null;
}

interface BattleMessage {
  speaker: 'bot1' | 'bot2';
  content: string;
}

export const BotBattleArena = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bot1, setBot1] = useState<Project | null>(null);
  const [bot2, setBot2] = useState<Project | null>(null);
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);
  const [isBattling, setIsBattling] = useState(false);
  const [round, setRound] = useState(0);
  const [votes, setVotes] = useState<{ bot1: number; bot2: number }>({ bot1: 0, bot2: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [battleComplete, setBattleComplete] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('ai_projects')
        .select('id, project_name, author_name, code, template_id')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setProjects(data);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battleMessages]);

  const extractSystemPrompt = (code: string): string => {
    const tripleMatch = code.match(/(?:SYSTEM_MESSAGE|SYSTEM_PROMPT|system_message|system_prompt)\s*=\s*"""([\s\S]*?)"""/);
    if (tripleMatch) return tripleMatch[1].trim();
    const singleMatch = code.match(/(?:SYSTEM_MESSAGE|SYSTEM_PROMPT|system_message|system_prompt)\s*=\s*["'](.*)["']/);
    if (singleMatch) return singleMatch[1];
    return 'You are a helpful AI assistant.';
  };

  const extractBotName = (code: string): string => {
    const match = code.match(/(?:BOT_NAME|bot_name|AGENT_NAME)\s*=\s*["'](.*)["']/);
    return match?.[1] || 'AI Bot';
  };

  const streamBotResponse = async (botCode: string, topic: string, conversationSoFar: string): Promise<string> => {
    const systemPrompt = extractSystemPrompt(botCode);
    const botName = extractBotName(botCode);
    
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/python-ai-assist`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'test-agent',
          code: `${conversationSoFar}\n\nNow respond to the topic: "${topic}". Keep it under 3 sentences. Be competitive but friendly. Stay in character as ${botName}.`,
          systemPrompt,
          botConfig: { botName, responseStyle: 'Concise', maxResponseLength: 'short' },
        }),
      }
    );

    if (!resp.ok || !resp.body) return 'I... need a moment to think about that.';
    
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
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullText += content;
        } catch {}
      }
    }
    return fullText || 'No response generated.';
  };

  const BATTLE_TOPICS = [
    "Who's the better AI assistant and why?",
    "What's the most interesting thing you can teach someone?",
    "If you could have any superpower, what would it be?",
    "Challenge: make me laugh in one sentence!",
    "What's your hot take on the future of AI?",
  ];

  const startBattle = async () => {
    if (!bot1 || !bot2) { toast.error('Pick two bots first!'); return; }
    if (bot1.id === bot2.id) { toast.error('Pick two different bots!'); return; }
    
    setIsBattling(true);
    setBattleMessages([]);
    setRound(0);
    setVotes({ bot1: 0, bot2: 0 });
    setHasVoted(false);
    setBattleComplete(false);

    const topic = BATTLE_TOPICS[Math.floor(Math.random() * BATTLE_TOPICS.length)];
    
    // System announcement
    setBattleMessages([{ speaker: 'bot1', content: `⚔️ **BATTLE TOPIC:** ${topic}` }]);
    
    let conversation = '';
    
    for (let r = 0; r < 3; r++) {
      setRound(r + 1);
      
      // Bot 1 speaks
      const bot1Response = await streamBotResponse(bot1.code, topic, conversation);
      conversation += `\n${extractBotName(bot1.code)}: ${bot1Response}`;
      setBattleMessages(prev => [...prev, { speaker: 'bot1', content: bot1Response }]);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Bot 2 responds
      const bot2Response = await streamBotResponse(bot2.code, topic, conversation);
      conversation += `\n${extractBotName(bot2.code)}: ${bot2Response}`;
      setBattleMessages(prev => [...prev, { speaker: 'bot2', content: bot2Response }]);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsBattling(false);
    setBattleComplete(true);
  };

  const handleVote = (winner: 'bot1' | 'bot2') => {
    if (hasVoted) return;
    setHasVoted(true);
    setVotes(prev => ({ ...prev, [winner]: prev[winner] + 1 }));
    toast.success(`🗳️ Vote cast for ${winner === 'bot1' ? extractBotName(bot1!.code) : extractBotName(bot2!.code)}!`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--discord-red)/0.15)] text-[hsl(var(--discord-red))] text-sm font-medium mb-4">
          <Swords className="w-4 h-4" />
          Bot Battle Arena
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">⚔️ Bot Battle Arena</h1>
        <p className="text-[hsl(var(--discord-text-muted))] text-lg">Pick two published bots and watch them duel!</p>
      </motion.div>

      {/* Bot Selection */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[
          { label: 'Challenger 1', selected: bot1, setSelected: setBot1, color: '#5865F2' },
          { label: 'Challenger 2', selected: bot2, setSelected: setBot2, color: '#ED4245' },
        ].map(({ label, selected, setSelected, color }) => (
          <div key={label} className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] p-4">
            <h3 className="text-sm font-bold text-white mb-3" style={{ color }}>{label}</h3>
            {selected ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{extractBotName(selected.code)}</p>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))]">by {selected.author_name}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)} disabled={isBattling} className="text-[hsl(var(--discord-text-muted))]">
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {projects.filter(p => p.id !== (label === 'Challenger 1' ? bot2?.id : bot1?.id)).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[hsl(var(--discord-light)/0.3)] transition-colors"
                  >
                    {p.template_id === 'agent' ? <Brain className="w-4 h-4 text-[hsl(var(--discord-green))]" /> : <Bot className="w-4 h-4 text-[hsl(var(--discord-blurple))]" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{p.project_name}</p>
                      <p className="text-[10px] text-[hsl(var(--discord-text-muted))]">{p.author_name}</p>
                    </div>
                  </button>
                ))}
                {projects.length === 0 && (
                  <p className="text-xs text-[hsl(var(--discord-text-muted))] text-center py-4">No published bots yet</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Start Battle */}
      <div className="text-center mb-8">
        <Button
          onClick={startBattle}
          disabled={!bot1 || !bot2 || isBattling}
          className="bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)] text-white font-bold px-8 py-3 text-lg"
        >
          {isBattling ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Round {round}/3...
            </>
          ) : (
            <>
              <Swords className="w-5 h-5 mr-2" />
              Start Battle!
            </>
          )}
        </Button>
      </div>

      {/* Battle Chat */}
      {battleMessages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[hsl(var(--discord-light)/0.2)] flex items-center gap-2">
            <Swords className="w-4 h-4 text-[hsl(var(--discord-red))]" />
            <span className="text-sm font-bold text-white">Battle Log</span>
            {isBattling && <Badge className="bg-[hsl(var(--discord-red))] text-white text-[10px]">LIVE</Badge>}
          </div>
          
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {battleMessages.map((msg, i) => {
              const isBot1 = msg.speaker === 'bot1';
              const botName = isBot1 ? (bot1 ? extractBotName(bot1.code) : 'Bot 1') : (bot2 ? extractBotName(bot2.code) : 'Bot 2');
              const isAnnouncement = i === 0;
              
              return (
                <motion.div
                  key={`${msg.speaker}-${i}`}
                  initial={{ opacity: 0, x: isBot1 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex ${isAnnouncement ? 'justify-center' : isBot1 ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    isAnnouncement
                      ? 'bg-[hsl(var(--discord-red)/0.15)] text-white text-center text-sm font-bold'
                      : isBot1
                      ? 'bg-[hsl(235,86%,65%,0.15)] border border-[hsl(235,86%,65%,0.3)]'
                      : 'bg-[hsl(359,83%,59%,0.15)] border border-[hsl(359,83%,59%,0.3)]'
                  }`}>
                    {!isAnnouncement && (
                      <p className="text-[10px] font-bold mb-1" style={{ color: isBot1 ? '#5865F2' : '#ED4245' }}>{botName}</p>
                    )}
                    <p className="text-sm text-white/90" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                </motion.div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Voting */}
          {battleComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-4 border-t border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-dark))]"
            >
              <p className="text-center text-sm font-bold text-white mb-3">
                <Trophy className="w-4 h-4 inline mr-1 text-[hsl(var(--discord-yellow))]" />
                Who won? Cast your vote!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => handleVote('bot1')}
                  disabled={hasVoted}
                  className="bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)] text-white"
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {bot1 ? extractBotName(bot1.code) : 'Bot 1'}
                  {hasVoted && <span className="ml-1 text-xs">({votes.bot1})</span>}
                </Button>
                <Button
                  onClick={() => handleVote('bot2')}
                  disabled={hasVoted}
                  className="bg-[hsl(var(--discord-red))] hover:bg-[hsl(var(--discord-red)/0.8)] text-white"
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {bot2 ? extractBotName(bot2.code) : 'Bot 2'}
                  {hasVoted && <span className="ml-1 text-xs">({votes.bot2})</span>}
                </Button>
              </div>
              {hasVoted && (
                <p className="text-center text-xs text-[hsl(var(--discord-text-muted))] mt-2">Thanks for voting! Start a new battle below.</p>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};
