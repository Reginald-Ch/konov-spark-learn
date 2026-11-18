import { SEO } from "@/components/SEO";
import { usePageTracking } from "@/hooks/useAnalytics";
import { SiteLayout } from "@/site/SiteLayout";
import { BOOK_A_CLASS, LINKS, SPRINT_LIST, WORKSHOP, showPrivacy } from "@/site/links";
import { Field, SubmitRow, Thanks, useSiteForm } from "@/site/forms";
import { Button, Label, Section, SmartLink, Strip, TextLink } from "@/site/ui";

const ROUTES = [
  ["parents", "Booking a class", "Weekend course, online class or tech camp.", "Book", BOOK_A_CLASS],
  ["schools", "A workshop for your group", "Schools, clubs and teams.", "Request", WORKSHOP],
  ["builders", "The AI Builder Sprint", "Join the list or sign up to mentor.", "Sprint", SPRINT_LIST],
  ["schools", "MeAI in your classroom", "Book a free trial lesson on the MeAI site.", "MeAI", LINKS.meai],
  ["partners", "Partnering or sponsoring", "Back the Sprint or reach families with us.", "Below", "#message"],
];

const MessageForm = () => {
  const { status, onSubmit, reset } = useSiteForm("Contact");
  if (status === "sent") {
    return <Thanks title="Thank you. Message received." onAgain={reset}>We'll reply soon by phone or email.</Thanks>;
  }
  return (
    <form className="k-form" onSubmit={(e) => onSubmit(e, { topic: "About", message: "Message", email: "Email" })}>
      <Field label="What's it about?" full>
        <select className="k-input" name="topic" defaultValue="Classes">
          {["Classes", "A workshop for a group", "The AI Builder Sprint", "MeAI in a classroom", "Partnering or sponsoring", "Something else"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Your name"><input className="k-input" name="name" autoComplete="name" required maxLength={120} /></Field>
      <Field label="Phone number"><input className="k-input" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
      <Field label="Email" optional full><input className="k-input" name="email" type="email" autoComplete="email" maxLength={160} /></Field>
      <Field label="Message" full><textarea className="k-input" name="message" required maxLength={2000} /></Field>
      <SubmitRow
        status={status}
        label="Send message"
        fine={<>We only use these details to reply to you.{showPrivacy && <> See our <SmartLink to="/privacy">privacy notice</SmartLink>.</>}</>}
      />
    </form>
  );
};

const Contact = () => {
  usePageTracking("/contact");
  return (
    <SiteLayout>
      <SEO
        title="Contact KONOV – Classes, Workshops & The Sprint"
        description="Questions about classes, the AI Builder Sprint, workshops or partnering with KONOV? Call us on 020 874 1517 or email hello@konovtech.com."
        canonical="/contact"
        keywords={["contact KONOV", "coding classes Accra contact", "school coding workshop Ghana"]}
      />

      <section className="k-paper" style={{ padding: "48px 0 72px" }}>
        <div className="k-wrap k-grid">
          <div className="k-c-1-7">
            <p className="k-label"><span className="k-slash">//</span> contact · Accra, Ghana</p>
            <h1 className="k-display">Let's talk</h1>
          </div>
          <div className="k-c-8-13 k-self-end">
            <p className="k-lede">Questions about classes, the Sprint, workshops or partnering with us? Call us, email us, or send a message below.</p>
          </div>
        </div>
      </section>

      <section className="k-dark" style={{ padding: "40px 0" }}>
        <div className="k-wrap k-cols k-cols--3">
          <div>
            <p className="k-upper" style={{ marginBottom: 12 }}>Call</p>
            <Button to={LINKS.phone} variant="orange" arrow="→">Call {LINKS.phoneDisplay}</Button>
          </div>
          <div>
            <p className="k-upper" style={{ marginBottom: 12 }}>Email</p>
            <a href={`mailto:${LINKS.email}`} style={{ color: "var(--paper)", fontWeight: 600, fontSize: 22, textDecoration: "underline", textUnderlineOffset: 4 }}>{LINKS.email}</a>
          </div>
          <div>
            <p className="k-upper" style={{ marginBottom: 12 }}>Visit</p>
            <p>Accra, Ghana<br />1 Boundary Rd</p>
          </div>
        </div>
      </section>

      <Section>
        <Label num="01">quickest route</Label>
        <h2 className="k-h2" style={{ marginBottom: 32 }}>What's it about?</h2>
        <div className="k-rows" style={{ borderTop: "2px solid var(--ink)" }}>
          {ROUTES.map(([tag, title, text, action, to]) => (
            <div key={title} className="k-grid" style={{ rowGap: 6, alignItems: "center" }}>
              <p className="k-c-1-3 k-fn">{tag}</p>
              <h3 className="k-c-3-8 k-h4" style={{ fontWeight: 600 }}>{title}</h3>
              <p className="k-c-8-13" style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span className="k-small">{text}</span>
                <SmartLink to={to} className="k-plain k-mono" aria-label={`${action}: ${title}`}>{action} {to.startsWith("http") ? "↗" : "→"}</SmartLink>
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="white" id="message">
        <div className="k-grid">
          <div className="k-c-1-6">
            <Label num="02">send a message</Label>
            <h2 className="k-h2">Write to us.</h2>
            <p style={{ marginTop: 16 }}>We'll get back to you as soon as we can.</p>
          </div>
          <div className="k-c-7-13"><MessageForm /></div>
        </div>
      </Section>

      <Section rule>
        <div>
          <Strip tag="behind the scenes" action={<TextLink to={LINKS.linkedin}>Follow KONOV on LinkedIn</TextLink>}>See what we're building on LinkedIn.</Strip>
        </div>
      </Section>
    </SiteLayout>
  );
};

export default Contact;
