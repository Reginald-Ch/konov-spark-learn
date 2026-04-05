import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import mascotLogo from "@/assets/meai-mascot.png";

interface RobotMascotProps {
  type?: "happy" | "thinking" | "excited" | "teaching" | "cool";
  size?: "sm" | "md" | "lg";
  className?: string;
  followScroll?: boolean;
}

export const RobotMascot = forwardRef<HTMLDivElement, RobotMascotProps>(({ 
  type = "happy", 
  size = "md",
  className = "",
  followScroll = false
}, _ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-36 h-36"
  };

  const handleClick = useCallback(() => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`${sizeClasses[size]} ${className} cursor-pointer select-none`}
      style={followScroll ? { 
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 50,
      } : undefined}
      animate={{ 
        y: followScroll ? [0, -4, 0] : [0, -6, 0],
        rotate: isClicked ? [0, -10, 10, -10, 0] : [0, 2, -2, 0],
      }}
      transition={{ 
        duration: isClicked ? 0.5 : 2.5,
        repeat: isClicked ? 0 : Infinity,
        ease: "easeInOut"
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-black">
        <img 
          src={mascotLogo} 
          alt="ME AI Mascot" 
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Sparkles when clicked */}
      <AnimatePresence>
        {isClicked && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-accent"
                style={{
                  top: "50%",
                  left: "50%",
                  fontSize: size === "lg" ? 14 : size === "md" ? 10 : 8,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos(i * 60 * Math.PI / 180) * 30,
                  y: Math.sin(i * 60 * Math.PI / 180) * 30,
                  opacity: 0,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                ✨
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Glow ring on hover */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-accent/50"
        animate={{ 
          opacity: isHovered ? [0.3, 0.7, 0.3] : 0.2,
          scale: isHovered ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  );
});
RobotMascot.displayName = "RobotMascot";
