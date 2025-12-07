import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Rocket, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { SignupModal } from "@/components/SignupModal";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";
import { ActionBurst } from "./ActionBurst";

export const CTA = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  return (
    <section id="cta-section" className="py-24 md:py-32 relative overflow-hidden halftone-bg">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <ComicPanel color="primary" className="p-8 md:p-12">
            <div className="text-center">
              {/* Mascots */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="flex justify-center gap-4 mb-6"
              >
                <RobotMascot type="excited" size="md" />
                <RobotMascot type="happy" size="lg" />
                <RobotMascot type="thinking" size="md" />
              </motion.div>

              {/* Action Burst */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-6"
              >
                <ActionBurst>
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Limited Spots!
                  </span>
                </ActionBurst>
              </motion.div>

              <motion.h2 
                className="text-4xl md:text-6xl font-fredoka font-bold mb-6 text-foreground"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Start Your Child's{" "}
                <span className="text-secondary">AI Journey</span>{" "}
                Today!
              </motion.h2>
              
              <motion.p 
                className="text-xl text-muted-foreground mb-10 font-space leading-relaxed max-w-2xl mx-auto"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                Join 10,000+ students learning AI through fun, 
                hands-on experiences. Limited spots available for this month's workshops!
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                  className="text-lg px-8 py-6 font-fredoka font-bold rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-gradient-to-r from-secondary to-accent"
                >
                  <Rocket className="mr-2 w-6 h-6" />
                  Get Started Today!
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => window.location.href = '/programs'}
                  className="text-lg px-8 py-6 font-fredoka font-bold rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-card"
                >
                  Learn More
                </Button>
              </motion.div>
              
              {/* Trust Indicators */}
              <motion.div 
                className="mt-12 pt-8 border-t-4 border-foreground/20"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-sm text-muted-foreground mb-4 font-fredoka">
                  Trusted by educators and parents across Africa
                </p>
                <div className="flex flex-wrap justify-center gap-6 items-center text-sm text-muted-foreground font-space">
                  {[
                    { label: "Safe Learning Environment", color: "bg-primary" },
                    { label: "Expert-Led Programs", color: "bg-accent" },
                    { label: "Proven Results", color: "bg-secondary" },
                  ].map((item, idx) => (
                    <span key={idx} className="flex items-center gap-2">
                      <motion.div 
                        className={`w-3 h-3 rounded-full ${item.color}`}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.3 }}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </ComicPanel>
        </div>
      </div>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="cta" />
    </section>
  );
};
