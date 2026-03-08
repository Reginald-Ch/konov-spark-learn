import { motion } from 'framer-motion';
import { 
  Rocket, UserPlus, Users, Brain, Trophy, CheckCircle2, 
  ArrowRight, Lightbulb, Zap, MessageSquare, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GettingStartedProps {
  onNavigate: (channel: string) => void;
}

export const GettingStarted = ({ onNavigate }: GettingStartedProps) => {
  const steps = [
    {
      number: 1,
      title: 'Register for a Hackathon',
      description: 'Browse our upcoming and live hackathons, then click "Register" to join. You\'ll need your name, email, and preferred experience level.',
      icon: UserPlus,
      color: '#C70110',
      action: { label: 'View Events', channel: 'all-events' }
    },
    {
      number: 2,
      title: 'Join or Create a Team',
      description: 'Team up with other  AI enthusiasts! Join an existing team or create your own and recruit teammates with complementary skills in ML, data science, or frontend.',
      icon: Users,
      color: '#F7941D',
      action: { label: 'Find Teams', channel: 'all-events' }
    },
    {
      number: 3,
      title: 'Select a project template ',
      description: 'Want to create a cool chatbot or agent?',
      icon: Brain,
      color: '#006600',
      action: { label: 'Forge your AI Ideas', channel: 'project-ideas' }
    },
    {
      number: 4,
      title: 'Submit & Win',
      description: 'Submit your Python AI project before the deadline. .',
      icon: Trophy,
      color: '#5865F2',
      action: { label: 'View Leaderboard', channel: 'leaderboard' }
    }
  ];

  const tips = [
    { icon: Lightbulb, text: 'Start with SYSTEM_MESSAGES, spend at least 10 minutes on the.' },
    { icon: Zap, text: 'one edit one test' },
    { icon: Lightbulb, text: 'Be specific in KNOWLEDGE_BASE' },
    { icon: CheckCircle2, text: 'Pick thematic Easter Egg Keyword' },
    { icon: MessageSquare, text: 'Add follow-up questions to system' },
    { icon: MessageSquare, text: 'Save checkpoint often every 5 minutes at least' },
    { icon: Rocket, text: 'Submit early to avoid last-minute issues' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center bg-primary"
          >
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Forge Your Way Up</h1>
            <p className="text-[hsl(var(--discord-text-muted))]">Elevate your skills, challenge your thinking.</p>
          </div>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="space-y-4 mb-10">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[hsl(var(--discord-darker))] rounded-lg p-5 border border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-light)/0.4)] transition-all group"
          >
            <div className="flex gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${step.color}20`, border: `2px solid ${step.color}40` }}
              >
                <step.icon className="w-6 h-6" style={{ color: step.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: step.color, color: 'white' }}
                  >
                    Step {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-[hsl(var(--discord-text-muted))] mb-3">{step.description}</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate(step.action.channel)}
                  className="text-[hsl(var(--discord-blurple))] hover:text-white hover:bg-[hsl(var(--discord-blurple))] -ml-3"
                >
                  {step.action.label}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pro Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-[hsl(var(--discord-blurple)/0.2)] to-transparent rounded-lg p-6 border border-[hsl(var(--discord-blurple)/0.3)]"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[hsl(var(--discord-yellow))]" />
          Pro Tips for Python AI Success
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 text-[hsl(var(--discord-text))]"
            >
              <tip.icon className="w-4 h-4 text-[hsl(var(--discord-green))]" />
              <span className="text-sm">{tip.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center"
      >
        <Button 
          onClick={() => onNavigate('all-events')}
          className="px-8 py-3 text-lg bg-primary hover:bg-primary/90"
        >
          <Rocket className="w-5 h-5 mr-2" />
          Forge Your Way UP
        </Button>
      </motion.div>
    </div>
  );
};
