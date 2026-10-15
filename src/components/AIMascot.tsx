import { useState } from "react";
import mascotImage from "@/assets/meai-mascot.png";
import { Button } from "./ui/button";
import { analytics } from "@/hooks/useAnalytics";
import { Link } from "react-router-dom";

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
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 pointer-events-none hidden md:block">
      {/* Speech Bubble — only on click */}
      <div
        className={`absolute bottom-24 right-0 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "invisible opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-card border-2 border-foreground/20 rounded-xl p-3 shadow-xl max-w-[220px]">
          <p className="text-xs font-semibold text-foreground mb-1.5 leading-snug">
            Hi! I'm Konovy. Explore Me AI, our first product.
          </p>
          <Button
            asChild
            className="w-full mt-2 bg-primary text-primary-foreground font-semibold text-xs py-1.5"
          >
            <Link to="/me-ai" onClick={handleCTAClick}>Discover Me AI</Link>
          </Button>
        </div>
        <div className="absolute -bottom-1.5 right-10 w-3 h-3 bg-card border-r-2 border-b-2 border-foreground/20 transform rotate-45" />
      </div>

      {/* Mascot — static, click to toggle */}
      <Button
        variant="ghost"
        className="relative h-16 w-16 p-0 cursor-pointer pointer-events-auto group hover:bg-transparent"
        onClick={handleMascotClick}
        aria-label="Toggle Konovy message"
        aria-expanded={isOpen}
      >
        <div className="relative w-16 h-16 transition-transform duration-200 group-hover:scale-105">
          <img
            src={mascotImage}
            alt="Konovy AI Mascot"
            className="w-full h-full object-contain"
          />
        </div>
      </Button>
    </div>
  );
};
