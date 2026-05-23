import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";
import { SpeechBubble } from "./SpeechBubble";

export const FAQ = () => {
  const faqs = [
    {
      question: "What is KONOV?",
      answer: "KONOV is an AI & Machine Learning education company helping young learners develop practical, future-ready technology skills. We believe children should not only grow up using technology — they should learn how to understand, think with, and build using Artificial Intelligence. Through school partnerships, workshops, and our learning platform MeAI, we make AI & ML education practical, engaging, and accessible for young learners."
    },
    {
      question: "What does KONOV do?",
      answer: "KONOV provides practical AI & Machine Learning learning experiences through: 🏫 School Partnerships — bringing AI learning directly into schools; 🛠 AI Workshops & Programs — hands-on learning experiences; 💻 The MeAI Learning Platform — interactive AI learning through projects, games, and experimentation; 🎓 Future-Ready Education — helping students develop practical emerging technology skills. Our goal: move students from passive technology users to active AI creators."
    },
    {
      question: "What is MeAI?",
      answer: "MeAI is KONOV's interactive AI & Machine Learning learning platform for young learners aged 6–16. Students learn by building, experimenting, and creating: 🤖 Build AI assistants & conversational AI · 🧠 Train simple Machine Learning models · 🎮 Create AI-powered games and missions · 💻 Build AI-powered projects · ✨ Learn through prompting and creativity."
    },
    {
      question: "Who is KONOV designed for?",
      answer: "🧒 Young Learners (ages 6–16) building practical AI knowledge and confidence · 🏫 Schools partnering with us to introduce practical AI & ML learning · 👨‍👩‍👧 Parents who want safe, guided, practical tech learning for their children · 🌍 Educational organizations & partners interested in future-ready education and AI literacy."
    },
    {
      question: "What age range do you work with?",
      answer: "Our programs and learning experiences are designed for young learners aged 6–16. We tailor each experience by age and understanding level so learning stays age-appropriate, practical, fun, and beginner-friendly."
    },
    {
      question: "What do students actually learn?",
      answer: "Students learn practical AI & ML skills through hands-on experiences. Depending on age and level they can: 🤖 build AI assistants & conversational AI · 🧠 train simple ML models using real data · 🎮 create AI-powered games and missions · 💻 build AI-powered projects · ✨ learn through prompting, creativity, and experimentation · 📚 understand AI concepts in fun, simple, practical ways. Our focus: learning AI by building with AI."
    },
    {
      question: "Why should children learn AI early?",
      answer: "AI is rapidly shaping education, healthcare, business, finance, creativity, and future careers — yet many children grow up only using technology without understanding how it works. Learning AI early helps children understand AI concepts, build confidence with technology, strengthen creativity and problem-solving, and learn how to create — not just consume. The future will increasingly belong to those who understand and build with AI."
    },
    {
      question: "Do students need coding experience?",
      answer: "No prior coding experience is required. KONOV's learning experiences are beginner-friendly. Students start with foundational concepts and gradually progress into more advanced AI building experiences at their own pace, through exploration, creativity, and hands-on practice."
    },
    {
      question: "How does learning happen?",
      answer: "At KONOV, learning is practical, interactive, hands-on, and fun. Students learn by doing — building real AI projects, training models, experimenting with prompts, and creating their own AI-powered games and assistants, with guidance from KONOV facilitators and the MeAI platform."
    },
    {
      question: "Can schools partner with KONOV?",
      answer: "Yes. We partner with schools to bring practical AI & Machine Learning learning into the classroom through curriculum support, facilitator-led sessions, teacher training, and access to the MeAI learning platform. Book a school demo to get started."
    },
  ];

  return (
    <section className="py-14 md:py-20 relative overflow-hidden halftone-bg">
      <motion.div 
        className="absolute top-1/3 -left-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-1/3 -right-20 w-72 h-72 bg-accent/15 rounded-full blur-3xl"
        animate={{ y: [30, 0, 30] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header with Mascot */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-12">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
              Got <span className="text-primary">Questions</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl font-space leading-relaxed">
              Everything you need to know about our programs
            </p>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="relative"
          >
            <RobotMascot type="thinking" size="lg" />
            <div className="absolute -top-14 right-0">
              <SpeechBubble direction="bottom" className="text-sm whitespace-nowrap">
                I've got answers! 💡
              </SpeechBubble>
            </div>
          </motion.div>
        </div>

        <ComicPanel color="primary" className="max-w-4xl mx-auto">
          <div className="p-6 md:p-10">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AccordionItem 
                    value={`item-${idx}`} 
                    className="border-3 border-foreground/20 rounded-xl px-5 bg-card/50 hover:border-primary/50 transition-colors"
                  >
                    <AccordionTrigger className="text-left font-fredoka font-bold text-foreground hover:text-primary transition-colors py-4">
                      <span className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                        {faq.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground font-space leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </ComicPanel>

        <motion.div 
          className="text-center mt-10"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-muted-foreground font-space mb-4">
            Still have questions?
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-fredoka font-bold text-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Contact our team →
          </a>
        </motion.div>
      </div>
    </section>
  );
};
