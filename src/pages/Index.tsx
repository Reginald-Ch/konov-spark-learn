import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { AIMascot } from "@/components/AIMascot";
import { MeAIIntro } from "@/components/MeAIIntro";
import { CompanyPurpose, LearningApproach, WorkshopsAndSchools, LearnerVoice, CompanyFAQ, CompanyCTA } from "@/components/CompanySections";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";
import { SEO, createFAQSchema } from "@/components/SEO";
import { companyFAQs } from "@/data/companyFAQs";

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  return (
    <div className="company-page min-h-screen font-space">
      <SEO title="Interactive Tech Learning Tools for Ages 6–16" description="KONOV builds interactive tools that make technology fun for ages 6–16. Explore Me AI, our first product, workshops and school partnerships in Ghana." canonical="/" keywords={["EdTech company Ghana", "interactive learning tools for kids", "technology education for kids", "Me AI", "coding for kids Ghana"]} jsonLd={createFAQSchema(companyFAQs)} />
      <Navbar />
      <main id="main-content"><Hero /><CompanyPurpose /><MeAIIntro /><LearningApproach /><WorkshopsAndSchools /><LearnerVoice /><CompanyFAQ /><CompanyCTA /></main>
      <Footer /><AIMascot />
    </div>
  );
};
export default Index;
