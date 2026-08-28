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
const WhoWeServe = lazy(() => import("@/components/WhoWeServe").then(m => ({ default: m.WhoWeServe })));
const WhatLearnersBuild = lazy(() => import("@/components/WhatLearnersBuild").then(m => ({ default: m.WhatLearnersBuild })));
const MeAIIntro = lazy(() => import("@/components/MeAIIntro").then(m => ({ default: m.MeAIIntro })));
const Values = lazy(() => import("@/components/Values").then(m => ({ default: m.Values })));
const Timeline = lazy(() => import("@/components/Timeline").then(m => ({ default: m.Timeline })));
const WhyChooseKonov = lazy(() => import("@/components/WhyChooseKonov").then(m => ({ default: m.WhyChooseKonov })));
const Testimonials = lazy(() => import("@/components/Testimonials").then(m => ({ default: m.Testimonials })));
const CTA = lazy(() => import("@/components/CTA").then(m => ({ default: m.CTA })));
const FAQ = lazy(() => import("@/components/FAQ").then(m => ({ default: m.FAQ })));
const SuccessStories = lazy(() => import("@/components/SuccessStories").then(m => ({ default: m.SuccessStories })));
const Gallery = lazy(() => import("@/components/Gallery").then(m => ({ default: m.Gallery })));

// FAQ data for structured data
const homepageFAQs = [
  { question: "What is KONOV Technologies?", answer: "KONOV Technologies is an education technology company helping young people develop the skills and confidence to understand and create Artificial Intelligence. Through our Me AI learning platform, practical AI programmes, workshops, and hackathons, we partner with schools, educators, parents, and organisations to deliver hands-on AI learning experiences where young people work with data, train AI models, and build AI systems. Our goal is to make AI education accessible, engaging, and practical while preparing the next generation of African AI innovators for an AI-powered future." },
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
        title="AI Education For Kids And Young Learners In Ghana"
        description="KONOV Technologies helps young people in Ghana and Africa learn AI, train models, build chatbots, and create real AI systems through Me AI, workshops, programs, and hackathons."
        canonical="/"
        keywords={["AI education for kids in Ghana", "AI classes for kids in Accra", "AI literacy for young people", "AI programs for young learners", "machine learning for kids", "machine learning for youth Africa", "chatbot building for kids", "AI workshops for schools in Ghana", "AI training for teachers in Ghana", "AI education for African schools", "AI learning platform for children", "AI creation platform for young learners", "youth AI hackathons", "practical AI learning for students", "Me AI platform", "KONOV Technologies"]}
        jsonLd={createFAQSchema(homepageFAQs)}
      />
      <AIMascot />
      <Navbar />
      <Hero />
      <SocialProof />
      <Suspense fallback={<SectionFallback />}>
        {/* 2. Who KONOV is */}
        <Mission />
        {/* 3. Who KONOV serves */}
        <WhoWeServe />
        {/* 4. What learners build */}
        <WhatLearnersBuild />
        {/* 5. Me AI platform introduction */}
        <MeAIIntro />
        {/* 6. Programs overview */}
        <Timeline />
        <Values />
        {/* 7. School and organization partnership section */}
        <BookFreeTrial />
        {/* 8. Why choose KONOV */}
        <WhyChooseKonov />
        <ParentTrust />
        {/* 9. Proof and impact */}
        <SuccessStories />
        <Gallery />
        <HackathonBanner />
        <Testimonials />
        <FAQ />
        {/* 10. Final call to action */}
        <CTA />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;
