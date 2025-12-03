import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, Video, FileText, Lightbulb } from "lucide-react";
import { useState } from "react";
import { SignupModal } from "@/components/SignupModal";
import resourcesBanner from "@/assets/resources-banner.jpg";

const Resources = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  const resources = [
    {
      category: "Parent Guides",
      icon: BookOpen,
      color: "from-primary to-accent",
      items: [
        {
          title: "Introduction to AI for Kids",
          description: "A comprehensive guide to help parents understand AI concepts and discuss them with children.",
          type: "PDF",
        },
        {
          title: "Coding at Home: Getting Started",
          description: "Tips and resources for supporting your child's coding journey from home.",
          type: "PDF",
        },
        {
          title: "Screen Time & Tech Balance",
          description: "Guidelines for healthy technology use and learning balance.",
          type: "PDF",
        },
      ],
    },
    {
      category: "Video Tutorials",
      icon: Video,
      color: "from-accent to-secondary",
      items: [
        {
          title: "What is Artificial Intelligence?",
          description: "An animated explanation of AI concepts for young learners.",
          type: "Video",
        },
        {
          title: "Building Your First Robot",
          description: "Step-by-step tutorial for a simple robot project at home.",
          type: "Video",
        },
        {
          title: "Coding Fundamentals",
          description: "Introduction to programming logic and basic coding concepts.",
          type: "Video",
        },
      ],
    },
    {
      category: "Worksheets & Activities",
      icon: FileText,
      color: "from-secondary to-primary",
      items: [
        {
          title: "AI Coloring Book",
          description: "Fun coloring pages featuring robots, AI, and technology themes.",
          type: "PDF",
        },
        {
          title: "Logic Puzzles for Kids",
          description: "Engaging puzzles that develop computational thinking skills.",
          type: "PDF",
        },
        {
          title: "Technology Vocabulary Cards",
          description: "Flashcards to help kids learn tech terminology in a fun way.",
          type: "PDF",
        },
      ],
    },
    {
      category: "Learning Articles",
      icon: Lightbulb,
      color: "from-primary via-accent to-secondary",
      items: [
        {
          title: "Why Tech Education Matters",
          description: "Understanding the importance of tech literacy in the modern world.",
          type: "Article",
        },
        {
          title: "Career Paths in Technology",
          description: "Exploring various careers in tech and how to prepare for them.",
          type: "Article",
        },
        {
          title: "The Future of Education",
          description: "How technology is transforming learning experiences worldwide.",
          type: "Article",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Resources Banner Image */}
      <div className="w-full h-56 md:h-72 relative overflow-hidden">
        <img 
          src={resourcesBanner} 
          alt="Students engaged in tech learning" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>
      
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6">
              Free <span className="gradient-text">Resources</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
              Educational materials, guides, and tutorials to support tech learning at home and in the classroom
            </p>
          </div>

          <div className="space-y-16">
            {resources.map((category, idx) => {
              const Icon = category.icon;
              return (
                <div key={idx}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-foreground" />
                    </div>
                    <h2 className="text-3xl font-orbitron font-bold text-foreground">
                      {category.category}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {category.items.map((item, itemIdx) => (
                      <Card key={itemIdx} className="p-6 glow-card bg-card/50 backdrop-blur-sm border border-primary/20 group hover:border-primary/50 transition-all duration-300">
                        <div className="mb-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-space font-semibold bg-gradient-to-r ${category.color} text-foreground`}>
                            {item.type}
                          </span>
                        </div>
                        <h3 className="text-xl font-orbitron font-bold mb-3 text-foreground group-hover:gradient-text transition-all">
                          {item.title}
                        </h3>
                        <p className="text-muted-foreground font-space mb-6 leading-relaxed">
                          {item.description}
                        </p>
                        <Button className="w-full font-space group">
                          <Download className="mr-2 w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                          Download
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <Card className="mt-16 p-12 text-center glow-card bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-primary/30">
            <h2 className="text-3xl md:text-4xl font-orbitron font-bold mb-4">
              Want More Resources?
            </h2>
            <p className="text-lg text-muted-foreground font-space mb-8 max-w-2xl mx-auto">
              Sign up for our newsletter to receive new educational materials, workshop updates, and exclusive content delivered to your inbox.
            </p>
            <Button size="lg" className="font-space font-semibold" onClick={() => setShowSignupModal(true)}>
              Subscribe to Newsletter
            </Button>
          </Card>
        </div>
      </section>

      <SignupModal 
        open={showSignupModal} 
        onOpenChange={setShowSignupModal}
        source="resources"
      />

      <Footer />
    </div>
  );
};

export default Resources;
