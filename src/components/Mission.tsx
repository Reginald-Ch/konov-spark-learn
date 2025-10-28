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

  const values = [
    {
      icon: Brain,
      title: "Empower Young Minds",
      description: "through hands-on AI and tech education that sparks curiosity",
    },
    {
      icon: Zap,
      title: "Build Future Innovators",
      description: "by teaching kids to create with cutting-edge technology",
    },
    {
      icon: Heart,
      title: "Make Learning Fun",
      description: "with gamified experiences, comics, and interactive workshops",
    },
  ];

  const additionalValues = [
    {
      icon: Zap,
      title: "Bridge the Tech Gap",
      description: "bringing advanced AI education to all kids, everywhere",
    },
    {
      icon: Brain,
      title: "Inspire Lifelong Learning",
      description: "cultivating problem-solving skills and creative thinking for tomorrow",
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            We Create <span className="gradient-text">Solutions That</span>
          </h2>
        </div>

        {/* Top Row - 3 Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6 max-w-6xl mx-auto">
          {values.map((value, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              <div className="glow-card p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-primary/20 h-full group hover:bg-card/60 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-orbitron font-bold mb-2 text-foreground">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground font-space leading-relaxed">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Row - 2 Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {additionalValues.map((value, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${(idx + 3) * 150}ms` }}
            >
              <div className="glow-card p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-primary/20 h-full group hover:bg-card/60 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-orbitron font-bold mb-2 text-foreground">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground font-space leading-relaxed">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
