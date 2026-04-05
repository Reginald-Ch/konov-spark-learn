import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, ArrowRight, Code, Terminal, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { ComicPanel } from "@/components/ComicPanel";

const FloatingCode = ({ delay, x, y, children }: { delay: number; x: string; y: string; children: string }) => (
  <motion.span
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 0.06 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 1 }}
    className="absolute font-mono text-xs text-primary/15 select-none pointer-events-none whitespace-pre"
    style={{ left: x, top: y }}
  >
    {children}
  </motion.span>
);

export const HackathonBanner = () => {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-background">
      {/* Halftone dot pattern background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Floating code snippets */}
      <FloatingCode delay={0.5} x="5%" y="15%">{"SYSTEM_PROMPT = \"You are a helpful AI\""}</FloatingCode>
      <FloatingCode delay={0.7} x="70%" y="10%">{"def respond(user_input):"}</FloatingCode>
      <FloatingCode delay={0.9} x="80%" y="75%">{"model.generate(prompt)"}</FloatingCode>
      <FloatingCode delay={1.1} x="8%" y="80%">{"knowledge_base = [...]"}</FloatingCode>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">

          {/* Comic-style main panel */}
          <ComicPanel color="primary" className="p-8 md:p-12 lg:p-16" delay={0}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-secondary/15 text-secondary font-fredoka"
                style={{ boxShadow: '2px 2px 0 hsl(var(--foreground))' }}
              >
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Now Open for Participation
              </div>
            </motion.div>

            {/* Main heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center mb-4"
            >
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight font-fredoka">
                <span className="text-foreground">Build Your First </span>
                <span className="relative inline-block">
                  <span className="text-primary">AI Project</span>
                  {/* Comic-style action underline */}
                  <motion.span
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="absolute -bottom-2 left-0 right-0 h-2 rounded-full bg-secondary origin-left"
                    style={{ boxShadow: '2px 2px 0 hsl(var(--foreground))' }}
                  />
                </span>
              </h2>
            </motion.div>

            {/* Speech-bubble style subtitle */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="relative max-w-2xl mx-auto mb-10"
            >
              <div
                className="relative bg-muted border-2 border-foreground rounded-3xl px-6 py-4 text-center"
                style={{ boxShadow: '3px 3px 0 hsl(var(--foreground))' }}
              >
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Forge your way up — pick a template, write code in our browser IDE,
                  and deploy a working chatbot or AI agent.{" "}
                  <span className="text-foreground font-bold">No setup required.</span>
                </p>
                {/* Speech bubble tail */}
                <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: '14px solid hsl(var(--foreground))',
                  }}
                />
                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '12px solid hsl(var(--muted))',
                  }}
                />
              </div>
            </motion.div>
          </ComicPanel>

          {/* Feature cards — comic panels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto my-10">
            {[
              { icon: Rocket, title: "1-Click Templates", desc: "Chatbot & Agent starters", color: "secondary" as const, iconClass: "text-secondary" },
              { icon: Terminal, title: "Browser IDE", desc: "Write Python with AI help", color: "primary" as const, iconClass: "text-primary" },
              { icon: Trophy, title: "Win Prizes", desc: "Compete on the leaderboard", color: "accent" as const, iconClass: "text-accent" },
            ].map((item, i) => (
              <ComicPanel key={i} color={item.color} delay={0.3 + i * 0.1} className="p-5 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-foreground ${
                  item.color === 'secondary' ? 'bg-secondary/15' : item.color === 'primary' ? 'bg-primary/15' : 'bg-accent/15'
                }`}
                  style={{ boxShadow: '2px 2px 0 hsl(var(--foreground))' }}
                >
                  <item.icon className={`w-7 h-7 ${item.iconClass}`} />
                </div>
                <h3 className="text-foreground font-bold text-base font-fredoka mb-1">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </ComicPanel>
            ))}
          </div>

          {/* CTA — comic action burst style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/hackathons">
              <Button
                size="lg"
                className="text-lg px-10 py-7 font-extrabold rounded-2xl text-primary-foreground bg-primary hover:bg-primary/90 border-2 border-foreground font-fredoka transition-transform hover:scale-105"
                style={{ boxShadow: '4px 4px 0 hsl(var(--foreground))' }}
              >
                <Rocket className="w-5 h-5 mr-2" />
                Enter FORGE Studio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/hackathons" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-fredoka">
              <Code className="w-4 h-4" />
              or browse templates first
            </Link>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground font-fredoka"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-accent" />
              Free to use
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
            <span>No downloads needed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
            <span>Works in your browser</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
