import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";
import { SpeechBubble } from "./SpeechBubble";

export const FAQ = () => {
  const faqs = [
     {
      question: "What is Konov Artechtist?",
      answer: "Konov Artechtist, is a company dedicated to transforming tech education across Africa. Our mission is to make emerging technologies, starting with AI, accessible, engaging, and fun for young learners.. We make tech education fun, creative, and easy to grasp.
"
    },
     {
      question: "Why should kids learn AI and Machine Learning?",
      answer: "AI is shaping the future of every industry. When kids understand how intelligent systems work, they become creators — not just consumers — of technology. Early exposure builds problem-solving, critical thinking, creativity, and confidence in the digital world."
    },
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
      answer: "For workshops, we provide all materials and kits during sessions expect laptops.Your child would need a computer or tablet."
    },
    {
      question: "How are workshops structured?",
      answer: "Workshops run every Saturday in 2-hour sessions. Each session includes hands-on building, challenges, and a project showcase. Classes are small (12-15 students) to ensure personalized attention."
    },
    {
      question: "Can schools integrate your curriculum?",
      answer: "Yes! Our School Programs include complete curriculum packages,KONOV facilitators or  teacher training, and ongoing support."
    },
    {
      question: "How do I track my child's progress?",
      answer: "Our EdTech platform includes a parent dashboard showing completed courses, projects built, skills mastered, and time spent learning. "
    },
    {
      question: "What do kids actually learn?",
      answer: "Kids learn how intelligent systems think, how to program and build simple AI systems and apps, and how data is collected, labelled, and used to make decisions. They explore how algorithms make predictions, train their own beginner-friendly AI models, and unleash creativity by using AI to create stories, images, and projects. Along the way, they also learn about AI ethics, responsible use, and how to apply problem-solving skills to real-world challenges."
    },
    {
      question: "What is included in your workshops?",
      answer: "Our workshops offer rich AI and Machine Learning lessons, beginner-friendly programming, and hands-on projects that help kids build real skills and confidence. Participants also enjoy snacks and refreshments to keep them energized, receive a proudly earned certificate of participation.Each session includes interactive challenges and a practical mini-project, ensuring every child leaves with new knowledge, improved problem-solving skills, and a fun, meaningful learning experience."
    },
    {
      question: "What is included in your workshops?",
      answer: "It is a  learning platform that teaches African children real Artificial Intelligence and Machine Learning through simple coding, hands-on model training, and culturally relevant storytelling. Unlike typical programs that focus only on robotics or basic coding, it empowers kids to build real AI systems — including chatbots, image classifiers, and audio models. Learners start with Chatie, an easy English-like coding tool, progress to Python with ChatterBot, and eventually explore our ML Studio to train real machine learning models directly in their browser.."
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden halftone-bg">
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
