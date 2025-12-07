import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SpeechBubbleProps {
  children: ReactNode;
  direction?: "left" | "right" | "bottom";
  className?: string;
  delay?: number;
}

export const SpeechBubble = ({ 
  children, 
  direction = "bottom",
  className = "",
  delay = 0
}: SpeechBubbleProps) => {
  const tailStyles = {
    bottom: "after:bottom-[-20px] after:left-[30px] after:border-t-foreground before:bottom-[-14px] before:left-[33px] before:border-t-card",
    left: "after:left-[-20px] after:top-[20px] after:border-r-foreground after:border-t-0 after:border-l-0 before:left-[-14px] before:top-[23px] before:border-r-card before:border-t-0 before:border-l-0",
    right: "after:right-[-20px] after:top-[20px] after:border-l-foreground after:border-t-0 after:border-r-0 before:right-[-14px] before:top-[23px] before:border-l-card before:border-t-0 before:border-r-0"
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
        className={`absolute w-0 h-0 ${direction === 'bottom' ? 'bottom-[-18px] left-[30px]' : direction === 'left' ? 'left-[-18px] top-[20px]' : 'right-[-18px] top-[20px]'}`}
        style={{
          borderLeft: direction === 'bottom' ? '12px solid transparent' : direction === 'right' ? '18px solid hsl(var(--foreground))' : 'none',
          borderRight: direction === 'bottom' ? '12px solid transparent' : direction === 'left' ? '18px solid hsl(var(--foreground))' : 'none',
          borderTop: direction === 'bottom' ? '18px solid hsl(var(--foreground))' : '12px solid transparent',
          borderBottom: direction === 'bottom' ? 'none' : '12px solid transparent'
        }}
      />
    </motion.div>
  );
};
