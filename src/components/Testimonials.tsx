import { Quote, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ComicPanel } from "./ComicPanel";
import { RobotMascot } from "./RobotMascot";

export const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      name: "Mrs. Adebayo",
      role: "Parent of 9-year-old",
      content: "After just two workshops, Tunde built his first robot at home using cardboard and simple circuits. He explained how AI works to his younger sister. I've never seen him this excited about learning!",
      rating: 5,
      mascot: "happy" as const,
    },
    {
      name: "Principal Okonkwo",
      role: "Greenfield Academy, Lagos",
      content: "We integrated Konov's curriculum last term. Our Year 5 students now understand machine learning basics and created an app that identifies plants. Parents are amazed at what their children can do.",
      rating: 5,
      mascot: "teaching" as const,
    },
    {
      name: "Chidi Eze",
      role: "Parent of two learners",
      content: "My kids race home to read the tech comics. They're learning AI, robotics, and coding through stories they actually want to read. It's the perfect blend of education and entertainment.",
      rating: 5,
      mascot: "excited" as const,
    },
    {
      name: "Ms. Kamau",
      role: "Computer Studies Teacher",
      content: "The hands-on approach works wonders. Students who struggled with abstract concepts now excel because they're building real projects. The platform's progress tracking helps me support each child individually.",
      rating: 5,
      mascot: "thinking" as const,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden halftone-bg">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-12"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
            What <span className="text-primary">Parents</span> &{" "}
            <span className="text-secondary">Educators</span> Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Join thousands of happy families and schools transforming education
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative min-h-[350px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <ComicPanel color="secondary">
                  <div className="p-8 md:p-12">
                    <div className="flex items-start gap-6">
                      <div className="hidden md:block">
                        <RobotMascot type={testimonials[activeIndex].mascot} size="md" />
                      </div>
                      
                      <div className="flex-1">
                        <Quote className="w-10 h-10 text-secondary/50 mb-4" />
                        
                        <p className="text-xl md:text-2xl text-foreground font-space leading-relaxed mb-6">
                          "{testimonials[activeIndex].content}"
                        </p>
                        
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <div className="font-fredoka font-bold text-xl text-foreground">
                              {testimonials[activeIndex].name}
                            </div>
                            <div className="text-muted-foreground font-space">
                              {testimonials[activeIndex].role}
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                              >
                                <Star className="w-6 h-6 fill-secondary text-secondary" />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ComicPanel>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`transition-all duration-300 rounded-full border-2 border-foreground ${
                  idx === activeIndex
                    ? "w-10 h-4 bg-gradient-to-r from-primary to-secondary"
                    : "w-4 h-4 bg-card hover:bg-primary/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
