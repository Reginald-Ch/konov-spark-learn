import { SEO } from "@/components/SEO";
import { SiteLayout } from "@/site/SiteLayout";
import { LINKS, PRIVACY_PUBLISHED } from "@/site/links";
import { SmartLink } from "@/site/ui";

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "who", title: "Who we are",
    body: <>
      <p>KONOV Technologies ("KONOV", "we") is an edtech company in Accra, Ghana. We run classes, workshops and the AI Builder Sprint, and we build learning tools including MeAI and FORGE. MeAI has its own privacy notice on meaitech.com.</p>
      <p>We follow Ghana's Data Protection Act, 2012 (Act 843). [CONFIRM: registration status with the Data Protection Commission.]</p>
    </>,
  },
  {
    id: "collect", title: "What we collect",
    body: <>
      <p>Only what we need to reply to you and run our programmes:</p>
      <ul>
        <li>Your name, phone number, and email if you give it</li>
        <li>Your child's age, and which class or programme you're interested in</li>
        <li>How you heard about us, and any message you send</li>
        <li>For FORGE and the Sprint: team and login details for registered participants [CONFIRM what FORGE stores]</li>
        <li>Website visit data, if we use analytics [CONFIRM tools used]</li>
      </ul>
    </>,
  },
  {
    id: "children", title: "Children",
    body: <>
      <p>Our classes, the Sprint and FORGE are for young people, so:</p>
      <ul>
        <li>A parent or guardian fills in our forms for children under 16, or gives permission</li>
        <li>We never show a child's full name, school or contact details publicly</li>
        <li>We only share photos or projects of children with a parent's written permission, using first names only</li>
        <li>FORGE channels are for teams and the Sprint only, moderated by KONOV mentors [CONFIRM]</li>
      </ul>
    </>,
  },
  {
    id: "why", title: "Why we use it",
    body: <p>To reply to your messages, book classes and workshops, run the Sprint and FORGE, send updates you asked for, and improve our programmes. We do not sell your information, and we do not use it for advertising.</p>,
  },
  {
    id: "share", title: "Who we share it with",
    body: <p>Only with services that help us run KONOV, such as [ADD: e.g. messaging, email, payment or hosting providers], and only as much as they need. We share information if the law requires it.</p>,
  },
  {
    id: "keep", title: "How long we keep it",
    body: <p>We keep information only as long as we need it for the reasons above, then delete it. [ADD: retention periods, e.g. enquiries kept for 12 months.]</p>,
  },
  {
    id: "rights", title: "Your rights",
    body: <p>You can ask us to show you the information we hold about you or your child, correct it, or delete it. You can also stop receiving updates at any time. If you're unhappy with how we handle your information, you can contact Ghana's Data Protection Commission.</p>,
  },
  {
    id: "contact", title: "Contact us",
    body: <p>Email <SmartLink to={`mailto:${LINKS.email}`} className="k-ink">{LINKS.email}</SmartLink> or call {LINKS.phoneDisplay}. [ADD: name of the person responsible for data protection at KONOV.]</p>,
  },
];

const Privacy = () => (
  <SiteLayout>
    <SEO title="Privacy Notice" description="How KONOV Technologies collects, uses and looks after your information and your child's." canonical="/privacy" noindex={!PRIVACY_PUBLISHED} />
    <section className="k-paper" style={{ padding: "48px 0 var(--section)" }}>
      <div className="k-wrap">
        <p className="k-label"><span className="k-slash">//</span> privacy notice</p>
        <h1 className="k-display" style={{ fontSize: "clamp(40px, 5.6vw, 72px)", maxWidth: "16ch" }}>How we look after your information</h1>
        <p className="k-lede" style={{ marginTop: 20, maxWidth: "34em" }}>In plain words: what we collect, why, and what you can ask us to do with it. We work with children, so we take this seriously.</p>
        <p className="k-caption">Last updated: [ADD DATE]</p>
        {!PRIVACY_PUBLISHED && (
          <p className="k-mono k-red" style={{ fontSize: 12, border: "1px dashed var(--red)", borderRadius: 4, padding: "12px 16px", marginTop: 24, maxWidth: 560 }}>
            // DRAFT: to be reviewed by KONOV's lawyer before it goes live. Items in [brackets] need confirming.
          </p>
        )}

        <div className="k-grid k-rule-top" style={{ marginTop: 32, paddingTop: 32 }}>
          <nav className="k-c-1-3" aria-label="On this page">
            <ol style={{ listStyle: "none", margin: 0, padding: 0, position: "sticky", top: 24, display: "grid", gap: 8 }}>
              {SECTIONS.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="k-plain k-mono" style={{ fontSize: 12, color: "var(--stone)" }}>{String(i + 1).padStart(2, "0")} · {s.title}</a></li>
              ))}
            </ol>
          </nav>
          <div className="k-c-4-12">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="k-anchor k-privacy" style={{ borderBottom: "1px solid var(--line)", padding: i ? "32px 0" : "0 0 32px" }}>
                <p className="k-mono k-red" style={{ fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</p>
                <h2 className="k-h3" style={{ fontSize: 26, margin: "6px 0 12px" }}>{s.title}</h2>
                <div className="k-stack" style={{ color: "var(--body)" }}>{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default Privacy;
