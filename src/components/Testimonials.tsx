import { Card } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      name: "Amara Johnson",
      role: "Parent, Lagos",
      content: "My daughter can't stop talking about the AI workshops! She's building her own chatbot now. Konov Artechtist made tech education so fun and accessible.",
      rating: 5,
    },
    {
      name: "Dr. Kwame Mensah",
      role: "Principal, Ghana",
      content: "The school program transformed how our students see technology. The engagement levels are incredible, and kids are learning complex concepts through play.",
      rating: 5,
    },
    {
      name: "Fatima Osei",
      role: "Parent, Nairobi",
      content: "The comics are brilliant! My son learns about AI through exciting stories. He's now inspired to become a tech innovator. Thank you Konov!",
      rating: 5,
    },
    {
      name: "Mr. Chukwu",
      role: "Teacher, Abuja",
      content: "The EdTech platform is a game-changer. Students are excited to learn coding and AI. The gamification makes even the toughest concepts easy to grasp.",
      rating: 5,
    },
  ];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            What <span className="gradient-text">Parents & Educators</span> Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Join thousands of happy families and schools transforming education
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {testimonials.map((testimonial, idx) => (
              <Card
                key={idx}
                className={`absolute inset-0 transition-all duration-700 ${
                  idx === activeIndex
                    ? "opacity-100 scale-100 z-10"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                <div className="glow-card p-8 md:p-12 rounded-3xl bg-card/50 backdrop-blur-sm border border-primary/20">
                  <Quote className="w-12 h-12 text-primary/50 mb-6" />
                  
                  <p className="text-xl md:text-2xl text-foreground font-space leading-relaxed mb-8">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-orbitron font-bold text-lg text-foreground">
                        {testimonial.name}
                      </div>
                      <div className="text-muted-foreground font-space">
                        {testimonial.role}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Spacer for absolute positioning */}
            <div className="opacity-0 pointer-events-none">
              <div className="p-8 md:p-12">
                <Quote className="w-12 h-12 mb-6" />
                <p className="text-xl md:text-2xl mb-8">Placeholder</p>
                <div className="h-16" />
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === activeIndex
                    ? "w-8 h-3 bg-gradient-to-r from-primary to-accent"
                    : "w-3 h-3 bg-primary/30 hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
