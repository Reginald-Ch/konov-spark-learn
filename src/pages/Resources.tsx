import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ComicPanel } from "@/components/ComicPanel";
import { SpeechBubble } from "@/components/SpeechBubble";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Brain, Sparkles, Lightbulb, Zap, 
  Rocket, CheckCircle2, Heart, Code, Bot, 
  Database, Eye, MessageSquare, 
  Gamepad2,
  ChevronRight, Play, ExternalLink
} from "lucide-react";
import { AIQuiz } from "@/components/resources/AIQuiz";
import { ConceptMatch } from "@/components/resources/ConceptMatch";
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
  name: "AI Learning Resources for Secondary Students",
  description: "Interactive AI and ML learning resources for secondary students ages 13-18 including topics on What is AI, Machine Learning, Data & Decisions, Computer Vision, Natural Language Processing, and Creative AI.",
  educationalLevel: "Ages 13-18",
  learningResourceType: "Interactive lesson",
  inLanguage: "en",
  provider: {
    "@type": "EducationalOrganization",
    name: "Konov",
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
    subtitle: "Understanding Intelligent Systems",
    icon: Bot,
    color: "primary",
    mascotType: "happy" as const,
    description: "Artificial Intelligence enables machines to perform tasks that normally require human intelligence — from pattern recognition to decision-making.",
    funFact: "AI processes millions of data points per second to make real-time decisions in autonomous vehicles! 🚗",
    whyLearn: "Understanding AI gives you the edge to build the next generation of apps, tools, and businesses.",
    activities: ["Explore an AI model playground", "Analyse how AI powers your favourite apps", "Design an AI solution for a real problem"]
  },
  {
    id: 2,
    title: "Machine Learning",
    subtitle: "Algorithms That Improve with Data",
    icon: Brain,
    color: "secondary",
    mascotType: "thinking" as const,
    description: "Machine Learning is a branch of AI where algorithms learn patterns from data instead of being explicitly programmed — powering recommendations, predictions, and more.",
    funFact: "Spotify's Discover Weekly uses ML to analyse billions of playlists and predict what you'll enjoy! 🎯",
    whyLearn: "ML skills are in massive demand — from fintech to healthcare to gaming.",
    activities: ["Train a classification model", "Explore supervised vs unsupervised learning", "Build a recommendation engine"]
  },
  {
    id: 3,
    title: "Data & Decisions",
    subtitle: "Turning Information into Insight",
    icon: Database,
    color: "accent",
    mascotType: "teaching" as const,
    description: "Data is the fuel for AI. Learning to collect, clean, and analyse data lets you make evidence-based decisions and build smarter systems.",
    funFact: "Netflix analyses viewing data from 230+ million subscribers to decide which shows to produce! 🎬",
    whyLearn: "Data literacy is a superpower in every career — science, business, policy, and tech.",
    activities: ["Clean and visualise a real dataset", "Build a decision tree classifier", "Analyse survey data with Python"]
  },
  {
    id: 4,
    title: "Computer Vision",
    subtitle: "How Machines Interpret Visual Data",
    icon: Eye,
    color: "primary",
    mascotType: "excited" as const,
    description: "Computer Vision enables machines to interpret and act on visual information — from medical imaging to augmented reality and security systems.",
    funFact: "Medical AI can detect certain cancers in scans more accurately than human radiologists! 🏥",
    whyLearn: "CV powers AR filters, autonomous vehicles, and medical diagnostics — huge career opportunities.",
    activities: ["Build an image classifier with a pre-trained model", "Experiment with object detection", "Create an AR prototype"]
  },
  {
    id: 5,
    title: "Natural Language",
    subtitle: "Making Machines Understand Text",
    icon: MessageSquare,
    color: "secondary",
    mascotType: "happy" as const,
    description: "Natural Language Processing (NLP) enables AI to read, understand, and generate human language — powering chatbots, translators, and search engines.",
    funFact: "Large Language Models are trained on trillions of words from the internet! 🌍",
    whyLearn: "NLP is behind every chatbot, voice assistant, and AI writing tool — learn to build your own.",
    activities: ["Build a sentiment analysis tool", "Create a custom chatbot", "Experiment with text generation"]
  },
  {
    id: 6,
    title: "Creative AI",
    subtitle: "Generative Models & Digital Art",
    icon: Sparkles,
    color: "accent",
    mascotType: "excited" as const,
    description: "Generative AI creates images, music, text, and video from prompts — opening new frontiers in design, media, and entertainment.",
    funFact: "AI-generated artwork has sold for over $400,000 at auction! 🎵",
    whyLearn: "Understanding generative AI lets you create content, prototype ideas, and explore the ethics of AI creativity.",
    activities: ["Generate art with Stable Diffusion prompts", "Compose music with AI tools", "Build a creative AI project"]
  }
];

// Tutorial moved to hackathon LearnTab

const whyLearnAI = [
  {
    icon: Rocket,
    title: "Future-Ready Skills",
    description: "AI is transforming every industry. Students who understand it now will lead tomorrow's workforce."
  },
  {
    icon: Lightbulb,
    title: "Solve Real-World Problems",
    description: "From climate modelling to healthcare — AI is the tool for tackling humanity's biggest challenges."
  },
  {
    icon: Gamepad2,
    title: "Build What's Next",
    description: "Create apps, automate workflows, design games, and prototype ideas that didn't exist yesterday."
  },
  {
    icon: CheckCircle2,
    title: "Be a Builder, Not Just a User",
    description: "Move from consuming AI to creating it — understand the tech shaping your world."
  }
];

const Resources = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  return (
    <div className="min-h-screen halftone-bg">
      <SEO 
        title="AI Learning Resources for Secondary Students"
        description="Interactive AI & ML learning resources for secondary students ages 13-18. Explore What is AI, Machine Learning, Computer Vision, NLP, and Creative AI."
        canonical="/resources"
        keywords={["AI resources for teens", "machine learning tutorials secondary school", "AI education ages 13-18", "teen tech learning materials"]}
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
                AI <span className="text-primary">Learning Lab</span> for{" "}
                <span className="text-secondary">Students</span>
              </h1>
              
              <p className="text-xl md:text-2xl font-fredoka text-muted-foreground mb-8">
                Master Artificial Intelligence concepts through interactive lessons, hands-on projects, and real-world applications.
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
                    <span className="text-lg">Ready to level up? 🚀</span>
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
              Why AI literacy matters for your future 🚀
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyLearnAI.map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color="primary" delay={idx * 0.1}>
                  <div className="p-6 text-center">
                    <motion.div 
                      className="w-16 h-16 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center"
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
                                <CheckCircle2 className="w-4 h-4 text-secondary" />
                                {activity}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Inline Quiz */}
                        <AIQuiz topicId={topic.id} />
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

      {/* Concept Matching Game */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-fredoka font-bold mb-4 text-foreground">
              Test Your <span className="text-accent">Knowledge!</span> 🧩
            </h2>
            <p className="text-xl font-fredoka text-muted-foreground">
              Can you match AI concepts to their real-world examples?
            </p>
          </motion.div>
          <ConceptMatch />
        </div>
      </section>

      {/* ME AI App CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <ComicPanel color="primary" className="p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <RobotMascot type="excited" size="lg" />
              </div>
              <div className="text-center md:text-left flex-1">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring" }}
                  className="inline-block mb-3"
                >
                  <ActionBurst>
                    <span className="text-foreground text-sm">NEW!</span>
                  </ActionBurst>
                </motion.div>
                <h3 className="text-3xl md:text-4xl font-fredoka font-bold text-foreground mb-3">
                  Ready to <span className="text-secondary">Build Your Own AI</span>? 🤖
                </h3>
                <p className="font-space text-muted-foreground mb-6 max-w-lg">
                  Take what you've learned and create your own AI chatbot or agent in our 
                  interactive AI Building Playground — no experience needed!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Button 
                    size="lg"
                    className="font-fredoka text-lg px-8 py-6 rounded-full border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    onClick={() => window.open('/hackathons', '_self')}
                  >
                    <Rocket className="mr-2 w-6 h-6" />
                    Try ME AI Builder
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ComicPanel>
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
                🎓 For Parents & Educators
              </span>
              <h2 className="text-4xl md:text-5xl font-fredoka font-bold mb-6 text-foreground">
                Why Secondary Students Should Learn{" "}
                <span className="text-primary">AI & ML</span>
              </h2>
              <div className="space-y-4 font-space text-muted-foreground">
                <p>
                  AI literacy is becoming as essential as mathematics and science. Students who understand 
                  how AI works will be better prepared for university, careers, and a future shaped by these technologies.
                </p>
                <p>
                  Our visual approach makes complex concepts accessible and engaging, building 
                  computational thinking skills while developing problem-solving and analytical abilities.
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
                        "Understanding AI gives students a competitive edge. 
                        It builds the analytical and creative skills universities and employers value most."
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
                Join thousands of students learning AI through interactive 
                lessons, hands-on projects, and real-world challenges!
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
