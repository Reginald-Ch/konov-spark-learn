import { useState } from "react";
import mascotImage from "@/assets/meai-mascot.png";
import { Button } from "./ui/button";
import { analytics } from "@/hooks/useAnalytics";

export const AIMascot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMascotClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      analytics.trackMascotInteraction('mascot-clicked');
    }
  };

  const handleCTAClick = () => {
    analytics.trackButtonClick('Mascot CTA', 'AI Mascot');
    if (window.location.pathname === '/') {
      const ctaSection = document.querySelector("#cta-section");
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 pointer-events-none hidden md:block">
      {/* Speech Bubble — only on click */}
      <div
        className={`absolute bottom-24 right-0 pointer-events-auto transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-card border-2 border-foreground/20 rounded-xl p-3 shadow-xl max-w-[220px]">
          <p className="text-xs font-semibold text-foreground mb-1.5 leading-snug">
            👋 Hi! I'm Konovy. Need help finding the right program?
          </p>
          <Button
            onClick={handleCTAClick}
            className="w-full mt-2 bg-primary text-primary-foreground font-semibold text-xs py-1.5"
          >
            Join Now! 🚀
          </Button>
        </div>
        <div className="absolute -bottom-1.5 right-10 w-3 h-3 bg-card border-r-2 border-b-2 border-foreground/20 transform rotate-45" />
      </div>

      {/* Mascot — static, click to toggle */}
      <div
        className="relative cursor-pointer pointer-events-auto group"
        onClick={handleMascotClick}
      >
        <div className="relative w-16 h-16 rounded-full border-2 border-primary/40 shadow-lg transition-transform duration-200 group-hover:scale-110 overflow-hidden bg-card">
          <img
            src={mascotImage}
            alt="Konovy AI Mascot"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center text-[10px] shadow border border-background">
          {isOpen ? "💬" : "✨"}
        </div>
      </div>
    </div>
  );
};
