import { useState, type KeyboardEvent } from "react";
import { SEO, createFAQSchema } from "@/components/SEO";
import { usePageTracking } from "@/hooks/useAnalytics";
import classMentor from "@/assets/site/class-mentor.webp";
import meaiTablet from "@/assets/site/meai-tablet.webp";
import { SiteLayout } from "@/site/SiteLayout";
import { BOOK_A_CLASS, LINKS } from "@/site/links";
import { Field, SubmitRow, Thanks, useSiteForm } from "@/site/forms";
import { Button, Cursor, Faq, Label, Note, Photo, Section, SectionHead, Steps, Strip, TextLink, type QA } from "@/site/ui";

const CLASSES = [
  {
    meta: "weekends · in person", name: "Weekend course",
    text: "Ten weeks of hands-on coding and AI in Accra. Learners build a new project step by step and finish with something they made.",
    spec: [["For", "Ages 6–14"], ["Length", "10 weeks"], ["When", "Weekends"], ["Fee", "GH₵1,200"]],
    cta: { label: "Book the weekend course", to: "#book", value: "weekend" },
  },
  {
    meta: "school vacations · online", name: "One-week online class",
    text: "A focused week of coding and AI from home, during school vacations. Dates are announced each vacation.",
    spec: [["For", "Ages 8–14"], ["Length", "1 week"], ["When", "Next one: announced soon"], ["Fee", "GH₵500"]],
    cta: { label: "Get notified", to: "#book", value: "online" },
  },
  {
    meta: "August · in person & online", name: "5-Day Tech Camp",
    text: "Five days of making: coding, AI and projects that end with a show-and-tell for families. In person in Accra, or online.",
    spec: [["For", "Ages 6–16"], ["Length", "5 days"], ["When", "August"], ["Fee", "Prices coming soon"]],
    cta: { label: "Get notified", to: "#book", value: "camp" },
  },
];

// Add the 10–12 and 13–14 groups here once the team has written them; each becomes a tab.
const AGES = [
  {
    id: "6-9", tab: "Ages 6–9", title: "First steps into code and AI",
    text: "Playful, visual coding with blocks, simple stories and chatbots, and teaching a computer to recognise things.",
    outcomes: [
      "Put instructions in the right order to make something happen",
      "Find and fix a simple mistake in their code",
      "Explain, in their own words, how a computer learns from examples",
    ],
  },
];

const PROJECTS = [
  { file: "sickle_cell_aid.py", name: "Sickle Cell Aid", learns: "sickle cell facts", does: "answer", title: "Sickle Cell Aid chatbot", text: "A chatbot that answers questions about sickle cell." },
  { file: "science_teacher.py", name: "Science Teacher", learns: "science lessons", does: "explain", title: "Science teacher chatbot", text: "A chatbot that explains science topics, step by step." },
  { file: "homework_helper.py", name: "Homework Helper", learns: "school subjects", does: "help", title: "Homework helper", text: "A chatbot that helps with homework questions." },
];

const FAQS: QA[] = [
  { q: "Does my child need any experience?", a: "No. Classes are beginner-friendly and grouped by age. Children who already code get bigger challenges." },
  { q: "What does it cost, and how do I pay?", a: "Weekend course: GH₵1,200 for 10 weeks, in person. One-week online class: GH₵500. 5-Day Tech Camp in August: prices coming soon." },
  { q: "Who teaches the classes?", a: "KONOV facilitators, in small groups." },
  { q: "Will I see how my child is doing?", a: "Yes. You'll see what your child built and what they learned." },
  { q: "Where are the classes?", a: "In Accra. We'll share the venue when we confirm your spot." },
];

const ByAge = () => {
  const [active, setActive] = useState(0);
  const group = AGES[active];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (active + (e.key === "ArrowRight" ? 1 : AGES.length - 1)) % AGES.length;
    setActive(next);
    document.getElementById(`age-tab-${AGES[next].id}`)?.focus();
  };
  return (
    <>
      <div className="k-tabs" role="tablist" aria-label="Age groups" onKeyDown={onKey}>
        {AGES.map((g, i) => (
          <button key={g.id} id={`age-tab-${g.id}`} role="tab" aria-selected={i === active} aria-controls="age-panel" tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)}>
            {g.tab}
          </button>
        ))}
      </div>
      <div id="age-panel" role="tabpanel" aria-labelledby={`age-tab-${group.id}`} className="k-grid">
        <div className="k-c-1-6">
          <p className="k-mono k-red" style={{ fontSize: 12 }}>ages {group.id.replace("-", "–")}</p>
          <h3 className="k-h3" style={{ marginTop: 6 }}>{group.title}</h3>
          <p className="k-lede" style={{ marginTop: 14 }}>{group.text}</p>
        </div>
        <div className="k-c-7-13">
          <p className="k-upper" style={{ marginBottom: 6 }}>By the end of a term, they can</p>
          <ul className="k-arrows">{group.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      </div>
    </>
  );
};

const BookingForm = ({ preset }: { preset: string }) => {
  const { status, onSubmit, reset } = useSiteForm("Class booking");
  if (status === "sent") {
    return <Thanks title="Thank you. Your spot request is in." onAgain={reset}>We'll call or email you to confirm the class, time and fee.</Thanks>;
  }
  return (
    <form className="k-form" onSubmit={(e) => onSubmit(e, { class: "Class", children: "Children", ages: "Ages", heard: "Heard about us", notes: "Notes", email: "Email" })}>
      <Field label="Your name" full><input className="k-input" name="name" autoComplete="name" required maxLength={120} /></Field>
      <Field label="Phone number"><input className="k-input" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
      <Field label="Email" optional><input className="k-input" name="email" type="email" autoComplete="email" maxLength={160} /></Field>
      <Field label="How many children?">
        <select className="k-input" name="children" defaultValue="1">{["1", "2", "3", "4+"].map((n) => <option key={n}>{n}</option>)}</select>
      </Field>
      <Field label="Their ages"><input className="k-input" name="ages" placeholder="e.g. 7 and 11" required maxLength={60} /></Field>
      <Field label="Class">
        <select className="k-input" name="class" key={preset} defaultValue={preset}>
          <option value="weekend">Weekend course (in person, 6–14)</option>
          <option value="online">One-week online class (8–14)</option>
          <option value="camp">5-Day Tech Camp</option>
          <option value="unsure">Not sure yet</option>
        </select>
      </Field>
      <Field label="How did you hear about us?">
        <select className="k-input" name="heard" defaultValue="A friend or family">
          {["A friend or family", "Instagram", "Facebook", "LinkedIn", "TikTok", "Google", "School", "Other"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Anything we should know?" optional full><textarea className="k-input" name="notes" maxLength={1000} /></Field>
      <SubmitRow status={status} label="Send booking request" fine="We only use these details to contact you about classes. We never share them." />
    </form>
  );
};

const WorkshopForm = () => {
  const { status, onSubmit, reset } = useSiteForm("Workshop request");
  if (status === "sent") {
    return <Thanks title="Thank you. We'll be in touch." onAgain={reset}>We'll call or email you to plan the workshop with you.</Thanks>;
  }
  return (
    <form className="k-form" onSubmit={(e) => onSubmit(e, { org: "School or group", learners: "Learners", ages: "Ages", notes: "Notes", email: "Email" })}>
      <Field label="School, club or team"><input className="k-input" name="org" required maxLength={160} /></Field>
      <Field label="Your name"><input className="k-input" name="name" autoComplete="name" required maxLength={120} /></Field>
      <Field label="Phone number"><input className="k-input" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
      <Field label="Email" optional><input className="k-input" name="email" type="email" autoComplete="email" maxLength={160} /></Field>
      <Field label="How many learners?"><input className="k-input" name="learners" inputMode="numeric" maxLength={20} /></Field>
      <Field label="Their ages"><input className="k-input" name="ages" placeholder="e.g. 10–13" maxLength={60} /></Field>
      <Field label="What would you like?" optional full><textarea className="k-input" name="notes" maxLength={1000} /></Field>
      <SubmitRow status={status} label="Request a workshop" fine="We only use these details to contact you about the workshop. We never share them." />
    </form>
  );
};

const Classes = () => {
  usePageTracking("/classes");
  const [preset, setPreset] = useState("weekend");
  const [workshopOpen, setWorkshopOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#workshop");

  return (
    <SiteLayout sticky={[{ to: BOOK_A_CLASS, label: "Book a class" }, { to: LINKS.phone, label: "Call us" }]}>
      <SEO
        title="AI & Coding Classes For Kids In Accra"
        description="Small-group coding and AI classes for ages 6–14: a 10-week weekend course in Accra (GH₵1,200), one-week online classes (GH₵500) and a 5-Day Tech Camp. No experience needed."
        canonical="/classes"
        keywords={["coding classes for kids Accra", "AI classes for kids Ghana", "weekend coding course Accra", "online coding class for kids", "tech camp Accra"]}
        jsonLd={createFAQSchema(FAQS.filter((f) => typeof f.a === "string" && !f.a.includes("[")).map((f) => ({ question: f.q, answer: f.a as string })))}
      />

      {/* Hero */}
      <section className="k-paper" style={{ padding: "48px 0 56px" }}>
        <div className="k-wrap k-grid">
          <div className="k-c-1-8">
            <p className="k-label"><span className="k-slash">//</span> classes · ages 6–14 · Accra &amp; online</p>
            <h1 className="k-display" style={{ fontSize: "clamp(44px, 6.6vw, 84px)" }}>Classes where young creators build real things<Cursor /></h1>
          </div>
          <div className="k-c-8-13 k-self-end">
            <p className="k-lede">Small groups, hands-on coding and AI, and something they built to show you every time. No experience needed.</p>
            <div className="k-actions" style={{ marginTop: 24 }}>
              <Button to="#book">Book a class</Button>
              <TextLink to="/contact" arrow={false}>Ask a question</TextLink>
            </div>
            <p className="k-note">// join 100+ young creators who have learned with us</p>
          </div>
        </div>
      </section>
      <figure style={{ margin: 0 }}>
        <img src={classMentor} alt="A facilitator guiding two learners at their laptops during a hands-on class" style={{ width: "100%", height: "clamp(240px, 40vw, 520px)", objectFit: "cover", objectPosition: "70% 62%", display: "block" }} fetchPriority="high" />
        <figcaption className="k-wrap"><p className="k-caption"><span className="k-slash">//</span> hands-on class, Accra</p></figcaption>
      </figure>

      {/* 01 Choose a class */}
      <Section>
        <Label num="01">choose a class</Label>
        <h2 className="k-h2">Three ways to start building.</h2>
        <Note>grouped by age · no experience needed</Note>
        <div className="k-cols k-cols--3 k-cols--ruled" style={{ borderTop: "2px solid var(--ink)", marginTop: 32, paddingTop: 28 }}>
          {CLASSES.map((c) => (
            <article key={c.name}>
              <p className="k-mono k-red" style={{ fontSize: 11 }}>{c.meta}</p>
              <h3 className="k-h3" style={{ fontSize: 26, marginTop: 6 }}>{c.name}</h3>
              <p style={{ marginTop: 10 }}>{c.text}</p>
              <dl className="k-spec">
                {c.spec.map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt className="k-upper">{k}</dt>
                    <dd style={k === "Fee" ? { fontWeight: 700 } : undefined}>{v}</dd>
                  </div>
                ))}
              </dl>
              <a href="#book" className="k-link" onClick={() => setPreset(c.cta.value)}>{c.cta.label}</a>
            </article>
          ))}
        </div>
      </Section>

      {/* 02 By age */}
      <Section tone="white" rule>
        <SectionHead num="02" label="by age" title="What your child will make." aside="Every class is grouped by age, so a 7-year-old and a 13-year-old each get the right challenge." />
        <ByAge />
      </Section>

      {/* 03 Inside a class */}
      <Section rule>
        <SectionHead num="03" label="inside a class" title={<>Imagine it. Build it.<br />Understand it.</>} aside="Every session follows the same rhythm, so children always know what's next, and always finish with something to show." />
        <Steps items={[
          { fn: "imagine()", title: "Start with an idea", text: "A warm-up puzzle, then one new idea, explained simply with real examples." },
          { fn: "build()", title: "Make it your own", text: "Code it, train it, test it, fix it, then show the group what you made." },
          { fn: "understand()", title: "Know how it works", text: "Talk through what happened inside, so the learning sticks." },
        ]} />
      </Section>

      {/* What they work with */}
      <Section rule>
        <div className="k-grid">
          <div className="k-c-1-7">
            <Photo src={meaiTablet} alt="A learner naming her own chatbot in MeAI on a tablet" ratio="4 / 2.85" position="60% 50%" caption="building with MeAI in class" />
          </div>
          <div className="k-c-8-13 k-self-center">
            <p className="k-mono" style={{ fontSize: 12, color: "var(--stone)" }}>// what they work with</p>
            <p className="k-h3" style={{ fontFamily: "var(--f-head)", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em", fontSize: "clamp(22px, 2.2vw, 28px)", marginTop: 12 }}>
              Real coding and AI tools, including MeAI, our own game for learning code and AI, shaped to fit how young people think.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Who teaches */}
      <Section tone="white" rule>
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="04">who teaches</Label>
            <h2 className="k-h2">In good hands.</h2>
            <p style={{ marginTop: 16 }}>Every class is led by KONOV facilitators who know the tools and know how to work with young people.</p>
          </div>
          <div className="k-c-6-13">
            <div className="k-cols k-cols--2" style={{ rowGap: 32 }}>
              {[
                ["KONOV facilitators", "Trained by our team."],
                ["Small groups", "So every child gets help when they're stuck."],
                ["Updates for parents", "See what your child built and what they learned."],
                ["A safe space", "Every class is supervised. Photos of children only with a parent's permission."],
              ].map(([t, d]) => (
                <div key={t} className="k-step"><h3 className="k-h5">{t}</h3><p className="k-small" style={{ marginTop: 6 }}>{d}</p></div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 05 Made in class */}
      <Section rule>
        <SectionHead num="05" label="made in class" title="Real things, built by real kids." aside={<TextLink to="/ai-builder-sprint">See more at the AI Builder Sprint</TextLink>} />
        <div className="k-cols k-cols--3">
          {PROJECTS.map((p) => (
            <article key={p.file}>
              <div className="k-code" style={{ minHeight: 168 }}>
                <div className="k-code__bar"><span>{p.file}</span></div>
                <pre aria-hidden="true">
                  <i>1</i>bot = konov.<span className="t-fn">chatbot</span>(<span className="t-str">"{p.name}"</span>){"\n"}
                  <i>2</i>bot.<span className="t-fn">learn</span>(<span className="t-str">"{p.learns}"</span>){"\n"}
                  <i>3</i>bot.<span className="t-fn">{p.does}</span>()
                </pre>
              </div>
              <h3 className="k-h5" style={{ marginTop: 14 }}>{p.title}</h3>
              <p className="k-small" style={{ marginTop: 4 }}>{p.text}</p>
            </article>
          ))}
        </div>
        <Note>built by learners in KONOV classes</Note>
      </Section>

      {/* 06 FAQ */}
      <Section rule>
        <div className="k-grid">
          <div className="k-c-1-6"><Label num="06">parents ask</Label><h2 className="k-h2">Good questions.</h2></div>
          <div className="k-c-6-13"><Faq items={FAQS} /></div>
        </div>
      </Section>

      {/* 07 Book */}
      <Section tone="dark" id="book">
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="07">book a class</Label>
            <h2 className="k-h2">Save a spot.</h2>
            <p className="k-lede" style={{ marginTop: 16 }}>Tell us a little about your child. We'll call or email you to confirm the class, time and fee.</p>
            <p style={{ marginTop: 20 }}>Rather just ask? <TextLink to={LINKS.phone} arrow={false}>Call {LINKS.phoneDisplay}</TextLink></p>
          </div>
          <div className="k-c-7-13"><BookingForm preset={preset} /></div>
        </div>
      </Section>

      {/* Groups + Sprint */}
      <Section tight id="workshop">
        <Strip big tag="bringing a group?" action={
          <button type="button" className="k-btn k-btn--ink" aria-expanded={workshopOpen} aria-controls="workshop-form" onClick={() => setWorkshopOpen((o) => !o)}>
            {workshopOpen ? "Close" : "Request a workshop"} <span className="k-arrow" aria-hidden="true">{workshopOpen ? "×" : "→"}</span>
          </button>
        }>
          We run hands-on coding and AI workshops for schools, clubs and teams.
        </Strip>
        {workshopOpen && <div id="workshop-form" style={{ padding: "24px 0 40px", maxWidth: 760 }}><WorkshopForm /></div>}
        <Strip tag="ready for a bigger challenge?" action={<TextLink to="/ai-builder-sprint">See the Sprint</TextLink>}>
          Take a project all the way at the AI Builder Sprint.
        </Strip>
      </Section>
    </SiteLayout>
  );
};

export default Classes;
