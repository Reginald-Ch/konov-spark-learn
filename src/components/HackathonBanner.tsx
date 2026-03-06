import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, ArrowRight, Code, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const HackathonBanner = () => {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117]" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
            style={{ background: 'rgba(199,1,16,0.15)', border: '1px solid rgba(199,1,16,0.3)', color: '#F7941D' }}
          >
            <Zap className="w-3.5 h-3.5" />
            Now Open for Participation
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
          >
            Build Your First{" "}
            <span className="bg-gradient-to-r from-[#F7941D] via-[#C70110] to-[#006600] bg-clip-text text-transparent">
              AI Project
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Forge your way up — pick a template, write code in our browser IDE, 
            and deploy a working chatbot or AI agent. No setup required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10"
          >
            {[
              { icon: Rocket, title: "1-Click Templates", desc: "Chatbot & Agent starters", color: "#F7941D" },
              { icon: Code, title: "Browser IDE", desc: "Write Python with AI help", color: "#5865F2" },
              { icon: Trophy, title: "Win Prizes", desc: "Compete on the leaderboard", color: "#006600" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}40` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/hackathons">
              <Button size="lg" className="text-lg px-8 py-6 font-bold rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
                <Sparkles className="w-5 h-5 mr-2" />
                Enter FORGE Studio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
