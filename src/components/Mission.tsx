import { Brain, Heart, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Mission = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Making complex AI concepts simple and fun through interactive experiences and real-world applications.",
      gradient: "from-primary to-accent",
    },
    {
      icon: Heart,
      title: "Creative & Playful",
      description: "Transform tech education into an adventure with comics, games, and hands-on activities that spark imagination.",
      gradient: "from-accent to-secondary",
    },
    {
      icon: Zap,
      title: "Future-Ready Skills",
      description: "Equip young minds with emerging tech skills to become Africa's next generation of innovators and creators.",
      gradient: "from-secondary to-primary",
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Our <span className="gradient-text">Mission</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            To build Africa's largest pipeline of future-ready innovators by making 
            emerging technologies accessible, engaging, and fun for every young learner.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 delay-${idx * 200} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="glow-card p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-primary/20 h-full group">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-2xl font-orbitron font-bold mb-4 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground font-space leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
