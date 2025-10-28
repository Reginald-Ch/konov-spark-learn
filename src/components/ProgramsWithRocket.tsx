import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ProgramsWithRocket = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

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
      title: "Tech Workshops",
      subtitle: "Hands-On Innovation",
      description: "Interactive workshops where kids build robots, create AI apps, and explore emerging technologies through hands-on learning experiences.",
      details: [
        "Robot building & programming",
        "AI app development basics",
        "3D printing projects",
        "Coding challenges & competitions",
        "Ages 6-14 | 2-4 hours sessions"
      ]
    },
    {
      title: "EdTech Platform",
      subtitle: "Digital Learning Hub",
      description: "Gamified learning platform with interactive courses, progress tracking, and AI-powered tutoring for self-paced tech education.",
      details: [
        "Gamified learning paths",
        "Interactive coding challenges",
        "Real-time progress tracking",
        "AI-powered personalized tutoring",
        "Ages 8-16 | Self-paced learning"
      ]
    },
    {
      title: "Tech Comics",
      subtitle: "Story-Based Learning",
      description: "Adventure-packed comics that transform complex AI and tech concepts into exciting stories that captivate young minds.",
      details: [
        "Visual storytelling approach",
        "Complex concepts simplified",
        "Age-appropriate content",
        "Digital & print formats",
        "Ages 7-13 | Self-paced reading"
      ]
    },
    {
      title: "School Integration",
      subtitle: "Curriculum Partnership",
      description: "Comprehensive programs bringing cutting-edge tech education, teacher training, and hands-on labs directly to classrooms.",
      details: [
        "Complete curriculum integration",
        "Teacher professional development",
        "Student assessment tools",
        "Hands-on lab equipment",
        "K-12 | Multi-year partnership"
      ]
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Programs <span className="gradient-text">We Offer</span>
          </h2>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Programs Grid */}
          <div className="grid md:grid-cols-2 gap-8 relative">
            {/* Top Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="md:pr-12"
            >
              <ProgramCard 
                program={programs[0]} 
                index={0}
                isSelected={selectedProgram === 0}
                onClick={() => setSelectedProgram(selectedProgram === 0 ? null : 0)}
              />
            </motion.div>

            {/* Top Right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="md:pl-12"
            >
              <ProgramCard 
                program={programs[1]} 
                index={1}
                isSelected={selectedProgram === 1}
                onClick={() => setSelectedProgram(selectedProgram === 1 ? null : 1)}
              />
            </motion.div>

            {/* Rocket in Center - Desktop Only */}
            <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 1.5,
                  delay: 0.3,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="relative"
              >
                {/* Rocket Flame/Trail */}
                <motion.div
                  animate={{
                    scaleY: [1, 1.3, 1],
                    opacity: [0.6, 0.9, 0.6],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-8 h-24 bg-gradient-to-b from-secondary via-primary to-transparent opacity-60 blur-sm"
                />
                
                {/* Rocket Body */}
                <svg width="80" height="120" viewBox="0 0 80 120" className="drop-shadow-2xl">
                  {/* Main rocket body */}
                  <path
                    d="M 40 5 L 35 30 L 35 80 L 25 95 L 25 105 L 40 90 L 55 105 L 55 95 L 45 80 L 45 30 Z"
                    fill="url(#rocketGradient)"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                  />
                  {/* Rocket nose cone */}
                  <path
                    d="M 40 5 L 35 30 L 45 30 Z"
                    fill="hsl(var(--accent))"
                  />
                  {/* Window */}
                  <circle cx="40" cy="45" r="8" fill="hsl(var(--background))" opacity="0.9" />
                  <circle cx="40" cy="45" r="6" fill="hsl(220 100% 70%)" opacity="0.6" />
                  
                  {/* Side fins */}
                  <path d="M 35 70 L 20 85 L 25 95 L 35 80 Z" fill="hsl(var(--primary))" opacity="0.8" />
                  <path d="M 45 70 L 60 85 L 55 95 L 45 80 Z" fill="hsl(var(--primary))" opacity="0.8" />
                  
                  <defs>
                    <linearGradient id="rocketGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--foreground))" />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
              </motion.div>
            </div>

            {/* Bottom Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="md:pr-12"
            >
              <ProgramCard 
                program={programs[2]} 
                index={2}
                isSelected={selectedProgram === 2}
                onClick={() => setSelectedProgram(selectedProgram === 2 ? null : 2)}
              />
            </motion.div>

            {/* Bottom Right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="md:pl-12"
            >
              <ProgramCard 
                program={programs[3]} 
                index={3}
                isSelected={selectedProgram === 3}
                onClick={() => setSelectedProgram(selectedProgram === 3 ? null : 3)}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface ProgramCardProps {
  program: {
    title: string;
    subtitle: string;
    description: string;
    details: string[];
  };
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const ProgramCard = ({ program, isSelected, onClick }: ProgramCardProps) => {
  return (
    <motion.div
      onClick={onClick}
      className="relative cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {!isSelected ? (
          <motion.div
            key="card"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="glow-card p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-primary/20 h-full hover:border-primary/40 transition-all duration-300"
          >
            <h3 className="text-xl font-orbitron font-bold mb-2 gradient-text">
              {program.title}
            </h3>
            <p className="text-sm text-accent mb-3 font-space">
              {program.subtitle}
            </p>
            <p className="text-sm text-muted-foreground font-space leading-relaxed">
              {program.description}
            </p>
            <div className="mt-4 text-xs text-primary font-space">
              Click to learn more →
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="glow-card p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 backdrop-blur-sm border border-primary/40 h-full"
          >
            <h3 className="text-xl font-orbitron font-bold mb-2 gradient-text">
              {program.title}
            </h3>
            <p className="text-sm text-accent mb-4 font-space">
              {program.subtitle}
            </p>
            <ul className="space-y-2">
              {program.details.map((detail, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-sm text-muted-foreground font-space flex items-start gap-2"
                >
                  <span className="text-primary mt-1">•</span>
                  <span>{detail}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-primary font-space">
              Click to collapse ←
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
