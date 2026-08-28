import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";

export const MeAIIntro = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 md:py-20 relative overflow-hidden halftone-bg">
      <div className="absolute top-1/3 -right-24 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <ComicPanel color="primary">
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center p-8 md:p-12">
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="inline-block text-xs font-fredoka font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-primary text-primary-foreground mb-4">
                Me AI
              </span>
              <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-4 leading-tight">
                The AI Creation Platform For Young Learners
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl font-space leading-relaxed mb-6">
                Me AI is KONOV's AI learning and creation platform for learners ages 6-18. It gives young
                people a safe, guided space to learn AI concepts, complete interactive lessons, train
                models, build chatbots, and create their own AI-powered projects.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary"
                  onClick={() => navigate('/me-ai')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Explore Me AI
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", delay: 0.2 }}
              className="hidden md:block"
            >
              <RobotMascot type="excited" size="lg" />
            </motion.div>
          </div>
        </ComicPanel>
      </div>
    </section>
  );
};
