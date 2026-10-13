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
      <SEO title="Interactive Tools For Young Learners" description="KONOV builds interactive tools to make tech education fun for ages 6–16. Discover Me AI, our first product, AI workshops, and school partnerships." canonical="/" keywords={["EdTech company Ghana", "interactive technology learning", "technology education for kids", "Me AI for families and classrooms"]} jsonLd={createFAQSchema(companyFAQs)} />
      <Navbar />
      <main><Hero /><CompanyPurpose /><MeAIIntro /><LearningApproach /><WorkshopsAndSchools /><LearnerVoice /><CompanyFAQ /><CompanyCTA /></main>
      <Footer /><AIMascot />
    </div>
  );
};
export default Index;
