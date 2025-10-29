import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

export const FAQ = () => {
  const faqs = [
    {
      question: "What age groups do you cater to?",
      answer: "We offer programs for ages 6-18, with content specifically designed for different developmental stages. Our AI Explorers (7-10), Young Builders (11-14), and Tech Ambassadors (15-18) programs ensure age-appropriate learning experiences."
    },
    {
      question: "Does my child need prior coding experience?",
      answer: "Not at all! Our programs are designed for complete beginners. We start with visual programming and gradually progress to text-based coding. Each child learns at their own pace with support from our instructors."
    },
    {
      question: "What equipment or materials do we need?",
      answer: "For workshops, we provide all materials and kits during sessions. For our EdTech platform, you'll need a computer or tablet with internet access. We offer take-home kits for continued learning at an additional cost."
    },
    {
      question: "How are workshops structured?",
      answer: "Workshops run every Saturday in 2-hour sessions. Each session includes hands-on building, coding challenges, and a project showcase. Classes are small (12-15 students) to ensure personalized attention."
    },
    {
      question: "Can schools integrate your curriculum?",
      answer: "Yes! Our School Programs include complete curriculum packages, teacher training, hardware kits, and ongoing support. We align with national education standards and can customize content for your school's needs."
    },
    {
      question: "How do I track my child's progress?",
      answer: "Our EdTech platform includes a parent dashboard showing completed courses, projects built, skills mastered, and time spent learning. You'll also receive monthly progress reports and can schedule check-ins with instructors."
    },
    {
      question: "What languages are your programs available in?",
      answer: "Our materials are available in English, French, Swahili, and Hausa. Our EdTech platform's AI tutor can answer questions in any of these languages, and our comics are translated into all four."
    },
    {
      question: "What is your refund policy?",
      answer: "We offer a full refund within the first two sessions if you're not satisfied. For our EdTech platform, you can try it free for 7 days before committing to a subscription."
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute top-1/3 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Everything you need to know about our programs
          </p>
        </div>

        <Card className="max-w-4xl mx-auto p-8 md:p-12 glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border border-primary/10 rounded-lg px-6 bg-card/30">
                <AccordionTrigger className="text-left font-orbitron font-semibold text-foreground hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-space leading-relaxed pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <div className="text-center mt-12">
          <p className="text-muted-foreground font-space mb-4">
            Still have questions?
          </p>
          <a 
            href="/contact" 
            className="text-primary hover:text-primary/80 font-space font-semibold underline underline-offset-4 transition-colors"
          >
            Contact our team →
          </a>
        </div>
      </div>
    </section>
  );
};