import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import builderSrc from "@/assets/gallery-meai-builder.jpg";
const builder = { url: builderSrc };

export const MeAIIntro = () => (
  <section id="me-ai" className="company-section bg-card scroll-mt-24 border-b border-border">
    <div className="company-container">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6"><p className="company-eyebrow text-primary !mb-0">Our first product</p><span className="text-sm text-muted-foreground">By KONOV · Ages 6–14</span></div>
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div><h2 className="text-6xl md:text-7xl font-fredoka font-semibold text-primary mb-5">MeAI</h2><p className="text-3xl font-fredoka leading-tight mb-5">Big ideas start with<br />a little exploration.</p><p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">Our interactive AI learning and creation platform gives young learners a place to experiment, understand, and build. Made for learning at home and in the classroom.</p>
          <ul className="space-y-3 text-base mb-8">{["Explore AI through interactive lessons", "Build chatbots with your own ideas", "Train simple machine learning models", "Create projects, not just watch lessons"].map(item => <li key={item} className="flex items-start gap-3"><Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />{item}</li>)}</ul>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-lg"><a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Open MeAI <ExternalLink /></a></Button><Button asChild size="lg" variant="link" className="px-2"><Link to="/me-ai">Explore the product <ArrowRight /></Link></Button></div>
        </div>
        <figure><img src={builder.url} alt="A young learner building her own AI project using MeAI" loading="lazy" className="w-full aspect-[4/3] [@media(max-height:540px)]:max-h-[70vh] object-cover rounded-lg" /><figcaption className="text-sm text-muted-foreground mt-4 border-l-2 border-secondary pl-4">Curiosity in action: building with MeAI.</figcaption></figure>
      </div>
    </div>
  </section>
);
