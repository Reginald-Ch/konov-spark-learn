import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Programs } from "@/components/Programs";
import { ProgramSelector } from "@/components/ProgramSelector";
import { SignupModal } from "@/components/SignupModal";
import { SocialProof } from "@/components/SocialProof";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";

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
        "Hands-on robot building",
        "AI app development",
        "3D printing projects",
        "Coding challenges",
        "Team collaboration",
        "Expert mentorship",
      ],
      curriculum: [
        "Introduction to Robotics",
        "AI & Machine Learning Basics",
        "Web Development",
        "Mobile App Creation",
        "Game Design",
        "IoT Projects",
      ],
    },
    comics: {
      features: [
        "Adventure-packed storylines",
        "Complex concepts simplified",
        "Beautiful illustrations",
        "Interactive elements",
        "Age-appropriate content",
        "Digital & print formats",
      ],
      curriculum: [
        "AI Basics through Stories",
        "Coding Adventures",
        "Robot Tales",
        "Data Science Journey",
        "Cybersecurity Quest",
        "Future Tech Exploration",
      ],
    },
    edtech: {
      features: [
        "Gamified learning paths",
        "Interactive coding challenges",
        "Real-time progress tracking",
        "AI-powered tutoring",
        "Video tutorials",
        "Community forums",
      ],
      curriculum: [
        "Programming Fundamentals",
        "AI & ML Courses",
        "Web Development Track",
        "Mobile App Development",
        "Data Science Path",
        "Advanced Projects",
      ],
    },
    schools: {
      features: [
        "Complete curriculum integration",
        "Teacher training programs",
        "Student assessment tools",
        "Hands-on lab equipment",
        "Digital resources",
        "Ongoing support",
      ],
      curriculum: [
        "Year 1: Tech Foundations",
        "Year 2: Programming Basics",
        "Year 3: AI & Robotics",
        "Year 4: Advanced Projects",
        "Teacher Professional Development",
        "School-wide Implementation",
      ],
    },
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
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

          {/* Program Selector Quiz */}
          <div className={`mb-24 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-orbitron font-bold mb-4 text-foreground">
                Not sure which program fits best?
              </h2>
              <p className="text-lg text-muted-foreground font-space">
                Take our quick quiz to find the perfect match!
              </p>
            </div>
            <ProgramSelector onComplete={handleProgramComplete} />
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
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
                <TabsTrigger value="workshops" className="font-space">Workshops</TabsTrigger>
                <TabsTrigger value="comics" className="font-space">Comics</TabsTrigger>
                <TabsTrigger value="edtech" className="font-space">EdTech</TabsTrigger>
                <TabsTrigger value="schools" className="font-space">Schools</TabsTrigger>
              </TabsList>

              {Object.entries(programDetails).map(([key, details]) => (
                <TabsContent key={key} value={key}>
                  <div className="grid md:grid-cols-2 gap-8">
                    <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
                      <h3 className="text-2xl font-orbitron font-bold mb-6 gradient-text">
                        Key Features
                      </h3>
                      <ul className="space-y-3">
                        {details.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 font-space">
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
                      <h3 className="text-2xl font-orbitron font-bold mb-6 gradient-text">
                        Curriculum Highlights
                      </h3>
                      <ul className="space-y-3">
                        {details.curriculum.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 font-space">
                            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
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
