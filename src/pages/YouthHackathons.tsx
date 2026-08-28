import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SignupModal } from "@/components/SignupModal";
import { SEO, createFAQSchema, createBreadcrumbSchema, createEventSchema } from "@/components/SEO";
import { Trophy, Users, Code, Presentation, ArrowRight } from "lucide-react";

const hackathonFAQs = [
  { question: "Who can join a KONOV youth hackathon?", answer: "Young innovators across the age groups KONOV serves — teams solve problems, build prototypes, and present AI-powered ideas with mentors and judges on hand." },
  { question: "Do I need to already know how to code to join?", answer: "No. Hackathons welcome beginners through advanced builders — FORGE Studio's guided scaffold means you can build a real AI project even as a first-timer." },
  { question: "Where do KONOV hackathons actually happen?", answer: "Live, judged hackathons run inside FORGE Studio, KONOV's hackathon platform — register interest here and we'll point you to the current or next event." },
  { question: "Can organizations sponsor a challenge?", answer: "Yes — reach out and we'll walk you through sponsoring a challenge track or prize." },
];

const hackathonsBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Youth AI Hackathons", url: "/youth-hackathons" },
]);

const hackathonEventSchema = createEventSchema({
  name: "KONOV Youth AI Hackathon",
  description: "Innovation challenges where young people solve problems, build prototypes, and present AI-powered ideas.",
  startDate: new Date().toISOString(),
});

const YouthHackathons = () => {
  const navigate = useNavigate();
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="Youth AI Hackathons And Innovation Challenges"
        description="KONOV organizes AI hackathons and innovation challenges where young people solve problems, build prototypes, and present AI-powered ideas."
        canonical="/youth-hackathons"
        keywords={["youth AI hackathons", "hackathons for kids Ghana", "youth hackathon Accra", "AI innovation challenges Africa"]}
        jsonLd={[hackathonsBreadcrumb, hackathonEventSchema, createFAQSchema(hackathonFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="primary" className="mb-4 inline-block">YOUTH AI HACKATHONS</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            Build. Compete. <span className="gradient-text">Present.</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="excited" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              KONOV organizes AI hackathons and innovation challenges where young people solve problems,
              build prototypes, and present AI-powered ideas.
            </p>
          </SpeechBubble>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Trophy className="w-5 h-5 mr-2" /> Register Interest
            </Button>
            <WhatsAppButton label="Sponsor A Challenge" message="Hi! I'd like to ask about sponsoring a KONOV youth hackathon challenge." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What A KONOV Hackathon <span className="text-primary">Looks Like</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, title: "Teams & Mentors", description: "Build solo or in a team, with mentors and judges guiding you along the way." },
              { icon: Code, title: "Real AI Prototypes", description: "Build a genuinely working AI project — a chatbot or agent — not just an idea on paper." },
              { icon: Presentation, title: "Showcase & Prizes", description: "Present your project, get judged, and celebrate what you built." },
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

      {/* Link to the real platform */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <ComicPanel color="primary" className="p-10">
            <h2 className="text-2xl md:text-4xl font-fredoka font-bold mb-4">
              Live Hackathons Run In <span className="text-primary">FORGE Studio</span>
            </h2>
            <p className="text-muted-foreground font-space leading-relaxed mb-6">
              FORGE Studio is KONOV's live AI hackathon platform — build your project, chat with the
              community, and submit for judging, all in one place.
            </p>
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => navigate('/hackathons')}>
              Enter FORGE Studio <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </ComicPanel>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {hackathonFAQs.map((faq, idx) => (
              <ComicPanel key={idx} className="p-6">
                <h3 className="font-fredoka font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground font-space text-sm leading-relaxed">{faq.answer}</p>
              </ComicPanel>
            ))}
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="hackathon_interest" />
      <Footer />
    </div>
  );
};

export default YouthHackathons;
