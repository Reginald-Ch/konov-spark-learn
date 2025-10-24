import { Navbar } from "@/components/Navbar";
import { ScrollProgress } from "@/components/ScrollProgress";
import { FloatingParticles } from "@/components/FloatingParticles";
import { InteractiveIcons } from "@/components/InteractiveIcons";
import { Hero } from "@/components/Hero";
import { Mission } from "@/components/Mission";
import { Programs } from "@/components/Programs";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { AIMascot } from "@/components/AIMascot";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <FloatingParticles />
      <InteractiveIcons />
      <ScrollProgress />
      <AIMascot />
      <Navbar />
      <Hero />
      <Mission />
      <Programs />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
