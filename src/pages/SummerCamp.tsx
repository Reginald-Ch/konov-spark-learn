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
import { Sun, Users, Trophy, Rocket } from "lucide-react";

const campFAQs = [
  { question: "When does KONOV's Summer AI & Tech Camp run?", answer: "The camp runs during the school vacation period — contact us for the current schedule and availability." },
  { question: "What age group is the camp for?", answer: "The Summer AI & Tech Camp is designed for ages 6-16, tailored by age and understanding level." },
  { question: "Do campers need any prior experience?", answer: "No — the camp is beginner-friendly and project-based, with full-day hands-on activities." },
];

const campBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Summer AI & Tech Camp", url: "/summer-ai-tech-camp" },
]);

const campCourseSchema = createCourseSchema({
  name: "Summer AI & Tech Camp",
  description: "Vacation programs where learners explore AI, coding, creativity, and problem-solving through hands-on projects.",
  ageRange: "Ages 6-16",
  duration: "P4W",
});

const SummerCamp = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="Summer AI And Tech Camp In Ghana"
        description="KONOV Technologies' Summer AI & Tech Camp — vacation programs where learners explore AI, coding, creativity, and problem-solving through hands-on projects."
        canonical="/summer-ai-tech-camp"
        keywords={["summer AI and tech camp Ghana", "tech camp Ghana", "summer coding camp Accra", "AI workshops for kids"]}
        jsonLd={[campBreadcrumb, campCourseSchema, createFAQSchema(campFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="accent" className="mb-4 inline-block">SUMMER AI &amp; TECH CAMP</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            A Full <span className="gradient-text">AI Adventure</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="excited" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              Vacation programs where learners explore AI, coding, creativity, and problem-solving through
              hands-on projects — a full-day immersive experience, not passive screen time.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Reserve A Spot
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            Camp <span className="text-primary">Highlights</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Sun, title: "Full-Day Immersion", description: "Full-day activities, project-based learning, and real team collaboration." },
              { icon: Users, title: "Small Groups", description: "Mentored, hands-on sessions in small groups for real attention." },
              { icon: Trophy, title: "Showcase Day", description: "Campers present real AI-powered projects at the end of camp." },
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
            Spots Are <span className="text-primary">Limited</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Reserve A Spot
            </Button>
            <WhatsAppButton label="Ask About Dates" message="Hi! I'd like to ask about Summer AI & Tech Camp dates." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {campFAQs.map((faq, idx) => (
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

export default SummerCamp;
