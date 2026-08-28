import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SignupModal } from "@/components/SignupModal";
import { SEO, createFAQSchema, createBreadcrumbSchema, createCourseSchema } from "@/components/SEO";
import { Bot, LineChart, Puzzle, MapPin, Rocket, Sparkles } from "lucide-react";

const classesFAQs = [
  { question: "What age is right for KONOV's AI classes?", answer: "Our AI classes are designed for children and teens ages 6-16, with content tailored by age and understanding level." },
  { question: "Does my child need coding experience?", answer: "No prior coding experience is required. Classes are beginner-friendly and build up gradually through exploration and hands-on practice." },
  { question: "Where do the classes take place?", answer: "KONOV runs AI classes in Accra, Ghana, with both after-school and weekend schedules." },
  { question: "What will my child actually build?", answer: "Real AI projects — chatbots, simple trained models, and creative AI-powered projects they can show off, not just worksheets." },
];

const classesBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "AI Classes for Kids", url: "/ai-classes-for-kids-accra" },
]);

const classesCourseSchema = createCourseSchema({
  name: "AI Classes For Kids In Accra",
  description: "Practical AI classes for children and teens who want to understand how artificial intelligence works and build their own AI projects.",
  ageRange: "Ages 6-16",
});

const AIClassesForKids = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="AI Classes For Kids In Accra And Ghana"
        description="KONOV offers practical AI classes for children and teens who want to understand how artificial intelligence works and build their own AI projects."
        canonical="/ai-classes-for-kids-accra"
        keywords={["AI classes for kids in Accra", "AI education for kids in Ghana", "AI programs for young learners", "kids coding Accra", "AI literacy for young people"]}
        jsonLd={[classesBreadcrumb, classesCourseSchema, createFAQSchema(classesFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="accent" className="mb-4 inline-flex items-center gap-1">
            <MapPin className="w-4 h-4" /> ACCRA, GHANA
          </ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            AI Classes For Kids In <span className="gradient-text">Accra</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="happy" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              Practical AI classes for children and teens who want to understand how artificial intelligence
              works and build their own AI projects — no prior coding experience needed.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Enroll Your Child
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What Kids <span className="text-primary">Build</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Bot, title: "Chatbots", description: "A chatbot with real personality, knowledge, and rules they design themselves." },
              { icon: LineChart, title: "Trained Models", description: "Hands-on work with data and patterns, training simple machine learning models." },
              { icon: Puzzle, title: "Creative AI Projects", description: "AI-powered stories, tools, and problem-solving projects to show off." },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color={["primary", "secondary", "accent"][idx] as "primary" | "secondary" | "accent"} delay={idx * 0.1} className="p-6">
                  <Icon className="w-9 h-9 text-foreground mb-3" />
                  <h3 className="text-lg font-fredoka font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-space">{item.description}</p>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Ages 6-16, <span className="text-primary">Beginner-Friendly</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed">
            Classes run after school and on weekends in Accra, tailored by age and understanding level so
            every child stays challenged but never overwhelmed. Small groups, real mentors, and real
            projects — not passive screen time.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Ready To <span className="text-primary">Enroll?</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Enroll Your Child
            </Button>
            <WhatsAppButton label="Ask A Question" message="Hi! I'd like to ask about AI classes for kids in Accra." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 halftone-bg border-t-4 border-foreground">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {classesFAQs.map((faq, idx) => (
              <ComicPanel key={idx} className="p-6">
                <h3 className="font-fredoka font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground font-space text-sm leading-relaxed">{faq.answer}</p>
              </ComicPanel>
            ))}
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="free_trial" />
      <Footer />
    </div>
  );
};

export default AIClassesForKids;
