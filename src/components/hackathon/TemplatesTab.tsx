import { Bot, Brain, ArrowRight, Sparkles, MessageSquare, Search, Calculator, Cpu, Zap, Clock, Trophy } from 'lucide-react';
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
  stages: { emoji: string; title: string; time: string }[];
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
    tagline: 'Build a conversational AI — stage by stage',
    description: 'A complete chatbot template with 7 challenges: personality, knowledge, follow-ups, polish, response styles, chat export, and final submission. Everything works — you fill in YOUR content!',
    stages: [
      { emoji: '🎯', title: 'Give Your Bot a Personality', time: '10 min' },
      { emoji: '💬', title: 'Teach Your Bot What It Knows', time: '15 min' },
      { emoji: '🧠', title: 'Add Smart Follow-Up Questions', time: '15 min' },
      { emoji: '⭐', title: 'Personalise & Polish', time: '10 min' },
      { emoji: '🎨', title: 'Add a Custom Response Style', time: '8 min' },
      { emoji: '📊', title: 'Add Chat Analytics', time: '8 min' },
      { emoji: '🚀', title: 'Submit & Present', time: '5 min' },
    ],
    useCases: ['Maths Tutor Bot', 'Homework Helper', 'Story Writer', 'Language Practice Bot'],
    icon: Bot,
    color: '#5865F2',
    gradient: 'linear-gradient(135deg, #5865F2, #7289DA)',
    diffIcons: [MessageSquare, Bot, Cpu],
  },
  {
    id: 'agent',
    title: 'AI Agent',
    emoji: '🧠',
    tagline: 'Build an autonomous tool-using AI — stage by stage',
    description: 'Start from scratch and wire up: imports → mission → tools → agent brain → deploy. Your agent will search the web, run code, and reason step-by-step.',
    stages: [
      { emoji: '🏗️', title: 'Foundation', time: '10 min' },
      { emoji: '🎯', title: 'Mission Brief', time: '8 min' },
      { emoji: '🛠️', title: 'Tools', time: '12 min' },
      { emoji: '🧠', title: 'Agent Brain', time: '10 min' },
      { emoji: '🚀', title: 'Polish & Deploy', time: '5 min' },
    ],
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
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))] text-sm font-medium mb-4">
          <Trophy className="w-4 h-4" />
          Build-Up Challenge — 5 Stages, 45 Minutes
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">What will you FORGE?</h1>
        <p className="text-[hsl(var(--discord-text-muted))] text-lg max-w-xl mx-auto">
          Choose your project type. You'll get a <strong className="text-white">skeleton with TODO blocks</strong> — complete all 5 stages to build a working AI.
        </p>
      </div>

      {/* Comparison Header */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5865F2' }} />
          <span className="text-sm text-[hsl(var(--discord-text-muted))]">Chatbot = <strong className="text-white">Conversations</strong></span>
        </div>
        <span className="text-[hsl(var(--discord-text-muted))]">vs</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00B894' }} />
          <span className="text-sm text-[hsl(var(--discord-text-muted))]">Agent = <strong className="text-white">Actions + Tools</strong></span>
        </div>
      </div>

      {/* Project Type Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {PROJECT_TYPES.map((type) => (
          <div
            key={type.id}
            className="bg-[hsl(var(--discord-darker))] rounded-xl border-2 overflow-hidden hover:shadow-lg hover:shadow-[hsl(var(--discord-blurple)/0.1)] transition-all group"
            style={{ borderColor: `${type.color}30` }}
          >
            {/* Top: Icon + tagline */}
            <div className="p-6 text-center" style={{ background: type.gradient }}>
              <span className="text-6xl block mb-2">{type.emoji}</span>
              <h2 className="text-2xl font-bold text-white">{type.title}</h2>
              <p className="text-white/80 text-sm mt-1">{type.tagline}</p>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-4 leading-relaxed">{type.description}</p>

              {/* 5 Stages */}
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))] block mb-2">
                  5-Stage Challenge
                </span>
                <div className="space-y-1">
                  {type.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="w-5 text-center">{stage.emoji}</span>
                      <span className="flex-1 text-[hsl(var(--discord-text))]">{stage.title}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[hsl(var(--discord-text-muted))]">
                        <Clock className="w-2.5 h-2.5" />
                        {stage.time}
                      </span>
                    </div>
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
                Start Challenge
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom callout */}
      <div className="mt-8 rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)] bg-[hsl(var(--discord-darker))] text-center">
        <p className="text-sm text-[hsl(var(--discord-text-muted))]">
          <strong className="text-white">💡 How it works:</strong>{' '}
          You get skeleton code with <code className="text-[hsl(var(--discord-blurple))]">TODO</code> comments. Fill them in stage by stage. Use the <strong className="text-white">AI Mentor</strong> for hints — it won't give you the full answer!
        </p>
      </div>
    </div>
  );
};
