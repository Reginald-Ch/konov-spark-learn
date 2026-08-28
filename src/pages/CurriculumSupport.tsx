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
import { BookOpen, Layers, ClipboardCheck, CalendarCheck } from "lucide-react";

const curriculumFAQs = [
  { question: "Does KONOV provide a ready-made AI curriculum, or build one for us?", answer: "Both — we bring a proven AI curriculum framework and adapt it to your school's grade levels, schedule, and existing tech subjects." },
  { question: "Does curriculum support include teacher training?", answer: "Yes, curriculum support is delivered alongside teacher training so your staff can own and continue the program." },
  { question: "Can this integrate with our existing ICT or STEM curriculum?", answer: "Yes — we design AI curriculum support to complement, not replace, what your school already teaches." },
];

const curriculumBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "AI Curriculum Support for Schools", url: "/ai-curriculum-support" },
]);

const CurriculumSupport = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="AI Curriculum Support For Schools"
        description="KONOV Technologies helps schools design and deliver a practical AI curriculum — aligned to grade levels, backed by teacher training, and built for African classrooms."
        canonical="/ai-curriculum-support"
        keywords={["AI curriculum support for schools", "AI education for African schools", "AI workshops for schools in Ghana", "school AI program Ghana"]}
        jsonLd={[curriculumBreadcrumb, createFAQSchema(curriculumFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="primary" className="mb-4 inline-block">CURRICULUM SUPPORT</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            AI Curriculum Support For <span className="gradient-text">Schools</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="teaching" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              A practical AI curriculum framework, adapted to your school's grade levels and existing
              subjects — backed by teacher training so your staff can own it long-term.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book A Consultation
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What Curriculum Support <span className="text-primary">Includes</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: BookOpen, title: "A Practical Framework", description: "A proven, age-appropriate AI curriculum, not a generic tech syllabus." },
              { icon: Layers, title: "Grade-Level Alignment", description: "Adapted to fit your school's existing subjects and schedule." },
              { icon: ClipboardCheck, title: "Teacher Ownership", description: "Delivered alongside teacher training so your staff can run it independently." },
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
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Let's Build Your <span className="text-primary">AI Curriculum</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book A Consultation
            </Button>
            <WhatsAppButton label="Chat With Us" message="Hi! I'd like to ask about AI curriculum support for our school." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {curriculumFAQs.map((faq, idx) => (
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

export default CurriculumSupport;
