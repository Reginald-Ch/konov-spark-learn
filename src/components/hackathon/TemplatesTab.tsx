import { motion } from 'framer-motion';
import { Bot, Brain, ArrowRight, Rocket, MessageSquare, Search, Calculator, Code, Globe, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectType } from './ProjectEditor';

interface TemplatesTabProps {
  onStartBuilding: (code: string, templateId: string) => void;
}

const PROJECT_TYPES: {
  id: ProjectType;
  title: string;
  emoji: string;
  tagline: string;
  description: string;
  features: string[];
  useCases: string[];
  icon: React.ElementType;
  color: string;
  gradient: string;
  diffIcons: React.ElementType[];
}[] = [
  {
    id: 'chatbot',
    title: 'AI Chatbot',
    emoji: '🤖',
    tagline: 'Conversations with personality',
    description: 'Build a conversational AI that answers questions, remembers context, and has its own personality. Great for tutoring bots, support assistants, or creative writing helpers.',
    features: ['Conversation memory', 'Custom personality via system prompt', 'Streamlit web UI', 'Knowledge base support'],
    useCases: ['Maths Tutor Bot', 'Homework Helper', 'Story Writer', 'Language Practice Bot'],
    icon: Bot,
    color: '#5865F2',
    gradient: 'linear-gradient(135deg, #5865F2, #7289DA)',
    diffIcons: [MessageSquare, Bot, Globe],
  },
  {
    id: 'agent',
    title: 'AI Agent',
    emoji: '🧠',
    tagline: 'Autonomous actions with tools',
    description: 'Build an autonomous AI that uses tools — web search, calculators, code execution, and more. Create research assistants, data analyzers, or task automation bots.',
    features: ['Tool-using agent (ReAct)', 'Web search & Wikipedia', 'Calculator & code execution', 'Zero-shot reasoning'],
    useCases: ['Research Assistant', 'Data Analyzer', 'Fact Checker', 'News Summarizer'],
    icon: Brain,
    color: '#00B894',
    gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
    diffIcons: [Search, Calculator, Cpu],
  },
];

export const TemplatesTab = ({ onStartBuilding }: TemplatesTabProps) => {
  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))] text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Pick a project type and start building instantly
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">What will you FORGE?</h1>
        <p className="text-[hsl(var(--discord-text-muted))] text-lg max-w-xl mx-auto">
          Choose your AI project type. Each gives you a complete working codebase — customize and deploy.
        </p>
      </motion.div>

      {/* Comparison Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center gap-6 mb-8"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5865F2' }} />
          <span className="text-sm text-[hsl(var(--discord-text-muted))]">Chatbot = <strong className="text-white">Conversations</strong></span>
        </div>
        <span className="text-[hsl(var(--discord-text-muted))]">vs</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00B894' }} />
          <span className="text-sm text-[hsl(var(--discord-text-muted))]">Agent = <strong className="text-white">Actions + Tools</strong></span>
        </div>
      </motion.div>

      {/* Project Type Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {PROJECT_TYPES.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12 }}
            className="bg-[hsl(var(--discord-darker))] rounded-xl border-2 overflow-hidden hover:shadow-lg hover:shadow-[hsl(var(--discord-blurple)/0.1)] transition-all group"
            style={{ borderColor: `${type.color}30` }}
          >
            {/* Top: Icon + tagline */}
            <div
              className="p-6 text-center"
              style={{ background: type.gradient }}
            >
              <span className="text-6xl block mb-2">{type.emoji}</span>
              <h2 className="text-2xl font-bold text-white">{type.title}</h2>
              <p className="text-white/80 text-sm mt-1">{type.tagline}</p>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-4 leading-relaxed">{type.description}</p>

              {/* What it does - visual icons */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: `${type.color}10`, border: `1px solid ${type.color}20` }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: type.color }}>Powers</span>
                <div className="flex gap-2">
                  {type.diffIcons.map((Icon, i) => (
                    <div key={i} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${type.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: type.color }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] block mb-2">Features</span>
                <div className="flex flex-wrap gap-1.5">
                  {type.features.map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div className="mb-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] block mb-2">Example Projects</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {type.useCases.map(uc => (
                    <div key={uc} className="text-[11px] text-[hsl(var(--discord-text))] flex items-center gap-1.5">
                      <Zap className="w-3 h-3 flex-shrink-0" style={{ color: type.color }} />
                      {uc}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => onStartBuilding('', type.id)}
                className="w-full font-bold text-white"
                style={{ backgroundColor: type.color }}
              >
                Build {type.title}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom: Key difference callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-darker))] text-center"
      >
        <p className="text-sm text-[hsl(var(--discord-text-muted))]">
          <strong className="text-white">💡 Key Difference:</strong>{' '}
          A <strong style={{ color: '#5865F2' }}>Chatbot</strong> talks and remembers conversations.{' '}
          An <strong style={{ color: '#00B894' }}>Agent</strong> thinks, uses tools, and takes actions autonomously.
        </p>
      </motion.div>
    </div>
  );
};
