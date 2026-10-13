import { Link } from "react-router-dom";
import { ArrowRight, Heart, Lightbulb, Blocks } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { MeAIIntro } from "@/components/MeAIIntro";
import { LearningApproach, WorkshopsAndSchools, CompanyCTA } from "@/components/CompanySections";
import group from "@/assets/gallery-meai-group.jpg.asset.json";

const About = () => (
  <div className="company-page min-h-screen font-space">
    <SEO title="About KONOV | The Company Behind Me AI" description="Meet KONOV, an EdTech company making technology fun for ages 6–16 through interactive tools, Me AI, hands-on workshops, and school partnerships." canonical="/about" keywords={["about KONOV", "EdTech company Ghana", "interactive learning tools", "Me AI creator"]} jsonLd={createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "About KONOV", url: "/about" }])} />
    <Navbar />
    <main>
      <section className="company-section bg-background !pb-8">
        <div className="company-container"><p className="company-eyebrow text-primary">About the company</p><h1 className="font-fredoka text-5xl md:text-7xl font-semibold leading-tight max-w-4xl">KONOV.<br />Built around <span className="text-primary">young curiosity.</span></h1><p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mt-6">We are an EdTech company that builds interactive tools to make technology education fun for young learners aged 6–16.</p><img src={group.url} alt="KONOV learners together at the end of a hands-on learning experience" fetchPriority="high" className="mt-10 w-full aspect-[16/7] max-h-[420px] object-cover rounded-lg" /></div>
      </section>
      <section className="company-section bg-background"><div className="company-container grid gap-8 md:grid-cols-[1fr_1.4fr]"><div><p className="company-eyebrow text-accent">Our purpose</p><h2 className="company-heading">From curiosity<br />to creation.</h2></div><div className="space-y-5 text-lg leading-relaxed text-muted-foreground"><p>Young people grow up surrounded by technology. We want them to have the opportunity to understand it, ask questions about it, and create with it—not only consume it.</p><p>Our response is to build tools that invite participation. Experiences where learners can try an idea, see what happens, and make something that is their own.</p><p><strong className="text-foreground">Me AI is our first product</strong>, bringing that approach to AI learning for families and classrooms. Our workshops and school partnerships connect the tools with guided, hands-on experiences.</p><p>AI is where our first product begins. Making technology fun to learn is the bigger mission.</p></div></div></section>
      <section className="company-section bg-accent text-accent-foreground"><div className="company-container grid gap-10 md:grid-cols-2"><div><p className="company-eyebrow">Our mission</p><h2 className="text-3xl md:text-4xl font-fredoka leading-tight">Make technology education fun, interactive, and meaningful for young learners.</h2></div><div><p className="company-eyebrow">The future we want</p><p className="text-xl md:text-2xl leading-relaxed">Young people with the curiosity, understanding, and confidence to become creators of technology—not just users.</p></div></div></section>
      <MeAIIntro />
      <LearningApproach />
      <section className="company-section bg-background"><div className="company-container"><p className="company-eyebrow text-primary">What guides us</p><h2 className="company-heading mb-10">Built for learners.<br />Connected to their world.</h2><div className="grid gap-8 md:grid-cols-3">{[{ icon: Heart, title: "Learners come first", text: "We design for ages 6–16, with activities that respect different starting points and give learners room to grow." }, { icon: Lightbulb, title: "Curiosity drives creation", text: "We make space for questions, experimentation, and original ideas. A finished project matters, and so does understanding how it works." }, { icon: Blocks, title: "Learning is shared", text: "Families, educators, and schools are part of the journey. Our products and workshops connect independent discovery with human guidance." }].map(({icon: Icon, title, text}) => <div key={title} className="border-t border-border pt-6"><Icon className="text-accent w-7 h-7 mb-5" /><h3 className="text-2xl font-fredoka font-semibold mb-3">{title}</h3><p className="text-base text-muted-foreground leading-relaxed">{text}</p></div>)}</div></div></section>
      <WorkshopsAndSchools />
      <section className="company-container pb-12"><Button asChild variant="link" className="px-0 text-base"><Link to="/contact">Share your ideas with KONOV <ArrowRight /></Link></Button></section>
      <CompanyCTA />
    </main>
    <Footer />
  </div>
);
export default About;
