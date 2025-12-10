import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, Sparkles, Users, Rocket, Zap, Trophy } from "lucide-react";
import { SignupModal } from "@/components/SignupModal";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";

const Community = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  const categories = [
    {
      title: "AI Explorers",
      subtitle: "Ages 6-9",
      description: "Perfect for curious minds taking their first steps into technology.",
      icon: Brain,
      color: "primary" as const,
      mascot: "happy" as const,
      features: [
        "Introduction to AI and ML Basics",
        "Visual Programming ",
        "Creative Digital Storytelling",
        "AI vrs Robots",
      ],
    },
    {
      title: "Young Builders",
      subtitle: "Ages 9-11",
      description: "For young creators ready to build real projects and dive deeper.",
      icon: Rocket,
      color: "secondary" as const,
      mascot: "thinking" as const,
      features: [
        "Introduction to AI and ML",
        "AI vrs Robots",
        "Data and Prediction",
        "Coding and Python Programming",
        "AI Ethics and Bias",
        "AI Models",
      ],
    },
    {
      title: "Tech Ambassadors",
      subtitle: "Ages 12-16",
      description: "Advanced programs for aspiring tech leaders and innovators.",
      icon: Trophy,
      color: "accent" as const,
      mascot: "excited" as const,
      features: [
        "Advanced AI ",
        "Research ",
        "AI app buiding",
        "Design thinking",
      ],
    },
  ];

  return (
    <div className="min-h-screen halftone-bg">
      <Navbar />

      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <ActionBurst className="mb-4">
              <span>Join the Fun!</span>
            </ActionBurst>
            <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
              Join Our <span className="text-primary">Tech</span>{" "}
              <span className="text-secondary">Community!</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-space">
              Choose your learning path and start building the future today
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {categories.map((category, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
              >
                <ComicPanel color={category.color} className="h-full">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                          category.color === 'primary' ? 'from-primary to-primary/70' :
                          category.color === 'secondary' ? 'from-secondary to-secondary/70' :
                          'from-accent to-accent/70'
                        } flex items-center justify-center`}
                      >
                        <category.icon className="w-7 h-7 text-foreground" />
                      </motion.div>
                      <RobotMascot type={category.mascot} size="sm" />
                    </div>
                    
                    <h3 className="text-2xl font-fredoka font-bold mb-1 text-foreground">
                      {category.title}
                    </h3>
                    <p className="text-sm text-secondary font-fredoka font-bold mb-3">
                      {category.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground font-space mb-4">
                      {category.description}
                    </p>
                    
                    <ul className="space-y-2 mb-6">
                      {category.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-sm font-space text-muted-foreground">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button 
                      onClick={() => setShowSignup(true)}
                      className="w-full font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Enroll Now!
                    </Button>
                  </div>
                </ComicPanel>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground font-space mb-4">
              Not sure which path is right for you?
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowSignup(true)}
              className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              <Users className="w-4 h-4 mr-2" />
              Talk to Our Team
            </Button>
          </motion.div>
        </div>
      </section>

      <SignupModal open={showSignup} onOpenChange={setShowSignup} />
      <Footer />
    </div>
  );
};

export default Community;
