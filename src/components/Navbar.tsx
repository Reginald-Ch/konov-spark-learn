import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SignupModal } from "@/components/SignupModal";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Programs", path: "/programs" },
    { name: "Community", path: "/community" },
    { name: "Resources", path: "/resources" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-lg border-b border-primary/20 shadow-lg shadow-primary/5"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-foreground animate-pulse-glow" />
              </div>
              <span className="text-xl font-orbitron font-bold gradient-text">
                Konov Artechtist
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link, idx) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-muted-foreground hover:text-foreground font-space font-medium transition-colors duration-300 relative group ${
                    location.pathname === link.path ? "text-foreground" : ""
                  }`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 ${
                    location.pathname === link.path ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button 
                onClick={() => setShowSignupModal(true)}
                className="bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300 font-space font-semibold"
              >
                Join Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-all duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-500 overflow-hidden ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-background/95 backdrop-blur-lg border-t border-primary/20 py-6">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-muted-foreground hover:text-foreground font-space font-medium transition-colors duration-300 py-2 ${
                    location.pathname === link.path ? "text-foreground" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Button 
                onClick={() => {
                  setShowSignupModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-primary to-accent font-space font-semibold mt-2"
              >
                Join Now
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-20" />
      
      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="navbar" />
    </>
  );
};
