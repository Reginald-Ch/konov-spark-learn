import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Rocket } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { AnimatedCounter } from "./AnimatedCounter";
import { SignupModal } from "./SignupModal";

export const Hero = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-40 right-20 w-24 h-24 bg-accent/20 rounded-full blur-3xl animate-float" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse-glow" />
            <span className="text-sm font-space text-muted-foreground">Africa's First AI & ML Literacy Hub for Kids</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-orbitron font-black leading-tight">
            <span className="gradient-text">AI Literacy</span>
            <br />
            <span className="text-foreground">Made Fun & Creative</span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Teaching kids how intelligent systems think, how data drives decisions, and how algorithms power creativity—through workshops, comics, and interactive learning.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all duration-300 font-space font-semibold group"
              onClick={() => setShowSignupModal(true)}
            >
              Start Learning
              <Rocket className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 font-space font-semibold"
              onClick={() => navigate('/programs')}
            >
              Explore Programs
            </Button>
          </div>
          
          <SignupModal 
            open={showSignupModal} 
            onOpenChange={setShowSignupModal}
            source="hero"
          />
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-4xl mx-auto">
            {[
              { label: "Students Reached", value: 10000, suffix: "+", desc: "since 2019" },
              { label: "Workshops Delivered", value: 500, suffix: "+", desc: "across Africa" },
              { label: "School Partners", value: 50, suffix: "+", desc: "and growing" },
              { label: "African Countries", value: 15, suffix: "", desc: "presence" },
            ].map((stat, idx) => (
              <div key={idx} className="glow-card p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/20 group hover:scale-105 transition-transform duration-300">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                <div className="text-sm text-muted-foreground font-space mt-2">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground/70 font-space mt-1">
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
