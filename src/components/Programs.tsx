import { BookOpen, Bot, School, Rocket, Trophy, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProgramCard } from "./ProgramCard";
import { motion } from "framer-motion";
import workshopsImg from "@/assets/programs-workshops.jpg";
import comicsImg from "@/assets/programs-comics.jpg";
import edtechImg from "@/assets/programs-edtech.jpg";
import schoolsImg from "@/assets/programs-schools.jpg";

export const Programs = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const programs = [
    {
      icon: BookOpen,
      title: "KONOV Weekend AI Creators",
      description: "An 8-week weekend AI program for ages 6–16 where learners explore AI and machine learning fundamentals, build chatbots, work with models, learn responsible AI, and create AI-powered apps and projects.",
      image: workshopsImg,
      color: "from-primary to-accent",
      features: ["AI & ML Fundamentals", "Build Chatbots", "Responsible AI", "Final Project"],
      capacity: "Ages 6–16",
      duration: "Weekend classes for 8 weeks",
      ageGroup: "Ages 6–16",
      ctaLabel: "Enroll Now",
    },
    {
      icon: School,
      title: "KONOV School AI Program",
      description: "A term-based AI enrichment program for schools, delivered through after-school AI clubs, termly workshops, or school-wide ICT enrichment for Grade 1 to Grade 9 learners.",
      image: schoolsImg,
      color: "from-secondary to-primary",
      features: ["After-School AI Club", "Termly Workshops", "Teacher Support", "Student Showcases"],
      capacity: "Schools & Grade 1–9",
      duration: "Termly school program",
      ageGroup: "Schools and Grade 1 to Grade 9",
      ctaLabel: "Book For Your School",
    },
    {
      icon: Bot,
      title: "KONOV AI Workshops",
      description: "Short, practical AI workshops where learners use Me AI to explore artificial intelligence, train models, build chatbots, and complete guided AI activities.",
      image: edtechImg,
      color: "from-accent to-secondary",
      features: ["Use Me AI", "Train A Model", "Build A Chatbot", "Guided Challenge"],
      capacity: "Schools, orgs & youth groups",
      duration: "Half-day, one-day, or multi-session",
      ageGroup: "Ages 6–16",
      ctaLabel: "Book A Workshop",
    },
    {
      icon: Sun,
      title: "KONOV Summer AI & Tech Camp",
      description: "A vacation camp for primary, junior high, and senior high learners focused on AI, coding, creative technology, teamwork, and project building.",
      image: comicsImg,
      color: "from-secondary to-accent",
      features: ["AI Basics On Me AI", "Build Chatbots", "Creative Technology", "Team Projects"],
      capacity: "Primary to senior high",
      duration: "Vacation camp",
      ageGroup: "Primary, JHS & SHS",
      ctaLabel: "Join The Camp",
    },
    {
      icon: Trophy,
      title: "KONOV Youth AI Challenges",
      description: "AI competitions and innovation challenges where learners solve problems, build prototypes, present ideas, and showcase AI-powered projects.",
      image: workshopsImg,
      color: "from-accent to-primary",
      features: ["Team Challenges", "Build A Prototype", "Judge Feedback", "Showcases"],
      capacity: "JHS, SHS & schools",
      duration: "Hackathons, competitions & showcases",
      ageGroup: "Junior, senior high & school learners",
      ctaLabel: "Join A Challenge",
    },
    {
      icon: Rocket,
      title: "KONOV Tertiary AI Innovation Program",
      description: "A practical AI course program for tertiary students focused on applied AI, automation, chatbot development, product thinking, and real-world problem solving. The program ends with a capstone AI hackathon and cash prizes.",
      image: edtechImg,
      color: "from-primary to-secondary",
      features: ["Applied AI & Automation", "Chatbot Development", "Product Thinking", "Capstone Hackathon"],
      capacity: "Tertiary students & young adults",
      duration: "Course program plus capstone hackathon",
      ageGroup: "Tertiary students",
      ctaLabel: "Apply Now",
    },
  ];

  return (
    <section ref={sectionRef} className="py-14 md:py-20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Our <span className="gradient-text">Programs</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            A dynamic ecosystem transforming tech education into playful, hands-on experiences
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {programs.map((program, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.7, 
                delay: idx * 0.2,
                ease: [0.25, 0.1, 0.25, 1]
              }}
            >
              <ProgramCard {...program} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
