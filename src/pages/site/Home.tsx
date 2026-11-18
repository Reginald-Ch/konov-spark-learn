import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/SEO";
import { usePageTracking } from "@/hooks/useAnalytics";
import laptopMeai from "@/assets/site/laptop-meai.webp";
import classMentor from "@/assets/site/class-mentor.webp";
import laptopLap from "@/assets/site/laptop-lap.webp";
import learnersTogether from "@/assets/site/learners-together.webp";
import { SiteLayout } from "@/site/SiteLayout";
import { BOOK_A_CLASS, LINKS, SPRINT_LIST, WORKSHOP } from "@/site/links";
import {
  Button, Cursor, Facts, FnRows, Label, Note, Photo, Section, SectionHead, SmartLink, Steps, Strip, TextLink,
} from "@/site/ui";

const RunWindow = () => {
  const [running, setRunning] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // "Run again" shows a short running state, then brings the photo and output back.
  const run = () => {
    setRunning(true);
    timer.current = window.setTimeout(() => setRunning(false), 1000);
  };

  return (
    <figure className="k-code" style={{ margin: 0 }}>
      <div className="k-code__bar">
        <span>your_idea.py</span>
        <button type="button" className="k-code__run" onClick={run} disabled={running}>▶ Run again</button>
      </div>
      <pre aria-label='Example code: idea = konov.imagine("a robot that says Akwaaba"), idea.learn("greetings"), idea.bring_to_life()'>
        <i>1</i>idea = konov.<span className="t-fn">imagine</span>(<span className="t-str">"a robot that says Akwaaba"</span>){"\n"}
        <i>2</i>idea.<span className="t-fn">learn</span>(<span className="t-str">"greetings"</span>){"\n"}
        <i>3</i>idea.<span className="t-fn">bring_to_life</span>()
      </pre>
      <div className="k-code__out" aria-live="polite">
        <img src={laptopMeai} alt="A young learner building a chatbot in MeAI on a laptop" style={{ opacity: running ? 0 : 1 }} fetchPriority="high" />
        {running ? (
          <p className="k-code__running">› running…</p>
        ) : (
          <p className="k-code__chip"><span className="k-orange">›</span> <b>Akwaaba!</b> · building with MeAI</p>
        )}
      </div>
    </figure>
  );
};

const STATS = [
  { n: "47%", text: "use generative AI every week" },
  { n: "41%", text: "feel anxious about AI" },
  { n: "31%", text: "believe AI helps them come up with new ideas, down from 42% a year earlier" },
];

const SOURCE = "source: Gallup & Walton Family Foundation, Voices of Gen Z (2025, 2026). Survey of young people in the US, aged 13–28.";

const CLASSES = [
  { meta: "10 weeks · in person", name: "Weekend course", detail: "Ages 6–14 · GH₵1,200" },
  { meta: "1 week · online", name: "One-week online class", detail: "Ages 8–14 · GH₵500 · each vacation" },
  { meta: "5 days · August", name: "5-Day Tech Camp", detail: "In person & online · prices soon" },
];

const Home = () => {
  usePageTracking("/");
  return (
    <SiteLayout>
      <SEO
        title="Interactive Tools For Young Learners"
        description="KONOV is a Ghanaian edtech company. We build fun, creative tools like MeAI and FORGE, run coding and AI classes in Accra and online, and host the yearly AI Builder Sprint for ages 6–16."
        canonical="/"
        keywords={["KONOV", "edtech company Ghana", "coding and AI classes Accra", "AI Builder Sprint", "MeAI", "FORGE", "coding for kids Ghana"]}
      />

      {/* Hero */}
      <section className="k-paper" style={{ padding: "48px 0 var(--section)" }}>
        <div className="k-wrap">
          <p className="k-label"><span className="k-slash">//</span> KONOV · creativity and tech, together · ages 6–16 · Accra</p>
          <h1 className="k-display" style={{ maxWidth: "14ch" }}>Where young imaginations come to life with tech.<Cursor /></h1>
          <div className="k-grid" style={{ marginTop: 48 }}>
            <div className="k-c-1-5 k-self-end">
              <p className="k-lede">We're a Ghanaian edtech company. We find the walls in tech education and build fun, creative tools to break them, so young people go from using tech to creating with it.</p>
              <div className="k-actions" style={{ marginTop: 28, flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
                <Button to={BOOK_A_CLASS}>Book a class</Button>
                <TextLink to="/contact" arrow={false}>Talk to us</TextLink>
              </div>
            </div>
            <div className="k-c-6-13"><RunWindow /></div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <Section rule>
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label>the problem</Label>
            <h2 className="k-h2">Young people are using AI without a map.</h2>
            <p className="k-lede" style={{ marginTop: 20 }}>Many use it every week. Many feel anxious about it, few feel more creative with it, and school rarely makes tech exciting. That's the wall.</p>
          </div>
          <div className="k-c-7-13 k-self-center">
            <div className="k-stats">
              {STATS.map((s) => (
                <div key={s.n} className="k-stat"><b>{s.n}</b><p className="k-ink">{s.text}</p></div>
              ))}
            </div>
          </div>
        </div>
        <p className="k-note" style={{ fontSize: 11 }}>// {SOURCE}</p>
        <div style={{ borderTop: "2px solid var(--ink)", marginTop: 48 }} />
        <div className="k-grid" style={{ marginTop: 56 }}>
          <div className="k-c-1-7">
            <Label>what we do about it</Label>
            <h2 className="k-h3" style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>We find the walls in tech education, and build tools to break them.</h2>
          </div>
          <div className="k-c-8-13">
            <p className="k-lede">MeAI turns AI into a game kids can teach. FORGE lets teens build their own AI and battle it against others. Our classes and the Sprint turn using into creating, with guidance, together.</p>
          </div>
        </div>
      </Section>

      {/* Quick facts */}
      <section className="k-white k-rule-top k-rule-bottom">
        <div className="k-wrap k-cols k-cols--4" style={{ padding: "28px var(--gutter)" }}>
          {[
            ["who teaches", "KONOV facilitators"],
            ["so far", "100+ young creators taught"],
            ["safety", "A safe, supervised space"],
            ["ages", "6–16, no experience needed"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="k-mono k-red" style={{ fontSize: 11 }}>// {k}</p>
              <p className="k-ink" style={{ fontWeight: 600, marginTop: 6 }}>{v}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="k-paper k-rule-bottom">
        <nav className="k-wrap k-linkline" aria-label="What we offer">
          {[
            ["Weekend course", "/classes"],
            ["One-week online class", "/classes"],
            ["5-Day Tech Camp", "/classes"],
            ["Workshops for schools & groups", WORKSHOP],
            ["AI Builder Sprint", "/ai-builder-sprint"],
            ["MeAI ↗", LINKS.meai],
          ].map(([label, to], i) => (
            <span key={label}>{i > 0 && <span aria-hidden="true">/&nbsp;&nbsp;&nbsp;</span>}<SmartLink to={to}>{label}</SmartLink></span>
          ))}
        </nav>
      </section>
      <section className="k-paper k-rule-bottom">
        <div className="k-wrap k-strip" style={{ padding: "48px var(--gutter)" }}>
          <p className="k-h3" style={{ fontFamily: "var(--f-head)", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.03em" }}>
            KONOV means <span className="k-hl-word">Knowledge</span> and <span className="k-hl-word">Innovation</span>, together.
          </p>
          <TextLink to="/about">Our story</TextLink>
        </div>
      </section>

      {/* 01 Community */}
      <Section tone="white">
        <SectionHead num="01" label="community" title="Young creators, making real things together." aside="Small groups, real tools, and people who've got your back. This is where ideas get built." />
        <div className="k-grid" style={{ rowGap: 24 }}>
          <div className="k-c-1-9">
            <Photo src={classMentor} alt="A facilitator guiding two learners at their laptops during a hands-on workshop" ratio="16 / 8.6" position="60% 60%" caption="hands-on workshop, Accra" />
          </div>
          <div className="k-c-9-13" style={{ display: "grid", gap: 12 }}>
            <Photo src={learnersTogether} alt="Two learners working through code on a laptop while a facilitator points at the screen" ratio="16 / 8.4" position="50% 45%" />
            <Photo src={laptopLap} alt="A learner typing on a laptop resting on their lap during class" ratio="16 / 8.4" position="50% 55%" caption="class time, Accra" />
          </div>
        </div>
        <div style={{ borderTop: "2px solid var(--ink)", marginTop: 56, paddingTop: 28 }} className="k-grid">
          <div className="k-c-1-9">
            <div className="k-cols k-cols--3">
              {CLASSES.map((c) => (
                <div key={c.name}>
                  <p className="k-mono k-red" style={{ fontSize: 11 }}>{c.meta}</p>
                  <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 4 }}>{c.name}</h3>
                  <p className="k-small">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="k-c-9-13" style={{ justifySelf: "end" }}>
            <Button to="/classes" variant="ink">See all classes</Button>
          </div>
        </div>
        <Note>every class is grouped by age. No experience needed.</Note>
        <div style={{ marginTop: 56 }}>
          <Strip tag="bringing a group?" action={<TextLink to={WORKSHOP} arrow="⟶">Request a workshop</TextLink>}>
            We run hands-on coding and AI workshops for schools, clubs and teams.
          </Strip>
        </div>
      </Section>

      {/* 02 AI Builder Sprint */}
      <Section tone="dark">
        <Label num="02">the AI Builder Sprint</Label>
        <h2 className="k-big">AI Builder<br />Sprint<span className="k-dot">.</span></h2>
        <div className="k-grid" style={{ marginTop: 40 }}>
          <div className="k-c-1-6">
            <p className="k-lede">Once a year, kids and teens team up to take an idea from a sketch to a working project with code and AI, then show it to everyone. It's the heart of the KONOV community.</p>
          </div>
          <div className="k-c-7-13">
            <Facts items={[{ label: "When", value: "Every year" }, { label: "Who", value: "Kids & teens" }, { label: "Next", value: "2027" }]} />
          </div>
        </div>
        <div style={{ marginTop: 48 }}>
          <Steps items={[
            { fn: "team_up()", title: "", text: "Find your crew and pick a problem worth solving." },
            { fn: "build()", title: "", text: "Code it, train it, test it, with mentors beside you." },
            { fn: "demo()", title: "", text: "Show what you made to families, judges and friends." },
          ]} />
        </div>
        <div className="k-actions k-rule-top" style={{ marginTop: 48, paddingTop: 24 }}>
          <Button to={SPRINT_LIST} variant="light">Get notified for the next Sprint</Button>
          <TextLink to="/ai-builder-sprint#how-it-works" arrow={false}>How the Sprint works</TextLink>
        </div>
      </Section>

      {/* 03 How we learn */}
      <Section>
        <div className="k-grid">
          <div className="k-c-1-7">
            <Label num="03">how we learn</Label>
            <h2 className="k-h2">Less watching.<br />More wondering, trying and making.</h2>
          </div>
          <div className="k-c-7-13">
            <FnRows items={[
              { fn: "imagine()", title: "Play with an idea", text: "Every project starts with a question." },
              { fn: "build()", title: "Make something of your own", text: "Code it, train it, test it, show it." },
              { fn: "understand()", title: "See how it works", text: "Know what's happening inside." },
            ]} />
          </div>
        </div>
      </Section>

      {/* 04 Our tools */}
      <Section rule>
        <SectionHead num="04" label="our tools" title="Tools we build, for walls we've found." aside="Each tool starts with a problem in tech education. More are on the way." titleClass="k-h3" />
        <div className="k-cols k-cols--3">
          <div className="k-card k-cream">
            <p className="k-mono" style={{ fontSize: 11, color: "var(--stone)" }}>for kids 6–14 · in schools now · MeAI for homes soon</p>
            <h3 className="k-h3">MeAI</h3>
            <p><b className="k-ink">Wall:</b> AI feels abstract and scary. <b className="k-ink">Tool:</b> a game where kids learn code and AI by teaching Nia, in real Ghanaian places.</p>
            <div className="k-card__foot"><TextLink to={LINKS.meai}>Visit meaitech.com</TextLink></div>
          </div>
          <div className="k-card k-dark">
            <p className="k-mono" style={{ fontSize: 11, color: "var(--on-dark-muted)" }}>for teens · the AI Builder Sprint</p>
            <h3 className="k-h3">FORGE</h3>
            <p><b style={{ color: "var(--paper)" }}>Wall:</b> teens use AI but never build it. <b style={{ color: "var(--paper)" }}>Tool:</b> a platform to build your own AI, team up, race the clock and battle bots.</p>
            <div className="k-card__foot">
              <TextLink to="/forge" arrow="⟶">Explore FORGE</TextLink>
              <p className="k-caption" style={{ marginTop: 12 }}>// Sprint teams get access during the hackathon</p>
            </div>
          </div>
          <div className="k-card k-card--dashed">
            <p className="k-mono" style={{ fontSize: 11, color: "var(--stone)" }}>in the works</p>
            <h3 className="k-h3" style={{ color: "var(--stone)" }}>Next tool</h3>
            <p>We're always looking for the next wall to break. Follow along on LinkedIn.</p>
            <div className="k-card__foot"><TextLink to={LINKS.linkedin}>Follow KONOV</TextLink></div>
          </div>
        </div>
      </Section>

      {/* Quote */}
      <Section rule>
        <figure style={{ margin: 0, textAlign: "center", maxWidth: 900, marginInline: "auto" }}>
          <blockquote className="k-quote" style={{ margin: 0 }}>“It was so interesting, fun and easy to understand.”</blockquote>
          <figcaption className="k-caption" style={{ marginTop: 20 }}>Pearl, KONOV student</figcaption>
        </figure>
      </Section>

      {/* CTA */}
      <Section rule>
        <div className="k-grid">
          <div className="k-c-1-8">
            <h2 className="k-display" style={{ fontSize: "clamp(40px, 5.4vw, 72px)" }}>Got an idea?<br /><span className="k-red">Let's bring it to life.</span></h2>
          </div>
          <div className="k-c-8-13 k-self-center">
            <div className="k-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
              <Button to={BOOK_A_CLASS}>Book a class</Button>
              <TextLink to="/contact" arrow={false}>Get in touch</TextLink>
            </div>
          </div>
        </div>
      </Section>
      <section className="k-paper k-rule-top">
        <div className="k-wrap">
          <Strip tag="behind the scenes" action={<TextLink to={LINKS.linkedin}>Follow KONOV on LinkedIn</TextLink>}>
            What we're building, inside our workshops and the Sprint, and the team behind it.
          </Strip>
        </div>
      </section>
    </SiteLayout>
  );
};

export default Home;
