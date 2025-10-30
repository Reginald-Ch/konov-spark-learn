import { Navbar } from "@/components/Navbar";
import { ScrollProgress } from "@/components/ScrollProgress";
import { FloatingParticles } from "@/components/FloatingParticles";
import { InteractiveIcons } from "@/components/InteractiveIcons";
import { Hero } from "@/components/Hero";
import { Mission } from "@/components/Mission";
import { Values } from "@/components/Values";
import { ProgramsWithRocket } from "@/components/ProgramsWithRocket";
import { Timeline } from "@/components/Timeline";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { AIMascot } from "@/components/AIMascot";
import { SocialProof } from "@/components/SocialProof";
import { FAQ } from "@/components/FAQ";
import { SuccessStories } from "@/components/SuccessStories";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  
  return (
    <div className="min-h-screen relative">
      <FloatingParticles />
      <InteractiveIcons />
      <ScrollProgress />
      <AIMascot />
      <Navbar />
      <Hero />
      <SocialProof />
      <Mission />
      <Values />
      <Timeline />
      <SuccessStories />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
