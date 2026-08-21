import { motion } from 'framer-motion';
import { Rocket, Code, Zap, Brain, Trophy, Star, Shield, Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ForgeLevel = 'beginner' | 'hacker' | 'architect' | 'ai-lord';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  unlocked: boolean;
}

const LEVEL_CONFIG: Record<ForgeLevel, { name: string; icon: React.ElementType; color: string; minPoints: number; emoji: string }> = {
  'beginner': { name: 'Beginner', icon: Code, color: '#57F287', minPoints: 0, emoji: '🌱' },
  'hacker': { name: 'Hacker', icon: Zap, color: '#5865F2', minPoints: 5, emoji: '⚡' },
  'architect': { name: 'Architect', icon: Brain, color: '#9B59B6', minPoints: 12, emoji: '🧠' },
  'ai-lord': { name: 'AI Lord', icon: Crown, color: '#FFD700', minPoints: 20, emoji: '👑' },
};

export const getForgeLevel = (challengeCount: number): ForgeLevel => {
  if (challengeCount >= 20) return 'ai-lord';
  if (challengeCount >= 12) return 'architect';
  if (challengeCount >= 5) return 'hacker';
  return 'beginner';
};

export const getAchievements = (stats: {
  challengeCount: number;
  hasCustomName: boolean;
  hasKnowledge: boolean;
  hasQAPairs: boolean;
  hasRules: boolean;
  hasTested: boolean;
  hasSaved: boolean;
  codeLength: number;
}): Achievement[] => [
  {
    id: 'first-edit',
    name: 'First Edit',
    description: 'Customized your first variable',
    icon: Code,
    color: '#57F287',
    unlocked: stats.challengeCount >= 1,
  },
  {
    id: 'identity',
    name: 'Identity Crisis',
    description: 'Gave your bot a custom name',
    icon: Star,
    color: '#FEE75C',
    unlocked: stats.hasCustomName,
  },
  {
    id: 'knowledge-keeper',
    name: 'Knowledge Keeper',
    description: 'Added a knowledge base',
    icon: Brain,
    color: '#9B59B6',
    unlocked: stats.hasKnowledge,
  },
  {
    id: 'rule-maker',
    name: 'Rule Maker',
    description: 'Added conversation rules',
    icon: Shield,
    color: '#5865F2',
    unlocked: stats.hasRules,
  },
  {
    id: 'qa-master',
    name: 'Q&A Master',
    description: 'Created Q&A pairs',
    icon: Zap,
    color: '#EB459E',
    unlocked: stats.hasQAPairs,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Completed 5+ challenges',
    icon: Rocket,
    color: '#ED4245',
    unlocked: stats.challengeCount >= 5,
  },
  {
    id: 'code-ninja',
    name: 'Code Ninja',
    description: 'Wrote 50+ lines of config',
    icon: Code,
    color: '#00B894',
    unlocked: stats.codeLength >= 50,
  },
  {
    id: 'ai-lord',
    name: 'AI Lord',
    description: 'Completed 20+ challenges — legendary!',
    icon: Crown,
    color: '#FFD700',
    unlocked: stats.challengeCount >= 20,
  },
];

interface LevelBadgeProps {
  challengeCount: number;
  compact?: boolean;
}

export const LevelBadge = ({ challengeCount, compact = false }: LevelBadgeProps) => {
  const level = getForgeLevel(challengeCount);
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;
  const nextLevel = level === 'beginner' ? 'hacker' : level === 'hacker' ? 'architect' : level === 'architect' ? 'ai-lord' : null;
  const nextConfig = nextLevel ? LEVEL_CONFIG[nextLevel] : null;
  const progress = nextConfig 
    ? Math.min(100, ((challengeCount - config.minPoints) / (nextConfig.minPoints - config.minPoints)) * 100)
    : 100;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-help"
            style={{ 
              backgroundColor: `${config.color}20`, 
              borderColor: `${config.color}40`,
              color: config.color 
            }}
          >
            <span>{config.emoji}</span>
            <span>{config.name}</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{config.emoji} {config.name}</p>
          <p className="text-xs text-muted-foreground">{challengeCount} challenges completed</p>
          {nextConfig && (
            <p className="text-xs text-muted-foreground">Next: {nextConfig.emoji} {nextConfig.name} ({nextConfig.minPoints} needed)</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg p-3 border"
      style={{ 
        backgroundColor: `${config.color}10`, 
        borderColor: `${config.color}30` 
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}25` }}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: config.color }}>{config.emoji} {config.name}</p>
          <p className="text-[10px] text-ide-text-muted">{challengeCount}/34 challenges</p>
        </div>
      </div>
      {nextConfig && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-ide-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
            />
          </div>
          <p className="text-[9px] text-ide-text-muted">
            {nextConfig.minPoints - challengeCount} more to reach {nextConfig.emoji} {nextConfig.name}
          </p>
        </div>
      )}
    </motion.div>
  );
};

interface AchievementGridProps {
  stats: Parameters<typeof getAchievements>[0];
}

export const AchievementGrid = ({ stats }: AchievementGridProps) => {
  const achievements = getAchievements(stats);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ide-text">
          <Trophy className="w-3 h-3 inline mr-1 text-ide-yellow" />
          Achievements ({unlockedCount}/{achievements.length})
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {achievements.map((achievement) => (
          <Tooltip key={achievement.id}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: achievement.unlocked ? 1 : 0.85 }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all cursor-help ${
                  achievement.unlocked
                    ? 'border-ide-border/40'
                    : 'border-ide-border/10 opacity-30 grayscale'
                }`}
                style={achievement.unlocked ? { backgroundColor: `${achievement.color}10` } : {}}
              >
                <achievement.icon className="w-4 h-4" style={{ color: achievement.unlocked ? achievement.color : '#555' }} />
                <span className="text-[8px] font-bold text-center leading-tight text-ide-text-muted">
                  {achievement.name}
                </span>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">{achievement.name}</p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
              <p className="text-xs">{achievement.unlocked ? '✅ Unlocked!' : '🔒 Locked'}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
