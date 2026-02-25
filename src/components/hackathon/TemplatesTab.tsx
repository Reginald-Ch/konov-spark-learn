import { motion } from 'framer-motion';
import { Bot, Mic, Brain, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectType } from './ProjectEditor';

interface TemplatesTabProps {
  onStartBuilding: (code: string, templateId: string) => void;
}

const PROJECT_TYPES: {
  id: ProjectType;
  title: string;
  emoji: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  color: string;
  gradient: string;
}[] = [
  {
    id: 'chatbot',
    title: 'AI Chatbot',
    emoji: '🤖',
    description: 'Build a conversational AI that answers questions, holds context, and has personality. Perfect for customer support, tutoring bots, or creative writing assistants.',
    features: ['Conversation memory', 'Custom personality via system prompt', 'Streamlit web UI', 'LangChain integration'],
    icon: Bot,
    color: '#5865F2',
    gradient: 'linear-gradient(135deg, #5865F2, #7289DA)',
  },
  {
    id: 'voice-assistant',
    title: 'Voice Assistant',
    emoji: '🎙️',
    description: 'Create a voice-powered AI: speak → transcribe → think → reply with speech. Build Siri-like assistants, language translators, or accessibility tools.',
    features: ['Whisper speech-to-text', 'AI-powered responses', 'Text-to-speech output', 'Audio file upload'],
    icon: Mic,
    color: '#F7941D',
    gradient: 'linear-gradient(135deg, #F7941D, #FFD700)',
  },
  {
    id: 'agent',
    title: 'AI Agent',
    emoji: '🧠',
    description: 'Build an autonomous AI that uses tools: web search, calculators, Wikipedia, and more. Create research assistants, data analyzers, or task automation bots.',
    features: ['Tool-using agent', 'Web search & Wikipedia', 'Calculator & code execution', 'Zero-shot reasoning'],
    icon: Brain,
    color: '#00B894',
    gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
  },
];

export const TemplatesTab = ({ onStartBuilding }: TemplatesTabProps) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))] text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Pick a project type and start building instantly
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">What will you build?</h1>
        <p className="text-[hsl(var(--discord-text-muted))] text-lg max-w-xl mx-auto">
          Choose one of three AI project types. You'll get a complete working codebase — just customize and deploy.
        </p>
      </motion.div>

      {/* 3 Project Type Cards */}
      <div className="grid gap-6">
        {PROJECT_TYPES.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.2)] overflow-hidden hover:border-[hsl(var(--discord-light)/0.5)] transition-all group"
          >
            <div className="flex flex-col md:flex-row">
              {/* Left: Icon area */}
              <div
                className="w-full md:w-48 flex items-center justify-center p-8 md:p-0 flex-shrink-0"
                style={{ background: type.gradient }}
              >
                <span className="text-7xl">{type.emoji}</span>
              </div>

              {/* Right: Content */}
              <div className="flex-1 p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{type.title}</h2>
                <p className="text-[hsl(var(--discord-text-muted))] mb-4 leading-relaxed">{type.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {type.features.map(f => (
                    <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))]">
                      {f}
                    </span>
                  ))}
                </div>

                <Button
                  onClick={() => onStartBuilding('', type.id)}
                  className="font-bold text-white px-6"
                  style={{ backgroundColor: type.color }}
                >
                  Start Building
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
