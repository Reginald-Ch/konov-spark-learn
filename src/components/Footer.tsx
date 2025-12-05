import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-primary/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-orbitron font-bold gradient-text mb-4">
              Konov Artechtist
            </h3>
            <p className="text-muted-foreground font-space leading-relaxed mb-6 max-w-md">
              Africa's first AI & ML literacy hub for kids. Teaching how intelligent systems think, 
              how data drives decisions, and how algorithms power creativity.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all duration-300 group"
                >
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-orbitron font-bold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2 font-space">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/programs" className="text-muted-foreground hover:text-foreground transition-colors">Our Programs</Link></li>
              <li><Link to="/community" className="text-muted-foreground hover:text-foreground transition-colors">Community</Link></li>
              <li><Link to="/resources" className="text-muted-foreground hover:text-foreground transition-colors">Resources</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-orbitron font-bold mb-4 text-foreground">Get in Touch</h4>
            <ul className="space-y-2 font-space">
              <li className="flex items-start gap-2 text-muted-foreground">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>hello@konovartechtist.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-space">
            © 2025 Konov Artechtist. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground font-space">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
