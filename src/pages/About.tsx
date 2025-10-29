import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Target, Lightbulb, Heart, Award } from "lucide-react";

const About = () => {
  const stats = [
    { value: 5000, label: "Students Reached", suffix: "+" },
    { value: 50, label: "Schools Partnered", suffix: "+" },
    { value: 200, label: "Workshops Delivered", suffix: "+" },
    { value: 15, label: "Countries", suffix: "" },
  ];

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're on a mission to make AI and emerging technologies accessible to every African child, breaking down barriers to tech education.",
      color: "from-primary to-accent",
    },
    {
      icon: Lightbulb,
      title: "Innovation First",
      description: "We constantly innovate our teaching methods, combining traditional learning with cutting-edge technology and playful experiences.",
      color: "from-accent to-secondary",
    },
    {
      icon: Heart,
      title: "Student-Centered",
      description: "Every program is designed with our students in mind, ensuring age-appropriate content that sparks curiosity and builds confidence.",
      color: "from-secondary to-primary",
    },
    {
      icon: Award,
      title: "Quality Excellence",
      description: "We maintain the highest standards in curriculum design, instructor training, and learning outcomes to deliver exceptional results.",
      color: "from-primary via-accent to-secondary",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6">
              About <span className="gradient-text">Konov Artechtist</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
              Transforming tech education across Africa through innovative, playful, and accessible learning experiences
            </p>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
            {stats.map((stat, idx) => (
              <Card key={idx} className="p-6 text-center glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
                <div className="text-4xl md:text-5xl font-orbitron font-bold gradient-text mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-muted-foreground font-space">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Our Story */}
          <div className="mb-24">
            <h2 className="text-4xl font-orbitron font-bold mb-8 text-center">
              Our <span className="gradient-text">Story</span>
            </h2>
            <Card className="p-12 glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
              <div className="max-w-3xl mx-auto space-y-6 font-space text-lg text-muted-foreground leading-relaxed">
                <p>
                  Founded in 2019 in Lagos, Nigeria, Konov Artechtist was born from a simple observation: children across Africa were fascinated by technology but had few opportunities to create with it.
                </p>
                <p>
                  Our founder, Konov Nwachukwu, a software engineer and educator, started with a weekend workshop teaching 12 kids how to build simple robots. Those kids went home and told their friends. Within six months, we were running workshops for 200+ students.
                </p>
                <p>
                  We quickly learned that traditional tech education wasn't working—it was too formal, too intimidating. So we reimagined it. We created comic books featuring African child protagonists solving problems with AI. We gamified our online platform. We designed workshops where kids build, break, and rebuild without fear of failure.
                </p>
                <p>
                  Today, we've reached over 10,000 young learners across 15 African countries. We've partnered with 50+ schools, published 8 comic series, and watched kids who couldn't code create AI-powered apps. But we're just getting started.
                </p>
                <p>
                  Our mission remains unchanged: make every African child a technology creator, not just a consumer. Because the next great innovation in AI could come from a 12-year-old in Accra, Nairobi, or Kigali—if we give them the tools and confidence to build it.
                </p>
              </div>
            </Card>
          </div>

          {/* Our Values */}
          <div>
            <h2 className="text-4xl font-orbitron font-bold mb-12 text-center">
              Our <span className="gradient-text">Values</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, idx) => {
                const Icon = value.icon;
                return (
                  <Card key={idx} className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20 group">
                    <div className={`w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-foreground" />
                    </div>
                    <h3 className="text-2xl font-orbitron font-bold mb-4 text-foreground">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground font-space leading-relaxed">
                      {value.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
