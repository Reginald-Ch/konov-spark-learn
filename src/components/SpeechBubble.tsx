import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SpeechBubbleProps {
  children: ReactNode;
  direction?: "left" | "right" | "bottom" | "up";
  className?: string;
  delay?: number;
}

export const SpeechBubble = ({ 
  children, 
  direction = "bottom",
  className = "",
  delay = 0
}: SpeechBubbleProps) => {
  const getTailPosition = () => {
    switch(direction) {
      case 'up':
        return 'top-[-18px] left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-[-18px] left-[30px]';
      case 'left':
        return 'left-[-18px] top-[20px]';
      case 'right':
        return 'right-[-18px] top-[20px]';
      default:
        return 'bottom-[-18px] left-[30px]';
    }
  };

  const getTailStyle = () => {
    switch(direction) {
      case 'up':
        return {
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderBottom: '18px solid hsl(var(--foreground))',
          borderTop: 'none'
        };
      case 'bottom':
        return {
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '18px solid hsl(var(--foreground))',
          borderBottom: 'none'
        };
      case 'left':
        return {
          borderTop: '12px solid transparent',
          borderBottom: '12px solid transparent',
          borderRight: '18px solid hsl(var(--foreground))',
          borderLeft: 'none'
        };
      case 'right':
        return {
          borderTop: '12px solid transparent',
          borderBottom: '12px solid transparent',
          borderLeft: '18px solid hsl(var(--foreground))',
          borderRight: 'none'
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.4, 
        delay,
        type: "spring",
        stiffness: 300
      }}
      className={`relative bg-card border-3 border-foreground rounded-3xl p-4 md:p-6 font-fredoka text-lg ${className}`}
      style={{
        boxShadow: "4px 4px 0 hsl(var(--foreground))"
      }}
    >
      {children}
      <div 
        className={`absolute w-0 h-0 ${getTailPosition()}`}
        style={getTailStyle()}
      />
    </motion.div>
  );
};