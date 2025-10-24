import { Hero } from "@/components/Hero";
import { Mission } from "@/components/Mission";
import { Programs } from "@/components/Programs";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Mission />
      <Programs />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
