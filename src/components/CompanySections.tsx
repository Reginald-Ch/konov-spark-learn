import { Link } from "react-router-dom";
import { ArrowRight, Blocks, School, Lightbulb, Code2, Heart, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { companyFAQs } from "@/data/companyFAQs";
import mentor from "@/assets/gallery-meai-mentor.jpg.asset.json";

export const CompanyPurpose = () => (
  <section className="company-section bg-background">
    <div className="company-container grid gap-8 md:grid-cols-[1fr_1.3fr] md:gap-16">
      <div><p className="company-eyebrow text-primary">The company behind the curiosity</p><h2 className="company-heading">Technology should invite young minds in.</h2></div>
      <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
        <p>KONOV is an EdTech company building interactive tools that make technology fun to learn, explore, and create with. We design for young learners aged <strong className="text-foreground">6–16</strong>, and the families and classrooms around them.</p>
        <p>Our first product is <strong className="text-foreground">Me AI</strong>. Alongside our products, we run practical workshops and partner with schools to turn curiosity into hands-on learning.</p>
        <Button asChild variant="link" className="px-0 text-base"><Link to="/about">Meet KONOV <ArrowRight /></Link></Button>
      </div>
    </div>
  </section>
);

export const LearningApproach = () => (
  <section className="company-section bg-card border-y border-border">
    <div className="company-container">
      <p className="company-eyebrow text-accent">How we make learning matter</p>
      <h2 className="company-heading max-w-2xl">Less watching. More wondering, trying, and making.</h2>
      <div className="grid gap-8 md:grid-cols-3 mt-10">
        {[
          { icon: MousePointer2, title: "Play with an idea", text: "Interactive lessons and creative activities make unfamiliar technology something learners can explore.", color: "text-primary" },
          { icon: Code2, title: "Build something of your own", text: "Coding, chatbot building, and model training turn concepts into projects young learners can shape.", color: "text-accent" },
          { icon: Lightbulb, title: "Understand what happens", text: "Experimenting, asking questions, and trying again build understanding—not just the ability to use a tool.", color: "text-secondary" },
        ].map(({ icon: Icon, title, text, color }, index) => <div key={title} className="border-t-2 border-border pt-6"><div className="flex justify-between items-center mb-5"><Icon className={`h-8 w-8 ${color}`} /><span className="font-space text-muted-foreground">0{index + 1}</span></div><h3 className="text-2xl font-fredoka font-semibold mb-3">{title}</h3><p className="text-base text-muted-foreground leading-relaxed">{text}</p></div>)}
      </div>
    </div>
  </section>
);

export const WorkshopsAndSchools = () => (
  <section className="company-section bg-background" id="workshops">
    <div className="company-container">
      <div className="grid gap-8 md:grid-cols-2 items-end mb-10"><div><p className="company-eyebrow text-primary">Beyond the screen</p><h2 className="company-heading">Products spark curiosity.<br />People help it grow.</h2></div><p className="text-lg leading-relaxed text-muted-foreground">We bring our learning approach into real spaces through AI workshops and school partnerships, helping young people explore, code, and create together.</p></div>
      <img src={mentor.url} alt="A KONOV mentor supporting a learner during a hands-on technology session" loading="lazy" className="w-full aspect-[16/7] max-h-[440px] object-cover rounded-lg" />
      <div className="grid md:grid-cols-2 gap-8 md:gap-16 mt-10">
        <div><Blocks className="h-7 w-7 text-primary mb-4" /><h3 className="text-3xl font-fredoka font-semibold mb-3">Hands-on workshops</h3><p className="text-base text-muted-foreground leading-relaxed mb-5">Facilitator-led tech programs and AI workshops where learners experiment with ideas, build projects, and learn with others.</p><Button asChild variant="outline" className="rounded-lg"><Link to="/programs">Explore workshops & programs <ArrowRight /></Link></Button></div>
        <div><School className="h-7 w-7 text-accent mb-4" /><h3 className="text-3xl font-fredoka font-semibold mb-3">Partnerships with schools</h3><p className="text-base text-muted-foreground leading-relaxed mb-5">Me AI for classrooms, guided workshops, and school learning programs that bring creative technology education closer to learners.</p><Button asChild variant="outline" className="rounded-lg"><Link to="/for-schools">Partner with KONOV <ArrowRight /></Link></Button></div>
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
  <section className="company-section bg-background"><div className="company-container grid gap-8 md:grid-cols-[1fr_1.5fr]"><div><p className="company-eyebrow text-primary">A little clarity</p><h2 className="company-heading">Your questions,<br />answered.</h2></div><Accordion type="single" collapsible>{companyFAQs.map((faq, i) => <AccordionItem value={`company-${i}`} key={faq.question}><AccordionTrigger className="text-left text-lg font-fredoka">{faq.question}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></div></section>
);

export const CompanyCTA = () => (
  <section className="company-section bg-card border-t border-border"><div className="company-container flex flex-col md:flex-row md:items-center justify-between gap-8"><div><p className="company-eyebrow text-accent">For families. For classrooms. For curious minds.</p><h2 className="company-heading">Let’s make room for discovery.</h2></div><div className="flex flex-wrap gap-3 shrink-0"><Button asChild size="lg" className="rounded-lg"><a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Open Me AI <ArrowRight /></a></Button><Button asChild size="lg" variant="outline" className="rounded-lg"><Link to="/contact">Talk to KONOV</Link></Button></div></div></section>
);