import { motion, useScroll, useTransform } from "framer-motion";
import { BookOpen, Palette, Laptop, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";
import { ComicPanel } from "./ComicPanel";
import { useRef } from "react";

const timelineEvents = [
  {
    icon: BookOpen,
    title: "Interactive Workshops",
    description: "Hands-on tech workshops where kids build robots, create AI apps, and explore the future of technology.",
    age: "Ages 6-14",
    color: "primary" as const,
  },
  {
    icon: Palette,
    title: "Tech Comics",
    description: "Adventure-packed comics that transform complex AI concepts into exciting stories.",
    age: "Ages 7-13",
    color: "secondary" as const,
  },
  {
    icon: Laptop,
    title: "EdTech Platform",
    description: "Gamified courses with real-time progress tracking and AI-powered personalized tutoring.",
    age: "Ages 8-16",
    color: "accent" as const,
  },
  {
    icon: GraduationCap,
    title: "School Programs",
    description: "Comprehensive curriculum integration bringing cutting-edge tech education to classrooms.",
    age: "K-12",
    color: "primary" as const,
  },
];

export const Timeline = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={containerRef} className="py-24 md:py-32 relative overflow-hidden halftone-bg">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
            Your Child's{" "}
            <span className="text-primary">Learning</span>{" "}
            <span className="text-secondary">Path</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space">
            Multiple ways to learn—choose what works best for your child
          </p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          {/* Animated Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-2 -translate-x-1/2 overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-foreground/20" />
            <motion.div
              style={{ height: lineHeight }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary via-secondary to-accent"
            />
          </div>

          {/* Timeline Events */}
          <div className="space-y-20">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative flex items-center ${
                    isLeft ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* Content Card */}
                  <div className={`w-full md:w-5/12 ${isLeft ? "md:pr-12" : "md:pl-12"}`}>
                    <ComicPanel color={event.color}>
                      <div className="p-6">
                        <div className={`flex items-start gap-4 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                          <motion.div 
                            className={`p-3 rounded-xl bg-gradient-to-br ${
                              event.color === 'primary' ? 'from-primary to-primary/70' :
                              event.color === 'secondary' ? 'from-secondary to-secondary/70' :
                              'from-accent to-accent/70'
                            }`}
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Icon className="w-7 h-7 text-foreground" />
                          </motion.div>
                          <div className={`flex-1 ${isLeft ? "" : "md:text-right"}`}>
                            <h3 className="text-2xl font-fredoka font-bold mb-2 text-foreground">
                              {event.title}
                            </h3>
                            <p className="text-muted-foreground font-space mb-3">
                              {event.description}
                            </p>
                            <span className={`inline-block px-4 py-1 rounded-full text-sm font-fredoka font-bold bg-gradient-to-r ${
                              event.color === 'primary' ? 'from-primary/20 to-primary/10 text-primary border-2 border-primary/30' :
                              event.color === 'secondary' ? 'from-secondary/20 to-secondary/10 text-secondary border-2 border-secondary/30' :
                              'from-accent/20 to-accent/10 text-accent border-2 border-accent/30'
                            }`}>
                              {event.age}
                            </span>
                            <div className="mt-4">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="font-fredoka rounded-full border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))] hover:shadow-[3px_3px_0_hsl(var(--foreground))] transition-all"
                              >
                                Learn More
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ComicPanel>
                  </div>

                  {/* Center Dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
                    className="absolute left-1/2 -translate-x-1/2 z-10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      className={`w-8 h-8 rounded-full border-4 border-background shadow-lg ${
                        event.color === 'primary' ? 'bg-primary' :
                        event.color === 'secondary' ? 'bg-secondary' :
                        'bg-accent'
                      }`}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
