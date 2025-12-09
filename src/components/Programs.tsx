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
      description: "Thrice-yearly immersive tech workshops running for two months. Join us after school and on weekends for hands-on AI, Machine Learning, and coding.",
      image: workshopsImg,
      color: "from-primary to-accent",
      features: [ "AI and Machine Learning", "After School & Weekends", "2-Month Programs"],
      capacity: "Limited spots",
      duration: "2 months, thrice yearly",
      ageGroup: "Ages 6-14",
    },
    {
      icon: GraduationCap,
      title: "Tech Camp",
      description: "Intensive summer technology camp where kids dive deep into AI and ML, programming and creative tech projects in a fun, collaborative environment.",
      image: edtechImg,
      color: "from-accent to-secondary",
      features: ["Full-Day Activities", "Project-Based Learning", "Summer Intensive", "Team Collaboration"],
      capacity: "6-30 students",
      duration: "Summer period",
      ageGroup: "Ages 6-14",
    },
    {
      icon: Laptop,
      title: "Tech Fair",
      description: "An exciting one-day event showcasing student projects, interactive tech demos, competitions, and inspiring talks. Experience the future of technology!",
      image: comicsImg,
      color: "from-secondary to-primary",
      features: ["Project Showcase", "Live Demos", "Competitions", "Guest Speakers"],
      capacity: "Open to all",
      duration: "One full day",
      ageGroup: "All ages",
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
