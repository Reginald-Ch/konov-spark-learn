import { Linkedin, Mail, Heart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RobotMascot } from "./RobotMascot";

export const Footer = () => {
  return (
    <footer className="py-16 border-t-4 border-foreground relative overflow-hidden bg-card/50">
      <div className="absolute inset-0 halftone-bg opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <RobotMascot type="happy" size="sm" />
              <h3 className="text-2xl lg:text-3xl font-fredoka font-bold text-primary min-w-0">
                KONOV Technologies
              </h3>
            </div>
            <p className="text-muted-foreground font-space leading-relaxed mb-6 max-w-md">
              An EdTech company building interactive tools that make technology fun to learn
              for ages 6–16. Discover MeAI, our first product for families and classrooms,
              alongside AI &amp; coding classes and school partnerships.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Linkedin, href: "https://www.linkedin.com/company/konov-artechtist", label: "LinkedIn" },
              ].map(({ Icon, href, label }, idx) => (
                <motion.a
                  key={idx}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={label}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-xl bg-card border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Icon className="w-5 h-5 text-foreground" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-fredoka font-bold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-3 font-space">
              {[
                { to: "/about", label: "About" },
                { to: "/programs", label: "Programs" },
                { to: "/me-ai", label: "MeAI" },
                { to: "/for-schools", label: "For Schools" },
                { to: "/hackathons", label: "FORGE Studio" },
                { to: "/blog", label: "Blog" },
                { to: "/contact", label: "Contact" },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://meaitech.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                  Open MeAI App
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            </ul>
          </div>

          {/* More */}
          <div>
            <h4 className="text-xl font-fredoka font-bold mb-4 text-foreground">More</h4>
            <ul className="space-y-3 font-space">
              {[
                { to: "/ai-classes-for-kids-accra", label: "AI & Coding Classes" },
                { to: "/summer-ai-tech-camp", label: "Summer School" },
                { to: "/machine-learning-for-kids", label: "Machine Learning for Kids" },
                { to: "/youth-hackathons", label: "Youth AI Hackathons" },
                { to: "/tertiary-ai-innovation-hub", label: "Tertiary AI Innovation Hub" },
                { to: "/ai-curriculum-support", label: "AI Curriculum Support" },
                { to: "/resources", label: "Learn AI" },
                { to: "/community", label: "Community" },
                { to: "/waitlist", label: "Waitlist" },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xl font-fredoka font-bold mb-4 text-foreground">Get in Touch</h4>
            <ul className="space-y-3 font-space">
              <li className="flex items-start gap-2 text-muted-foreground">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                <a href="mailto:hello@konovtech.com" className="min-w-0 break-all hover:text-primary">hello@konovtech.com</a>
              </li>
              <li>
                <a
                  href="https://wa.me/233208741417"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                  Chat on WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t-4 border-foreground/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-space flex items-center gap-2">
            © 2026 KONOV Technologies. Made with{" "}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Heart className="w-4 h-4 text-primary fill-primary" />
            </motion.span>
            {" "}for young innovators.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground font-space">
            <Link to="/contact" className="hover:text-primary transition-colors">Contact KONOV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
