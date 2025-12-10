import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Target, Lightbulb, Heart, Award } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";

const About = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(false);
  const valuesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setValuesVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (valuesRef.current) {
      observer.observe(valuesRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    { value: 500, label: "Students Reached", suffix: "+" },
    { value: 15, label: "Curriculum Module", suffix: "+" },
    { value: 17, label: "Partners", suffix: "+" },
    { value: 20, label: "Projects", suffix: "" },
  ];

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're on a mission to make AI and emerging technologies accessible to every African child, breaking down barriers to tech education.",
      color: "from-primary to-accent",
      mascot: "happy" as const,
    },
    {
      icon: Lightbulb,
      title: "Innovation First",
      description: "We constantly innovate our teaching methods, combining traditional learning with cutting-edge technology and playful experiences.",
      color: "from-accent to-secondary",
      mascot: "excited" as const,
    },
    {
      icon: Heart,
      title: "Student-Centered",
      description: "Every program is designed with our students in mind, ensuring age-appropriate content that sparks curiosity and builds confidence.",
      color: "from-secondary to-primary",
      mascot: "thinking" as const,
    },
    {
      icon: Award,
      title: "Quality Excellence",
      description: "We maintain the highest standards in curriculum design, instructor training, and learning outcomes to deliver exceptional results.",
      color: "from-primary via-accent to-secondary",
      mascot: "cool" as const,
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      
      {/* Hero Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex justify-center mb-6">
              <ActionBurst color="primary" className="text-2xl md:text-3xl">
                MEET THE TEAM!
              </ActionBurst>
            </div>
            <h1 className="text-5xl md:text-7xl font-fredoka font-bold mb-6">
              About <span className="gradient-text">Konov Artechtist</span>
            </h1>
            <div className="flex justify-center mb-6">
              <RobotMascot type="happy" size="lg" />
            </div>
            <SpeechBubble direction="up" className="max-w-3xl mx-auto">
              <p className="text-xl font-space leading-relaxed">
                AI & ML literacy hub—teaching kids how intelligent systems think, how data drives decisions, and how algorithms power creativity!
              </p>
            </SpeechBubble>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={isVisible ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <ComicPanel className="p-6 text-center hover:scale-105 transition-transform">
                  <div className="text-4xl md:text-5xl font-fredoka font-bold gradient-text mb-2">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-sm text-muted-foreground font-space">{stat.label}</p>
                </ComicPanel>
              </motion.div>
            ))}
          </div>

          {/* Our Story */}
          <div className={`mb-24 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center justify-center gap-4 mb-8">
              <ActionBurst color="accent">ORIGIN</ActionBurst>
              <h2 className="text-4xl font-fredoka font-bold">
                Our <span className="gradient-text">Story</span>
              </h2>
              <ActionBurst color="secondary">STORY!</ActionBurst>
            </div>
            
            <div className="flex justify-center mb-6">
              <RobotMascot type="thinking" size="md" />
            </div>
            
            <ComicPanel className="p-8 md:p-12">
              <div className="max-w-3xl mx-auto space-y-6 font-space text-lg text-muted-foreground leading-relaxed">
                <SpeechBubble direction="left" delay={0.2}>
                  <p>
                    Founded  in Accra, Ghan, Konov Artechtist was born from a simple observation of providing innovative and creative tech education: while most tech hubs focus on robotics with a sprinkle of AI, the real future lies in AI and ML literacy—understanding how intelligent systems think.
                  </p>
                </SpeechBubble>
                
                <SpeechBubble direction="right" delay={0.4}>
                  <p>
                    Our founder saw that children across Africa were fascinated by AI but had few opportunities to truly understand it. Not just use AI tools, but grasp how data drives decisions, how algorithms learn, and how machine learning powers creativity.
                  </p>
                </SpeechBubble>
                
                <SpeechBubble direction="left" delay={0.6}>
                  <p>
                    We quickly learned that traditional tech education wasn't working—it was too focused on hardware, too intimidating. So we reimagined it. We created comic books featuring African child protagonists exploring AI concepts. We gamified our platform around ML fundamentals. We designed workshops where kids understand neural networks through play.
                  </p>
                </SpeechBubble>
                
                <SpeechBubble direction="right" delay={0.8}>
                  <p>
                    Today, we've reached over 500 plus young learners in a year. Our edge? We're fully focused on AI and ML literacy—a more scalable and future-oriented approach that doesn't require expensive hardware.
                  </p>
                </SpeechBubble>
                
                <div className="flex justify-center pt-4">
                  <ActionBurst color="primary" className="text-lg">
                    THE FUTURE IS AI!
                  </ActionBurst>
                </div>
              </div>
            </ComicPanel>
          </div>

          {/* Our Values */}
          <div ref={valuesRef}>
            <div className="flex items-center justify-center gap-4 mb-12">
              <RobotMascot type="cool" size="sm" />
              <h2 className={`text-4xl font-fredoka font-bold transition-all duration-1000 ${valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                Our <span className="gradient-text">Values</span>
              </h2>
              <RobotMascot type="happy" size="sm" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, idx) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30, rotate: idx % 2 === 0 ? -3 : 3 }}
                    animate={valuesVisible ? { opacity: 1, y: 0, rotate: 0 } : {}}
                    transition={{ duration: 0.6, delay: idx * 0.15 }}
                  >
                    <ComicPanel className="p-8 h-full group hover:scale-[1.02] transition-transform">
                      <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 flex-shrink-0 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border-3 border-foreground`}>
                          <Icon className="w-8 h-8 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-fredoka font-bold mb-2 text-foreground">
                            {value.title}
                          </h3>
                          <p className="text-muted-foreground font-space leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                        <RobotMascot type={value.mascot} size="sm" className="hidden md:block" />
                      </div>
                    </ComicPanel>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
