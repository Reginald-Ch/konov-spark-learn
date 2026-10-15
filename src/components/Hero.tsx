import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import group from "@/assets/gallery-meai-group.jpg.asset.json";

export const Hero = () => (
  <section className="relative isolate overflow-hidden bg-foreground text-background">
    <img src={group.url} alt="Young KONOV learners celebrating their technology projects together" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
    <div className="absolute inset-0 -z-10 bg-foreground/65" />
    <div className="company-container company-hero-content py-12 md:py-20 flex flex-col justify-center">
      <p className="company-eyebrow">Interactive tools. Curious minds. Ages 6–16.</p>
      <h1 className="font-fredoka font-semibold text-6xl md:text-8xl leading-none mb-5">KONOV</h1>
      <p className="company-hero-tagline font-fredoka text-3xl md:text-5xl leading-tight max-w-3xl mb-6">We make technology<br className="hidden sm:block" /> fun to learn and create with.</p>
      <p className="text-base md:text-lg leading-relaxed max-w-xl mb-8">An EdTech company building interactive learning tools for young learners. Meet Me AI, our first product for families and classrooms.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="rounded-lg"><a href="#me-ai">Discover Me AI <ArrowRight /></a></Button>
        <Button asChild size="lg" variant="outline" className="rounded-lg border-background/70 text-background hover:bg-background hover:text-foreground"><Link to="/for-schools">For schools <ArrowRight /></Link></Button>
      </div>
    </div>
    <div className="border-t border-background/30"><div className="company-container py-5 flex flex-wrap gap-x-8 gap-y-2 text-sm"><span>Built for ages 6–16</span><span>For families & classrooms</span><span>Products + hands-on learning</span></div></div>
  </section>
);
