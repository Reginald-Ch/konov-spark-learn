import { Bot, MessageSquareText, Sparkles, LineChart, Puzzle, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "./ComicPanel";

export const WhatLearnersBuild = () => {
  const projects = [
    {
      icon: Bot,
      title: "Chatbots & Conversational AI",
      description: "Design and train a chatbot with its own personality, knowledge, and rules.",
      color: "primary" as const,
    },
    {
      icon: LineChart,
      title: "Machine Learning Models",
      description: "Train image recognition and pattern-detection models from real data.",
      color: "secondary" as const,
    },
    {
      icon: Sparkles,
      title: "AI-Powered Stories & Tools",
      description: "Create AI-powered stories, learning tools, and creative projects.",
      color: "accent" as const,
    },
    {
      icon: Puzzle,
      title: "Real-World Problem Solving",
      description: "Apply AI to genuine problems in their communities and schools.",
      color: "primary" as const,
    },
    {
      icon: MessageSquareText,
      title: "Simple AI Applications",
      description: "Build working AI applications, not just tutorials — real, usable projects.",
      color: "secondary" as const,
    },
    {
      icon: Trophy,
      title: "Hackathon Showcases",
      description: "Present finished AI projects during hackathons and community showcases.",
      color: "accent" as const,
    },
  ];

  return (
    <section className="py-14 md:py-20 relative overflow-hidden halftone-bg">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
            Students Do More Than Learn About AI.{" "}
            <span className="text-primary">They Build With It.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Learners train models, build chatbots and conversational AI, work with data and patterns,
            design simple AI applications, and solve real-world problems using artificial intelligence.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {projects.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ComicPanel key={idx} color={item.color} delay={idx * 0.08}>
                <div className="p-6">
                  <motion.div
                    className={`w-14 h-14 rounded-2xl ${
                      item.color === 'primary' ? 'bg-primary' :
                      item.color === 'secondary' ? 'bg-secondary' :
                      'bg-accent'
                    } flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-7 h-7 text-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-space leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </ComicPanel>
            );
          })}
        </div>
      </div>
    </section>
  );
};
