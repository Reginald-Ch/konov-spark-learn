import { useState, useEffect } from "react";
import mascotImage from "@/assets/ai-mascot.jpg";

const funFacts = [
  "🚀 Did you know? AI can help design video games!",
  "🎨 Fun fact: AI can create amazing digital art!",
  "🤖 Hey there! AI is learning to understand jokes!",
  "✨ Cool! AI helps doctors find cures faster!",
  "🌟 Amazing! You can teach AI to recognize your drawings!",
  "🎮 Wow! AI can learn to play games just like you!",
  "🧠 Did you know? AI learns from practice, just like you!",
  "🌈 Fun fact: AI helps make cartoons and movies!",
];

const encouragements = [
  "You're awesome! 🌟",
  "Keep exploring! 🚀",
  "You're a future innovator! 💡",
  "Learning is fun! 🎉",
  "You're amazing! ⭐",
  "Tech is cool! 🤖",
];

export const AIMascot = () => {
  const [message, setMessage] = useState(funFacts[0]);
  const [isVisible, setIsVisible] = useState(true);
  const [isWaving, setIsWaving] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Show random fun facts periodically
    const factInterval = setInterval(() => {
      const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
      setMessage(randomFact);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }, 15000);

    // Gentle floating animation
    const floatInterval = setInterval(() => {
      setPosition({
        x: Math.sin(Date.now() / 2000) * 10,
        y: Math.cos(Date.now() / 3000) * 15,
      });
    }, 50);

    // Random wave animation
    const waveInterval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 8000);

    return () => {
      clearInterval(factInterval);
      clearInterval(floatInterval);
      clearInterval(waveInterval);
    };
  }, []);

  const handleMascotClick = () => {
    const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
    setMessage(randomMessage);
    setIsVisible(true);
    setIsWaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsWaving(false);
    }, 3000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
      {/* Speech Bubble */}
      <div
        className={`absolute bottom-32 right-0 bg-card border-2 border-primary rounded-2xl p-4 shadow-lg max-w-xs transition-all duration-500 pointer-events-auto ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="text-sm font-medium gradient-text">{message}</div>
        <div className="absolute -bottom-2 right-8 w-4 h-4 bg-card border-r-2 border-b-2 border-primary transform rotate-45"></div>
      </div>

      {/* Mascot */}
      <div
        className="relative cursor-pointer pointer-events-auto group"
        onClick={handleMascotClick}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: "transform 0.3s ease-out",
        }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full blur-xl opacity-50 animate-pulse-glow"></div>
          
          {/* Mascot image */}
          <img
            src={mascotImage}
            alt="AI Mascot"
            className={`relative w-24 h-24 rounded-full border-4 border-primary/50 shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:border-secondary ${
              isWaving ? "animate-pulse scale-110" : ""
            }`}
          />
          
          {/* Click me indicator */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-xs animate-bounce">
            👋
          </div>
        </div>

        {/* Hover tooltip */}
        <div className="absolute bottom-0 right-full mr-4 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm border border-primary/30">
          Click me for fun! ✨
        </div>
      </div>
    </div>
  );
};
