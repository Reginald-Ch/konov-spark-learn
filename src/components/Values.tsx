import { Brain, Heart, Zap, Target, Lightbulb, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Values = () => {
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
      title: "Innovation & Creativity",
      description: "We foster creative problem-solving through hands-on tech experiences that inspire young minds to think differently",
    },
    {
      icon: Heart,
      title: "Accessibility for All",
      description: "Making AI and tech education available to every child across Africa, breaking down barriers to learning",
    },
    {
      icon: Zap,
      title: "Playful Learning",
      description: "Education should be fun! We use comics, games, and interactive workshops to make learning exciting",
    },
    {
      icon: Target,
      title: "Future-Ready Skills",
      description: "Equipping students with practical AI, robotics, and coding skills they'll need in tomorrow's world",
    },
    {
      icon: Lightbulb,
      title: "Empowerment Through Technology",
      description: "Transforming children from tech consumers to tech creators who can build solutions for their communities",
    },
    {
      icon: Users,
      title: "Community Impact",
      description: "Building a network of young innovators who collaborate, share knowledge, and inspire each other",
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background to-background/50">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Our <span className="gradient-text">Values</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {values.map((value, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="glow-card p-8 rounded-2xl bg-card/40 backdrop-blur-sm border border-primary/20 h-full group hover:bg-card/60 hover:border-primary/40 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <value.icon className="w-7 h-7 text-foreground" />
                </div>
                <h3 className="text-xl font-orbitron font-bold mb-3 text-foreground">
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
