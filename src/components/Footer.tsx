import { Instagram, Linkedin, Mail, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RobotMascot } from "./RobotMascot";

// TikTok icon component since lucide doesn't have it
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export const Footer = () => {
  return (
    <footer className="py-16 border-t-4 border-foreground relative overflow-hidden bg-card/50">
      <div className="absolute inset-0 halftone-bg opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <RobotMascot type="happy" size="sm" />
              <h3 className="text-3xl font-fredoka font-bold text-primary">
                Konov Artechtist
              </h3>
            </div>
            <p className="text-muted-foreground font-space leading-relaxed mb-6 max-w-md">
              Africa's first AI & ML literacy hub for kids. Teaching how intelligent systems think, 
              how data drives decisions, and how algorithms power creativity.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Linkedin, href: "#", label: "LinkedIn" },
                { Icon: TikTokIcon, href: "#", label: "TikTok" },
                { Icon: Instagram, href: "#", label: "Instagram" },
              ].map(({ Icon, href, label }, idx) => (
                <motion.a
                  key={idx}
                  href={href}
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
                { to: "/about", label: "About Us" },
                { to: "/programs", label: "Our Programs" },
                { to: "/community", label: "Community" },
                { to: "/resources", label: "Learn AI" },
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
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xl font-fredoka font-bold mb-4 text-foreground">Get in Touch</h4>
            <ul className="space-y-3 font-space">
              <li className="flex items-start gap-2 text-muted-foreground">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                <span>konovartechtist@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t-4 border-foreground/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-space flex items-center gap-2">
            © 2025 Konov Artechtist. Made with{" "}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Heart className="w-4 h-4 text-primary fill-primary" />
            </motion.span>
            {" "}for young innovators.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground font-space">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
