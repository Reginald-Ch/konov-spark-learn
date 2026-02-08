import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, MessageCircle, ChevronRight,
  Star, Sparkles, Zap, Users, Brain, Eye, Palette, BarChart3,
  Bot, BookOpen, Mic, Swords
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  features: string[];
  icon: React.ElementType;
  color: string;
}

export const ProjectIdeas = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Ideas', icon: Sparkles },
    { id: 'chatbots', name: 'Chatbots', icon: Bot },
    { id: 'vision', name: 'Computer Vision', icon: Eye },
    { id: 'creative', name: 'Creative AI', icon: Palette },
    { id: 'data', name: 'Data / ML', icon: BarChart3 },
  ];

  const ideas: ProjectIdea[] = [
    {
      id: '1',
      title: 'AI Chatbot Assistant',
      description: 'Build a conversational chatbot using a large language model API that can answer questions, tell jokes, or help with homework.',
      category: 'chatbots',
      difficulty: 'Beginner',
      techStack: ['React', 'OpenAI API', 'Tailwind CSS', 'Vercel AI SDK'],
      features: ['Conversational UI', 'Chat history', 'Typing indicators', 'Multiple personalities'],
      icon: Bot,
      color: '#5865F2'
    },
    {
      id: '2',
      title: 'Image Classifier',
      description: 'Use a pre-trained machine learning model to classify images uploaded by users — identify objects, animals, or scenes.',
      category: 'vision',
      difficulty: 'Intermediate',
      techStack: ['React', 'TensorFlow.js', 'MobileNet', 'Tailwind CSS'],
      features: ['Drag & drop upload', 'Real-time predictions', 'Confidence scores', 'Top-5 results'],
      icon: Eye,
      color: '#006600'
    },
    {
      id: '3',
      title: 'AI Story Generator',
      description: 'Generate creative stories, poems, or adventures using AI prompts. Users pick a genre, characters, and setting.',
      category: 'creative',
      difficulty: 'Beginner',
      techStack: ['React', 'OpenAI API', 'Framer Motion', 'LocalStorage'],
      features: ['Genre selection', 'Character builder', 'Story continuation', 'Save & share stories'],
      icon: BookOpen,
      color: '#F7941D'
    },
    {
      id: '4',
      title: 'Smart Study Planner',
      description: 'An AI-powered study schedule optimizer that creates personalized study plans based on subjects, deadlines, and learning style.',
      category: 'data',
      difficulty: 'Intermediate',
      techStack: ['React', 'OpenAI API', 'Supabase', 'date-fns'],
      features: ['AI schedule generation', 'Priority ranking', 'Progress tracking', 'Smart reminders'],
      icon: Brain,
      color: '#C70110'
    },
    {
      id: '5',
      title: 'Sentiment Analyzer',
      description: 'Analyze the sentiment of text from social media posts, reviews, or messages. Visualize emotions with charts and colors.',
      category: 'data',
      difficulty: 'Beginner',
      techStack: ['React', 'Hugging Face API', 'Recharts', 'Tailwind CSS'],
      features: ['Text input & paste', 'Emotion detection', 'Sentiment charts', 'Batch analysis'],
      icon: BarChart3,
      color: '#00B894'
    },
    {
      id: '6',
      title: 'AI Art Gallery',
      description: 'Generate and curate AI-created artwork using text prompts. Build a gallery where users can create, vote, and share AI art.',
      category: 'creative',
      difficulty: 'Intermediate',
      techStack: ['React', 'Stable Diffusion API', 'Supabase Storage', 'Masonry Grid'],
      features: ['Text-to-image generation', 'Gallery wall', 'Community voting', 'Download & share'],
      icon: Palette,
      color: '#9B59B6'
    },
    {
      id: '7',
      title: 'Voice Command App',
      description: 'Build an app controlled by voice! Use speech-to-text to execute commands, search the web, or control a game.',
      category: 'chatbots',
      difficulty: 'Advanced',
      techStack: ['React', 'Web Speech API', 'OpenAI Whisper', 'Langchain'],
      features: ['Voice recognition', 'Command parsing', 'Text-to-speech response', 'Custom wake word'],
      icon: Mic,
      color: '#E91E63'
    },
    {
      id: '8',
      title: 'AI Debate Partner',
      description: 'An AI that takes the opposite side of any argument and debates with you. Great for critical thinking and exploring perspectives.',
      category: 'chatbots',
      difficulty: 'Advanced',
      techStack: ['React', 'OpenAI API', 'Langchain', 'Framer Motion'],
      features: ['Topic selection', 'Turn-based debate', 'Argument scoring', 'Debate history'],
      icon: Swords,
      color: '#00CEC9'
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredIdeas = selectedCategory === 'all' 
    ? ideas 
    : ideas.filter(idea => idea.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F7941D 0%, #FFD700 100%)' }}
          >
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI Project Ideas</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Get inspired for your next AI hackathon project</p>
          </div>
        </div>
      </motion.div>

      {/* Category Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className={`${
              selectedCategory === category.id
                ? 'bg-[hsl(var(--discord-blurple))] text-white'
                : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]'
            } border border-[hsl(var(--discord-light)/0.2)]`}
          >
            <category.icon className="w-4 h-4 mr-2" />
            {category.name}
          </Button>
        ))}
      </motion.div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredIdeas.map((idea, index) => (
            <motion.div
              key={idea.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] overflow-hidden hover:border-[hsl(var(--discord-light)/0.4)] transition-all"
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${idea.color}20` }}
                  >
                    <idea.icon className="w-5 h-5" style={{ color: idea.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{idea.title}</h3>
                      <Badge className={`text-xs border ${getDifficultyColor(idea.difficulty)}`}>
                        {idea.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-2">{idea.description}</p>
                  </div>
                  <ChevronRight 
                    className={`w-5 h-5 text-[hsl(var(--discord-text-muted))] transition-transform ${
                      expandedIdea === idea.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                <AnimatePresence>
                  {expandedIdea === idea.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-[hsl(var(--discord-light)/0.2)]"
                    >
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase mb-2">
                          Suggested Tech Stack
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {idea.techStack.map((tech) => (
                            <Badge 
                              key={tech} 
                              variant="outline" 
                              className="text-xs bg-[hsl(var(--discord-light)/0.1)] text-[hsl(var(--discord-text))] border-[hsl(var(--discord-light)/0.3)]"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase mb-2">
                          Key Features
                        </h4>
                        <ul className="space-y-1">
                          {idea.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-[hsl(var(--discord-text))]">
                              <Star className="w-3 h-3" style={{ color: idea.color }} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Inspiration Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 p-6 rounded-lg border border-dashed border-[hsl(var(--discord-light)/0.3)] bg-[hsl(var(--discord-darker)/0.5)] text-center"
      >
        <Zap className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--discord-yellow))]" />
        <h3 className="text-lg font-semibold text-white mb-2">Have Your Own AI Idea?</h3>
        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto mb-4">
          These are just suggestions! The best AI hackathon projects solve real problems 
          using artificial intelligence. Build something you're passionate about!
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--discord-text-muted))]">
          <Users className="w-4 h-4" />
          <span>Team up and brainstorm AI solutions together</span>
        </div>
      </motion.div>
    </div>
  );
};
