import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Tone = "paper" | "white" | "dark" | "cream";

export const Section = ({ tone = "paper", id, tight, rule, className = "", children }: {
  tone?: Tone; id?: string; tight?: boolean; rule?: boolean; className?: string; children: ReactNode;
}) => (
  <section id={id} className={`k-${tone} ${tight ? "k-section--tight" : "k-section"} ${rule ? "k-rule-top" : ""} ${id ? "k-anchor" : ""} ${className}`}>
    <div className="k-wrap">{children}</div>
  </section>
);

// The orange block that ends one headline per page.
export const Cursor = () => <span className="k-cursor" aria-hidden="true" />;

// "01 / community": the number is red (orange on dark sections).
export const Label = ({ num, children }: { num?: string; children: ReactNode }) => (
  <span className="k-label">{num ? <><b>{num}</b> / </> : <span className="k-slash">// </span>}{children}</span>
);

export const Caption = ({ children }: { children: ReactNode }) => (
  <p className="k-caption"><span className="k-slash">//</span> {children}</p>
);

export const Note = ({ children }: { children: ReactNode }) => (
  <p className="k-note">// {children}</p>
);

const isExternal = (to: string) => /^(https?:|mailto:|tel:)/.test(to);

// One link element for internal routes, in-page anchors and outside sites.
export const SmartLink = ({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode; "aria-label"?: string }) =>
  isExternal(to) ? (
    <a href={to} className={className} {...(to.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>{children}</a>
  ) : (
    <Link to={to} className={className} {...rest}>{children}</Link>
  );

type ButtonVariant = "red" | "ink" | "orange" | "light";
const arrowFor = (to: string, arrow?: string) => arrow ?? (to.startsWith("http") ? "↗" : "→");

export const Button = ({ to, variant = "red", small, arrow, children }: {
  to: string; variant?: ButtonVariant; small?: boolean; arrow?: string; children: ReactNode;
}) => (
  <SmartLink to={to} className={`k-btn k-btn--${variant} ${small ? "k-btn--sm" : ""}`}>
    {children} <span className="k-arrow" aria-hidden="true">{arrowFor(to, arrow)}</span>
  </SmartLink>
);

// Bold text link with the 2px red underline. Outside links get ↗ unless told otherwise.
export const TextLink = ({ to, arrow, children }: { to: string; arrow?: string | false; children: ReactNode }) => {
  const mark = arrow === false ? null : arrow ?? (to.startsWith("http") ? "↗" : null);
  return (
    <SmartLink to={to} className="k-link">
      {children}{mark && <> <span className="k-arrow" aria-hidden="true">{mark}</span></>}
    </SmartLink>
  );
};

// A link whose address KONOV hasn't supplied yet is not shown at all.
export const PendingLink = ({ to, placeholder, children, button }: {
  to: string; placeholder: string; children: ReactNode; button?: ButtonVariant;
}) => {
  if (!to) return null;
  return button ? <Button to={to} variant={button}>{children}</Button> : <TextLink to={to}>{children}</TextLink>;
};

export const Photo = ({ src, alt, caption, ratio = "4 / 3", position = "center", eager }: {
  src: string; alt: string; caption?: ReactNode; ratio?: string; position?: string; eager?: boolean;
}) => (
  <figure style={{ margin: 0 }}>
    <img src={src} alt={alt} className="k-photo" style={{ aspectRatio: ratio, objectPosition: position }} loading={eager ? "eager" : "lazy"} decoding="async" />
    {caption && <figcaption><Caption>{caption}</Caption></figcaption>}
  </figure>
);

// A marked frame for a photo or screenshot that hasn't been supplied yet.
export const Frame = ({ label, caption, ratio = "4 / 3", solid, dark, style }: {
  label: string; caption?: ReactNode; ratio?: string; solid?: boolean; dark?: boolean; style?: React.CSSProperties;
}) => (
  <figure style={{ margin: 0 }}>
    <div className={`k-frame ${solid ? "k-frame--solid" : ""} ${dark ? "k-frame--dark" : ""}`} style={{ aspectRatio: ratio, ...style }} role="img" aria-label={`Placeholder: ${label}`}>
      [{label}]
    </div>
    {caption && <figcaption><Caption>{caption}</Caption></figcaption>}
  </figure>
);

export type Step = { fn: string; title: string; text: ReactNode };

// Steps written as code: imagine() → build() → understand().
export const Steps = ({ items, cols, tone }: { items: Step[]; cols?: 3 | 4 | 5; tone?: "red" | "soft" }) => (
  <div className={`k-cols k-cols--${cols ?? items.length}`}>
    {items.map((s) => (
      <div key={s.fn} className={`k-step ${tone ? `k-step--${tone}` : ""}`}>
        <span className="k-fn">{s.fn}</span>
        {s.title && <h3 className="k-h5">{s.title}</h3>}
        <p className="k-small">{s.text}</p>
      </div>
    ))}
  </div>
);

// Function-labelled rows, used beside a headline.
export const FnRows = ({ items }: { items: Step[] }) => (
  <div className="k-rows">
    {items.map((s) => (
      <div key={s.fn} className="k-row">
        <span className="k-fn">{s.fn}</span>
        <div>
          <h3 className="k-h5">{s.title}</h3>
          <p className="k-small" style={{ marginTop: 4 }}>{s.text}</p>
        </div>
      </div>
    ))}
  </div>
);

export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="k-facts">
    {items.map((f) => (
      <div key={f.label}>
        <dt className="k-upper">{f.label}</dt>
        <dd>{f.value}</dd>
      </div>
    ))}
  </dl>
);

// A headline on the left with a short paragraph on the right.
export const SectionHead = ({ num, label, title, aside, cursor, titleClass = "k-h2" }: {
  num?: string; label: ReactNode; title: ReactNode; aside?: ReactNode; cursor?: boolean; titleClass?: string;
}) => (
  <div className="k-grid" style={{ marginBottom: 48 }}>
    <div className="k-c-1-8">
      <Label num={num}>{label}</Label>
      <h2 className={titleClass}>{title}{cursor && <Cursor />}</h2>
    </div>
    {aside && <div className="k-c-8-13 k-self-end"><div className="k-lede">{aside}</div></div>}
  </div>
);

// "// bringing a group?  We run … workshops …  Request a workshop →"
export const Strip = ({ tag, children, action, big }: { tag: string; children: ReactNode; action: ReactNode; big?: boolean }) => (
  <div className={`k-strip ${big ? "k-strip--big" : "k-rule-top"}`}>
    <p><span className="k-mono">// {tag}</span>{" "}{children}</p>
    <div>{action}</div>
  </div>
);

export type QA = { q: string; a: ReactNode };

export const Faq = ({ items }: { items: QA[] }) => (
  <div className="k-faq">
    {items.map((item, i) => (
      <details key={item.q} open={i === 0}>
        <summary>{item.q}</summary>
        <div><p>{item.a}</p></div>
      </details>
    ))}
  </div>
);
