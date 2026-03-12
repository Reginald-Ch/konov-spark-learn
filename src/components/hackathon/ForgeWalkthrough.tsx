import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Code, Zap, MessageSquare, Trophy, ChevronRight, X, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalkthroughStep {
  id: string;
  title: string;
  message: string;
  icon: React.ElementType;
  color: string;
  emoji: string;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: 'welcome', title: 'Welcome to FORGE!', message: "I'll guide you through building your first AI bot. It's easier than you think!", icon: Rocket, color: '#F7941D', emoji: '👋' },
  { id: 'config', title: 'Set Your Bot\'s Identity', message: 'Start by giving your bot a name and personality. Edit the BOT_NAME and SYSTEM_MESSAGE in the code.', icon: Code, color: '#5865F2', emoji: '⚙️' },
  { id: 'test', title: 'Test in Live Preview', message: 'Type a message in the chat panel on the right to see your bot in action!', icon: MessageSquare, color: '#00B894', emoji: '💬' },
  { id: 'customize', title: 'Make It Yours!', message: 'Add knowledge, Q&A pairs, rules, and easter eggs. Each one is a challenge!', icon: Zap, color: '#9B59B6', emoji: '🎨' },
  { id: 'deploy', title: 'Deploy & Share', message: 'When you\'re ready, hit Go Live to publish your bot and earn points!', icon: Trophy, color: '#FFD700', emoji: '🚀' },
];

interface ForgeWalkthroughProps {
  onComplete: () => void;
}

export const ForgeWalkthrough = ({ onComplete }: ForgeWalkthroughProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = WALKTHROUGH_STEPS[currentStep];
  const isLast = currentStep === WALKTHROUGH_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <WalkthroughCard
        key="walkthrough"
        step={step}
        currentStep={currentStep}
        totalSteps={WALKTHROUGH_STEPS.length}
        isLast={isLast}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </AnimatePresence>
  );
};

interface WalkthroughCardProps {
  step: WalkthroughStep;
  currentStep: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const WalkthroughCard = forwardRef<HTMLDivElement, WalkthroughCardProps>(
  ({ step, currentStep, totalSteps, isLast, onNext, onSkip }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 max-w-xs"
    >
      <div className="bg-[hsl(var(--discord-dark))] border border-[hsl(var(--discord-light)/0.3)] rounded-xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center gap-1 px-4 pt-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-all"
              style={{
                backgroundColor: i <= currentStep ? step.color : 'hsl(var(--discord-light))',
              }}
            />
          ))}
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <motion.div
              key={step.id}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${step.color}20`, border: `1px solid ${step.color}40` }}
            >
              <step.icon className="w-5 h-5" style={{ color: step.color }} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <motion.p
                key={`title-${step.id}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-bold text-white"
              >
                {step.emoji} {step.title}
              </motion.p>
              <motion.p
                key={`msg-${step.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xs text-[hsl(var(--discord-text-muted))] mt-1 leading-relaxed"
              >
                {step.message}
              </motion.p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={onSkip} className="text-[10px] text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors">
              Skip tour
            </button>
            <Button
              size="sm"
              onClick={onNext}
              className="h-7 text-xs font-bold text-white"
              style={{ backgroundColor: step.color }}
            >
              {isLast ? 'Start Building!' : 'Next'}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Speech bubble tail */}
      <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[hsl(var(--discord-dark))] border-r border-b border-[hsl(var(--discord-light)/0.3)] rotate-45" />
    </motion.div>
  )
);
WalkthroughCard.displayName = 'WalkthroughCard';

/**
 * Confetti celebration component - shows confetti burst for milestones
 */
export const MilestoneCelebration = ({ 
  show, 
  message, 
  onComplete 
}: { 
  show: boolean; 
  message: string; 
  onComplete: () => void 
}) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onCompleteRef.current(), 4000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <CelebrationOverlay key="celebration" message={message} />
    </AnimatePresence>
  );
};

const CelebrationOverlay = forwardRef<HTMLDivElement, { message: string }>(
  ({ message }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -50 }}
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
    >
      {/* Confetti particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 600,
            scale: [0, 1, 0.5],
            rotate: Math.random() * 720,
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: 'easeOut',
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#5865F2', '#FFD700'][i % 8],
          }}
        />
      ))}

      {/* Message card */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
        className="bg-[hsl(var(--discord-dark))] border-2 border-[hsl(var(--discord-yellow))] rounded-2xl px-8 py-5 shadow-2xl text-center"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <PartyPopper className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--discord-yellow))]" />
        </motion.div>
        <p className="text-lg font-bold text-white">{message}</p>
        <p className="text-xs text-[hsl(var(--discord-text-muted))] mt-1">Keep going! 🔥</p>
      </motion.div>
    </motion.div>
  )
);
CelebrationOverlay.displayName = 'CelebrationOverlay';
