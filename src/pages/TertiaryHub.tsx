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
import { Rocket, Cog, Database, Search, Users, Calendar, Gift, Trophy, CheckCircle2 } from "lucide-react";

const hubFAQs = [
  { question: "Who can join the Tertiary AI Innovation Hub?", answer: "Tertiary students, university students, and young adults interested in applying AI to real product building, automation, data, and research." },
  { question: "Do I need to already know AI or machine learning?", answer: "No — the Hub is applied and project-based, so you build real skills as you go, though some prior coding exposure helps you move faster." },
  { question: "What do participants actually produce?", answer: "Real applied AI work: automation tools, data projects, and products — not just theory." },
  { question: "What is the AI Builder Sprint?", answer: "The AI Builder Sprint is the Hub's free, 7-day virtual entry program — a fast, guided way to explore AI, learn how it works, and build your own AI-powered project before it ends in a capstone hackathon." },
  { question: "Is the AI Builder Sprint really free?", answer: "Yes. It's a free 7-day virtual experience — the only requirement is your time and a genuine interest in exploring artificial intelligence." },
];

const sprintCurriculum = [
  "AI fundamentals",
  "Prompt engineering",
  "Data and machine learning basics",
  "AI tools and automation",
  "Chatbot and conversational AI development",
  "Product thinking",
  "Problem-solving with AI",
  "Project presentation",
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
        description="KONOV's Tertiary AI Innovation Hub helps students apply AI to product building, automation, data, and research — starting with the free 7-day AI Builder Sprint."
        canonical="/tertiary-ai-innovation-hub"
        keywords={["Tertiary AI Innovation Hub", "AI Builder Sprint", "AI for university students Ghana", "applied AI programs Africa", "practical AI learning for students", "free AI program for students"]}
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
              KONOV helps tertiary students, university students, and young adults apply artificial
              intelligence to product building, automation, data, research, and real-world problem
              solving — starting with the free, 7-day <strong>AI Builder Sprint</strong>.
            </p>
          </SpeechBubble>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Join The AI Builder Sprint — Free
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

      {/* AI Builder Sprint */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <ActionBurst color="primary" className="mb-4 inline-block">FLAGSHIP PROGRAM</ActionBurst>
            <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-4">
              The <span className="gradient-text">AI Builder Sprint</span>
            </h2>
            <p className="text-lg text-muted-foreground font-space leading-relaxed max-w-2xl mx-auto">
              A free 7-day virtual experience for tertiary students, university students, and young adults
              who want to explore artificial intelligence, learn how AI works, and build their own
              AI-powered project.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10 max-w-4xl mx-auto">
            <ComicPanel color="primary" className="p-6 text-center">
              <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-fredoka font-bold">100% Free</p>
            </ComicPanel>
            <ComicPanel color="secondary" className="p-6 text-center">
              <Calendar className="w-8 h-8 text-secondary mx-auto mb-2" />
              <p className="font-fredoka font-bold">7 Days, Virtual</p>
            </ComicPanel>
            <ComicPanel color="accent" className="p-6 text-center">
              <Trophy className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-fredoka font-bold">Capstone Hackathon, Cash Prizes</p>
            </ComicPanel>
          </div>

          <ComicPanel className="p-8 md:p-10 max-w-3xl mx-auto">
            <h3 className="text-xl font-fredoka font-bold mb-4">What You'll Learn In 7 Days</h3>
            <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
              {sprintCurriculum.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 font-space text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground font-space leading-relaxed text-sm mb-6">
              The Sprint ends with a capstone AI hackathon where participants present their solutions and
              compete for cash prizes.
            </p>
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Join The AI Builder Sprint — Free
            </Button>
          </ComicPanel>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Ready To <span className="text-primary">Build?</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Join The Hub
            </Button>
            <WhatsAppButton label="Ask A Question" message="Hi! I'd like to ask about the Tertiary AI Innovation Hub and the AI Builder Sprint." />
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
