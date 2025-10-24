import { BookOpen, Palette, Laptop, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
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
      description: "Hands-on tech workshops where kids build robots, create AI apps, and explore the future of technology.",
      image: workshopsImg,
      color: "from-primary to-accent",
    },
    {
      icon: Palette,
      title: "Comics",
      description: "Adventure-packed tech comics that transform complex AI concepts into exciting stories young minds love.",
      image: comicsImg,
      color: "from-accent to-secondary",
    },
    {
      icon: Laptop,
      title: "EdTech Platform",
      description: "Interactive digital learning platform with gamified courses, coding challenges, and AI-powered lessons.",
      image: edtechImg,
      color: "from-secondary to-primary",
    },
    {
      icon: GraduationCap,
      title: "School Programs",
      description: "Comprehensive curriculum integration bringing cutting-edge tech education directly to classrooms across Africa.",
      image: schoolsImg,
      color: "from-primary via-accent to-secondary",
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
            <div
              key={idx}
              className={`transition-all duration-700 delay-${idx * 150} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <Card className="glow-card overflow-hidden bg-card/50 backdrop-blur-sm border border-primary/20 group h-full">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={program.image} 
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${program.color} opacity-40 group-hover:opacity-30 transition-opacity duration-300`} />
                  <div className={`absolute top-6 left-6 w-14 h-14 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center shadow-lg`}>
                    <program.icon className="w-7 h-7 text-foreground" />
                  </div>
                </div>
                
                <div className="p-8">
                  <h3 className="text-3xl font-orbitron font-bold mb-4 text-foreground">
                    {program.title}
                  </h3>
                  <p className="text-muted-foreground font-space leading-relaxed text-lg">
                    {program.description}
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
