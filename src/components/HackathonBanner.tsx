import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, ArrowRight, Code, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

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

      {/* Floating code snippets for atmosphere */}
      <FloatingCode delay={0.5} x="5%" y="15%">{"SYSTEM_PROMPT = \"You are a helpful AI\""}</FloatingCode>
      <FloatingCode delay={0.7} x="70%" y="10%">{"def respond(user_input):"}</FloatingCode>
      <FloatingCode delay={0.9} x="80%" y="75%">{"model.generate(prompt)"}</FloatingCode>
      <FloatingCode delay={1.1} x="8%" y="80%">{"knowledge_base = [...]"}</FloatingCode>

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-secondary/30 bg-secondary/10 text-secondary">
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
            className="text-center mb-6"
          >
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
              <span className="text-foreground">Build Your First </span>
              <span className="relative inline-block">
                <span className="text-primary">
                  AI Project
                </span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-primary origin-left"
                />
              </span>
            </h2>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Forge your way up — pick a template, write code in our browser IDE, 
            and deploy a working chatbot or AI agent. <span className="text-foreground font-medium">No setup required.</span>
          </motion.p>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12"
          >
            {[
              { icon: Rocket, title: "1-Click Templates", desc: "Chatbot & Agent starters", colorClass: "text-secondary", bgClass: "bg-secondary/10 border-secondary/25" },
              { icon: Terminal, title: "Browser IDE", desc: "Write Python with AI help", colorClass: "text-primary", bgClass: "bg-primary/10 border-primary/25" },
              { icon: Trophy, title: "Win Prizes", desc: "Compete on the leaderboard", colorClass: "text-accent", bgClass: "bg-accent/10 border-accent/25" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative flex flex-col items-center p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${item.bgClass}`}>
                  <item.icon className={`w-6 h-6 ${item.colorClass}`} />
                </div>
                <h3 className="relative text-foreground font-bold text-sm mb-1">{item.title}</h3>
                <p className="relative text-muted-foreground text-xs">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/hackathons">
              <Button size="lg" className="text-lg px-10 py-7 font-bold rounded-2xl text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_0_30px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.3)] transition-shadow">
                <Rocket className="w-5 h-5 mr-2" />
                Enter FORGE Studio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/hackathons" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Code className="w-4 h-4" />
              or browse templates first
            </Link>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Free to use
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>No downloads needed</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Works in your browser</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
