import { lazy, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { BookFreeTrial } from "@/components/BookFreeTrial";
import { Footer } from "@/components/Footer";
import { AIMascot } from "@/components/AIMascot";
import { HackathonBanner } from "@/components/HackathonBanner";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";
import { SEO, createFAQSchema } from "@/components/SEO";
import { ParentTrust } from "@/components/ParentTrust";

// Lazy-load below-fold sections
const Mission = lazy(() => import("@/components/Mission").then(m => ({ default: m.Mission })));
const Values = lazy(() => import("@/components/Values").then(m => ({ default: m.Values })));
const Timeline = lazy(() => import("@/components/Timeline").then(m => ({ default: m.Timeline })));
const Testimonials = lazy(() => import("@/components/Testimonials").then(m => ({ default: m.Testimonials })));
const CTA = lazy(() => import("@/components/CTA").then(m => ({ default: m.CTA })));
const FAQ = lazy(() => import("@/components/FAQ").then(m => ({ default: m.FAQ })));
const SuccessStories = lazy(() => import("@/components/SuccessStories").then(m => ({ default: m.SuccessStories })));
const Gallery = lazy(() => import("@/components/Gallery").then(m => ({ default: m.Gallery })));

// FAQ data for structured data
const homepageFAQs = [
  { question: "What is KONOV?", answer: "KONOV is a company dedicated to transforming tech education across Africa. Our mission is to make emerging technologies, starting with AI, accessible, engaging, and fun for young learners." },
  { question: "Why should kids learn AI and Machine Learning?", answer: "AI is shaping the future of every industry. When kids understand how intelligent systems work, they become creators — not just consumers — of technology. Early exposure builds problem-solving, critical thinking, creativity, and confidence." },
  { question: "What age groups do you cater to?", answer: "We offer programs for ages 6-16, with content specifically designed for different developmental stages. Our AI Explorers (6-9), Young Builders (9-11), and Tech Ambassadors (12-16) programs ensure age-appropriate learning experiences." },
  { question: "Does my child need prior coding experience?", answer: "Not at all! Our programs are designed for complete beginners. We start with visual programming and gradually progress to text-based coding. Each child learns at their own pace with support from our instructors." },
  { question: "What programs do you offer?", answer: "We offer three main programs: Workshops (twice yearly, two-month duration), Summer Tech Camp (full immersion during summer), and One-Day Tech Fair (mega event with exhibitions and demonstrations)." }
];

const SectionFallback = () => <div className="py-16" />;

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  
  return (
    <div className="min-h-screen relative">
      <SEO 
        title="Empowering Young Tech Innovators"
        description="Africa's first AI & ML literacy hub for kids. Teaching children ages 6-14 how intelligent systems think through hands-on workshops, tech camps, and tech fairs in Ghana."
        canonical="/"
        keywords={["AI education Ghana", "kids coding Accra", "machine learning for children Africa", "STEM programs Ghana", "tech education for kids", "AI workshops Ghana"]}
        jsonLd={createFAQSchema(homepageFAQs)}
      />
      <AIMascot />
      <Navbar />
      <Hero />
      <SocialProof />
      <BookFreeTrial />
      <Suspense fallback={<SectionFallback />}>
        <Mission />
        <Values />
        <ParentTrust />
        <Timeline />
        <SuccessStories />
        <Gallery />
        <HackathonBanner />
        <Testimonials />
        <FAQ />
        <CTA />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;
