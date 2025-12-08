import { motion } from "framer-motion";

interface RobotMascotProps {
  type?: "happy" | "thinking" | "excited" | "teaching" | "cool";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RobotMascot = ({ 
  type = "happy", 
  size = "md",
  className = "" 
}: RobotMascotProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const emojiFaces = {
    happy: "😊",
    thinking: "🤔",
    excited: "🤩",
    teaching: "🧠",
    cool: "😎"
  };

  const bgColors = {
    happy: "from-secondary via-primary to-accent",
    thinking: "from-accent via-secondary to-primary",
    excited: "from-primary via-secondary to-accent",
    teaching: "from-accent via-primary to-secondary",
    cool: "from-primary via-accent to-secondary"
  };

  const emojiSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl"
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ 
        y: [0, -6, 0],
        rotate: [0, 3, -3, 0],
      }}
      transition={{ 
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div 
        className={`relative w-full h-full bg-gradient-to-br ${bgColors[type]} rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] flex items-center justify-center overflow-hidden`}
        whileHover={{ scale: 1.15, rotate: 10 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {/* Sparkle effects */}
        <motion.div
          className="absolute top-1 right-1 text-xs"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        >
          ✨
        </motion.div>
        <motion.div
          className="absolute bottom-1 left-1 text-xs"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
        >
          ⭐
        </motion.div>

        {/* Emoji face */}
        <motion.span 
          className={`${emojiSizes[size]} select-none`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {emojiFaces[type]}
        </motion.span>

        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
};