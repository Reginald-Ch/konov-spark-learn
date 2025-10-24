import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glow-card p-12 md:p-16 rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-primary/30">
            <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
              Ready to <span className="gradient-text">Innovate?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 font-space leading-relaxed max-w-2xl mx-auto">
              Join thousands of young African innovators on their journey to mastering 
              AI and emerging technologies. The future starts here!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-300 font-space font-semibold group"
              >
                <Mail className="mr-2 w-5 h-5" />
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 font-space font-semibold"
              >
                Learn More
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-primary/20">
              <p className="text-sm text-muted-foreground mb-4 font-space">Trusted by educators and parents across Africa</p>
              <div className="flex flex-wrap justify-center gap-6 items-center text-sm text-muted-foreground font-space">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                  Safe Learning Environment
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                  Expert-Led Programs
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
                  Proven Results
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
