import { Brain, Heart, Zap, Lightbulb, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";
import { SpeechBubble } from "./SpeechBubble";

export const Mission = () => {
  const values = [
    {
      icon: Brain,
      title: "AI & ML Literacy Focus",
      description: "Teaching how intelligent systems think and make decisions",
      color: "primary" as const,
    },
    {
      icon: Zap,
      title: "Data-Driven Thinking",
      description: "Showing kids how data powers the algorithms around them",
      color: "secondary" as const,
    },
    {
      icon: Heart,
      title: "Creative AI Applications",
      description: "Exploring how algorithms power art, music, and storytelling",
      color: "accent" as const,
    },
  ];

  const additionalValues = [
    {
      icon: Lightbulb,
      title: "Future-Ready Skills",
      description: "Building foundational AI knowledge that scales with technology",
      color: "secondary" as const,
    },
    {
      icon: Cpu,
      title: "Beyond Robotics",
      description: "Pure AI and ML education without hardware barriers",
      color: "primary" as const,
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden halftone-bg">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header with Mascot */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-16">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
              We Help Kids{" "}
              <span className="text-primary">Understand</span>{" "}
              <span className="text-secondary">AI!</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl font-space leading-relaxed">
              Teaching how intelligent systems think, how data drives decisions, and how algorithms power creativity
            </p>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="relative"
          >
            <RobotMascot type="teaching" size="lg" />
            <div className="absolute -top-16 -right-8">
              <SpeechBubble direction="bottom" className="text-sm whitespace-nowrap">
                Let's learn together! 🎓
              </SpeechBubble>
            </div>
          </motion.div>
        </div>

        {/* Top Row - 3 Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6 max-w-6xl mx-auto">
          {values.map((value, idx) => {
            const Icon = value.icon;
            return (
              <ComicPanel key={idx} color={value.color} delay={idx * 0.15}>
                <div className="p-6">
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                      value.color === 'primary' ? 'from-primary to-primary/70' :
                      value.color === 'secondary' ? 'from-secondary to-secondary/70' :
                      'from-accent to-accent/70'
                    } flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-7 h-7 text-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-space leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </ComicPanel>
            );
          })}
        </div>

        {/* Bottom Row - 2 Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {additionalValues.map((value, idx) => {
            const Icon = value.icon;
            return (
              <ComicPanel key={idx} color={value.color} delay={(idx + 3) * 0.15}>
                <div className="p-6">
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                      value.color === 'primary' ? 'from-primary to-primary/70' :
                      value.color === 'secondary' ? 'from-secondary to-secondary/70' :
                      'from-accent to-accent/70'
                    } flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-7 h-7 text-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-space leading-relaxed">
                    {value.description}
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
