import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SignupModal } from "@/components/SignupModal";
import { SEO, createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import { LineChart, Image, MessageSquareText, Rocket } from "lucide-react";

const mlFAQs = [
  { question: "What is machine learning, in kid-friendly terms?", answer: "Machine learning is how computers learn patterns from examples instead of being told exact rules — like learning to recognize a cat from lots of cat pictures." },
  { question: "What age can start learning machine learning with KONOV?", answer: "Our AI Foundations and Me AI Creators programs introduce machine learning concepts from age 6, tailored to each learner's level." },
  { question: "Will my child actually train a real model?", answer: "Yes — learners work with real data and train simple, real machine learning models, not just watch a demo." },
];

const mlBreadcrumb = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Machine Learning for Kids", url: "/machine-learning-for-kids" },
]);

const MachineLearningForKids = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen">
      <SEO
        title="Machine Learning For Kids"
        description="KONOV Technologies teaches machine learning for kids through practical, hands-on projects — training real models with real data, built for young African learners."
        canonical="/machine-learning-for-kids"
        keywords={["machine learning for kids", "AI education for kids in Ghana", "AI literacy for young people", "chatbot building for kids"]}
        jsonLd={[mlBreadcrumb, createFAQSchema(mlFAQs)]}
      />
      <Navbar />

      <section className="py-20 md:py-28 relative overflow-hidden halftone-bg border-b-4 border-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <ActionBurst color="secondary" className="mb-4 inline-block">MACHINE LEARNING FOR KIDS</ActionBurst>
          <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-6 max-w-4xl mx-auto">
            How Machines <span className="gradient-text">Actually Learn</span>
          </h1>
          <div className="flex justify-center mb-6">
            <RobotMascot type="thinking" size="lg" />
          </div>
          <SpeechBubble direction="up" className="max-w-2xl mx-auto">
            <p className="text-lg font-space leading-relaxed">
              Pattern recognition, not magic — KONOV Technologies teaches machine learning for kids through
              real, hands-on projects with real data.
            </p>
          </SpeechBubble>
          <div className="flex justify-center mt-8">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Enroll Your Child
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">
            What Kids <span className="text-primary">Actually Do</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Image, title: "Train Image Models", description: "Feed a model real images and watch it learn to recognize patterns." },
              { icon: LineChart, title: "Work With Data", description: "Explore real datasets and see how data drives predictions." },
              { icon: MessageSquareText, title: "Build Smarter Chatbots", description: "Combine ML concepts with chatbot building on Me AI." },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <ComicPanel key={idx} color={["primary", "secondary", "accent"][idx] as "primary" | "secondary" | "accent"} delay={idx * 0.1} className="p-6">
                  <Icon className="w-9 h-9 text-foreground mb-3" />
                  <h3 className="text-lg font-fredoka font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-space">{item.description}</p>
                </ComicPanel>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Start With <span className="text-primary">Real ML, Not Theory</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => setShowSignupModal(true)}>
              <Rocket className="w-5 h-5 mr-2" /> Enroll Your Child
            </Button>
            <WhatsAppButton label="Ask A Question" message="Hi! I'd like to ask about machine learning classes for kids." />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {mlFAQs.map((faq, idx) => (
              <ComicPanel key={idx} className="p-6">
                <h3 className="font-fredoka font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground font-space text-sm leading-relaxed">{faq.answer}</p>
              </ComicPanel>
            ))}
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source="free_trial" />
      <Footer />
    </div>
  );
};

export default MachineLearningForKids;
