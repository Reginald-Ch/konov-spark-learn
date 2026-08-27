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
  { question: "What is KONOV?", answer: "Konov Technologies is an AI education company helping young people develop the skills and confidence to understand and create Artificial Intelligence. Through our MeAI learning platform, practical AI programmes, workshops, and hackathons, we partner with schools, educators, parents, and organisations to deliver hands-on AI learning experiences where young people work with data, train AI models, and build AI systems. Our goal is to make AI education accessible, engaging, and practical while preparing the next generation of African AI innovators for an AI-powered future." },
  { question: "What is MeAI?", answer: "MeAI is KONOV's interactive AI & Machine Learning learning platform for young learners aged 6–16. Students build AI assistants, train simple ML models, create AI-powered games, and learn through prompting and creativity." },
  { question: "What age range do you work with?", answer: "Our programs and learning experiences are designed for young learners, tailored by age and understanding level to stay age-appropriate, practical, and fun." },
  { question: "Do students need coding experience?", answer: "No prior coding experience is required. KONOV's learning experiences are beginner-friendly — students progress at their own pace through exploration, creativity, and hands-on practice." },
  { question: "Can schools partner with KONOV?", answer: "Yes. We partner with schools to bring practical AI & ML learning into the classroom through curriculum support, facilitator-led sessions, teacher training, and access to MeAI." }
];

const SectionFallback = () => <div className="py-16" />;

const Index = () => {
  usePageTracking('/');
  useScrollTracking();
  
  return (
    <div className="min-h-screen relative">
      <SEO 
        title="Empowering Young Tech Innovators"
        description="Konov Technologies is an AI education company helping young people develop the skills and confidence to understand and create Artificial Intelligence. Through our MeAI learning platform, practical AI programmes, workshops, and hackathons, we partner with schools, educators, parents, and organisations to deliver hands-on AI learning experiences where young people work with data, train AI models, and build AI systems. Our goal is to make AI education accessible, engaging, and practical while preparing the next generation of African AI innovators for an AI-powered future.."
        canonical="/"
        keywords={["AI education Ghana", "kids coding Accra", "machine learning for children Africa", "tech programs Ghana", "tech education for kids", "AI workshops Ghana"]}
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
