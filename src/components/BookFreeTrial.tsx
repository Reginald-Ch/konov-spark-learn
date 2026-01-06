import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, Sparkles, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";
import { SpeechBubble } from "@/components/SpeechBubble";
import { SignupModal } from "@/components/SignupModal";

export const BookFreeTrial = () => {
  const [showModal, setShowModal] = useState(false);

  const benefits = [
    { icon: Clock, text: "1-Hour Free Session" },
    { icon: Users, text: "Small Group Learning" },
    { icon: Gift, text: "Free Learning Kit" },
  ];

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <ComicPanel color="primary" className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div className="text-center md:text-left">
                <ActionBurst color="accent" className="mb-4 inline-block">
                  FREE TRIAL!
                </ActionBurst>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-fredoka font-bold mb-4">
                  Book Your{" "}
                  <span className="gradient-text">Free Trial</span>{" "}
                  Session!
                </h2>
                
                <SpeechBubble direction="up" className="mb-6">
                  <p className="text-base md:text-lg font-space">
                    Experience the magic of AI learning with a free introductory session. 
                    No commitment required!
                  </p>
                </SpeechBubble>

                {/* Benefits */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-8">
                  {benefits.map((benefit, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]"
                    >
                      <benefit.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-fredoka font-bold">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setShowModal(true)}
                    className="font-fredoka font-bold text-lg px-8 py-6 rounded-full border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all group"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Free Trial
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>

                <p className="text-sm text-muted-foreground mt-4 font-space">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  Limited spots available each week
                </p>
              </div>

              {/* Right Content - Mascot */}
              <div className="flex flex-col items-center justify-center">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-2, 2, -2]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <RobotMascot type="excited" size="lg" />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="mt-4"
                >
                  <SpeechBubble direction="up" className="text-center">
                    <p className="font-fredoka font-bold text-lg">
                      "Try before you enroll!"
                    </p>
                    <p className="text-sm text-muted-foreground font-space">
                      100% Free • No strings attached
                    </p>
                  </SpeechBubble>
                </motion.div>
              </div>
            </div>
          </ComicPanel>
        </motion.div>
      </div>

      <SignupModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        source="free_trial" 
      />
    </section>
  );
};
