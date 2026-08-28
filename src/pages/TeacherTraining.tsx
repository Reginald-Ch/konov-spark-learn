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
import { SEO, createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import { GraduationCap, BookOpen, Users, Lightbulb, CalendarCheck } from "lucide-react";

const teacherFAQs = [
  { question: "Do I need an AI or tech background to join teacher training?", answer: "No. Training is designed for educators at any starting point — no prior AI or coding background needed." },
  { question: "Is teacher training only for schools already partnering with KONOV?", answer: "No, though it's often delivered as part of a school partnership. Individual educators and NGOs can also request training." },
  { question: "What do teachers walk away with?", answer: "A practical understanding of how AI works, plus ready-to-use ways to bring AI learning into their own classroom." },
];

const teacherBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Teacher Training", url: "/teacher-training" },
]);

const TeacherTraining = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="AI Training For Teachers In Ghana"
        description="KONOV helps teachers and educators understand artificial intelligence and design practical AI learning experiences for students."
        canonical="/teacher-training"
        keywords={["AI training for teachers in Ghana", "AI education for African schools", "teacher AI professional development", "AI curriculum support for schools"]}
        jsonLd={[teacherBreadcrumb, createFAQSchema(teacherFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="primary" className="mb-4 inline-block">TEACHER TRAINING</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            AI Training For <span className="gradient-text">Teachers In Ghana</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="teaching" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              KONOV helps teachers and educators understand artificial intelligence and design practical AI
              learning experiences for students — no AI background required.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book Teacher Training
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What Teacher Training <span className="text-primary">Covers</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Lightbulb, title: "AI Fundamentals", description: "How AI and machine learning actually work, explained clearly and practically." },
              { icon: BookOpen, title: "Classroom-Ready Activities", description: "Concrete, age-appropriate ways to bring AI learning into your own lessons." },
              { icon: Users, title: "Supporting Student Projects", description: "How to guide students through hands-on AI projects like chatbots and models." },
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
          <GraduationCap className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Confident Teachers, <span className="text-primary">Confident Students</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed mb-8">
            Training can be delivered as part of a broader school partnership, or on its own for educators
            and organizations who want to build AI literacy on their team.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book Teacher Training
            </Button>
            <WhatsAppButton label="Ask A Question" message="Hi! I'd like to ask about AI teacher training." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {teacherFAQs.map((faq, idx) => (
              <ComicPanel key={idx} className="p-6">
                <h3 className="font-fredoka font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground font-space text-sm leading-relaxed">{faq.answer}</p>
              </ComicPanel>
            ))}
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="school_demo" />
      <Footer />
    </div>
  );
};

export default TeacherTraining;
