import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Programs } from "@/components/Programs";
import { SignupModal } from "@/components/SignupModal";
import { SocialProof } from "@/components/SocialProof";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";
import { motion } from "framer-motion";
import programsWorkshops from "@/assets/programs-workshops.jpg";

const ProgramsPage = () => {
  usePageTracking('/programs');
  useScrollTracking();
  
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleProgramComplete = (program: string) => {
    setSelectedProgram(program);
    setShowSignupModal(true);
  };

  const programDetails = {
    workshops: {
      features: [
        "Twice yearly sessions (2 months each)",
        "After school & weekend schedules",
        "Hands-on robot building",
        "AI app development",
        "3D printing projects",
        "Expert mentorship",
      ],
      curriculum: [
        "Week 1-2: Tech Foundations & Safety",
        "Week 3-4: Introduction to Robotics",
        "Week 5-6: Coding & Programming",
        "Week 7-8: AI & Machine Learning Basics",
        "Week 9-10: Final Project & Showcase",
      ],
    },
    techcamp: {
      features: [
        "Full summer immersion program",
        "Full-day activities (9am-4pm)",
        "Project-based learning",
        "Electronics & circuitry",
        "Team collaboration",
        "Field trips & guest speakers",
      ],
      curriculum: [
        "Week 1: Electronics & Circuits Bootcamp",
        "Week 2: Web Development & Design",
        "Week 3: Robotics & Automation",
        "Week 4: AI & Creative Coding",
        "Week 5: Final Tech Challenge & Exhibition",
      ],
    },
    techfair: {
      features: [
        "One-day mega event",
        "Student project exhibitions",
        "Interactive tech demonstrations",
        "Coding competitions",
        "Industry guest speakers",
        "Free for all attendees",
      ],
      curriculum: [
        "Morning: Project Showcase Opening",
        "10am-12pm: Live Tech Demonstrations",
        "12pm-1pm: Lunch & Networking",
        "1pm-3pm: Competitions & Challenges",
        "3pm-5pm: Awards & Closing Ceremony",
      ],
    },
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Programs Hero Image */}
      <div className="w-full h-64 md:h-96 relative overflow-hidden">
        <img 
          src={programsWorkshops} 
          alt="Students learning tech at Konov workshop" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>
      
      <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6">
              Our <span className="gradient-text">Programs</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
              A comprehensive ecosystem of tech education designed to inspire and empower the next generation
            </p>
          </div>

          {/* Social Proof Stats */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <SocialProof />
          </div>


          {/* All Programs Overview */}
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Programs />
          </div>

          {/* Detailed Program Information */}
          <div className={`mt-24 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl font-orbitron font-bold mb-12 text-center">
              Program <span className="gradient-text">Details</span>
            </h2>
            
            <Tabs defaultValue="workshops" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 max-w-2xl mx-auto">
                <TabsTrigger value="workshops" className="font-space">Workshops</TabsTrigger>
                <TabsTrigger value="techcamp" className="font-space">Tech Camp</TabsTrigger>
                <TabsTrigger value="techfair" className="font-space">Tech Fair</TabsTrigger>
              </TabsList>

              {Object.entries(programDetails).map(([key, details], tabIdx) => (
                <TabsContent key={key} value={key}>
                  <motion.div 
                    className="grid md:grid-cols-2 gap-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-500 h-full">
                        <h3 className="text-2xl font-orbitron font-bold mb-6 gradient-text">
                          Key Features
                        </h3>
                        <ul className="space-y-3">
                          {details.features.map((feature, idx) => (
                            <motion.li 
                              key={idx} 
                              className="flex items-start gap-3 font-space"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                              whileHover={{ x: 4 }}
                            >
                              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{feature}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20 hover:border-accent/40 transition-all duration-500 h-full">
                        <h3 className="text-2xl font-orbitron font-bold mb-6 gradient-text">
                          {key === 'techfair' ? 'Event Schedule' : 'Curriculum Highlights'}
                        </h3>
                        <ul className="space-y-3">
                          {details.curriculum.map((item, idx) => (
                            <motion.li 
                              key={idx} 
                              className="flex items-start gap-3 font-space"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                              whileHover={{ x: 4 }}
                            >
                              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source={`program_${selectedProgram}`} />
      <Footer />
    </div>
  );
};

export default ProgramsPage;
