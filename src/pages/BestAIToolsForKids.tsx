import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO, createBreadcrumbSchema, createFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Brain, Bot, Code, Eye, GraduationCap, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Resources", url: "/resources" },
  { name: "Best AI Tools for Kids", url: "/resources/best-ai-tools-for-kids" },
]);

const faqSchema = createFAQSchema([
  {
    question: "What are the best AI tools for kids to start with?",
    answer: "The best tools are safe, project-based and supervised: MeAI for guided AI literacy, Scratch-style coding tools for logic, visual machine-learning tools for model training, and age-appropriate creative AI tools for storytelling and design.",
  },
  {
    question: "What age should children start learning AI?",
    answer: "Children can start learning AI concepts from age 6 when lessons are visual, playful and supervised. KONOV adapts AI, robotics, coding and tech learning for ages 6-16.",
  },
  {
    question: "Do kids need coding before learning AI?",
    answer: "No. Kids can begin with prompting, pattern recognition, image classification and chatbot projects, then move into coding and app development as they grow more confident.",
  },
]);

const aiTools = [
  {
    icon: Brain,
    title: "MeAI by KONOV",
    use: "Guided AI and machine-learning literacy for kids ages 6-16.",
    why: "MeAI is built around comic-style lessons, practical projects, chatbot building and simple model-training activities, so young learners understand how intelligent systems think instead of only playing with robot toys.",
  },
  {
    icon: Bot,
    title: "Visual ML model builders",
    use: "Training simple image, sound or text models without advanced code.",
    why: "These tools help children see that AI learns from examples. They can collect data, train a model, test predictions and improve the model when it makes mistakes.",
  },
  {
    icon: Code,
    title: "Block coding and Python starters",
    use: "Moving from drag-and-drop logic to real programming.",
    why: "Coding tools help learners connect AI ideas to app development, robotics commands, games and automation projects.",
  },
  {
    icon: Eye,
    title: "Computer vision sandboxes",
    use: "Exploring image recognition, color detection, face detection and object detection.",
    why: "Vision projects are easy for kids to understand because they can immediately test what a model sees and where it fails.",
  },
  {
    icon: Sparkles,
    title: "Creative AI tools",
    use: "Storytelling, design, brainstorming and media creation.",
    why: "Creative tools make AI feel useful, but children should learn source checking, originality, bias and responsible prompting alongside creativity.",
  },
  {
    icon: Wrench,
    title: "Robotics control tools",
    use: "Connecting sensors, motors and AI logic to physical robots.",
    why: "Robotics turns AI from screen learning into real-world problem solving: detect an object, decide what it is, then make the robot respond.",
  },
];

const safetyRules = [
  "Use child-safe accounts and adult supervision for any tool with chat, sharing or uploads.",
  "Start with project goals, not random prompting: build a bot, classify images, design a game or control a robot.",
  "Teach children that AI can be wrong, biased or incomplete, so every result needs human checking.",
  "Avoid uploading private photos, school records, addresses, phone numbers or sensitive family information.",
];

const BestAIToolsForKids = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Best AI Tools for Kids in Ghana"
        description="A practical parent and school guide to safe AI tools for kids ages 6-16, covering MeAI, machine learning, robotics, coding and creative AI."
        canonical="/resources/best-ai-tools-for-kids"
        keywords={[
          "best AI tools for kids",
          "AI for kids Ghana",
          "safe AI tools for children",
          "machine learning for kids",
          "robotics and coding for kids Ghana",
        ]}
        jsonLd={[breadcrumbSchema, faqSchema]}
      />
      <Navbar />

      <main className="pt-28 pb-16">
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-2 font-fredoka text-sm font-bold text-primary shadow-[3px_3px_0_hsl(var(--foreground))]">
                <GraduationCap className="h-4 w-4" /> Parent & School Guide
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-tight text-foreground font-fredoka md:text-6xl">
                Best AI Tools for Kids: A Safe, Project-Based Guide for Ages 6-16
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground font-space md:text-xl">
                AI learning should help children build, question and create. This guide shows parents and schools how to choose tools that teach real AI literacy: prompting, data, machine learning, computer vision, robotics, coding and responsible use.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="font-fredoka border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                  <a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Explore MeAI</a>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-fredoka border-4 border-foreground bg-card shadow-[4px_4px_0_hsl(var(--foreground))]">
                  <Link to="/programs">See KONOV Programs</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 bg-card/50 border-y-4 border-foreground">
          <div className="container mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { value: "6-16", label: "age-adapted AI learning" },
              { value: "Tech", label: "robotics, coding and app projects" },
              { value: "Ghana", label: "built for African learners and schools" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border-4 border-foreground bg-background p-6 shadow-[5px_5px_0_hsl(var(--foreground))]">
                <div className="font-fredoka text-4xl font-bold text-primary">{item.value}</div>
                <p className="mt-2 font-space text-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-foreground font-fredoka md:text-5xl">What to look for in an AI tool for children</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {aiTools.map(({ icon: Icon, title, use, why }) => (
                <article key={title} className="rounded-lg border-4 border-foreground bg-card p-6 shadow-[5px_5px_0_hsl(var(--foreground))]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-foreground bg-primary">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-fredoka text-xl font-bold text-foreground">{title}</h3>
                  <p className="mt-2 font-space font-semibold text-primary">{use}</p>
                  <p className="mt-3 font-space leading-relaxed text-muted-foreground">{why}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 bg-card/50">
          <div className="container mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary/20 px-4 py-2 font-fredoka text-sm font-bold text-secondary">
                <ShieldCheck className="h-4 w-4" /> Safety first
              </span>
              <h2 className="mt-4 text-3xl font-bold text-foreground font-fredoka md:text-5xl">A simple AI safety checklist for parents and schools</h2>
              <p className="mt-4 font-space leading-relaxed text-muted-foreground">
                The best AI education balances curiosity with guardrails. Children should understand what AI is doing, what data it uses and when to ask an adult before sharing or publishing anything.
              </p>
            </div>
            <div className="space-y-4">
              {safetyRules.map((rule, index) => (
                <div key={rule} className="flex gap-4 rounded-lg border-2 border-foreground bg-background p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-fredoka font-bold text-primary-foreground">{index + 1}</span>
                  <p className="font-space text-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-4xl rounded-lg border-4 border-foreground bg-primary p-8 text-primary-foreground shadow-[6px_6px_0_hsl(var(--foreground))]">
            <h2 className="font-fredoka text-3xl font-bold md:text-4xl">The KONOV recommendation</h2>
            <p className="mt-4 font-space text-lg leading-relaxed">
              Start with guided, age-appropriate projects. Younger learners can explore pattern recognition, prompts and creative AI. Older learners can build chatbots, train simple models, control robots and publish apps. That is the path KONOV uses across MeAI, workshops, weekend programs and FORGE Studio.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="font-fredoka border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <Link to="/contact">Book a School Demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-fredoka border-4 border-foreground bg-background text-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <Link to="/resources">Explore AI Resources</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BestAIToolsForKids;