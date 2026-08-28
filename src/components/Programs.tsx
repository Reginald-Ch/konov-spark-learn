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
      title: "AI Foundations",
      description: "A beginner-friendly program where children and teens learn AI basics, data literacy, machine learning, prompt thinking, and creative problem-solving.",
      image: workshopsImg,
      color: "from-primary to-accent",
      features: ["AI Basics & Data Literacy", "Machine Learning", "Prompt Thinking"],
      capacity: "Limited spots",
      duration: "Ongoing cohorts",
      ageGroup: "Ages 6-16",
    },
    {
      icon: Bot,
      title: "Me AI Creators",
      description: "A practical program where learners use Me AI to build chatbots, train models, and complete hands-on AI projects.",
      image: edtechImg,
      color: "from-accent to-secondary",
      features: ["Build Chatbots", "Train AI Models", "Hands-On Projects"],
      capacity: "Open enrollment",
      duration: "Self-paced on Me AI",
      ageGroup: "Ages 6-18",
    },
    {
      icon: School,
      title: "School AI Workshops",
      description: "Short, practical AI learning experiences designed for schools that want students to understand and explore artificial intelligence.",
      image: schoolsImg,
      color: "from-secondary to-primary",
      features: ["In-Classroom Sessions", "Teacher Support", "Student Showcases"],
      capacity: "Whole-class",
      duration: "Half-day to multi-week",
      ageGroup: "School partners",
    },
    {
      icon: Rocket,
      title: "Tertiary AI Innovation Hub",
      description: "Applied AI programs for tertiary students focused on AI tools, product building, automation, data, and real-world innovation.",
      image: comicsImg,
      color: "from-primary to-secondary",
      features: ["Product Building", "Automation & Data", "Real-World Innovation"],
      capacity: "Cohort-based",
      duration: "Term-based",
      ageGroup: "Tertiary students",
    },
    {
      icon: Trophy,
      title: "Youth AI Hackathons",
      description: "Innovation challenges where young people solve problems, build prototypes, and present AI-powered ideas.",
      image: workshopsImg,
      color: "from-accent to-primary",
      features: ["Team Challenges", "Mentors & Judges", "Prizes & Showcases"],
      capacity: "Open to all",
      duration: "Multi-day events",
      ageGroup: "All ages",
    },
    {
      icon: Sun,
      title: "Summer AI & Tech Camp",
      description: "Vacation programs where learners explore AI, coding, creativity, and problem-solving through hands-on projects.",
      image: edtechImg,
      color: "from-secondary to-accent",
      features: ["Full-Day Activities", "Project-Based Learning", "Team Collaboration"],
      capacity: "6-30 students",
      duration: "Vacation period",
      ageGroup: "Ages 6-16",
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
