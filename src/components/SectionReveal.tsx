import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

export const SectionReveal = ({ 
  children, 
  className = "", 
  delay = 0,
  direction = "up" 
}: SectionRevealProps) => {
  const directionMap = {
    up: { y: 40, x: 0 },
    left: { y: 0, x: -40 },
    right: { y: 0, x: 40 },
  };

  const offset = directionMap[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
