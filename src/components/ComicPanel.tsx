import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ComicPanelProps {
  children: ReactNode;
  color?: "primary" | "secondary" | "accent" | "default";
  className?: string;
  delay?: number;
}

export const ComicPanel = ({ 
  children, 
  color = "default", 
  className = "",
  delay = 0 
}: ComicPanelProps) => {
  const borderClass = {
    primary: "comic-border-primary",
    secondary: "comic-border-secondary",
    accent: "comic-border-accent",
    default: "comic-border"
  }[color];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
      whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 200
      }}
      whileHover={{ scale: 1.02, rotate: 1 }}
      className={`${borderClass} bg-card overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};
