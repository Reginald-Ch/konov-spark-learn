import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ComicPanel } from "@/components/ComicPanel";
import { SpeechBubble } from "@/components/SpeechBubble";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Brain, Sparkles, Lightbulb, Zap, Target, 
  Rocket, Star, Heart, Code, Bot, 
  Database, Cpu, Eye, MessageSquare, 
  Gamepad2, Music, Camera, BookOpen,
  ChevronRight, Play
} from "lucide-react";
import { useState } from "react";
import { SignupModal } from "@/components/SignupModal";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";

const resourcesBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Resources", url: "/resources" }
]);

const learningResourceSchema = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "AI Learning Resources for Kids",
  description: "Interactive AI and ML learning resources for children including topics on What is AI, Machine Learning, Data & Decisions, Computer Vision, Natural Language Processing, and Creative AI.",
  educationalLevel: "Ages 6-14",
  learningResourceType: "Interactive lesson",
  inLanguage: "en",
  provider: {
    "@type": "EducationalOrganization",
    name: "Konov Artechtist",
    url: "https://konovartechtist.com"
  },
  about: [
    { "@type": "Thing", name: "Artificial Intelligence" },
    { "@type": "Thing", name: "Machine Learning" },
    { "@type": "Thing", name: "Computer Vision" },
    { "@type": "Thing", name: "Natural Language Processing" }
  ]
};

const aiTopics = [
  {
    id: 1,
    title: "What is AI?",
    subtitle: "Meet Your Robot Friends!",
    icon: Bot,
    color: "primary",
    mascotType: "happy" as const,
    description: "AI stands for Artificial Intelligence - it's like teaching computers to think and learn, just like you!",
    funFact: "AI can recognize your face in photos faster than you can say 'cheese'! 📸",
    whyLearn: "Understanding AI helps you know how your favorite apps and games work!",
    activities: ["Draw your own robot friend", "Play 'Spot the AI' game", "Create an AI story"]
  },
  {
    id: 2,
    title: "Machine Learning",
    subtitle: "Computers That Learn!",
    icon: Brain,
    color: "secondary",
    mascotType: "thinking" as const,
    description: "Machine Learning is how computers get smarter by practicing - just like how you get better at riding a bike!",
    funFact: "Your phone learns which emojis you use most and suggests them first! 🎯",
    whyLearn: "ML powers video game characters that adapt to how you play!",
    activities: ["Train a simple AI", "Pattern recognition games", "Build a sorting robot"]
  },
  {
    id: 3,
    title: "Data & Decisions",
    subtitle: "The Power of Information!",
    icon: Database,
    color: "accent",
    mascotType: "teaching" as const,
    description: "Data is like pieces of a puzzle. When AI puts them together, it can make smart decisions!",
    funFact: "Netflix uses data to guess which shows you'll love! 🎬",
    whyLearn: "Learn how to use data to solve problems like a detective!",
    activities: ["Data treasure hunt", "Make a decision tree", "Survey your friends"]
  },
  {
    id: 4,
    title: "Computer Vision",
    subtitle: "Teaching Computers to See!",
    icon: Eye,
    color: "primary",
    mascotType: "excited" as const,
    description: "Computer Vision helps machines see and understand pictures and videos - like giving a robot eyes!",
    funFact: "Self-driving cars use computer vision to spot traffic lights! 🚗",
    whyLearn: "Create apps that recognize objects, faces, and even emotions!",
    activities: ["Photo scavenger hunt", "Draw for AI to guess", "Create fun filters"]
  },
  {
    id: 5,
    title: "Natural Language",
    subtitle: "Chatting with Computers!",
    icon: MessageSquare,
    color: "secondary",
    mascotType: "happy" as const,
    description: "NLP helps computers understand human language - that's how Siri and Alexa understand you!",
    funFact: "AI can translate 100+ languages in real-time! 🌍",
    whyLearn: "Build your own chatbot that talks like your favorite character!",
    activities: ["Create a story with AI", "Language puzzles", "Build a mini chatbot"]
  },
  {
    id: 6,
    title: "Creative AI",
    subtitle: "AI Makes Art Too!",
    icon: Sparkles,
    color: "accent",
    mascotType: "excited" as const,
    description: "AI can create music, art, and stories! It's like having a creative robot partner!",
    funFact: "AI has composed music that was performed by orchestras! 🎵",
    whyLearn: "Combine your creativity with AI to make amazing things!",
    activities: ["AI art gallery", "Music with AI", "Collaborative stories"]
  }
];

const whyLearnAI = [
  {
    icon: Rocket,
    title: "Future-Ready Skills",
    description: "AI will be everywhere! Learning it now puts you ahead of the game."
  },
  {
    icon: Lightbulb,
    title: "Solve Big Problems",
    description: "From climate change to curing diseases - AI helps solve world problems!"
  },
  {
    icon: Gamepad2,
    title: "Create Cool Stuff",
    description: "Build games, apps, robots, and things we haven't even imagined yet!"
  },
  {
    icon: Star,
    title: "Be a Creator, Not Just User",
    description: "Don't just use AI - learn to build and shape it!"
  }
];

const Resources = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  return (
    <div className="min-h-screen halftone-bg">
      <SEO 
        title="AI Learning Resources for Kids"
        description="Explore fun AI & ML learning resources for kids. Interactive comic panels teaching What is AI, Machine Learning, Computer Vision, and more!"
        canonical="/resources"
        keywords={["AI resources for kids", "machine learning tutorials children", "free AI education", "kids tech learning materials"]}
        jsonLd={[resourcesBreadcrumb, learningResourceSchema]}
      />
      <Navbar />
      
      {/* Hero Section - Comic Style */}
      <section className="pt-24 pb-16 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left side - Title */}
            <motion.div 
              className="flex-1 text-center lg:text-left"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-block mb-4"
              >
                <ActionBurst>
                  <span className="text-foreground">LEARN AI!</span>
                </ActionBurst>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-fredoka font-bold mb-6 text-foreground leading-tight">
                AI <span className="text-primary">Adventures</span> for{" "}
                <span className="text-secondary">Kids!</span>
              </h1>
              
              <p className="text-xl md:text-2xl font-fredoka text-muted-foreground mb-8">
                Discover the exciting world of Artificial Intelligence through fun comics and interactive lessons!
              </p>

              <Button 
                size="lg" 
                className="font-fredoka text-lg px-8 py-6 rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                onClick={() => setShowSignupModal(true)}
              >
                <Rocket className="mr-2 w-6 h-6" />
                Start Your Adventure!
              </Button>
            </motion.div>

            {/* Right side - Mascots */}
            <motion.div 
              className="flex-1 relative"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative flex justify-center items-center">
                <RobotMascot type="excited" size="lg" className="z-10" />
                <RobotMascot type="happy" size="md" className="absolute -left-8 top-8" />
                <RobotMascot type="teaching" size="md" className="absolute -right-8 top-12" />
                
                {/* Speech Bubble */}
                <motion.div 
                  className="absolute -top-20 right-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  <SpeechBubble direction="bottom" className="text-center">
                    <span className="text-lg">Welcome, young inventor! 🎉</span>
                  </SpeechBubble>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Learn AI Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-fredoka font-bold mb-4 text-foreground">
              Why Learn <span className="text-primary">AI</span>?
            </h2>
            <p className="text-xl font-fredoka text-muted-foreground">
              Here's why AI is the coolest thing to learn! 🚀
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyLearnAI.map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color="primary" delay={idx * 0.1}>
                  <div className="p-6 text-center">
                    <motion.div 
                      className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="w-8 h-8 text-foreground" />
                    </motion.div>
                    <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                      {item.title}
                    </h3>
                    <p className="font-space text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Topics Comic Panels */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-fredoka font-bold mb-4 text-foreground">
              AI <span className="text-secondary">Topics</span> to Explore!
            </h2>
            <p className="text-xl font-fredoka text-muted-foreground">
              Click on each panel to learn more! 📚
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {aiTopics.map((topic, idx) => {
              const Icon = topic.icon;
              const isExpanded = expandedTopic === topic.id;
              const colorClass = {
                primary: "from-primary to-primary/70",
                secondary: "from-secondary to-secondary/70",
                accent: "from-accent to-accent/70"
              }[topic.color];

              return (
                <ComicPanel 
                  key={topic.id} 
                  color={topic.color as "primary" | "secondary" | "accent"} 
                  delay={idx * 0.1}
                  className="cursor-pointer"
                >
                  <motion.div
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                    layout
                  >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${colorClass} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center border-2 border-foreground">
                            <Icon className="w-6 h-6 text-foreground" />
                          </div>
                          <div>
                            <span className="text-xs font-fredoka text-foreground/80 uppercase tracking-wider">
                              Episode {topic.id}
                            </span>
                            <h3 className="text-xl font-fredoka font-bold text-foreground">
                              {topic.title}
                            </h3>
                          </div>
                        </div>
                        <RobotMascot type={topic.mascotType} size="sm" />
                      </div>
                      <p className="font-fredoka text-foreground/90 mt-2">
                        {topic.subtitle}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="font-space text-muted-foreground mb-4">
                        {topic.description}
                      </p>

                      {/* Fun Fact */}
                      <div className="bg-secondary/20 rounded-xl p-3 mb-4 border-2 border-secondary/30">
                        <span className="font-fredoka font-bold text-secondary text-sm">
                          ⚡ FUN FACT:
                        </span>
                        <p className="font-space text-foreground text-sm mt-1">
                          {topic.funFact}
                        </p>
                      </div>

                      {/* Expanded Content */}
                      <motion.div
                        initial={false}
                        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                        className="overflow-hidden"
                      >
                        {/* Why Learn This */}
                        <div className="bg-primary/20 rounded-xl p-3 mb-4 border-2 border-primary/30">
                          <span className="font-fredoka font-bold text-primary text-sm">
                            🎯 WHY LEARN THIS:
                          </span>
                          <p className="font-space text-foreground text-sm mt-1">
                            {topic.whyLearn}
                          </p>
                        </div>

                        {/* Activities */}
                        <div className="bg-accent/20 rounded-xl p-3 border-2 border-accent/30">
                          <span className="font-fredoka font-bold text-accent text-sm">
                            🎮 ACTIVITIES:
                          </span>
                          <ul className="mt-2 space-y-1">
                            {topic.activities.map((activity, aIdx) => (
                              <li key={aIdx} className="flex items-center gap-2 text-sm font-space text-foreground">
                                <Star className="w-4 h-4 text-secondary" />
                                {activity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>

                      {/* Expand Button */}
                      <Button 
                        variant="ghost" 
                        className="w-full mt-4 font-fredoka"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTopic(isExpanded ? null : topic.id);
                        }}
                      >
                        {isExpanded ? "Show Less" : "Learn More"}
                        <ChevronRight className={`ml-2 w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </Button>
                    </div>
                  </motion.div>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Parents Section */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-2 bg-primary/20 rounded-full font-fredoka text-primary text-sm mb-4">
                👨‍👩‍👧 For Parents
              </span>
              <h2 className="text-4xl md:text-5xl font-fredoka font-bold mb-6 text-foreground">
                Why Your Child Should Learn{" "}
                <span className="text-primary">AI & ML</span>
              </h2>
              <div className="space-y-4 font-space text-muted-foreground">
                <p>
                  AI literacy is becoming as essential as reading and math. Children who understand 
                  how AI works will be better prepared for a future where these technologies are everywhere.
                </p>
                <p>
                  Our comic-based approach makes complex concepts accessible and fun, building 
                  critical thinking skills while nurturing creativity and problem-solving abilities.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { icon: Brain, label: "Critical Thinking" },
                  { icon: Code, label: "Coding Skills" },
                  { icon: Lightbulb, label: "Problem Solving" },
                  { icon: Heart, label: "AI Ethics" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border">
                    <item.icon className="w-6 h-6 text-primary" />
                    <span className="font-fredoka text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <ComicPanel color="secondary" className="p-8">
                <div className="flex items-start gap-4">
                  <RobotMascot type="teaching" size="md" />
                  <div>
                    <SpeechBubble direction="left" className="mb-4">
                      <p className="font-fredoka">
                        "Learning AI is like learning a new superpower! 
                        It helps kids understand the technology shaping their world."
                      </p>
                    </SpeechBubble>
                    <p className="font-fredoka text-muted-foreground text-sm">
                      - Professor Bot, AI Teacher
                    </p>
                  </div>
                </div>
              </ComicPanel>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <ComicPanel color="primary" className="p-8 md:p-12 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center gap-4 mb-6">
                <RobotMascot type="excited" size="md" />
                <RobotMascot type="happy" size="lg" />
                <RobotMascot type="thinking" size="md" />
              </div>
              
              <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-4 text-foreground">
                Ready to Start Your{" "}
                <span className="text-secondary">AI Journey</span>?
              </h2>
              <p className="text-xl font-fredoka text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of young innovators learning AI through our fun, 
                comic-style lessons and hands-on activities!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="font-fredoka text-lg px-8 py-6 rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  onClick={() => setShowSignupModal(true)}
                >
                  <Zap className="mr-2 w-6 h-6" />
                  Join Free Workshop
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="font-fredoka text-lg px-8 py-6 rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-card"
                >
                  <Play className="mr-2 w-6 h-6" />
                  Watch Demo
                </Button>
              </div>
            </motion.div>
          </ComicPanel>
        </div>
      </section>

      <SignupModal 
        open={showSignupModal} 
        onOpenChange={setShowSignupModal}
        source="resources"
      />

      <Footer />
    </div>
  );
};

export default Resources;
