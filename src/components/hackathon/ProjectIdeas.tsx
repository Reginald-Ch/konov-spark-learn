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
    { id: 'nlp', name: 'NLP / Chatbots', icon: Bot },
    { id: 'vision', name: 'Computer Vision', icon: Eye },
    { id: 'datascience', name: 'Data Science', icon: BarChart3 },
    { id: 'generative', name: 'Generative AI', icon: Palette },
  ];

  const ideas: ProjectIdea[] = [
    {
      id: '1',
      title: 'Chatbot with LangChain',
      description: 'Build a conversational AI chatbot using Python and LangChain that can answer questions, summarize documents, or act as a study tutor.',
      category: 'nlp',
      difficulty: 'Beginner',
      techStack: ['Python', 'LangChain', 'OpenAI API', 'Streamlit'],
      features: ['Conversational memory', 'Document Q&A', 'Streamlit chat UI', 'Prompt templates'],
      icon: Bot,
      color: '#5865F2'
    },
    {
      id: '2',
      title: 'Image Classifier with PyTorch',
      description: 'Use a pre-trained PyTorch model (ResNet, EfficientNet) to classify images uploaded by users — identify objects, animals, or scenes.',
      category: 'vision',
      difficulty: 'Intermediate',
      techStack: ['Python', 'PyTorch', 'torchvision', 'Gradio'],
      features: ['Drag & drop upload', 'Real-time predictions', 'Confidence scores', 'Gradio web UI'],
      icon: Eye,
      color: '#006600'
    },
    {
      id: '3',
      title: 'AI Story Generator',
      description: 'Generate creative stories, poems, or adventures using Python and OpenAI. Users pick a genre, characters, and setting.',
      category: 'generative',
      difficulty: 'Beginner',
      techStack: ['Python', 'OpenAI API', 'Flask', 'Jinja2'],
      features: ['Genre selection', 'Character builder', 'Story continuation', 'Save as PDF'],
      icon: BookOpen,
      color: '#F7941D'
    },
    {
      id: '4',
      title: 'Data Visualizer with ML Predictions',
      description: 'Build a dashboard that visualizes datasets and makes ML predictions using scikit-learn. Upload CSVs and get insights instantly.',
      category: 'datascience',
      difficulty: 'Intermediate',
      techStack: ['Python', 'scikit-learn', 'Pandas', 'Matplotlib', 'Streamlit'],
      features: ['CSV upload', 'Auto-visualization', 'ML model training', 'Prediction export'],
      icon: BarChart3,
      color: '#C70110'
    },
    {
      id: '5',
      title: 'Sentiment Analysis Dashboard',
      description: 'Analyze the sentiment of text using Hugging Face Transformers. Paste tweets, reviews, or messages and visualize emotions.',
      category: 'nlp',
      difficulty: 'Beginner',
      techStack: ['Python', 'Hugging Face Transformers', 'Streamlit', 'Plotly'],
      features: ['Text input & paste', 'Emotion detection', 'Sentiment charts', 'Batch analysis'],
      icon: Brain,
      color: '#00B894'
    },
    {
      id: '6',
      title: 'AI Image Generator',
      description: 'Generate images from text prompts using Stable Diffusion. Build a gallery where users create, browse, and share AI art.',
      category: 'generative',
      difficulty: 'Intermediate',
      techStack: ['Python', 'Stable Diffusion', 'Diffusers', 'Gradio'],
      features: ['Text-to-image generation', 'Style presets', 'Gallery view', 'Download & share'],
      icon: Palette,
      color: '#9B59B6'
    },
    {
      id: '7',
      title: 'Voice-to-Text Transcriber',
      description: 'Build a speech-to-text app using OpenAI Whisper. Upload audio files or record live and get accurate transcriptions.',
      category: 'nlp',
      difficulty: 'Advanced',
      techStack: ['Python', 'OpenAI Whisper', 'FastAPI', 'Streamlit'],
      features: ['Audio file upload', 'Live recording', 'Multi-language support', 'Transcript export'],
      icon: Mic,
      color: '#E91E63'
    },
    {
      id: '8',
      title: 'AI Code Reviewer',
      description: 'Build a tool that reviews Python code using LangChain and AST parsing. Get AI-powered suggestions for bugs, style, and performance.',
      category: 'datascience',
      difficulty: 'Advanced',
      techStack: ['Python', 'LangChain', 'AST module', 'Streamlit'],
      features: ['Code paste input', 'Bug detection', 'Style suggestions', 'Performance tips'],
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
            <h1 className="text-3xl font-bold text-white">Python AI Project Ideas</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Build these projects using Python + AI models</p>
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
        <AnimatePresence mode="wait">
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
                          Python Tech Stack
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
        <h3 className="text-lg font-semibold text-white mb-2">Have Your Own Python AI Idea?</h3>
        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto mb-4">
          These are just suggestions! Build any AI project using Python. 
          Use Streamlit or Gradio for your demo UI — judges love a great presentation!
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--discord-text-muted))]">
          <Users className="w-4 h-4" />
          <span>Team up and brainstorm Python AI solutions together</span>
        </div>
      </motion.div>
    </div>
  );
};
