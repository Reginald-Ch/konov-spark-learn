import { motion } from "framer-motion";

interface RobotMascotProps {
  type?: "happy" | "thinking" | "excited" | "teaching";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RobotMascot = ({ 
  type = "happy", 
  size = "md",
  className = "" 
}: RobotMascotProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  const expressions = {
    happy: { eyes: "^_^", mouth: "◡", antenna: "📡" },
    thinking: { eyes: "◔_◔", mouth: "〜", antenna: "💭" },
    excited: { eyes: "★_★", mouth: "◠", antenna: "⚡" },
    teaching: { eyes: "◉_◉", mouth: "▽", antenna: "💡" }
  };

  const colors = {
    happy: "from-secondary to-primary",
    thinking: "from-accent to-secondary",
    excited: "from-primary to-secondary",
    teaching: "from-accent to-primary"
  };

  const expr = expressions[type];

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ 
        y: [0, -8, 0],
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className={`relative w-full h-full bg-gradient-to-br ${colors[type]} rounded-2xl border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]`}>
        {/* Antenna */}
        <motion.div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl"
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {expr.antenna}
        </motion.div>
        
        {/* Face */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Eyes */}
          <motion.div 
            className="text-foreground font-bold text-xl md:text-2xl font-fredoka"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {expr.eyes}
          </motion.div>
          
          {/* Mouth */}
          <div className="text-foreground text-lg mt-1">
            {expr.mouth}
          </div>
        </div>

        {/* Blinking lights */}
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-foreground"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-2 left-2 w-2 h-2 rounded-full bg-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
};
