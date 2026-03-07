import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Rocket, Brain, Code, Sparkles, Zap, GraduationCap, Palette, Target, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LearnTabProps {
  onNavigateToBuild: () => void;
  onNavigateToTemplates: () => void;
}

const CHALLENGE_STEPS = [
  {
    step: 1,
    title: "Give Your Bot an Identity",
    subtitle: "Challenges 1–4 — Takes 2 minutes",
    icon: Target,
    color: "#F7941D",
    challenges: [
      { name: 'BOT_NAME', desc: 'The name shown in the header', example: 'BOT_NAME = "GhanaFreedom Guide"' },
      { name: 'BOT_EMOJI', desc: 'The emoji avatar next to messages', example: 'BOT_EMOJI = "🇬🇭"' },
      { name: 'AI_MESSAGE', desc: 'First message users see', example: 'AI_MESSAGE = "Akwaaba! Welcome!"' },
      { name: 'CREATOR_NAME', desc: 'Your name as creator', example: 'CREATOR_NAME = "Your Name"' },
    ],
    tip: 'After saving, your bot name and emoji appear in Live Preview immediately.',
  },
  {
    step: 2,
    title: "The System Message — Most Important!",
    subtitle: "Challenge 5 — Spend the most time here",
    icon: Brain,
    color: "#C70110",
    challenges: [
      { name: 'SYSTEM_MESSAGE', desc: 'Your bot\'s personality, expertise, and rules — this IS your bot', example: '"""You are GhanaFreedom Guide — a passionate educator on Ghana independence..."""' },
    ],
    tip: 'Formula: WHO (name, role) + HOW (tone) + WHAT (topics) + RULES (special instructions). Judges score this highest!',
    badExample: 'SYSTEM_MESSAGE = "You are a helpful AI assistant."',
    goodExample: 'SYSTEM_MESSAGE = """You are GhanaFreedom Guide — a passionate, proud educator. Use Akwaaba, Medaase. Ask a follow-up each time."""',
  },
  {
    step: 3,
    title: "Give Your Bot Knowledge",
    subtitle: "Challenges 6 & 7 — The smarter your bot, the better it scores",
    icon: BookOpen,
    color: "#006600",
    challenges: [
      { name: 'KNOWLEDGE_BASE', desc: 'Paste facts here — the more specific, the smarter', example: 'KNOWLEDGE_BASE = """DATES: March 6 1957: Independence..."""' },
      { name: 'QA_PAIRS', desc: 'Guaranteed exact answers for specific questions', example: 'QA_PAIRS = [{"q": "When did Ghana gain independence?", "a": "March 6, 1957!"}]' },
    ],
    tip: 'KNOWLEDGE_BASE gives the AI info to draw from. QA_PAIRS gives EXACT answers word for word — the AI doesn\'t need to think.',
  },
  {
    step: 4,
    title: "Control Bot Behaviour",
    subtitle: "Challenges 8–12 — Shape how your bot responds",
    icon: Sparkles,
    color: "#5865F2",
    challenges: [
      { name: 'TEMPERATURE', desc: '0.1–0.3 factual, 0.5–0.7 balanced, 0.8–1.0 creative', example: 'TEMPERATURE = 0.6' },
      { name: 'RESPONSE_STYLE', desc: 'Friendly, Professional, Academic, Storyteller...', example: 'RESPONSE_STYLE = "Friendly"' },
      { name: 'MAX_RESPONSE_LENGTH', desc: 'short (1–2 sentences), medium (1 paragraph), long', example: 'MAX_RESPONSE_LENGTH = "medium"' },
      { name: 'RULES', desc: 'Enforce consistent behaviour', example: 'RULES = ["Use an emoji each time", "Ask a follow-up"]' },
      { name: 'CONVERSATION_STARTERS', desc: 'Quick reply buttons for visitors', example: 'CONVERSATION_STARTERS = ["Who was Nkrumah?"]' },
    ],
    tip: 'Temperature 0.6 is the sweet spot for educational bots — factual but engaging.',
  },
  {
    step: 5,
    title: "Easter Eggs, Guardrails & Personality",
    subtitle: "Challenges 13–17 — The fun part + safety",
    icon: Smile,
    color: "#9B59B6",
    challenges: [
      { name: 'EASTER_EGGS', desc: 'Secret instant responses by keyword', example: 'EASTER_EGGS = {"freedom": "Ghana is free forever! 🎉"}' },
      { name: 'CATCHPHRASES', desc: 'Signature phrases woven into responses', example: 'CATCHPHRASES = ["Here\'s a piece of history...", "Did you know?"]' },
      { name: 'BLOCKED_TOPICS', desc: 'Topics the bot politely refuses', example: 'BLOCKED_TOPICS = ["inappropriate content", "homework answers"]' },
      { name: 'FORBIDDEN_WORDS', desc: 'Words the bot must never use', example: 'FORBIDDEN_WORDS = ["primitive", "tribe"]' },
      { name: 'MOOD', desc: 'Overall emotional tone: energetic, cheerful, serious, calm...', example: 'MOOD = "energetic"' },
    ],
    tip: 'Easter eggs fire BEFORE the AI — instant, no API call. Judges notice personality and cultural authenticity!',
  },
  {
    step: 6,
    title: "Polish & Style",
    subtitle: "Challenges 18–20 — Finishing touches that make you stand out",
    icon: Palette,
    color: "#3498DB",
    challenges: [
      { name: 'FEW_SHOT_EXAMPLES', desc: 'Show the AI exactly HOW to answer', example: 'FEW_SHOT_EXAMPLES = [{"input": "Tell me about 1957", "output": "Ayekoo! 🇬🇭 On March 6..."}]' },
      { name: 'LANGUAGE_STYLE', desc: 'casual, formal, academic, slang, poetic, storyteller', example: 'LANGUAGE_STYLE = "storyteller"' },
      { name: 'SIGN_OFF', desc: 'Closing phrase on every response', example: 'SIGN_OFF = "🇬🇭 Freedom and Justice!"' },
    ],
    tip: 'Recommended order: Identity (1–4) → System Message (5) → Knowledge (6–7) → Behaviour (8–12) → Fun extras (13–20)',
  },
];

const RESOURCES = [
  { title: 'Python for AI Beginners', description: 'Learn Python basics: variables, loops, functions, and data structures for AI.', icon: Code, color: '#006600', link: 'https://www.learnpython.org/', level: 'Beginner' },
  { title: 'Introduction to Machine Learning', description: 'Understand what ML is, how models learn, and supervised vs unsupervised learning.', icon: Brain, color: '#5865F2', link: 'https://developers.google.com/machine-learning/crash-course', level: 'Beginner' },
  { title: 'Build a Chatbot with LangChain', description: 'Step-by-step guide to building a conversational AI chatbot using LangChain.', icon: Sparkles, color: '#F7941D', link: 'https://python.langchain.com/docs/tutorials/', level: 'Intermediate' },
  { title: 'Streamlit: Build AI Demos Fast', description: 'Create interactive web apps for your AI projects in minutes — no frontend code needed.', icon: Rocket, color: '#C70110', link: 'https://docs.streamlit.io/get-started', level: 'Beginner' },
  { title: 'Hugging Face Transformers', description: 'Access thousands of pre-trained AI models for text, image, and audio tasks.', icon: Zap, color: '#9B59B6', link: 'https://huggingface.co/docs/transformers', level: 'Intermediate' },
  { title: 'AI Agents with Tools', description: 'Learn to build AI agents that search the web, calculate, and interact with APIs.', icon: GraduationCap, color: '#3498DB', link: 'https://python.langchain.com/docs/how_to/#agents', level: 'Advanced' },
];

const LEVEL_COLORS: Record<string, string> = { Beginner: '#006600', Intermediate: '#F7941D', Advanced: '#C70110' };

export const LearnTab = ({ onNavigateToBuild, onNavigateToTemplates }: LearnTabProps) => {
  const [showTutorial, setShowTutorial] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #006600 0%, #F7941D 100%)'
        }}>
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Challenge Guide</h2>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm">Complete all 20 challenges to build your AI bot</p>
        </div>
      </div>

      {/* Challenge Tutorial */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between p-4 rounded-t-lg border border-[hsl(var(--discord-blurple)/0.3)]"
          style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.2), hsl(var(--discord-blurple) / 0.05))' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">All 20 Challenges — Step by Step</h3>
              <p className="text-xs text-[hsl(var(--discord-text-muted))]">Follow this guide to complete every variable in main.py</p>
            </div>
          </div>
          <span className={`text-[hsl(var(--discord-text-muted))] transition-transform ${showTutorial ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showTutorial && (
          <div className="border border-t-0 border-[hsl(var(--discord-blurple)/0.3)] rounded-b-lg bg-[hsl(var(--discord-darker))]">
            {/* Overview */}
            <div className="p-4 border-b border-[hsl(var(--discord-light)/0.1)]">
              <div className="bg-[hsl(var(--discord-dark)/0.6)] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.15)]">
                <p className="text-[11px] text-[hsl(var(--discord-text-muted))] leading-relaxed">
                  💡 <strong className="text-white">Think of FORGE like a car:</strong> the engine is already built. You just choose the colour, the music, and where to drive it. Edit the 20 variables in <code className="text-[hsl(var(--discord-blurple))]">main.py</code> — no AI or coding knowledge needed!
                </p>
              </div>
            </div>

            {/* Steps accordion */}
            <div className="divide-y divide-[hsl(var(--discord-light)/0.1)]">
              {CHALLENGE_STEPS.map((step) => {
                const Icon = step.icon;
                const isExpanded = expandedStep === step.step;
                return (
                  <div key={step.step}>
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-[hsl(var(--discord-light)/0.05)] transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${step.color}20`, border: `2px solid ${step.color}40` }}>
                        <Icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: step.color }}>
                            Step {step.step}
                          </span>
                          <h4 className="font-semibold text-white text-sm truncate">{step.title}</h4>
                        </div>
                        <p className="text-[11px] text-[hsl(var(--discord-text-muted))]">{step.subtitle}</p>
                      </div>
                      <span className={`text-[hsl(var(--discord-text-muted))] transition-transform text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4">
                        <div className="space-y-2 mb-3">
                          {step.challenges.map(ch => (
                            <div key={ch.name} className="bg-[hsl(var(--discord-dark)/0.6)] rounded-md p-3 border border-[hsl(var(--discord-light)/0.1)]">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: step.color, backgroundColor: `${step.color}15` }}>
                                  {ch.name}
                                </code>
                                <span className="text-[11px] text-[hsl(var(--discord-text-muted))]">{ch.desc}</span>
                              </div>
                              <div className="bg-[hsl(var(--discord-darker))] rounded p-2 mt-1.5">
                                <code className="text-[10px] text-[hsl(var(--discord-text))] font-mono">{ch.example}</code>
                              </div>
                            </div>
                          ))}
                        </div>

                        {step.badExample && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-red-500/10 rounded-md p-2.5 border border-red-500/20">
                              <span className="text-[10px] font-bold text-red-400">❌ BAD</span>
                              <code className="text-[10px] block mt-1 text-red-300/80 font-mono">{step.badExample}</code>
                            </div>
                            <div className="bg-green-500/10 rounded-md p-2.5 border border-green-500/20">
                              <span className="text-[10px] font-bold text-green-400">✅ GOOD</span>
                              <code className="text-[10px] block mt-1 text-green-300/80 font-mono break-all">{step.goodExample}</code>
                            </div>
                          </div>
                        )}

                        <div className="bg-[hsl(var(--discord-blurple)/0.1)] rounded-md p-2.5 border border-[hsl(var(--discord-blurple)/0.2)]">
                          <span className="text-[10px] font-bold" style={{ color: step.color }}>💡 TIP:</span>
                          <p className="text-[10px] text-[hsl(var(--discord-text))] mt-0.5">{step.tip}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 p-4 justify-center border-t border-[hsl(var(--discord-light)/0.1)]">
              <Button size="sm" onClick={onNavigateToTemplates}
                style={{ background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)' }}>
                <Rocket className="w-3.5 h-3.5 mr-1" />
                Start Building Now!
              </Button>
              <Button size="sm" variant="outline" onClick={onNavigateToBuild}
                className="border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]">
                <Code className="w-3.5 h-3.5 mr-1" />
                Open IDE
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Resources */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-lg p-5 mb-8 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}>
        <h3 className="text-lg font-semibold text-white mb-2">📚 Learning Resources</h3>
        <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-3">Deepen your AI skills with these curated tutorials and guides.</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((resource, index) => (
          <motion.a key={resource.title} href={resource.link} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.05 }}
            className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] rounded-lg p-4 hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all group block">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${resource.color}20`, border: `1px solid ${resource.color}40` }}>
                <resource.icon className="w-5 h-5" style={{ color: resource.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm group-hover:text-[hsl(var(--discord-blurple))] transition-colors truncate">{resource.title}</h4>
                  <ExternalLink className="w-3 h-3 text-[hsl(var(--discord-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: `${LEVEL_COLORS[resource.level]}20`, color: LEVEL_COLORS[resource.level],
                }}>{resource.level}</span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--discord-text-muted))] line-clamp-2">{resource.description}</p>
          </motion.a>
        ))}
      </div>
    </div>
  );
};
