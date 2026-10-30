import { useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, Blocks, School, Lightbulb, Code2, Heart, MousePointer2, Gamepad2, Terminal, BrainCircuit, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { companyFAQs } from "@/data/companyFAQs";
import { WHATSAPP_NUMBER } from "@/components/WhatsAppButton";
import mentorSrc from "@/assets/gallery-meai-mentor.jpg";
const mentor = { url: mentorSrc };

export const CompanyPurpose = () => (
  <section className="company-section bg-background">
    <div className="company-container grid gap-8 md:grid-cols-[1fr_1.3fr] md:gap-16">
      <div><p className="company-eyebrow company-eyebrow-num text-primary">The company behind the curiosity</p><h2 className="company-heading">Technology should invite young minds in.</h2></div>
      <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
        <p>KONOV is an EdTech company building interactive tools that make technology fun to learn, explore, and create with. We design for young learners aged <strong className="text-foreground">6–16</strong>, and the families and classrooms around them.</p>
        <p>Our first product is <strong className="text-foreground">MeAI</strong>. Alongside our products, we run practical workshops and partner with schools to turn curiosity into hands-on learning.</p>
        <Button asChild variant="link" className="px-0 text-base"><Link to="/about">Meet KONOV <ArrowRight /></Link></Button>
      </div>
    </div>
  </section>
);

export const LearningApproach = () => (
  <section className="company-section bg-card border-y border-border">
    <div className="company-container">
      <p className="company-eyebrow company-eyebrow-num text-accent">How we make learning matter</p>
      <h2 className="company-heading max-w-2xl">Less watching. More wondering, trying, and making.</h2>
      <div className="grid gap-8 md:grid-cols-3 mt-10">
        {[
          { icon: MousePointer2, title: "Play with an idea", text: "Interactive lessons and creative activities make unfamiliar technology something learners can explore.", color: "text-primary" },
          { icon: Code2, title: "Build something of your own", text: "Coding, chatbot building, and model training turn concepts into projects young learners can shape.", color: "text-accent" },
          { icon: Lightbulb, title: "Understand what happens", text: "Experimenting, asking questions, and trying again build understanding—not just the ability to use a tool.", color: "text-secondary" },
        ].map(({ icon: Icon, title, text, color }, index) => <div key={title} className="company-lift border-t-2 border-border pt-6 hover:border-primary"><div className="flex justify-between items-center mb-5"><Icon className={`h-8 w-8 ${color}`} /><span className="font-space text-muted-foreground">0{index + 1}</span></div><h3 className="text-2xl font-fredoka font-semibold mb-3">{title}</h3><p className="text-base text-muted-foreground leading-relaxed">{text}</p></div>)}
      </div>
    </div>
  </section>
);

export const WorkshopsAndSchools = () => (
  <section className="company-section bg-background" id="workshops">
    <div className="company-container">
      <div className="grid gap-8 md:grid-cols-2 items-end mb-10"><div><p className="company-eyebrow company-eyebrow-num text-primary">Beyond the screen</p><h2 className="company-heading">Products spark curiosity.<br />People help it grow.</h2></div><p className="text-lg leading-relaxed text-muted-foreground">We bring our learning approach into real spaces through AI workshops and school partnerships, helping young people explore, code, and create together.</p></div>
      <img src={mentor.url} alt="A KONOV mentor supporting a learner during a hands-on technology session" loading="lazy" decoding="async" className="w-full aspect-[4/3] sm:aspect-[16/7] max-h-[440px] object-cover rounded-lg" />
      <div className="grid md:grid-cols-2 gap-8 md:gap-16 mt-10">
        <div className="company-lift"><Blocks className="h-7 w-7 text-primary mb-4" /><h3 className="text-3xl font-fredoka font-semibold mb-3">Hands-on workshops</h3><p className="text-base text-muted-foreground leading-relaxed mb-5">Facilitator-led tech programs and AI workshops where learners experiment with ideas, build projects, and learn with others.</p><Button asChild variant="outline" className="rounded-lg"><Link to="/programs">Explore workshops & programs <ArrowRight /></Link></Button></div>
        <div className="company-lift"><School className="h-7 w-7 text-accent mb-4" /><h3 className="text-3xl font-fredoka font-semibold mb-3">Partnerships with schools</h3><p className="text-base text-muted-foreground leading-relaxed mb-5">MeAI for classrooms, guided workshops, and school learning programs that bring creative technology education closer to learners.</p><Button asChild variant="outline" className="rounded-lg"><Link to="/for-schools">Partner with KONOV <ArrowRight /></Link></Button></div>
      </div>
    </div>
  </section>
);

export const LearnerVoice = () => (
  <section className="company-section bg-accent text-accent-foreground">
    <div className="company-container grid gap-8 md:grid-cols-[1fr_2fr]">
      <div className="flex items-start gap-3"><Heart className="h-6 w-6 shrink-0" /><p className="company-eyebrow">In a learner’s words</p></div>
      <figure><blockquote className="text-3xl md:text-4xl font-fredoka font-medium leading-snug">“It was so interesting, fun and easy to understand.”</blockquote><figcaption className="mt-6 text-base">Ranel Joel-Ashie <span className="opacity-80">— Student, Code Lab</span></figcaption></figure>
    </div>
  </section>
);

export const CompanyFAQ = () => (
  <section className="company-section bg-background"><div className="company-container grid gap-8 md:grid-cols-[1fr_1.5fr]"><div><p className="company-eyebrow company-eyebrow-num text-primary">A little clarity</p><h2 className="company-heading">Your questions,<br />answered.</h2></div><Accordion type="single" collapsible>{companyFAQs.map((faq, i) => <AccordionItem value={`company-${i}`} key={faq.question}><AccordionTrigger className="text-left text-lg font-fredoka">{faq.question}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></div></section>
);

const meaiSteps = [
  { id: "play", icon: Gamepad2, label: "Play missions", title: "Explore a game world inspired by African life", text: "Every 3D mission is a challenge to solve, so learning feels like playing." },
  { id: "code", icon: Terminal, label: "Write code", title: "Write real code, one step at a time", text: "Kids type real code to move characters, build chatbots, and solve each mission." },
  { id: "train", icon: BrainCircuit, label: "Train AI", title: "Teach an AI with your own examples", text: "Learners give a model examples, test it, and see how AI makes its choices." },
] as const;

type MeAIStepId = (typeof meaiSteps)[number]["id"];

const MissionBoard = () => (
  <div className="space-y-3">
    <p className="font-mono text-xs uppercase tracking-widest text-background/60">Example missions</p>
    {[
      { name: "Code your first game", status: "Complete", progress: 100 },
      { name: "Build a chatbot", status: "In progress", progress: 60 },
      { name: "Train an AI to sort pictures", status: "Up next", progress: 0 },
    ].map((m) => (
      <div key={m.name} className="rounded-lg border border-background/15 bg-background/5 p-4">
        <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold">Mission · {m.name}</span><span className="font-mono text-xs text-background/70">{m.status}</span></div>
        <div className="mt-3 h-1.5 rounded-full bg-background/15"><div className="h-1.5 rounded-full bg-secondary" style={{ width: `${m.progress}%` }} /></div>
      </div>
    ))}
  </div>
);

const CodePanel = () => (
  <div className="font-mono text-sm leading-7">
    <p className="text-xs uppercase tracking-widest text-background/60 mb-3">mission_02.py</p>
    <pre className="whitespace-pre-wrap"><span className="text-background/50"># Mission: Build a chatbot</span>{"\n"}bot = <span className="text-[hsl(358_98%_68%)]">MeAI</span>.chatbot(<span className="text-secondary">"Ama"</span>){"\n"}bot.teach(<span className="text-secondary">"hello"</span>, <span className="text-secondary">"Akwaaba! How can I help?"</span>){"\n"}bot.teach(<span className="text-secondary">"bye"</span>, <span className="text-secondary">"Nante yie!"</span>){"\n"}bot.chat(<span className="text-secondary">"hello"</span>)</pre>
    <p className="mt-4 rounded-md bg-background/10 px-3 py-2"><span className="text-background/60">Ama ›</span> Akwaaba! How can I help?</p>
  </div>
);

const TrainPanel = () => (
  <div className="space-y-4">
    <p className="font-mono text-xs uppercase tracking-widest text-background/60">Example model · How does this feel?</p>
    <p className="rounded-md bg-background/10 px-3 py-2 text-sm">“I scored a goal today!”</p>
    {[
      { label: "Happy", value: 91 },
      { label: "Surprised", value: 6 },
      { label: "Sad", value: 3 },
    ].map((r) => (
      <div key={r.label} className="text-sm">
        <div className="flex justify-between font-mono"><span>{r.label}</span><span>{r.value}%</span></div>
        <div className="mt-1.5 h-2 rounded-full bg-background/15"><div className="h-2 rounded-full bg-primary" style={{ width: `${r.value}%` }} /></div>
      </div>
    ))}
  </div>
);

const meaiPanels: Record<MeAIStepId, ComponentType> ={ play: MissionBoard, code: CodePanel, train: TrainPanel };

export const MeAIHowItWorks = () => {
  const [active, setActive] = useState<MeAIStepId>("play");
  const reduce = useReducedMotion();
  const step = meaiSteps.find((s) => s.id === active)!;
  const Panel = meaiPanels[active];

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = meaiSteps.findIndex((s) => s.id === active);
    const next = meaiSteps[(i + (e.key === "ArrowRight" ? 1 : meaiSteps.length - 1)) % meaiSteps.length];
    setActive(next.id);
    document.getElementById(`meai-tab-${next.id}`)?.focus();
  };

  return (
    <section className="company-section bg-background" aria-labelledby="meai-how-heading">
      <div className="company-container">
        <p className="company-eyebrow company-eyebrow-num text-primary">How MeAI works</p>
        <h2 id="meai-how-heading" className="company-heading max-w-2xl">Play. Code. Build AI.</h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div role="tablist" aria-label="How MeAI works" className="flex flex-col gap-3" onKeyDown={onTabKey}>
            {meaiSteps.map((s, i) => {
              const selected = s.id === active;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  id={`meai-tab-${s.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="meai-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(s.id)}
                  className={`flex items-start gap-4 rounded-lg border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-mono text-xs text-muted-foreground">Step 0{i + 1}</span>
                    <span className="block font-fredoka text-xl font-semibold">{s.label}</span>
                    {selected && <span className="mt-1 block text-base text-muted-foreground leading-relaxed">{s.text}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div id="meai-panel" role="tabpanel" aria-labelledby={`meai-tab-${active}`} className="rounded-xl bg-foreground p-6 text-background md:p-8">
            <motion.div key={active} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="font-fredoka text-2xl font-semibold mb-6">{step.title}</h3>
              <Panel />
            </motion.div>
          </div>
        </div>
        <Button asChild variant="link" className="mt-6 px-0 text-base"><Link to="/me-ai">Explore MeAI <ArrowRight /></Link></Button>
      </div>
    </section>
  );
};

// Fades a section in as it scrolls into view; renders plainly when the visitor prefers reduced motion.
export const Reveal = ({ children }: { children: ReactNode }) => {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
};

export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-primary" style={{ scaleX }} />;
};

export const StickyWhatsApp = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi KONOV! I'd like to know more about MeAI and your AI & coding classes.")}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with KONOV on WhatsApp"
    className="fixed bottom-4 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-5 font-semibold text-white shadow-lg md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <MessageCircle className="h-5 w-5" aria-hidden="true" />
    WhatsApp
  </a>
);

export const CompanyCTA = () => (
  <section id="cta-section" className="company-section bg-card border-t border-border scroll-mt-24"><div className="company-container flex flex-col lg:flex-row lg:items-center justify-between gap-8"><div><p className="company-eyebrow text-accent">For families. For classrooms. For curious minds.</p><h2 className="company-heading">Let’s make room for discovery.</h2></div><div className="flex flex-wrap gap-3 shrink-0"><Button asChild size="lg" className="rounded-lg"><a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Open MeAI <ArrowRight /></a></Button><Button asChild size="lg" variant="outline" className="rounded-lg"><Link to="/contact">Talk to KONOV</Link></Button></div></div></section>
);