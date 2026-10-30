import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import groupSrc from "@/assets/gallery-meai-group.jpg";
const group = { url: groupSrc };

const CODE_LINES = ['robot = MeAI.create("Kofi")', 'robot.learn("greetings")', 'robot.say("Akwaaba!")'];
const CODE_OUTPUT = "Kofi › Akwaaba!";
const TOTAL_CHARS = CODE_LINES.reduce((n, line) => n + line.length, 0);

// Colours strings, the MeAI name and method calls; partial lines (mid-typing) are fine.
const highlight = (text: string) =>
  text.split(/("[^"]*"?|\bMeAI\b|\.\w+(?=\())/g).map((part, i) => {
    if (part.startsWith('"')) return <span key={i} className="text-secondary">{part}</span>;
    if (part === "MeAI") return <span key={i} className="text-[hsl(358_98%_68%)]">{part}</span>;
    if (part.startsWith(".")) return <span key={i} className="text-[hsl(140_55%_62%)]">{part}</span>;
    return part;
  });

const HeroCodeWindow = () => {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? TOTAL_CHARS : 0);

  useEffect(() => {
    if (reduce) {
      setTyped(TOTAL_CHARS);
      return;
    }
    // Type one character at a time, hold the finished program, then start over.
    const id = window.setTimeout(() => setTyped((t) => (t >= TOTAL_CHARS ? 0 : t + 1)), typed >= TOTAL_CHARS ? 4000 : typed === 0 ? 600 : 55);
    return () => window.clearTimeout(id);
  }, [typed, reduce]);

  let remaining = typed;
  const visible = CODE_LINES.map((line) => {
    const shown = line.slice(0, Math.max(0, remaining));
    remaining -= line.length;
    return shown;
  });
  const done = typed >= TOTAL_CHARS;

  return (
    <figure className="w-full max-w-md rounded-xl border border-background/20 bg-foreground/85 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-background/15 px-4 py-3" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="ml-3 font-mono text-xs text-background/60">mission_01.py · MeAI</span>
      </div>
      <figcaption className="sr-only">Example MeAI code: {CODE_LINES.join("; ")}. Output: {CODE_OUTPUT}</figcaption>
      <pre aria-hidden="true" className="min-h-[148px] whitespace-pre-wrap px-5 py-4 font-mono text-sm leading-7 text-background">
        {visible.map((line, i) => (
          <div key={i}>
            <span className="mr-4 select-none text-background/35">{i + 1}</span>
            {highlight(line)}
            {!done && line.length > 0 && line.length < CODE_LINES[i].length && <span className="hero-cursor" />}
          </div>
        ))}
        <div className={`mt-2 rounded-md bg-background/10 px-3 py-1 transition-opacity duration-300 ${done ? "opacity-100" : "opacity-0"}`}>
          <span className="text-background/60">›</span> {CODE_OUTPUT}
        </div>
      </pre>
    </figure>
  );
};

export const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const frame = useRef(0);

  // Moves the glow in the dot grid towards the pointer. CSS variables avoid a re-render per move.
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = sectionRef.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    const { left, top } = el.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    });
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <section ref={sectionRef} onPointerMove={onPointerMove} className="hero-grid relative isolate overflow-hidden bg-foreground text-background">
      <img src={group.url} alt="Young KONOV learners celebrating their technology projects together" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-foreground/65" />
      <div className="hero-grid-dots absolute inset-0 -z-10" aria-hidden="true" />
      <div className="company-container company-hero-content py-12 md:py-20 grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col justify-center">
          <p className="company-eyebrow">Interactive tools. Curious minds. Ages 6–16.</p>
          <h1 className="font-fredoka font-semibold text-6xl md:text-8xl leading-none mb-5">KONOV</h1>
          <p className="company-hero-tagline font-fredoka text-3xl md:text-5xl leading-tight max-w-3xl mb-6">We make technology<br className="hidden sm:block" /> fun to learn and create with.<span className="hero-cursor hero-cursor-lg" aria-hidden="true" /></p>
          <p className="hero-lede text-base md:text-lg leading-relaxed max-w-xl mb-8">An EdTech company building interactive learning tools for young learners. Meet MeAI, our first product, and join our AI &amp; coding classes in Accra.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-lg"><Link to="/me-ai">Discover MeAI <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-lg border-background/70 text-background hover:bg-background hover:text-foreground"><Link to="/for-schools">For schools <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="hidden md:flex justify-center lg:justify-end"><HeroCodeWindow /></div>
      </div>
      <div className="border-t border-background/30"><div className="company-container py-5 flex flex-wrap gap-x-8 gap-y-2 text-sm"><span>Built for ages 6–16</span><span>For families & classrooms</span><span>Products + hands-on learning</span></div></div>
    </section>
  );
};
