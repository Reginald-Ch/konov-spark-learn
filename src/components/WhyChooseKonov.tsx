import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SpeechBubble } from "./SpeechBubble";

export const WhyChooseKonov = () => {
  return (
    <section className="py-14 md:py-20 relative overflow-hidden halftone-bg">
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-3xl md:text-5xl font-fredoka font-bold">
              Why Choose <span className="text-primary">KONOV?</span>
            </h2>
          </div>
          <SpeechBubble className="inline-block">
            <p className="text-lg md:text-xl text-muted-foreground font-space leading-relaxed">
              KONOV is AI-first, practical, and built for African learners. KONOV does not only teach
              students how to use technology. It helps them understand how intelligent systems work
              and gives them tools to create their own.
            </p>
          </SpeechBubble>
        </motion.div>
      </div>
    </section>
  );
};
