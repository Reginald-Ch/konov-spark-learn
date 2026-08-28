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
import { Rocket, Cog, Database, Search, Users } from "lucide-react";

const hubFAQs = [
  { question: "Who can join the Tertiary AI Innovation Hub?", answer: "Tertiary (university/college) students interested in applying AI to real product building, automation, data, and research." },
  { question: "Do I need to already know AI or machine learning?", answer: "No — the Hub is applied and project-based, so you build real skills as you go, though some prior coding exposure helps you move faster." },
  { question: "What do participants actually produce?", answer: "Real applied AI work: automation tools, data projects, and products — not just theory." },
];

const hubBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Tertiary AI Innovation Hub", url: "/tertiary-ai-innovation-hub" },
]);

const TertiaryHub = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="Tertiary AI Innovation Hub In Ghana"
        description="KONOV helps tertiary students apply artificial intelligence to product building, automation, data, research, and real-world problem solving."
        canonical="/tertiary-ai-innovation-hub"
        keywords={["Tertiary AI Innovation Hub", "AI for university students Ghana", "applied AI programs Africa", "practical AI learning for students"]}
        jsonLd={[hubBreadcrumb, createFAQSchema(hubFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="accent" className="mb-4 inline-block">TERTIARY AI INNOVATION HUB</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            Applied AI For <span className="gradient-text">Tertiary Students</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="cool" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              KONOV helps tertiary students apply artificial intelligence to product building, automation,
              data, research, and real-world problem solving.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Join The Hub
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What You'll <span className="text-primary">Apply AI To</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Cog, title: "Product Building", description: "Turn an idea into a working AI-powered product." },
              { icon: Database, title: "Automation & Data", description: "Automate real workflows and work with real datasets." },
              { icon: Search, title: "Research", description: "Apply AI methods to genuine research questions." },
              { icon: Users, title: "Real-World Innovation", description: "Solve problems that matter to your community." },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color={["primary", "secondary", "accent", "primary"][idx] as "primary" | "secondary" | "accent"} delay={idx * 0.08} className="p-6">
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
            Ready To <span className="text-primary">Build?</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Join The Hub
            </Button>
            <WhatsAppButton label="Ask A Question" message="Hi! I'd like to ask about the Tertiary AI Innovation Hub." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {hubFAQs.map((faq, idx) => (
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

export default TertiaryHub;
