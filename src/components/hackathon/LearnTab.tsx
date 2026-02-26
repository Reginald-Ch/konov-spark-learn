import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Rocket, Brain, Code, Sparkles, Zap, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearnTabProps {
  onNavigateToBuild: () => void;
  onNavigateToTemplates: () => void;
}

const RESOURCES = [
  {
    title: 'Python for AI Beginners',
    description: 'Learn Python basics: variables, loops, functions, and data structures you need for AI development.',
    icon: Code,
    color: '#006600',
    link: 'https://www.learnpython.org/',
    level: 'Beginner',
  },
  {
    title: 'Introduction to Machine Learning',
    description: 'Understand what ML is, how models learn from data, and the difference between supervised and unsupervised learning.',
    icon: Brain,
    color: '#5865F2',
    link: 'https://developers.google.com/machine-learning/crash-course',
    level: 'Beginner',
  },
  {
    title: 'Build a Chatbot with LangChain',
    description: 'Step-by-step guide to building a conversational AI chatbot using LangChain and OpenAI APIs.',
    icon: Sparkles,
    color: '#F7941D',
    link: 'https://python.langchain.com/docs/tutorials/',
    level: 'Intermediate',
  },
  {
    title: 'Streamlit: Build AI Demos Fast',
    description: 'Create interactive web apps for your AI projects in minutes with Streamlit — no frontend code needed.',
    icon: Rocket,
    color: '#C70110',
    link: 'https://docs.streamlit.io/get-started',
    level: 'Beginner',
  },
  {
    title: 'Hugging Face Transformers',
    description: 'Access thousands of pre-trained AI models for text, image, and audio tasks. The go-to library for modern AI.',
    icon: Zap,
    color: '#9B59B6',
    link: 'https://huggingface.co/docs/transformers',
    level: 'Intermediate',
  },
  {
    title: 'AI Agents with Tools',
    description: 'Learn to build AI agents that can search the web, use calculators, and interact with APIs autonomously.',
    icon: GraduationCap,
    color: '#3498DB',
    link: 'https://python.langchain.com/docs/how_to/#agents',
    level: 'Advanced',
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Beginner: '#006600',
  Intermediate: '#F7941D',
  Advanced: '#C70110',
};

export const LearnTab = ({ onNavigateToBuild, onNavigateToTemplates }: LearnTabProps) => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #006600 0%, #F7941D 100%)'
        }}>
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Learn AI with Python</h2>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm">Curated resources to level up your AI skills</p>
        </div>
      </div>

      {/* Quick Start Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg p-5 mb-8 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">🚀 Quick Start</h3>
        <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-3">
          Jump straight into building — pick a template and start coding in our browser-based IDE.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onNavigateToTemplates}
            style={{ background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)' }}>
            <Rocket className="w-3.5 h-3.5 mr-1" />
            Browse Templates
          </Button>
          <Button size="sm" variant="outline" onClick={onNavigateToBuild}
            className="border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]">
            <Code className="w-3.5 h-3.5 mr-1" />
            Open IDE
          </Button>
        </div>
      </motion.div>

      {/* Resources Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((resource, index) => (
          <motion.a
            key={resource.title}
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] rounded-lg p-4 hover:border-[hsl(var(--discord-blurple)/0.5)] transition-all group block"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${resource.color}20`, border: `1px solid ${resource.color}40` }}>
                <resource.icon className="w-5 h-5" style={{ color: resource.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm group-hover:text-[hsl(var(--discord-blurple))] transition-colors truncate">
                    {resource.title}
                  </h4>
                  <ExternalLink className="w-3 h-3 text-[hsl(var(--discord-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: `${LEVEL_COLORS[resource.level]}20`,
                  color: LEVEL_COLORS[resource.level],
                }}>
                  {resource.level}
                </span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--discord-text-muted))] line-clamp-2">{resource.description}</p>
          </motion.a>
        ))}
      </div>
    </div>
  );
};
