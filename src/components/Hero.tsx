import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Rocket, Zap } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { AnimatedCounter } from "./AnimatedCounter";
import { SignupModal } from "./SignupModal";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";
import { SpeechBubble } from "./SpeechBubble";
import { ActionBurst } from "./ActionBurst";

export const Hero = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden halftone-bg">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      
      {/* Floating Elements */}
      <motion.div 
        className="absolute top-20 left-10 w-20 h-20 bg-primary/30 rounded-full blur-2xl"
        animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/30 rounded-full blur-2xl"
        animate={{ y: [0, 20, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
      <motion.div 
        className="absolute top-40 right-20 w-24 h-24 bg-accent/30 rounded-full blur-2xl"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Action Burst Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-block"
          >
            <ActionBurst>
              <span className="flex items-center gap-2 text-base md:text-lg">
                <Sparkles className="w-5 h-5" />
                 AI & ML Literacy Hub!
              </span>
            </ActionBurst>
          </motion.div>
          
          {/* Main Heading - Comic Style */}
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-fredoka font-bold leading-tight"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="text-primary">AI Literacy</span>
            <br />
            <span className="text-foreground">Made Fun & </span>
            <span className="text-secondary">Creative!</span>
          </motion.h1>
          
          {/* Speech Bubble Description */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <SpeechBubble className="inline-block">
              <p className="text-lg md:text-xl text-muted-foreground font-space leading-relaxed">
                “Teaching kids how intelligent systems think — how data drives decisions, how algorithms spark creativity — through hands-on workshops, powerful storytelling comics, and an interactive EdTech learning experience!”
              </p>
            </SpeechBubble>
          </motion.div>

          {/* Mascots Row */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center items-end gap-4 my-8"
          >
            <RobotMascot type="thinking" size="md" />
            <RobotMascot type="excited" size="lg" />
            <RobotMascot type="happy" size="md" />
          </motion.div>
          
          {/* CTA Buttons - Comic Style */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 font-fredoka font-bold rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-gradient-to-r from-primary to-accent"
              onClick={() => setShowSignupModal(true)}
            >
              <Rocket className="mr-2 w-6 h-6" />
              Start Learning!
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 font-fredoka font-bold rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-card"
              onClick={() => navigate('/programs')}
            >
              <Zap className="mr-2 w-5 h-5" />
              Explore Programs
            </Button>
          </motion.div>
          
          <SignupModal 
            open={showSignupModal} 
            onOpenChange={setShowSignupModal}
            source="hero"
          />
          
          {/* Stats - Comic Panels */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-5xl mx-auto"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[
              { label: "Students Reached", value: 10000, suffix: "+", desc: "since 2019" },
              { label: "Workshops Delivered", value: 500, suffix: "+", desc: "across Africa" },
              { label: "School Partners", value: 50, suffix: "+", desc: "and growing" },
              { label: "African Countries", value: 15, suffix: "", desc: "presence" },
            ].map((stat, idx) => (
              <ComicPanel 
                key={idx} 
                color={["primary", "secondary", "accent", "primary"][idx] as "primary" | "secondary" | "accent"}
                delay={idx * 0.1}
              >
                <div className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-fredoka font-bold text-foreground">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-foreground font-fredoka mt-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground font-space mt-1">
                    {stat.desc}
                  </div>
                </div>
              </ComicPanel>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
