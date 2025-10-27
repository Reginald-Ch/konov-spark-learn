import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BookOpen, Palette, Laptop, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";

const timelineEvents = [
  {
    icon: BookOpen,
    title: "Interactive Workshops",
    description: "Hands-on tech workshops where kids build robots, create AI apps, and explore the future of technology.",
    age: "Ages 6-14",
    gradient: "from-primary via-accent to-primary",
  },
  {
    icon: Palette,
    title: "Tech Comics",
    description: "Adventure-packed comics that transform complex AI concepts into exciting stories.",
    age: "Ages 7-13",
    gradient: "from-accent via-secondary to-accent",
  },
  {
    icon: Laptop,
    title: "EdTech Platform",
    description: "Gamified courses with real-time progress tracking and AI-powered personalized tutoring.",
    age: "Ages 8-16",
    gradient: "from-secondary via-primary to-secondary",
  },
  {
    icon: GraduationCap,
    title: "School Programs",
    description: "Comprehensive curriculum integration bringing cutting-edge tech education to classrooms.",
    age: "K-12",
    gradient: "from-primary via-accent to-secondary",
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
    <section ref={containerRef} className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Our <span className="gradient-text">Learning Journey</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space">
            A progressive pathway from exploration to mastery
          </p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          {/* Animated Center Line with Glow */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 overflow-hidden">
            {/* Static gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-accent/20 to-secondary/20" />
            
            {/* Animated progress line */}
            <motion.div
              style={{ height: lineHeight }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary via-accent to-secondary"
            />
            
            {/* Animated glow effect */}
            <motion.div
              animate={{
                y: ["0%", "100%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute w-8 h-32 -left-[14px] blur-xl bg-gradient-to-b from-transparent via-primary to-transparent opacity-60"
            />
          </div>

          {/* Timeline Events */}
          <div className="space-y-24">
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
                  <div className={`w-full md:w-5/12 ${isLeft ? "md:pr-16" : "md:pl-16"}`}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="glow-card p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-primary/20"
                    >
                      <div className={`flex items-start gap-4 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${event.gradient}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className={`flex-1 ${isLeft ? "" : "md:text-right"}`}>
                          <h3 className="text-2xl font-orbitron font-bold mb-2">
                            {event.title}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {event.description}
                          </p>
                          <span className="inline-block px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20">
                            {event.age}
                          </span>
                          <div className="mt-4">
                            <Button variant="outline" size="sm">
                              Learn More
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Center Dot with Glow */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
                    className="absolute left-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="relative">
                      {/* Outer glow ring */}
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.2,
                        }}
                        className={`absolute inset-0 w-8 h-8 rounded-full bg-gradient-to-br ${event.gradient} blur-md`}
                      />
                      {/* Inner dot */}
                      <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${event.gradient} border-4 border-background`} />
                    </div>
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
