import { Brain, Heart, Zap, Target, Lightbulb, Users } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "./ComicPanel";

export const Values = () => {
  const values = [
    {
      icon: Brain,
      title: "Innovation & Creativity",
      description: "We foster creative problem-solving through hands-on tech experiences that inspire young minds to think differently",
      color: "primary" as const,
    },
    {
      icon: Heart,
      title: "Accessibility for All",
      description: "Making AI and tech education available to every child across Africa, breaking down barriers to learning",
      color: "secondary" as const,
    },
    {
      icon: Zap,
      title: "Playful Learning",
      description: "Education should be fun! We use comics, games, and interactive workshops to make learning exciting",
      color: "accent" as const,
    },
    {
      icon: Target,
      title: "Future-Ready Skills",
      description: "Equipping students with practical AI and coding skills they'll need in tomorrow's world",
      color: "primary" as const,
    },
    {
      icon: Lightbulb,
      title: "Empowerment Through Technology",
      description: "Transforming children from tech consumers to tech creators who can build solutions for their communities",
      color: "secondary" as const,
    },
    {
      icon: Users,
      title: "Community Impact",
      description: "Building a network of young innovators who collaborate, share knowledge, and inspire each other",
      color: "accent" as const,
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden halftone-bg">
      {/* Background Elements */}
      <motion.div 
        className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
            Our <span className="text-primary">Values</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            The principles that guide everything we do
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {values.map((value, idx) => {
            const Icon = value.icon;
            return (
              <ComicPanel key={idx} color={value.color} delay={idx * 0.1}>
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
                  <h3 className="text-xl font-fredoka font-bold mb-3 text-foreground">
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
