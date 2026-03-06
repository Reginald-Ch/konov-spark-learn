import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Rocket, Brain, Code, Zap, GraduationCap, MessageSquare, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LearnTabProps {
  onNavigateToBuild: () => void;
  onNavigateToTemplates: () => void;
}

// Platform tutorial steps
const PLATFORM_TUTORIAL = [
  {
    step: 1,
    title: "Pick a Template",
    icon: Rocket,
    description: "Click 'AI Chatbot' or 'AI Agent' template. This gives you a working Python project instantly — no setup needed!",
    example: "For a Maths Chatbot, start with the AI Chatbot template.",
    color: "#F7941D"
  },
  {
    step: 2,
    title: "Set Your System Prompt",
    icon: MessageSquare,
    description: "In the Config panel, change the System Prompt to tell your AI what it should do. This is the personality and knowledge of your AI.",
    example: 'Change it to: "You are a friendly maths tutor for SHS students. Explain algebra and calculus step by step."',
    color: "#5865F2"
  },
  {
    step: 3,
    title: "Edit Your Code",
    icon: Code,
    description: "The code editor shows your main.py file. Change the model name, temperature, and add custom logic.",
    example: 'Change the title to: st.title("📐 Maths Tutor AI") and update SYSTEM_PROMPT in the code.',
    color: "#006600"
  },
  {
    step: 4,
    title: "Test in Live Preview",
    icon: Bot,
    description: "Chat with your AI in real-time on the right panel. Try asking questions — if you don't like the responses, tweak your system prompt!",
    example: 'Try: "Explain Pythagoras theorem" or "Solve 2x + 5 = 15"',
    color: "#9B59B6"
  },
  {
    step: 5,
    title: "Use AI Mentor for Help",
    icon: Brain,
    description: "Click 'Review', 'Explain', or 'Suggest' to get AI feedback. Ask the AI Mentor questions in the bottom panel.",
    example: 'Click "Review" to get feedback, or ask: "How do I add a quiz feature?"',
    color: "#E74C3C"
  },
  {
    step: 6,
    title: "Save & Go Live!",
    icon: Zap,
    description: "Click 'Save Checkpoint' to save. When ready, click 'Go Live' to deploy and get a real URL anyone can visit!",
    example: "Your Maths Chatbot gets a public URL like /projects/abc123 — share it with friends!",
    color: "#C70110"
  },
];

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
  const [showTutorial, setShowTutorial] = useState(true);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #006600 0%, #F7941D 100%)'
        }}>
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Learn & Build</h2>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm">Step-by-step guide + curated resources</p>
        </div>
      </div>

      {/* ── How to Build Your AI App Tutorial (PRIMARY) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between p-4 rounded-t-lg border border-[hsl(var(--discord-blurple)/0.3)]"
          style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.2), hsl(var(--discord-blurple) / 0.05))' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">How to Build Your AI App</h3>
              <p className="text-xs text-[hsl(var(--discord-text-muted))]">6 steps from zero to a live AI project — using a Maths Chatbot example</p>
            </div>
          </div>
          <span className={`text-[hsl(var(--discord-text-muted))] transition-transform ${showTutorial ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showTutorial && (
          <div className="border border-t-0 border-[hsl(var(--discord-blurple)/0.3)] rounded-b-lg p-4 bg-[hsl(var(--discord-darker))]">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_TUTORIAL.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="bg-[hsl(var(--discord-dark)/0.6)] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.15)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: step.color }}
                      >
                        {step.step}
                      </div>
                      <h4 className="font-semibold text-white text-sm">{step.title}</h4>
                      <Icon className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: step.color }} />
                    </div>
                    <p className="text-[11px] text-[hsl(var(--discord-text-muted))] mb-2 leading-relaxed">
                      {step.description}
                    </p>
                    <div className="bg-[hsl(var(--discord-blurple)/0.1)] rounded-md p-2 border border-[hsl(var(--discord-blurple)/0.2)]">
                      <span className="text-[10px] font-bold" style={{ color: step.color }}>💡 EXAMPLE:</span>
                      <p className="text-[10px] text-[hsl(var(--discord-text))] mt-0.5">{step.example}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4 justify-center">
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

      {/* Quick Start Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg p-5 mb-8 border border-[hsl(var(--discord-blurple)/0.3)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--discord-blurple) / 0.15), transparent)' }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">📚 Learning Resources</h3>
        <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-3">
          Deepen your AI skills with these curated tutorials and guides.
        </p>
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
            transition={{ delay: 0.15 + index * 0.05 }}
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
