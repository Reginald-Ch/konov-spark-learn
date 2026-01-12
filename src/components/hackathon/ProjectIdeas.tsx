import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, Globe, Gamepad2, Heart, Leaf, GraduationCap, 
  ShoppingCart, Music, Camera, MessageCircle, ChevronRight,
  Star, Sparkles, Zap, Users
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
    { id: 'web', name: 'Web Apps', icon: Globe },
    { id: 'games', name: 'Games', icon: Gamepad2 },
    { id: 'social', name: 'Social Good', icon: Heart },
    { id: 'education', name: 'Education', icon: GraduationCap },
  ];

  const ideas: ProjectIdea[] = [
    {
      id: '1',
      title: 'Eco Tracker',
      description: 'An app that helps users track and reduce their carbon footprint through daily challenges and tips.',
      category: 'social',
      difficulty: 'Beginner',
      techStack: ['React', 'Tailwind CSS', 'LocalStorage'],
      features: ['Daily eco-challenges', 'Carbon calculator', 'Achievement badges', 'Share progress'],
      icon: Leaf,
      color: '#006600'
    },
    {
      id: '2',
      title: 'Study Buddy',
      description: 'A collaborative learning platform where students can form study groups and share resources.',
      category: 'education',
      difficulty: 'Intermediate',
      techStack: ['React', 'Supabase', 'Real-time DB'],
      features: ['Group chat', 'Resource sharing', 'Quiz maker', 'Progress tracking'],
      icon: GraduationCap,
      color: '#5865F2'
    },
    {
      id: '3',
      title: 'Mini Arcade',
      description: 'A collection of simple browser-based games like Snake, Tetris, or Memory Match.',
      category: 'games',
      difficulty: 'Beginner',
      techStack: ['HTML5 Canvas', 'JavaScript', 'CSS'],
      features: ['Multiple games', 'High score system', 'Sound effects', 'Mobile responsive'],
      icon: Gamepad2,
      color: '#F7941D'
    },
    {
      id: '4',
      title: 'Mood Journal',
      description: 'A mental wellness app for tracking daily moods, journaling, and viewing mood patterns.',
      category: 'social',
      difficulty: 'Beginner',
      techStack: ['React', 'Charts.js', 'LocalStorage'],
      features: ['Mood logging', 'Journal entries', 'Mood analytics', 'Reminders'],
      icon: Heart,
      color: '#C70110'
    },
    {
      id: '5',
      title: 'Recipe Remix',
      description: 'A web app that suggests recipes based on ingredients you already have in your kitchen.',
      category: 'web',
      difficulty: 'Intermediate',
      techStack: ['React', 'API Integration', 'Supabase'],
      features: ['Ingredient input', 'Recipe suggestions', 'Favorites list', 'Shopping list'],
      icon: ShoppingCart,
      color: '#00B894'
    },
    {
      id: '6',
      title: 'Beat Maker',
      description: 'A simple drum machine and beat sequencer where users can create their own music loops.',
      category: 'games',
      difficulty: 'Intermediate',
      techStack: ['Web Audio API', 'React', 'CSS Grid'],
      features: ['16-step sequencer', 'Multiple instruments', 'Tempo control', 'Export audio'],
      icon: Music,
      color: '#9B59B6'
    },
    {
      id: '7',
      title: 'Photo Filter Studio',
      description: 'Apply Instagram-like filters to photos right in the browser using canvas.',
      category: 'web',
      difficulty: 'Advanced',
      techStack: ['HTML5 Canvas', 'WebGL', 'React'],
      features: ['10+ filters', 'Adjustable intensity', 'Download edited photos', 'Batch processing'],
      icon: Camera,
      color: '#E91E63'
    },
    {
      id: '8',
      title: 'Anonymous Feedback',
      description: 'A platform for anonymous peer feedback in classrooms or teams.',
      category: 'education',
      difficulty: 'Intermediate',
      techStack: ['React', 'Supabase', 'Real-time'],
      features: ['Anonymous submissions', 'Sentiment analysis', 'Teacher dashboard', 'Response threads'],
      icon: MessageCircle,
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
            <h1 className="text-3xl font-bold text-white">Project Ideas</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Get inspired for your next hackathon project</p>
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
        <h3 className="text-lg font-semibold text-white mb-2">Have Your Own Idea?</h3>
        <p className="text-[hsl(var(--discord-text-muted))] max-w-md mx-auto mb-4">
          These are just suggestions! The best hackathon projects solve real problems 
          you care about. Build something you're passionate about!
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--discord-text-muted))]">
          <Users className="w-4 h-4" />
          <span>Team up and brainstorm together for even better ideas</span>
        </div>
      </motion.div>
    </div>
  );
};
