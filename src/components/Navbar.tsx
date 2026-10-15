import { Button } from "@/components/ui/button";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logo from "@/assets/konov-logo-clear.png";

const navLinks = [
  { name: "About KONOV", path: "/about" },
  { name: "Me AI", path: "/me-ai" },
  { name: "Workshops", path: "/programs" },
  { name: "For Schools", path: "/for-schools" },
  { name: "Contact", path: "/contact" },
];
const exploreLinks = [
  { name: "FORGE Studio", path: "/hackathons" },
  { name: "Learn AI & Resources", path: "/resources" },
  { name: "Community", path: "/community" },
  { name: "Blog", path: "/blog" },
];

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);
  const linkClass = (path: string) => `rounded-md px-3 py-2.5 font-fredoka text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${location.pathname === path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`;
  const openApp = <Button asChild className="rounded-lg"><a href="https://meaitech.com" target="_blank" rel="noopener noreferrer">Open Me AI <ArrowUpRight /></a></Button>;

  return (
    <>
      {['/', '/about'].includes(location.pathname) && <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:p-3 focus:text-foreground focus:ring-2 focus:ring-ring">Skip to content</a>}
      <nav aria-label="Main navigation" className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
        <div className="company-container flex h-20 items-center justify-between gap-4">
          <Link to="/" aria-label="KONOV home" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={logo} alt="KONOV" width="480" height="339" className="h-16 w-auto object-contain" /></Link>
          <div className="hidden xl:flex items-center gap-1">
            {navLinks.map(link => <Link key={link.path} to={link.path} aria-current={location.pathname === link.path ? "page" : undefined} className={linkClass(link.path)}>{link.name}</Link>)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className={`font-fredoka text-base rounded-md ${exploreLinks.some(l => l.path === location.pathname) ? "text-primary bg-primary/10" : ""}`}>Explore <ChevronDown /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">{exploreLinks.map(link => <DropdownMenuItem key={link.path} asChild><Link to={link.path} className="min-h-11 font-space">{link.name}</Link></DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="hidden xl:block">{openApp}</div>
          <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DialogTrigger asChild><Button variant="outline" size="icon" className="xl:hidden h-11 w-11 rounded-lg" aria-label="Open navigation menu"><Menu /></Button></DialogTrigger>
            <DialogContent hideCloseButton className="inset-0 top-0 left-0 h-[100dvh] max-w-none translate-x-0 translate-y-0 rounded-none sm:rounded-none p-0 gap-0 flex flex-col overflow-hidden" aria-describedby={undefined}>
              <div className="company-container flex h-20 shrink-0 items-center justify-between border-b border-border"><DialogTitle className="font-fredoka text-2xl">Explore KONOV</DialogTitle><DialogClose asChild><Button variant="outline" size="icon" className="h-11 w-11 rounded-lg" aria-label="Close navigation menu"><X /></Button></DialogClose></div>
              <div className="overflow-y-auto overscroll-contain flex-1 py-5"><div className="company-container flex flex-col gap-2">
                <Link to="/" className={linkClass('/')} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                {navLinks.map(link => <Link key={link.path} to={link.path} aria-current={location.pathname === link.path ? "page" : undefined} className={linkClass(link.path)} onClick={() => setIsMobileMenuOpen(false)}>{link.name}</Link>)}
                <p className="company-eyebrow text-muted-foreground border-t border-border pt-5 mt-3 !mb-0">Explore</p>
                {exploreLinks.map(link => <Link key={link.path} to={link.path} className={linkClass(link.path)} onClick={() => setIsMobileMenuOpen(false)}>{link.name}</Link>)}
              </div></div>
              <div className="border-t border-border shrink-0 py-4"><div className="company-container">{openApp}</div></div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>
      <div className="h-20" aria-hidden="true" />
    </>
  );
};
