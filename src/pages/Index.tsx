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
import { SEO, createFAQSchema } from "@/components/SEO";

// FAQ data for structured data
const homepageFAQs = [
  { question: "What is Konov Artechtist?", answer: "Konov Artechtist is a company dedicated to transforming tech education across Africa. Our mission is to make emerging technologies, starting with AI, accessible, engaging, and fun for young learners." },
  { question: "Why should kids learn AI and Machine Learning?", answer: "AI is shaping the future of every industry. When kids understand how intelligent systems work, they become creators — not just consumers — of technology. Early exposure builds problem-solving, critical thinking, creativity, and confidence." },
  { question: "What age groups do you cater to?", answer: "We offer programs for ages 6-16, with content specifically designed for different developmental stages. Our AI Explorers (6-9), Young Builders (9-11), and Tech Ambassadors (12-16) programs ensure age-appropriate learning experiences." },
  { question: "Does my child need prior coding experience?", answer: "Not at all! Our programs are designed for complete beginners. We start with visual programming and gradually progress to text-based coding. Each child learns at their own pace with support from our instructors." },
  { question: "What programs do you offer?", answer: "We offer three main programs: Workshops (twice yearly, two-month duration), Summer Tech Camp (full immersion during summer), and One-Day Tech Fair (mega event with exhibitions and demonstrations)." }
];

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  
  return (
    <div className="min-h-screen relative">
      <SEO 
        title="Africa's First AI & ML Literacy Hub for Kids"
        description="Making AI and emerging tech literacy accessible, engaging, and fun for Kids ages 6-14 through interactive workshops, tech camps, and tech fairs in Ghana."
        canonical="/"
        keywords={["AI education Ghana", "kids coding Accra", "machine learning for children Africa", "STEM programs Ghana"]}
        jsonLd={createFAQSchema(homepageFAQs)}
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
