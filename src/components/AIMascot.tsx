import { useState, useEffect, useRef } from "react";
import mascotImage from "@/assets/ai-mascot.jpg";
import { Button } from "./ui/button";
import { analytics } from "@/hooks/useAnalytics";

const urgentMessages = [
  "🔥 Limited spots! Join our next workshop before they're gone!",
  "⚡ 50+ kids joined this week! Don't miss out!",
  "🎯 Early bird discount ending soon! Sign up now!",
  "✨ Your friends are already learning AI! Join them!",
];

const engagementMessages = [
  "🌟 Want to build your own AI? Let's start learning!",
  "🚀 I can teach you to code in just 4 weeks!",
  "🎨 Create amazing things with AI! Ready to begin?",
  "💡 You're just one click away from becoming a tech wizard!",
  "🎯 Future innovators start here! Are you ready?",
  "🌈 Your AI journey begins with one step! Take it now!",
];

const socialProofMessages = [
  "👥 500+ students already enrolled! Join the community!",
  "⭐ Parents love our programs! 4.9/5 rating!",
  "🏆 Our students built 100+ AI projects this month!",
  "💬 'My kid won't stop talking about the classes!' - Happy Parent",
];

const curiosityMessages = [
  "🤔 Want to know a secret about AI? Click me!",
  "❓ Did you know AI can create music? Learn how!",
  "🎮 Ever wanted to make your own game? I can show you!",
  "🔮 Discover what AI can do for YOU!",
];

type MoodType = "idle" | "excited" | "thinking" | "celebrating" | "waving";

export const AIMascot = () => {
  const [message, setMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [mood, setMood] = useState<MoodType>("idle");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [showCTA, setShowCTA] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const [hasScrolledPast50, setHasScrolledPast50] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Check returning visitor
  useEffect(() => {
    const lastVisit = localStorage.getItem('lastMascotVisit');
    if (lastVisit) {
      setIsReturningVisitor(true);
      analytics.trackMascotInteraction('returning-visitor');
    }
    localStorage.setItem('lastMascotVisit', new Date().toISOString());
  }, []);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasInteracted && timeOnPage > 10) {
        setMood("excited");
        setMessage("⏰ Wait! Don't miss our limited workshop spots!");
        setIsVisible(true);
        setShowCTA(true);
        analytics.trackMascotInteraction('exit-intent-triggered');
        setTimeout(() => {
          setIsVisible(false);
          setShowCTA(false);
        }, 8000);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasInteracted, timeOnPage]);

  // Scroll-based trigger
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent > 50 && !hasScrolledPast50 && !hasInteracted) {
        setHasScrolledPast50(true);
        setMood("thinking");
        setMessage("🤔 Interested? Let me help you find the perfect program!");
        setIsVisible(true);
        setShowCTA(true);
        analytics.trackMascotInteraction('scroll-triggered');
        setTimeout(() => {
          setIsVisible(false);
          setShowCTA(false);
        }, 7000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolledPast50, hasInteracted]);

  // Track mouse for eye following
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;
      
      const angleX = (e.clientX - mascotCenterX) / 50;
      const angleY = (e.clientY - mascotCenterY) / 50;
      
      setEyePosition({
        x: Math.max(-8, Math.min(8, angleX)),
        y: Math.max(-8, Math.min(8, angleY)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Time on page tracker with strategic interventions
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnPage((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Strategic message triggers based on time and behavior
  useEffect(() => {
    // Welcome message after 3 seconds
    if (timeOnPage === 3) {
      setMood("waving");
      const welcomeMsg = isReturningVisitor 
        ? "🎉 Welcome back! Ready to continue your journey?"
        : "👋 Hi! I'm Konovy, your AI learning buddy!";
      setMessage(welcomeMsg);
      setIsVisible(true);
      analytics.trackMascotInteraction('welcome-shown');
      setTimeout(() => setIsVisible(false), 4000);
      setTimeout(() => setMood("idle"), 1000);
    }

    // Engagement message after 10 seconds
    if (timeOnPage === 10 && !hasInteracted) {
      setMood("excited");
      const msg = engagementMessages[Math.floor(Math.random() * engagementMessages.length)];
      setMessage(msg);
      setIsVisible(true);
      setShowCTA(true);
      analytics.trackMascotInteraction('engagement-10s');
      setTimeout(() => {
        setIsVisible(false);
        setShowCTA(false);
      }, 8000);
    }

    // Urgency message after 20 seconds
    if (timeOnPage === 20) {
      setMood("excited");
      const msg = urgentMessages[Math.floor(Math.random() * urgentMessages.length)];
      setMessage(msg);
      setIsVisible(true);
      setShowCTA(true);
      setTimeout(() => {
        setIsVisible(false);
        setShowCTA(false);
      }, 8000);
    }

    // Social proof after 35 seconds
    if (timeOnPage === 35) {
      setMood("celebrating");
      const msg = socialProofMessages[Math.floor(Math.random() * socialProofMessages.length)];
      setMessage(msg);
      setIsVisible(true);
      setShowCTA(true);
      setTimeout(() => {
        setIsVisible(false);
        setShowCTA(false);
        setMood("idle");
      }, 8000);
    }

    // Exit intent simulation (curiosity) after 50 seconds
    if (timeOnPage === 50) {
      setMood("thinking");
      const msg = curiosityMessages[Math.floor(Math.random() * curiosityMessages.length)];
      setMessage(msg);
      setIsVisible(true);
      setShowCTA(true);
      setTimeout(() => {
        setIsVisible(false);
        setShowCTA(false);
        setMood("idle");
      }, 7000);
    }
  }, [timeOnPage, hasInteracted]);

  // Floating animation
  useEffect(() => {
    const floatInterval = setInterval(() => {
      setPosition({
        x: Math.sin(Date.now() / 2000) * 10,
        y: Math.cos(Date.now() / 3000) * 15,
      });
    }, 50);

    return () => clearInterval(floatInterval);
  }, []);

  const handleMascotClick = () => {
    setHasInteracted(true);
    setMood("celebrating");
    analytics.trackMascotInteraction('mascot-clicked');
    const responses = [
      "🎉 Awesome! Let's get you started!",
      "💫 You're going to love learning with us!",
      "🚀 Smart choice! Your future starts now!",
      "⭐ Yes! Let's build something amazing together!",
    ];
    const randomMessage = responses[Math.floor(Math.random() * responses.length)];
    setMessage(randomMessage);
    setIsVisible(true);
    setShowCTA(true);
    
    setTimeout(() => setMood("excited"), 1500);
  };

  const handleCTAClick = () => {
    analytics.trackButtonClick('Mascot CTA', 'AI Mascot');
    // Only scroll to CTA on homepage
    if (window.location.pathname === '/') {
      const ctaSection = document.querySelector("#cta-section");
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMood("celebrating");
    setMessage("🎊 Perfect! Fill out the form below!");
    setTimeout(() => {
      setIsVisible(false);
      setShowCTA(false);
      setMood("idle");
    }, 3000);
  };

  const getMoodAnimation = () => {
    switch (mood) {
      case "excited":
        return "animate-bounce";
      case "celebrating":
        return "animate-pulse scale-110";
      case "waving":
        return "animate-pulse";
      case "thinking":
        return "";
      default:
        return "";
    }
  };

  const getMoodEmoji = () => {
    switch (mood) {
      case "excited":
        return "🤩";
      case "celebrating":
        return "🎉";
      case "waving":
        return "👋";
      case "thinking":
        return "💭";
      default:
        return "✨";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none">
      {/* Enhanced Speech Bubble */}
      <div
        className={`absolute bottom-24 right-0 pointer-events-auto transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="bg-card border border-primary/40 rounded-xl p-3 shadow-xl max-w-[240px] backdrop-blur-lg">
          <div className="text-xs font-semibold text-primary mb-1.5 leading-snug">{message}</div>
          
          {showCTA && (
            <Button
              onClick={handleCTAClick}
              className="w-full mt-2 bg-primary text-white font-semibold hover:scale-105 transition-transform text-xs py-1.5"
            >
              Join Now! 🚀
            </Button>
          )}
        </div>
        <div className="absolute -bottom-1.5 right-10 w-3 h-3 bg-card border-r border-b border-primary/40 transform rotate-45"></div>
      </div>

      {/* Enhanced Mascot */}
      <div
        ref={mascotRef}
        className="relative cursor-pointer pointer-events-auto group"
        onClick={handleMascotClick}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: "transform 0.3s ease-out",
        }}
      >
        <div className="relative">
          {/* Enhanced glow with pulsing effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/400 animate-pulse-glow"primary/40 mood-based animationprimary/40     <img
              src={mascotImage}
              alt="Konovy AI Mascot"
              className={`relative w-20 h-20 rounded-full border-2 border-primary/50 shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:border-secondary ${getMoodAnimation()}`}
            />
            
            {/* Animated eyes overlay */}
            <div 
              className="absolute top-7 left-1/2 -translate-x-1/2 w-8 flex justify-between pointer-events-none"
              style={{
                transform: `translate(calc(-50% + ${eyePosition.x}px), ${eyePosition.y}px)`,
                transition: "transform 0.1s ease-out",
              }}
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-lg"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-lg"></div>
            </div>
          </div>
          
          {/* Mood indicator with enhanced animation */}
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center secondary border-white animate-bounce">
            {getMoodEmoji()}
  secondaryon pulse rings */}
          {isVisible && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30"></div>
              <div className="absolute inset-0 rounded-full border-2 border-secondary animate-ping opacity-20" style={{ animationDelay: "0.2s" }}></div>
            </>
          )}
        </div>

        {/* Enhanced hover tooltip */}
        <div className="absolute bottom-0 right-full mr-4 bg-gradient-to-r from-primary to-secondary backdrop-blur-sm px-3 py-1.5 rounded-lg opacity-0 group-hoverprim-300 whitespace-nowrap text-xs font-semibold text-white shadow-lg border border-white/20">
          Click me! ✨
        </div>
      </div>
    </div>
  );
};
