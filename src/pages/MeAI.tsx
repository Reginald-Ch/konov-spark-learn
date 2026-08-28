import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SEO, createFAQSchema, createBreadcrumbSchema, createProductSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import {
  Zap, Bot, LineChart, Sparkles, GraduationCap, Users, School,
  BookOpen, ShieldCheck, PlayCircle, ArrowRight, ExternalLink,
} from "lucide-react";

const meAiFAQs = [
  { question: "What is Me AI?", answer: "Me AI is KONOV Technologies' AI learning and creation platform for learners ages 6-18. It gives young people a safe, guided space to learn AI concepts, complete interactive lessons, train models, build chatbots, and create their own AI-powered projects." },
  { question: "Who is Me AI for?", answer: "Me AI is designed for young learners ages 6-18, and is also used by schools and educators for classroom AI programs." },
  { question: "Do I need coding experience to use Me AI?", answer: "No prior coding experience is required. Me AI is beginner-friendly, with guided lessons that build up to real Python code as learners progress." },
  { question: "Can schools get access to Me AI?", answer: "Yes. Schools can request classroom access to Me AI as part of KONOV's school partnership programs." },
  { question: "How do I get started with Me AI?", answer: "Click \"Try Me AI\" to open the platform, or contact us on WhatsApp to request school or group access." },
];

const meAiBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Me AI", url: "/me-ai" },
]);

const meAiProductSchema = createProductSchema({
  name: "Me AI",
  description: "Me AI is KONOV Technologies' AI learning and creation platform for learners ages 6-18 — build chatbots, train models, and complete guided AI projects.",
  ageRange: "Ages 6-18",
});

const audiences = [
  {
    icon: GraduationCap,
    title: "Learners",
    description: "Complete interactive lessons, train models, build chatbots, and create AI-powered projects at your own pace.",
  },
  {
    icon: Users,
    title: "Parents",
    description: "A safe, guided learning space with no unsupervised internet access — track progress and celebrate real projects.",
  },
  {
    icon: School,
    title: "Schools",
    description: "Bring Me AI into the classroom with teacher support, curriculum alignment, and group access.",
  },
];

const buildItems = [
  { icon: Bot, title: "Chatbots", description: "Give a bot a name, personality, knowledge base, and rules — then chat with it live." },
  { icon: LineChart, title: "Trained Models", description: "Work with real data and see how machine learning models learn from patterns." },
  { icon: Sparkles, title: "AI-Powered Projects", description: "Combine what you've learned into a real, working AI project you can show off." },
];

const learnerFeatures = ["Guided, interactive lessons", "Real Python code as you progress", "Instant feedback on your work", "Earn coins and badges as you learn"];
const parentFeatures = ["Safe, supervised learning environment", "Age-appropriate content (6-18)", "Visible progress and completed projects", "No prior coding experience required"];
const schoolFeatures = ["Classroom-ready curriculum", "Teacher training and support", "Group/class access", "Hackathon and showcase integration"];

const MeAI = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Me AI | AI Learning And Creation Platform For Kids And Teens"
        description="Me AI by KONOV Technologies helps young learners build chatbots, train AI models, complete guided AI projects, and understand artificial intelligence through practical learning."
        canonical="/me-ai"
        keywords={["Me AI platform", "AI creation platform for young learners", "AI learning platform for children", "chatbot building for kids", "machine learning for kids"]}
        jsonLd={[meAiBreadcrumb, meAiProductSchema, createFAQSchema(meAiFAQs)]}
      />
      <Navbar />

      {/* Hero */}
      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="primary" className="mb-4 inline-block">ME AI</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            An AI Creation Platform For <span className="gradient-text">Young Learners</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="excited" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              Me AI is KONOV's AI learning platform for learners ages 6-18. It helps young people learn AI
              through interactive lessons, guided projects, model training, chatbot creation, and hands-on
              activities designed for African learners.
            </p>
          </SpeechBubble>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button
              asChild
              size="lg"
              className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary"
            >
              <a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">
                <Zap className="w-5 h-5 mr-2" /> Try Me AI <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <WhatsAppButton label="Request School Access" message="Hi! I'd like to request school access to Me AI." />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-4">
            Who Me AI Is <span className="text-primary">For</span>
          </h2>
          <p className="text-center text-muted-foreground font-space max-w-2xl mx-auto mb-12">
            Built for learners ages 6-18, and the parents and schools who support them.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {audiences.map((a, idx) => {
              const Icon = a.icon;
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
                  <ComicPanel color={idx === 0 ? "primary" : idx === 1 ? "secondary" : "accent"} className="p-6 h-full">
                    <Icon className="w-10 h-10 text-foreground mb-3" />
                    <h3 className="text-xl font-fredoka font-bold mb-2">{a.title}</h3>
                    <p className="text-sm text-muted-foreground font-space">{a.description}</p>
                  </ComicPanel>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What learners can build */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What Learners Can <span className="text-primary">Build</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {buildItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color="primary" delay={idx * 0.1} className="p-6">
                  <Icon className="w-10 h-10 text-primary mb-3" />
                  <h3 className="text-lg font-fredoka font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-space">{item.description}</p>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            How It <span className="text-primary">Works</span>
          </h2>
          <ComicPanel className="p-8 md:p-12">
            <ol className="space-y-6 font-space text-lg text-muted-foreground">
              <li className="flex gap-4"><span className="font-fredoka font-bold text-primary text-2xl">1.</span> Sign up and pick a starting project — a chatbot or an AI agent.</li>
              <li className="flex gap-4"><span className="font-fredoka font-bold text-primary text-2xl">2.</span> Follow guided, interactive lessons to configure and code your project.</li>
              <li className="flex gap-4"><span className="font-fredoka font-bold text-primary text-2xl">3.</span> Test your AI live, get instant feedback, and iterate.</li>
              <li className="flex gap-4"><span className="font-fredoka font-bold text-primary text-2xl">4.</span> Publish your project and show it off — or take it into a KONOV hackathon.</li>
            </ol>
          </ComicPanel>
        </div>
      </section>

      {/* Features by audience */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "For Learners", icon: BookOpen, items: learnerFeatures },
              { title: "For Parents", icon: ShieldCheck, items: parentFeatures },
              { title: "For Schools", icon: School, items: schoolFeatures },
            ].map((group, idx) => {
              const Icon = group.icon;
              return (
                <ComicPanel key={idx} color={idx === 0 ? "primary" : idx === 1 ? "secondary" : "accent"} className="p-6">
                  <Icon className="w-8 h-8 mb-3" />
                  <h3 className="text-lg font-fredoka font-bold mb-3">{group.title}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground font-space">
                    {group.items.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo / preview placeholder */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            See It In <span className="text-primary">Action</span>
          </h2>
          <ComicPanel className="p-12 flex flex-col items-center gap-4">
            <PlayCircle className="w-16 h-16 text-primary" />
            <p className="text-muted-foreground font-space max-w-md">
              Explore Me AI directly — the fastest way to see how learners build and test real AI projects.
            </p>
            <Button asChild size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary">
              <a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">
                Open Me AI <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </ComicPanel>
        </div>
      </section>

      {/* Access */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Access For <span className="text-primary">Learners &amp; Schools</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed mb-8">
            Individual learners can start on Me AI directly. Schools and organizations wanting group or
            classroom access should reach out — we'll walk you through options that fit your program.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary">
              <a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Try Me AI</a>
            </Button>
            <WhatsAppButton label="Request School Access" message="Hi! I'd like to request school access to Me AI." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {meAiFAQs.map((faq, idx) => (
              <ComicPanel key={idx} className="p-6">
                <h3 className="font-fredoka font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground font-space text-sm leading-relaxed">{faq.answer}</p>
              </ComicPanel>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MeAI;
