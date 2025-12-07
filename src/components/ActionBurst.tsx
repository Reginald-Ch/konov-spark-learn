import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ActionBurstProps {
  children: ReactNode;
  className?: string;
}

export const ActionBurst = ({ children, className = "" }: ActionBurstProps) => {
  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Star burst background */}
      <motion.div
        className="absolute inset-0 action-burst"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          transform: "scale(1.3)",
          zIndex: 0
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 px-6 py-3 font-fredoka font-bold text-foreground text-xl md:text-2xl">
        {children}
      </div>
    </motion.div>
  );
};
