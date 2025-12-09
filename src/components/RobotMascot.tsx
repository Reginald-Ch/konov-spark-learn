import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

interface RobotMascotProps {
  type?: "happy" | "thinking" | "excited" | "teaching" | "cool";
  size?: "sm" | "md" | "lg";
  className?: string;
  followScroll?: boolean;
}

// Sound effect URLs (using Web Audio API for simple sounds)
const playSound = (type: "click" | "hover" | "welcome") => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case "click":
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case "hover":
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
      break;
    case "welcome":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
  }
};

// Welcome emotions that cycle
const welcomeEmotions = ["wave", "smile", "sparkle"] as const;
type WelcomeEmotion = typeof welcomeEmotions[number];

export const RobotMascot = ({ 
  type = "happy", 
  size = "md",
  className = "",
  followScroll = false
}: RobotMascotProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [welcomeEmotion, setWelcomeEmotion] = useState<WelcomeEmotion>("wave");
  const [scrollY, setScrollY] = useState(0);
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Eye movement based on mouse position
  const eyeX = useTransform(mouseX, [-100, 100], [-3, 3]);
  const eyeY = useTransform(mouseY, [-100, 100], [-2, 2]);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const eyeSizes = {
    sm: { eye: 8, pupil: 4, highlight: 2 },
    md: { eye: 10, pupil: 5, highlight: 2.5 },
    lg: { eye: 14, pupil: 7, highlight: 3 }
  };

  const bgColors = {
    happy: "from-secondary via-primary to-accent",
    thinking: "from-accent via-secondary to-primary",
    excited: "from-primary via-secondary to-accent",
    teaching: "from-accent via-primary to-secondary",
    cool: "from-primary via-accent to-secondary"
  };

  // Cycle through welcome emotions
  useEffect(() => {
    const emotionInterval = setInterval(() => {
      setWelcomeEmotion(prev => {
        const currentIndex = welcomeEmotions.indexOf(prev);
        return welcomeEmotions[(currentIndex + 1) % welcomeEmotions.length];
      });
    }, 3000);
    return () => clearInterval(emotionInterval);
  }, []);

  // Play welcome sound on mount
  useEffect(() => {
    if (!hasPlayedWelcome) {
      const timer = setTimeout(() => {
        try {
          playSound("welcome");
        } catch (e) {
          // Audio context may not be available
        }
        setHasPlayedWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasPlayedWelcome]);

  // Scroll tracking for follow behavior
  useEffect(() => {
    if (!followScroll) return;
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [followScroll]);

  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 150);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleClick = useCallback(() => {
    setIsClicked(true);
    try {
      playSound("click");
    } catch (e) {
      // Audio context may not be available
    }
    setTimeout(() => setIsClicked(false), 500);
  }, []);

  const handleHover = useCallback(() => {
    setIsHovered(true);
    try {
      playSound("hover");
    } catch (e) {
      // Audio context may not be available
    }
  }, []);

  const getExpression = () => {
    if (isClicked) return "love";
    if (isHovered) {
      switch (type) {
        case "happy": return "wink";
        case "thinking": return "curious";
        case "excited": return "surprised";
        case "teaching": return "smart";
        case "cool": return "sunglasses";
        default: return "wink";
      }
    }
    return welcomeEmotion;
  };

  const expression = getExpression();
  const sizes = eyeSizes[size];

  // Get wave hand for wave emotion
  const renderWelcomeEmote = () => {
    switch (welcomeEmotion) {
      case "wave":
        return (
          <motion.div
            className="absolute -right-2 top-1/2 text-lg"
            animate={{ rotate: [0, 20, -10, 20, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
          >
            👋
          </motion.div>
        );
      case "smile":
        return null; // Smile is shown in the mouth
      case "sparkle":
        return (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-accent"
                style={{
                  top: `${20 + i * 25}%`,
                  left: i % 2 === 0 ? "-15%" : "105%",
                  fontSize: size === "lg" ? 12 : 10,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              >
                ✨
              </motion.div>
            ))}
          </>
        );
    }
  };

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
        y: followScroll 
          ? [0, -4, 0]
          : [0, -6, 0],
        rotate: isClicked ? [0, -10, 10, -10, 0] : [0, 2, -2, 0],
        scale: followScroll ? [1, 1.02, 1] : 1,
      }}
      transition={{ 
        duration: isClicked ? 0.5 : 2.5,
        repeat: isClicked ? 0 : Infinity,
        ease: "easeInOut"
      }}
      onHoverStart={handleHover}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div 
        className={`relative w-full h-full bg-gradient-to-br ${bgColors[type]} rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] overflow-visible`}
      >
        {/* Welcome emotion emotes */}
        <AnimatePresence mode="wait">
          {!isHovered && !isClicked && renderWelcomeEmote()}
        </AnimatePresence>

        {/* Cheeks - appear on hover or smile emotion */}
        <motion.div
          className="absolute bottom-[25%] left-[10%] w-[18%] h-[12%] bg-primary/40 rounded-full"
          animate={{ opacity: isHovered || isClicked || welcomeEmotion === "smile" ? 0.6 : 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.div
          className="absolute bottom-[25%] right-[10%] w-[18%] h-[12%] bg-primary/40 rounded-full"
          animate={{ opacity: isHovered || isClicked || welcomeEmotion === "smile" ? 0.6 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Eyes Container */}
        <div className="absolute top-[30%] left-0 right-0 flex justify-center gap-[18%]">
          {/* Left Eye */}
          <motion.div 
            className="relative bg-foreground rounded-full flex items-center justify-center"
            style={{ 
              width: sizes.eye, 
              height: blinking ? 2 : sizes.eye 
            }}
            animate={{
              scaleY: blinking ? 0.1 : 1,
              y: expression === "surprised" ? -2 : 0,
            }}
            transition={{ duration: 0.1 }}
          >
            {!blinking && expression !== "wink" && (
              <>
                {/* Pupil */}
                <motion.div 
                  className="absolute bg-background rounded-full"
                  style={{ 
                    width: sizes.pupil, 
                    height: sizes.pupil,
                    x: eyeX,
                    y: eyeY,
                  }}
                />
                {/* Eye highlight */}
                <motion.div 
                  className="absolute bg-background/80 rounded-full"
                  style={{ 
                    width: sizes.highlight, 
                    height: sizes.highlight,
                    top: 1,
                    right: 1,
                  }}
                />
              </>
            )}
            {expression === "love" && (
              <motion.span 
                className="absolute text-primary -top-1"
                style={{ fontSize: sizes.eye * 1.5 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                ❤️
              </motion.span>
            )}
          </motion.div>

          {/* Right Eye */}
          <motion.div 
            className="relative bg-foreground rounded-full flex items-center justify-center"
            style={{ 
              width: sizes.eye, 
              height: blinking || expression === "wink" ? 2 : sizes.eye 
            }}
            animate={{
              scaleY: blinking || expression === "wink" ? 0.1 : 1,
              y: expression === "surprised" ? -2 : 0,
            }}
            transition={{ duration: 0.1 }}
          >
            {!blinking && expression !== "wink" && (
              <>
                <motion.div 
                  className="absolute bg-background rounded-full"
                  style={{ 
                    width: sizes.pupil, 
                    height: sizes.pupil,
                    x: eyeX,
                    y: eyeY,
                  }}
                />
                <motion.div 
                  className="absolute bg-background/80 rounded-full"
                  style={{ 
                    width: sizes.highlight, 
                    height: sizes.highlight,
                    top: 1,
                    right: 1,
                  }}
                />
              </>
            )}
            {expression === "love" && (
              <motion.span 
                className="absolute text-primary -top-1"
                style={{ fontSize: sizes.eye * 1.5 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                ❤️
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Mouth */}
        <motion.div 
          className="absolute bottom-[22%] left-1/2 -translate-x-1/2"
          animate={{
            width: expression === "surprised" ? "20%" : 
                   (welcomeEmotion === "smile" && !isHovered) ? "40%" :
                   isHovered ? "35%" : "25%",
            height: expression === "surprised" ? "15%" : 
                    (welcomeEmotion === "smile" && !isHovered) ? "15%" :
                    isHovered ? "12%" : "8%",
            borderRadius: expression === "surprised" ? "50%" : "0 0 50% 50%",
          }}
          transition={{ duration: 0.2 }}
        >
          <div 
            className={`w-full h-full bg-foreground ${
              expression === "surprised" ? "rounded-full" : "rounded-b-full"
            }`}
          />
          {/* Tongue - appears when excited */}
          {(isHovered && type === "excited") && (
            <motion.div
              className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[40%] h-[80%] bg-primary rounded-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>

        {/* Sparkles when clicked */}
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
                transition={{ duration: 0.5 }}
              >
                ✨
              </motion.div>
            ))}
          </>
        )}

        {/* Glow ring on hover */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/50"
          animate={{ 
            opacity: isHovered ? [0.3, 0.7, 0.3] : 0.2,
            scale: isHovered ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Antenna */}
        <motion.div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-3 bg-foreground rounded-full"
          animate={{ rotate: isHovered ? [0, 10, -10, 0] : 0 }}
          transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
        >
          <motion.div 
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent rounded-full border border-foreground"
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: isHovered 
                ? ["0 0 0 0 hsl(var(--accent))", "0 0 8px 2px hsl(var(--accent))", "0 0 0 0 hsl(var(--accent))"]
                : "0 0 0 0 hsl(var(--accent))"
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
