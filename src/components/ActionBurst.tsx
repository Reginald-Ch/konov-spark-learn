import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ActionBurstProps {
  children: ReactNode;
  className?: string;
  color?: "primary" | "accent" | "secondary";
}

export const ActionBurst = ({ children, className = "", color = "primary" }: ActionBurstProps) => {
  const colorClasses = {
    primary: "bg-primary",
    accent: "bg-accent",
    secondary: "bg-secondary"
  };

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Star burst background */}
      <motion.div
        className={`absolute inset-0 ${colorClasses[color]} action-burst`}
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          transform: "scale(1.3)",
          zIndex: 0,
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 px-6 py-3 font-fredoka font-bold text-foreground text-xl md:text-2xl">
        {children}
      </div>
    </motion.div>
  );
};