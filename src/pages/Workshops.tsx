import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, Sparkles, Users, Rocket, Zap, Trophy } from "lucide-react";
import { SignupModal } from "@/components/SignupModal";

const Workshops = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  const categories = [
    {
      title: "AI Explorers",
      subtitle: "Ages 7-10",
      description: "Perfect for curious minds taking their first steps into technology. At this age, kids are natural explorers—we channel that curiosity into hands-on tech experiments that feel like play.",
      icon: Brain,
      color: "from-purple-500 to-pink-500",
      features: [
        "Introduction to Robotics & AI Basics",
        "Visual Programming with Scratch Jr",
        "Creative Digital Storytelling",
        "Build Simple Robots (no soldering required)",
        "Why this age? Develops computational thinking before abstract reasoning kicks in",
      ],
    },
    {
      title: "Young Builders",
      subtitle: "Ages 11-14",
      description: "For young creators ready to build real projects and dive deeper. This is when abstract thinking develops—perfect for grasping algorithms, logic, and cause-and-effect in code.",
      icon: Rocket,
      color: "from-blue-500 to-cyan-500",
      features: [
        "Python Programming & Real App Development",
        "Train Your Own AI Models (image recognition, chatbots)",
        "Arduino & Circuit Building with Sensors",
        "Game Design from Scratch to Unity basics",
        "Why this age? Transition from visual to text-based coding while creativity peaks",
      ],
    },
    {
      title: "Tech Ambassadors",
      subtitle: "Ages 15-18",
      description: "Advanced programs for aspiring tech leaders and innovators. Teens at this stage can handle complex concepts and are thinking about real-world impact and career paths.",
      icon: Trophy,
      color: "from-orange-500 to-red-500",
      features: [
        "Advanced AI: Build Neural Networks from Scratch",
        "Full-Stack Development (React, Node.js, databases)",
        "IoT Projects: Create Smart Home Systems",
        "Build a Tech Startup: From Idea to MVP",
        "Why this age? Ready for professional tools, real-world applications, and portfolio building",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-orbitron font-bold mb-4">
              Join Our <span className="gradient-text">Tech Community</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto font-space">
              Choose your learning path and start building the future today
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {categories.map((category, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                onClick={() => setSelectedCategory(selectedCategory === idx ? null : idx)}
                className="cursor-pointer"
              >
                {selectedCategory === idx ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glow-card p-8 rounded-2xl bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-sm border-2 border-primary/60 h-full"
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 mx-auto`}>
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-orbitron font-bold mb-2 text-center gradient-text">
                      {category.title}
                    </h3>
                    <p className="text-xs text-accent mb-6 text-center font-space">
                      {category.subtitle}
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      {category.features.map((feature, fIdx) => (
                        <motion.div
                          key={fIdx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: fIdx * 0.1 }}
                          className="flex items-start gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground font-space">{feature}</span>
                        </motion.div>
                      ))}
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSignup(true);
                      }}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Enroll Now
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="glow-card p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300 h-full"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 mx-auto`}>
                      <category.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-orbitron font-bold mb-2 text-center gradient-text">
                      {category.title}
                    </h3>
                    <p className="text-xs text-accent mb-3 text-center font-space">
                      {category.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground font-space text-center leading-relaxed mb-4">
                      {category.description}
                    </p>
                    
                    <div className="text-center">
                      <span className="text-xs text-primary font-space">
                        Click to explore →
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-16 space-y-4"
          >
            <p className="text-muted-foreground font-space">
              Not sure which path is right for you?
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowSignup(true)}
              className="group"
            >
              <Users className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              Talk to Our Team
            </Button>
          </motion.div>
        </div>
      </section>

      <SignupModal 
        open={showSignup} 
        onOpenChange={setShowSignup} 
      />

      <Footer />
    </div>
  );
};

export default Workshops;
