import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import logo from "@/assets/site/konov-logo.png";
import { BOOK_A_CLASS, LINKS, WORKSHOP, showPrivacy } from "./links";
import { Button, SmartLink } from "./ui";
import "./site.css";

const MENU = [
  { to: "/classes", label: "Classes" },
  { to: "/ai-builder-sprint", label: "AI Builder Sprint" },
  { to: "/about", label: "About" },
  { to: LINKS.meai, label: "MeAI ↗" },
  { to: "/contact", label: "Contact" },
];

type HeaderCta = { to: string; label: string };

const navLink = (item: { to: string; label: string }, onClick?: () => void) =>
  item.to.startsWith("http") ? (
    <a key={item.to} href={item.to} target="_blank" rel="noopener noreferrer" onClick={onClick}>{item.label}</a>
  ) : item.to.includes("#") ? (
    // Links to a section of a page never count as the current page.
    <Link key={item.to} to={item.to} onClick={onClick}>{item.label}</Link>
  ) : (
    <NavLink key={item.to} to={item.to} end onClick={onClick}>{item.label}</NavLink>
  );

const Logo = () => (
  <NavLink to="/" className="k-logo" aria-label="KONOV home">
    <img src={logo} alt="KONOV" width={48} height={34} />
  </NavLink>
);

const PhoneMenu = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="k-menu-btn" aria-label="Open menu">Menu <span aria-hidden="true">≡</span></Dialog.Trigger>
      <Dialog.Portal>
        {/* The panel sits inside .k-site so it picks up the site's tokens. */}
        <Dialog.Content className="k-site k-site--no-bar k-menu-panel" aria-describedby={undefined}>
          <div className="k-wrap" style={{ width: "100%" }}>
            <div className="k-menu-panel__top">
              <Logo />
              <Dialog.Close className="k-menu-btn" style={{ display: "inline-flex" }}>Close <span aria-hidden="true">×</span></Dialog.Close>
            </div>
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <nav aria-label="Main">
              {navLink({ to: "/", label: "Home" }, close)}
              {MENU.map((item) => navLink(item, close))}
              {navLink({ to: "/forge", label: "FORGE" }, close)}
              {navLink({ to: WORKSHOP, label: "Workshops for schools & groups" }, close)}
            </nav>
            <div className="k-actions" style={{ paddingBottom: 40 }} onClick={close}>
              <Button to={BOOK_A_CLASS}>Book a class</Button>
              <Button to={LINKS.phone} variant="ink" arrow="→">Call {LINKS.phoneDisplay}</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const SiteHeader = ({ dark, cta }: { dark?: boolean; cta: HeaderCta }) => (
  <header className={`k-header ${dark ? "k-dark" : ""}`}>
    <div className="k-wrap k-header__bar">
      <Logo />
      <nav className="k-nav" aria-label="Main">{MENU.map((item) => navLink(item))}</nav>
      <span className="k-header__cta">
        <Button to={cta.to} variant={dark ? "light" : "ink"} small>{cta.label}</Button>
      </span>
      <PhoneMenu />
    </div>
  </header>
);

const FooterCol = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <h2 className="k-upper" style={{ fontFamily: "var(--f-mono)", letterSpacing: "0.06em" }}>{title}</h2>
    <ul>{children}</ul>
  </div>
);

const SiteFooter = () => (
  <footer className="k-dark k-footer">
    <div className="k-wrap">
      <div className="k-grid">
        <div className="k-c-1-7">
          <p className="k-wordmark">KONOV</p>
          <p style={{ marginTop: 10 }}>Creativity and tech, together.</p>
        </div>
        <div className="k-c-7-13">
          <div className="k-cols k-cols--3">
            <FooterCol title="Explore">
              <li><SmartLink to="/classes">Classes</SmartLink></li>
              <li><SmartLink to={WORKSHOP}>Workshops for schools &amp; groups</SmartLink></li>
              <li><SmartLink to="/ai-builder-sprint">AI Builder Sprint</SmartLink></li>
              <li><SmartLink to="/about">About</SmartLink></li>
              <li><SmartLink to="/forge">FORGE</SmartLink></li>
              <li><SmartLink to={LINKS.meai}>MeAI ↗</SmartLink></li>
            </FooterCol>
            <FooterCol title="Contact">
              <li><a href={`mailto:${LINKS.email}`}>{LINKS.email}</a></li>
              <li><SmartLink to={LINKS.phone}>{LINKS.phoneDisplay}</SmartLink></li>
              <li style={{ color: "var(--on-dark-muted)", fontSize: 15 }}>Accra, Ghana</li>
            </FooterCol>
            <FooterCol title="Follow">
              <li><SmartLink to={LINKS.linkedin}>LinkedIn ↗</SmartLink></li>
            </FooterCol>
          </div>
        </div>
      </div>
      <p className="k-footer__base">
        © 2026 KONOV Technologies · Knowledge and Innovation, together
        {showPrivacy && <> &nbsp;·&nbsp; <SmartLink to="/privacy">Privacy</SmartLink></>}
        {" "}&nbsp;·&nbsp; <SmartLink to="/contact">Contact</SmartLink>
      </p>
    </div>
  </footer>
);

export type StickyAction = { to: string; label: string; variant?: "red" | "ink" | "orange" };

// Two buttons pinned to the bottom of the screen on phones.
const StickyBar = ({ actions }: { actions: [StickyAction, StickyAction] }) => (
  <div className="k-stickybar" role="region" aria-label="Quick actions">
    {actions.map((a, i) => (
      <Button key={a.label} to={a.to} variant={a.variant ?? (i === 0 ? "red" : "ink")}>{a.label}</Button>
    ))}
  </div>
);

export const SiteLayout = ({ children, darkHeader, cta = { to: BOOK_A_CLASS, label: "Book a class" }, sticky }: {
  children: ReactNode; darkHeader?: boolean; cta?: HeaderCta; sticky?: [StickyAction, StickyAction];
}) => {
  const { hash, pathname } = useLocation();

  // Router navigation doesn't scroll to #anchors on its own (ScrollToTop resets to the top).
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(), 60);
    return () => window.clearTimeout(id);
  }, [hash, pathname]);

  return (
    <div className={`k-site ${sticky ? "" : "k-site--no-bar"}`}>
      <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
      <SiteHeader dark={darkHeader} cta={cta} />
      <main id="main">{children}</main>
      <SiteFooter />
      {sticky && <StickyBar actions={sticky} />}
    </div>
  );
};
