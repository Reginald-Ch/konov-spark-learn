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
      <SEO title="Interactive Tools For Young Learners" description="KONOV builds interactive tools that make tech fun to learn and create for ages 6–16. Meet MeAI, and join our AI & coding classes in Accra." canonical="/" keywords={["interactive tools for young learners", "AI and coding classes for kids in Accra", "summer school for kids Accra", "EdTech company Ghana", "interactive learning tools for kids", "technology education for kids", "MeAI", "coding for kids Ghana"]} jsonLd={createFAQSchema(companyFAQs)} />
      <Navbar />
      <main id="main-content"><Hero /><CompanyPurpose /><MeAIIntro /><LearningApproach /><WorkshopsAndSchools /><LearnerVoice /><CompanyFAQ /><CompanyCTA /></main>
      <Footer /><AIMascot />
    </div>
  );
};
export default Index;
