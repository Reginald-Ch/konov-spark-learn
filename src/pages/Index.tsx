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
import { Gallery } from "@/components/Gallery";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";
import { SEO } from "@/components/SEO";

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  
  return (
    <div className="min-h-screen relative">
      <SEO 
        title="Africa's First AI & ML Literacy Hub for Kids"
        description="Making AI and emerging tech literacy accessible, engaging, and fun for Kids ages 6-14 through interactive workshops, tech camps, and tech fairs in Ghana."
        canonical="/"
      />
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
      <Gallery />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
