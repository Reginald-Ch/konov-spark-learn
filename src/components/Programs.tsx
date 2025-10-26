import { BookOpen, Palette, Laptop, GraduationCap } from "lucide-react";
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
      title: "Workshops",
      description: "Hands-on tech workshops where kids build robots, create AI apps, and explore the future of technology through interactive learning experiences.",
      image: workshopsImg,
      color: "from-primary to-accent",
      features: ["Robot Building", "AI Development", "3D Printing", "Coding Challenges"],
      capacity: "15-20 students",
      duration: "2-4 hours",
      ageGroup: "Ages 6-14",
    },
    {
      icon: Palette,
      title: "Comics",
      description: "Adventure-packed tech comics that transform complex AI concepts into exciting stories that captivate and educate young minds.",
      image: comicsImg,
      color: "from-accent to-secondary",
      features: ["Visual Learning", "Story-Based", "Age-Appropriate", "Interactive Elements"],
      capacity: "Unlimited",
      duration: "Self-paced",
      ageGroup: "Ages 7-13",
    },
    {
      icon: Laptop,
      title: "EdTech Platform",
      description: "Interactive digital learning platform with gamified courses, real-time progress tracking, and AI-powered personalized tutoring.",
      image: edtechImg,
      color: "from-secondary to-primary",
      features: ["Gamified Lessons", "Progress Tracking", "Video Tutorials", "Community Forums"],
      capacity: "Unlimited",
      duration: "Self-paced",
      ageGroup: "Ages 8-16",
    },
    {
      icon: GraduationCap,
      title: "School Programs",
      description: "Comprehensive curriculum integration bringing cutting-edge tech education, teacher training, and hands-on labs to classrooms.",
      image: schoolsImg,
      color: "from-primary via-accent to-secondary",
      features: ["Full Curriculum", "Teacher Training", "Lab Equipment", "Ongoing Support"],
      capacity: "Whole schools",
      duration: "Multi-year",
      ageGroup: "K-12",
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
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

        <div className="grid md:grid-cols-2 gap-8">
          {programs.map((program, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.6, 
                delay: idx * 0.15,
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
