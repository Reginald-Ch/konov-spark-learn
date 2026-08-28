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
import {
  AlertTriangle, School, Users, GraduationCap, Zap, Trophy,
  CheckCircle2, CalendarCheck,
} from "lucide-react";

const schoolsFAQs = [
  { question: "Do teachers need AI experience to bring KONOV into their school?", answer: "No. We provide teacher training alongside every school program, so educators are equipped to support students even without prior AI experience." },
  { question: "Can KONOV run a one-off workshop, or only long-term programs?", answer: "Both. We offer short, practical AI workshops as well as ongoing classroom programs and after-school AI clubs, depending on what fits your school." },
  { question: "Does KONOV provide Me AI access for classrooms?", answer: "Yes. Schools can get classroom access to Me AI as part of a partnership, so students can continue learning between sessions." },
  { question: "How do we start a partnership with KONOV?", answer: "Book a consultation with us — we'll discuss your school's goals, student ages, and schedule, then propose a program that fits." },
];

const schoolsBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "For Schools", url: "/for-schools" },
]);

const offerings = [
  { icon: Users, title: "Student AI Workshops", description: "Short, practical AI learning experiences designed for schools that want students to understand and explore artificial intelligence." },
  { icon: GraduationCap, title: "Teacher Training", description: "Hands-on training so educators can confidently support AI learning in their own classrooms." },
  { icon: Zap, title: "Me AI For Classrooms", description: "Classroom access to Me AI so students can keep building AI projects between sessions." },
  { icon: School, title: "AI Clubs & After-School Programs", description: "Ongoing AI learning outside class hours, for students who want to go further." },
  { icon: Trophy, title: "Hackathons & Showcases", description: "Student innovation challenges where learners present real AI projects, judged and celebrated." },
];

const partnershipSteps = [
  "Book a consultation to share your school's goals and student ages.",
  "We propose a program — a one-off workshop, a term-long class, or an AI club.",
  "We deliver the program with trained facilitators and, where useful, Me AI classroom access.",
  "Students showcase what they've built — in class, at a school event, or a KONOV hackathon.",
];

const ForSchools = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="AI Education Programs For Schools In Ghana"
        description="KONOV helps schools introduce practical AI education through student workshops, teacher training, Me AI classroom access, AI clubs, and innovation challenges."
        canonical="/for-schools"
        keywords={["AI workshops for schools in Ghana", "AI education for African schools", "AI training for teachers in Ghana", "AI curriculum support for schools", "school partnership AI Ghana"]}
        jsonLd={[schoolsBreadcrumb, createFAQSchema(schoolsFAQs)]}
      />
      <Navbar />

      {/* Hero */}
      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="secondary" className="mb-4 inline-block">FOR SCHOOLS</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            AI Education Programs For <span className="gradient-text">Schools In Ghana</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="teaching" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              KONOV helps schools introduce practical AI education through workshops, classroom programs,
              teacher training, Me AI access, and student innovation challenges.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book a School Workshop
            </Button>
          </div>
        </div>
      </section>

      {/* Why schools need AI education */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <AlertTriangle className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Why Schools Need <span className="text-primary">AI Education</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed">
            AI is already shaping how young people learn, work, and create. Most edtech treats students as
            tool users. KONOV Technologies is AI-first and practical — we help students understand how
            intelligent systems actually work, not just how to click through an app, so your school is
            preparing learners for what comes next rather than what's already here.
          </p>
        </div>
      </section>

      {/* What KONOV offers schools */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What KONOV Offers <span className="text-primary">Schools</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {offerings.map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color={["primary", "secondary", "accent"][idx % 3] as "primary" | "secondary" | "accent"} delay={idx * 0.08} className="p-6">
                  <Icon className="w-9 h-9 text-foreground mb-3" />
                  <h3 className="text-lg font-fredoka font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-space">{item.description}</p>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partnership process */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            Partnership <span className="text-primary">Process</span>
          </h2>
          <ComicPanel className="p-8 md:p-12">
            <ol className="space-y-5">
              {partnershipSteps.map((step, idx) => (
                <li key={idx} className="flex gap-4 items-start font-space text-lg text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  {step}
                </li>
              ))}
            </ol>
          </ComicPanel>
        </div>
      </section>

      {/* Book a consultation CTA */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Ready To <span className="text-primary">Partner?</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed mb-8">
            Book a consultation and we'll design a program that fits your students, schedule, and goals.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <CalendarCheck className="w-5 h-5 mr-2" /> Book a School Workshop
            </Button>
            <WhatsAppButton label="Chat With Us" message="Hi! I'd like to talk about a school partnership with KONOV Technologies." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {schoolsFAQs.map((faq, idx) => (
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

export default ForSchools;
