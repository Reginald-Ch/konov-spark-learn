import { SEO } from "@/components/SEO";
import { usePageTracking } from "@/hooks/useAnalytics";
import founder from "@/assets/site/founder.webp";
import { SiteLayout } from "@/site/SiteLayout";
import { LINKS, WORKSHOP } from "@/site/links";
import { Cursor, Label, Photo, Section, SectionHead, SmartLink, Strip, TextLink } from "@/site/ui";

// The letters of KONOV, picked out of "Knowledge" and "Innovation".
const NameWord = ({ parts }: { parts: [string, boolean][] }) => (
  <span style={{ display: "block" }}>
    {parts.map(([text, hit], i) => <span key={i} style={{ color: hit ? "var(--orange)" : "#6f685f" }}>{text}</span>)}
  </span>
);

const JOURNEY = [
  ["2024", "KONOV is founded", "In Accra, Ghana."],
  ["2024", "First classes in Accra", "Weekend coding and AI classes begin. 200+ students enrolled so far."],
  ["", "MeAI is live in schools", <>MeAI for homes is coming soon. <SmartLink to={LINKS.meai} className="k-ink">meaitech.com ↗</SmartLink></>],
  ["2026", "First AI Builder Sprint", "A pilot on FORGE, to find the best format and age group."],
  ["2027", "First official Sprint", "For kids and teenagers."],
] as const;

const WALLS = [
  ["wall_01", "Using, not creating.", "Young people use tech every day but rarely make anything with it. We believe every young person is a creator."],
  ["wall_02", "AI feels scary, not creative.", "Complex tech can fit young minds. Not watered down, rebuilt, so a 7-year-old can play with it and a 15-year-old can build with it."],
  ["wall_03", "Tech lessons feel boring.", "We learn best by making, together: less watching, more trying, side by side with friends and mentors."],
];

const WHAT_WE_DO = [
  ["tool", "MeAI", LINKS.meai, "A coding and AI game for kids aged 6–14, set in real Ghanaian places."],
  ["tool", "FORGE", "/forge", "Our platform for teens to build their own AI, team up and battle bots. Sprint teams get access during the hackathon."],
  ["next", "More tools", "", "In the works. We share what we're building on LinkedIn."],
  ["learning", "Classes", "/classes", "A 10-week weekend course in Accra, one-week online classes, a 5-Day Tech Camp, and workshops for schools and groups."],
  ["community", "AI Builder Sprint", "/ai-builder-sprint", "Our yearly coding and AI hackathon for kids and teenagers, with mentors, a certificate and demo day."],
];

const About = () => {
  usePageTracking("/about");
  return (
    <SiteLayout>
      <SEO
        title="About KONOV – Knowledge And Innovation, Together"
        description="KONOV is a Ghanaian edtech company. We find the walls in tech education and build interactive tools to break them, so young people aged 6–16 go from using tech to creating with it."
        canonical="/about"
        keywords={["about KONOV", "edtech company Ghana", "KONOV Technologies", "MeAI", "FORGE", "AI Builder Sprint"]}
      />

      {/* Hero */}
      <section className="k-paper" style={{ padding: "48px 0 var(--section)" }}>
        <div className="k-wrap">
          <p className="k-label"><span className="k-slash">//</span> about KONOV · Accra, Ghana</p>
          <h1 className="k-display" style={{ fontSize: "clamp(42px, 6.4vw, 84px)", maxWidth: "17ch" }}>Young people aren't just users of technology. They're creators<Cursor /></h1>
          <div className="k-grid" style={{ marginTop: 40 }}>
            <div className="k-c-1-7"><p className="k-lede">KONOV is a Ghanaian edtech company. We find the walls in tech education and build interactive tools to break them, taking complex, emerging tech like AI and shaping it to fit how young people aged 6–16 see the world.</p></div>
            <div className="k-c-8-13"><p className="k-lede">We started with MeAI, then built FORGE, and more tools are on the way. We also run classes and a yearly hackathon, so young creators can learn, build and grow together.</p></div>
          </div>
        </div>
      </section>

      {/* 01 Our name */}
      <Section tone="dark">
        <div className="k-grid">
          <div className="k-c-1-8">
            <Label num="01">our name</Label>
            <h2 className="k-big" aria-label="Knowledge, Innovation.">
              <NameWord parts={[["K", true], ["n", false], ["o", true], ["wledge", false]]} />
              <NameWord parts={[["In", false], ["nov", true], ["ation", false]]} />
            </h2>
          </div>
          <div className="k-c-8-13 k-self-center">
            <p className="k-lede">KONOV means <b style={{ color: "var(--paper)" }}>Knowledge and Innovation, together</b>. Knowledge is understanding how technology works. Innovation is being creative with it. We help young people do both.</p>
            <p className="k-caption">// creativity and tech, together</p>
          </div>
        </div>
      </Section>

      {/* 02 Our story */}
      <Section>
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="02">our story</Label>
            <h2 className="k-h2" style={{ marginBottom: 32 }}>Why we started.</h2>
            <div style={{ maxWidth: 400 }}><Photo src={founder} alt="Portrait of KONOV's founder" ratio="1 / 1" position="50% 30%" caption="KONOV founder, Accra" /></div>
          </div>
          <div className="k-c-7-13">
            <blockquote className="k-quote" style={{ margin: 0, fontSize: "clamp(24px, 2.4vw, 32px)", lineHeight: 1.25 }}>
              “We build interactive tools that make technology fun, so young people want to learn it and create with it. We take complex, emerging tech and shape it to fit how they understand the world.”
            </blockquote>
            <p className="k-caption">— KONOV founder</p>
          </div>
        </div>
      </Section>

      {/* 03 Our journey */}
      <Section rule>
        <Label num="03">our journey</Label>
        <h2 className="k-h2" style={{ marginBottom: 32 }}>So far.</h2>
        <div className="k-rows">
          {JOURNEY.map(([year, title, text]) => (
            <div key={title} className="k-grid" style={{ rowGap: 6 }}>
              <p className="k-c-1-3 k-mono k-red" style={{ fontSize: 12 }}>{year}</p>
              <h3 className="k-c-3-8 k-h5">{title}</h3>
              <p className="k-c-8-13 k-small">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 Walls */}
      <Section tone="white" rule>
        <Label num="04">the walls we're breaking</Label>
        <h2 className="k-h2" style={{ maxWidth: "20ch" }}>Imagination, brought to life, once the walls come down.</h2>
        <p style={{ marginTop: 16, maxWidth: "36em" }}>Research on young people shows many use AI every week, yet many feel anxious about it and few feel more creative with it. We see the same walls in tech education, and we build to break them.</p>
        <div className="k-cols k-cols--3 k-cols--ruled" style={{ borderTop: "2px solid var(--ink)", marginTop: 32, paddingTop: 24 }}>
          {WALLS.map(([tag, title, text]) => (
            <div key={tag}>
              <p className="k-fn">{tag}</p>
              <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>{title}</h3>
              <p className="k-small" style={{ marginTop: 8 }}>{text}</p>
            </div>
          ))}
        </div>
        <p className="k-note" style={{ fontSize: 11 }}>// source: Gallup &amp; Walton Family Foundation, Voices of Gen Z (2025, 2026). Survey of young people in the US, aged 13–28.</p>
      </Section>

      {/* 05 What we do */}
      <Section rule>
        <Label num="05">what we do</Label>
        <h2 className="k-h2" style={{ marginBottom: 32 }}>Tools, classes and a community.</h2>
        <div className="k-rows" style={{ borderTop: "2px solid var(--ink)" }}>
          {WHAT_WE_DO.map(([tag, name, to, text]) => (
            <div key={name} className="k-grid" style={{ rowGap: 6, alignItems: "center" }}>
              <p className="k-c-1-3 k-fn">{tag}</p>
              <h3 className="k-c-3-8 k-h3" style={{ fontSize: 28, color: to ? undefined : "var(--stone)" }}>
                {to ? <SmartLink to={to} className="k-plain">{name} <span className="k-mono" aria-hidden="true">{to.startsWith("http") ? "↗" : "→"}</span></SmartLink> : name}
              </h3>
              <p className="k-c-8-13 k-small">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 06 Team */}
      <Section tone="white" rule>
        <SectionHead num="06" label="the team" title="The people behind KONOV." aside="A small team of builders, teachers and creatives in Accra." />
        <div>
          <Strip tag="want to build with us?" action={<TextLink to={LINKS.linkedin}>Follow KONOV on LinkedIn</TextLink>}>
            We share openings, and what we're working on, on LinkedIn.
          </Strip>
        </div>
      </Section>

      {/* 07 Work with us */}
      <Section rule>
        <Label num="07">work with us</Label>
        <h2 className="k-h2" style={{ maxWidth: "18ch" }}>Let's bring more young imaginations to life.</h2>
        <div className="k-cols k-cols--3 k-cols--ruled" style={{ borderTop: "2px solid var(--ink)", marginTop: 32, paddingTop: 24 }}>
          <div>
            <p className="k-fn">schools</p>
            <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>Bring KONOV to your school</h3>
            <p className="k-small" style={{ marginTop: 8 }}>Hands-on KONOV workshops for your learners, or MeAI in your classrooms.</p>
            <div className="k-actions" style={{ marginTop: 18, gap: 16 }}>
              <TextLink to={WORKSHOP} arrow={false}>Request a workshop</TextLink>
              <TextLink to={LINKS.meai}>MeAI for schools</TextLink>
            </div>
          </div>
          <div>
            <p className="k-fn">partners</p>
            <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>Partner or sponsor</h3>
            <p className="k-small" style={{ marginTop: 8 }}>Back the AI Builder Sprint, host a class, or reach families with us.</p>
            <div style={{ marginTop: 18 }}><TextLink to={`mailto:${LINKS.email}`} arrow={false}>Email us</TextLink></div>
          </div>
          <div>
            <p className="k-fn">mentors</p>
            <h3 className="k-h4" style={{ fontWeight: 700, marginTop: 6 }}>Mentor young builders</h3>
            <p className="k-small" style={{ marginTop: 8 }}>Give a few hours at the Sprint and help a team get unstuck.</p>
            <div style={{ marginTop: 18 }}><TextLink to="/ai-builder-sprint#join" arrow={false}>Sign up to mentor</TextLink></div>
          </div>
        </div>
        <p style={{ marginTop: 40 }} className="k-ink">Or just say hello: <TextLink to={`mailto:${LINKS.email}`} arrow={false}>{LINKS.email}</TextLink> · Accra, Ghana</p>
      </Section>
    </SiteLayout>
  );
};

export default About;
