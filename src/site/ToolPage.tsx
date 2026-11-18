import type { ReactNode } from "react";
import { SEO } from "@/components/SEO";
import { SiteLayout, type StickyAction } from "./SiteLayout";
import { Button, Cursor, Frame, Label, Note, PendingLink, Photo, Section, SectionHead, Steps, Strip, TextLink, type Step } from "./ui";

// An image slot: a real photo, or the label of a screenshot still to come.
export type Shot = string | { src: string; alt: string; caption?: string; position?: string };

const ShotView = ({ shot, ratio, eager }: { shot: Shot; ratio: string; eager?: boolean }) =>
  typeof shot === "string"
    ? <Frame label={shot} ratio={ratio} dark />
    : <Photo src={shot.src} alt={shot.alt} caption={shot.caption} ratio={ratio} position={shot.position} eager={eager} />;

// Everything a KONOV tool page shows. FORGE is the first; future tools reuse
// this layout by supplying their own Tool object.
export type Tool = {
  seo: { title: string; description: string; path: string; keywords: string[] };
  name: string;
  eyebrow: string;
  headline: string;
  intro: string;
  primary: { label: string; to: string };
  secondary: { label: string; to: string; placeholder: string };
  facts: { label: string; value: string }[];
  heroShot: Shot;
  wall: { title: string; paragraphs: string[] };
  features: { tag: string; title: string; text: string; shot: Shot }[];
  access: { title: string; aside: string; steps: Step[]; cta: { label: string; to: string } };
  safety: { title: string; points: string[]; note?: string };
  more: { text: ReactNode; link: { label: string; to: string } };
  sticky: [StickyAction, StickyAction];
};

export const ToolPage = ({ tool }: { tool: Tool }) => (
  <SiteLayout sticky={tool.sticky}>
    <SEO title={tool.seo.title} description={tool.seo.description} canonical={tool.seo.path} keywords={tool.seo.keywords} />

    {/* Hero */}
    <section className="k-dark" style={{ padding: "56px 0 var(--section)" }}>
      <div className="k-wrap">
        <p className="k-label"><span className="k-slash">//</span> {tool.eyebrow}</p>
        <div className="k-grid">
          <div className="k-c-1-7 k-self-center"><h1 className="k-mega">{tool.name}</h1></div>
          <div className="k-c-7-13 k-self-center">
            <p className="k-h3" style={{ fontFamily: "var(--f-head)", fontWeight: 600, color: "var(--paper)", letterSpacing: "-0.02em", fontSize: "clamp(24px, 2.2vw, 30px)", lineHeight: 1.2 }}>
              {tool.headline}<Cursor />
            </p>
            <p style={{ marginTop: 14 }}>{tool.intro}</p>
            <div className="k-actions" style={{ marginTop: 24 }}>
              <Button to={tool.primary.to} variant="orange">{tool.primary.label}</Button>
              <PendingLink to={tool.secondary.to} placeholder={tool.secondary.placeholder}>{tool.secondary.label}</PendingLink>
            </div>
            <dl className="k-spec k-rule-top" style={{ paddingTop: 16, marginTop: 24 }}>
              {tool.facts.map((f) => (
                <div key={f.label} style={{ display: "contents" }}>
                  <dt className="k-upper">{f.label}</dt>
                  <dd style={{ color: "var(--paper)" }}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div style={{ marginTop: 40 }}><ShotView shot={tool.heroShot} ratio="16 / 7.5" eager /></div>
      </div>
    </section>

    {/* 01 The wall it breaks */}
    <Section>
      <div className="k-grid">
        <div className="k-c-1-6"><Label num="01">the wall it breaks</Label><h2 className="k-h2">{tool.wall.title}</h2></div>
        <div className="k-c-7-13 k-stack">{tool.wall.paragraphs.map((p) => <p key={p} className="k-lede">{p}</p>)}</div>
      </div>
    </Section>

    {/* 02 What's inside */}
    <Section tone="dark">
      <Label num="02">what's inside</Label>
      <h2 className="k-h2">Everything a team needs to build.</h2>
      <div style={{ marginTop: 40 }}>
        {tool.features.map((f, i) => (
          <div key={f.title} className="k-grid k-rule-top" style={{ padding: "40px 0", alignItems: "center" }}>
            <div className={typeof f.shot === "string" ? "k-c-1-8" : i % 2 ? "k-c-8-13" : "k-c-1-6"} style={{ gridRow: 1 }}>
              <p className="k-mono k-orange" style={{ fontSize: 12 }}>{String(i + 1).padStart(2, "0")} · {f.tag}</p>
              <h3 className="k-h3" style={{ marginTop: 6 }}>{f.title}</h3>
              <p style={{ marginTop: 10 }}>{f.text}</p>
            </div>
            {typeof f.shot !== "string" && <div className={i % 2 ? "k-c-1-7" : "k-c-7-13"} style={{ gridRow: 1 }}><ShotView shot={f.shot} ratio="16 / 9.5" /></div>}
          </div>
        ))}
      </div>
    </Section>

    {/* 03 Who it's for & how to get in */}
    <Section>
      <SectionHead num="03" label="who it's for & how to get in" title={tool.access.title} aside={tool.access.aside} />
      <Steps cols={4} tone="soft" items={tool.access.steps} />
      <div style={{ marginTop: 32 }}><Button to={tool.access.cta.to} variant="ink">{tool.access.cta.label}</Button></div>
    </Section>

    {/* 04 Safe by design */}
    <Section tone="white" rule>
      <div className="k-grid">
        <div className="k-c-1-6">
          <Label num="04">safe by design</Label>
          <h2 className="k-h3">{tool.safety.title}</h2>
          {tool.safety.note && <Note>{tool.safety.note}</Note>}
        </div>
        <div className="k-c-7-13"><ul className="k-arrows">{tool.safety.points.map((p) => <li key={p}>{p}</li>)}</ul></div>
      </div>
    </Section>

    <Section tight>
      <Strip big tag="more tools from KONOV" action={<TextLink to={tool.more.link.to}>{tool.more.link.label}</TextLink>}>{tool.more.text}</Strip>
    </Section>
  </SiteLayout>
);
