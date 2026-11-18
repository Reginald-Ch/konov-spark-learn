import { useState } from "react";
import { SEO } from "@/components/SEO";
import { usePageTracking } from "@/hooks/useAnalytics";
import sprintRoom from "@/assets/site/sprint-room.webp";
import forgeBuilderScreen from "@/assets/site/forge-builder-screen.webp";
import { SiteLayout } from "@/site/SiteLayout";
import { LINKS, SPRINT_LIST } from "@/site/links";
import { Field, SubmitRow, Thanks, useSiteForm } from "@/site/forms";
import { Button, Cursor, Facts, Faq, FnRows, Label, PendingLink, Photo, Section, SectionHead, Steps, Strip, TextLink, type QA } from "@/site/ui";

const FAQS: QA[] = [
  { q: "Who can take part?", a: "Kids and teenagers, on their own or with friends." },
  { q: "Who are the mentors?", a: "Developers, designers and students who volunteer their time." },
];

const JoinList = ({ role, setRole }: { role: string; setRole: (r: string) => void }) => {
  const { status, onSubmit, reset } = useSiteForm("Sprint list");
  if (status === "sent") {
    return <Thanks title="You're on the list." onAgain={reset}>We'll message you when registration for the next Sprint opens.</Thanks>;
  }
  return (
    <form className="k-form" onSubmit={(e) => onSubmit(e, { role: "I'm a", age: "Builder's age", email: "Email" })}>
      <Field label="I'm a…" full>
        <select className="k-input" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Young builder</option>
          <option>Parent</option>
          <option>Mentor</option>
        </select>
      </Field>
      <Field label="Your name"><input className="k-input" name="name" autoComplete="name" required maxLength={120} /></Field>
      <Field label="Phone number" hint="(a parent's, if under 16)"><input className="k-input" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
      <Field label="Email" optional><input className="k-input" name="email" type="email" autoComplete="email" maxLength={160} /></Field>
      <Field label="Builder's age" hint="(young builders only)">
        <input className="k-input" name="age" inputMode="numeric" placeholder="e.g. 13" maxLength={3} disabled={role === "Mentor"} />
      </Field>
      <SubmitRow
        status={status}
        label="Notify me"
        variant="orange"
        fine={<>We only use these details to contact you about the Sprint. We never share them. Partners and sponsors: email {LINKS.email}.</>}
      />
    </form>
  );
};

const Sprint = () => {
  usePageTracking("/ai-builder-sprint");
  const [role, setRole] = useState("Young builder");
  const mentorSignup = () => setRole("Mentor");

  return (
    <SiteLayout
      darkHeader
      cta={{ to: SPRINT_LIST, label: "Get notified" }}
      sticky={[{ to: SPRINT_LIST, label: "Get notified", variant: "orange" }, { to: "/contact", label: "Contact us" }]}
    >
      <SEO
        title="AI Builder Sprint – Yearly AI Hackathon For Kids & Teens"
        description="KONOV's yearly coding and AI hackathon for kids and teenagers in Ghana. Team up, build with code and AI on FORGE, and show it off on demo day. The first official Sprint is planned for 2027."
        canonical="/ai-builder-sprint"
        keywords={["AI hackathon for kids Ghana", "AI Builder Sprint", "coding hackathon for teens Accra", "FORGE", "kids AI competition Ghana"]}
      />

      {/* Hero */}
      <section className="k-dark" style={{ padding: "48px 0 var(--section)" }}>
        <div className="k-wrap">
          <p className="k-label"><span className="k-slash">//</span> KONOV's yearly coding &amp; AI hackathon · kids &amp; teenagers</p>
          <h1 className="k-mega">AI Builder<br />Sprint<Cursor /></h1>
          <div className="k-grid" style={{ marginTop: 40 }}>
            <div className="k-c-1-6">
              <p className="k-lede">Got an idea? Team up, build it with code and AI, and show it off on demo day. Once a year, it's the heart of the KONOV community.</p>
              <div className="k-actions" style={{ marginTop: 28 }}>
                <Button to="#join" variant="orange">Get notified for the next Sprint</Button>
                <TextLink to="#how-it-works" arrow={false}>How it works</TextLink>
              </div>
            </div>
            <div className="k-c-7-13 k-self-end">
              <Facts items={[{ label: "Next", value: "2027, the first official Sprint" }, { label: "Who", value: "Kids & teenagers" }, { label: "Finale", value: "Demo day" }]} />
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <Photo src={sprintRoom} alt="Rows of young builders coding at laptops while mentors look on" ratio="16 / 5.7" position="50% 62%" caption="building on FORGE, Accra" eager />
          </div>
        </div>
      </section>

      {/* Why join */}
      <Section tone="white" tight>
        <div className="k-grid">
          <div className="k-c-1-5"><Label>why join</Label><h2 className="k-h3">Learn, code and build AI, the fun way.</h2></div>
          <div className="k-c-5-13">
            <div className="k-cols k-cols--4">
              {[["Certificate", "Proof of what you built."], ["Mentorship", "Real builders help you get unstuck."], ["Demo day", "Show your project to everyone."], ["Community", "Meet builders like you."]].map(([t, d]) => (
                <div key={t} className="k-step k-step--red"><h3 className="k-h5">{t}</h3><p className="k-small" style={{ marginTop: 4 }}>{d}</p></div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Built on FORGE */}
      <Section tone="dark">
        <div className="k-grid">
          <div className="k-c-1-7 k-self-center">
            <Label>built on FORGE</Label>
            <h2 className="k-h2">Build your own AI. Then make it compete.</h2>
            <p className="k-lede" style={{ marginTop: 16 }}>Every Sprint team builds on FORGE, KONOV's own AI building platform: a builder, team channels, a timer and bot-vs-bot battles.</p>
            <div className="k-actions" style={{ marginTop: 28 }}>
              <Button to="/forge" variant="orange">Explore FORGE</Button>
              <PendingLink to={LINKS.forge} placeholder="[ADD FORGE URL]">Sign in · Sprint teams</PendingLink>
            </div>
          </div>
          <div className="k-c-8-13"><Photo src={forgeBuilderScreen} alt="A teen building a chatbot in FORGE Builder, with the bot chat open beside the code" ratio="4 / 2.8" caption="FORGE Builder in action" /></div>
        </div>
      </Section>

      {/* 01 How it works */}
      <Section id="how-it-works">
        <SectionHead num="01" label="how it works" title="From a sketch to something real." aside="Five steps, with KONOV mentors beside every team the whole way." />
        <Steps tone="soft" items={[
          { fn: "sign_up()", title: "Register", text: "On your own or with friends." },
          { fn: "team_up()", title: "Form a team", text: "Pick a problem worth solving." },
          { fn: "build()", title: "Build it on FORGE", text: "Build your AI, with mentors beside you." },
          { fn: "demo()", title: "Battle & demo day", text: "Bots compete, then teams present to judges and families." },
          { fn: "celebrate()", title: "Celebrate", text: "Certificates, winners and a closing ceremony." },
        ]} />
      </Section>

      {/* 02 What teams build */}
      <Section tone="white" rule>
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="02">what teams build</Label>
            <h2 className="k-h2">Ideas that solve real problems, close to home.</h2>
            <p className="k-lede" style={{ marginTop: 16 }}>Every Sprint has a challenge. Teams choose a problem from their own lives, schools or communities, and build something that helps.</p>
          </div>
          <div className="k-c-7-13">
            <FnRows items={[
              { fn: "chatbots", title: "Bots that talk and help", text: "Answer questions, give reminders, speak local languages." },
              { fn: "vision", title: "AI that sees and sorts", text: "Recognise plants, products, signs or waste." },
              { fn: "apps", title: "Apps for everyday life", text: "Tools for school, the market, the farm or the family." },
            ]} />
          </div>
        </div>
      </Section>

      {/* 03 Get involved */}
      <Section rule>
        <Label num="03">get involved</Label>
        <h2 className="k-h2" style={{ maxWidth: "16ch" }}>It takes a community to build a Sprint.</h2>
        <p style={{ marginTop: 16 }}>Mentors are checked by KONOV and work with teams only in supervised sessions.</p>
        <div className="k-cols k-cols--3 k-cols--ruled" style={{ borderTop: "2px solid var(--ink)", marginTop: 32, paddingTop: 24 }}>
          <div>
            <p className="k-fn">mentors</p>
            <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>Mentor a team</h3>
            <p className="k-small" style={{ marginTop: 8 }}>Developers, designers and students: give a few hours and help young builders get unstuck.</p>
            <p style={{ marginTop: 18 }}><a href="#join" className="k-link" onClick={mentorSignup}>Sign up to mentor</a></p>
          </div>
          {[
            ["partners", "Host or partner", "Schools, tech hubs and communities: bring the Sprint to your space or your learners."],
            ["sponsors", "Sponsor the Sprint", "Back the next generation of Ghanaian builders, with prizes, devices or support."],
          ].map(([tag, title, text]) => (
            <div key={tag}>
              <p className="k-fn">{tag}</p>
              <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>{title}</h3>
              <p className="k-small" style={{ marginTop: 8 }}>{text}</p>
              <div className="k-actions" style={{ marginTop: 18, gap: 16 }}>
                <TextLink to={`mailto:${LINKS.email}`} arrow={false}>{LINKS.email}</TextLink>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 Questions */}
      <Section tone="white" rule>
        <div className="k-grid">
          <div className="k-c-1-6"><Label num="04">questions</Label><h2 className="k-h2">Before you join.</h2></div>
          <div className="k-c-6-13"><Faq items={FAQS} /></div>
        </div>
      </Section>

      {/* 05 Join the list */}
      <Section tone="dark" id="join">
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="05">join the list</Label>
            <h2 className="k-h2">Join the list.</h2>
            <p className="k-lede" style={{ marginTop: 16 }}>Builders and parents: we'll message you when registration opens. Mentors: we'll be in touch about the next Sprint. Under 16? Ask a parent to fill this in with you.</p>
          </div>
          <div className="k-c-7-13"><JoinList role={role} setRole={setRole} /></div>
        </div>
      </Section>

      <Section tight>
        <Strip big tag="want to get ready?" action={
          <div className="k-actions" style={{ gap: 20 }}>
            <TextLink to="/classes" arrow={false}>See classes</TextLink>
            <TextLink to={LINKS.meai}>Meet MeAI</TextLink>
          </div>
        }>
          Many builders start with MeAI and our classes, then bring their skills to the Sprint.
        </Strip>
      </Section>
    </SiteLayout>
  );
};

export default Sprint;
