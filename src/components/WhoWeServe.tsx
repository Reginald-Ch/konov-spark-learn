import { GraduationCap, Users, School, Building2, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "./ComicPanel";

export const WhoWeServe = () => {
  const audiences = [
    {
      icon: GraduationCap,
      title: "Young Learners",
      description: "Ages 6-18 exploring AI through hands-on lessons, projects, and creative challenges.",
      color: "primary" as const,
    },
    {
      icon: Users,
      title: "Parents",
      description: "Looking for practical, safe, and engaging AI learning for their children.",
      color: "secondary" as const,
    },
    {
      icon: School,
      title: "Schools & Educators",
      description: "Bringing AI literacy into the classroom through workshops and teacher training.",
      color: "accent" as const,
    },
    {
      icon: GraduationCap,
      title: "Tertiary Students",
      description: "Applying AI to real product building, automation, data, and research.",
      color: "primary" as const,
    },
    {
      icon: HeartHandshake,
      title: "NGOs & Sponsors",
      description: "Investing in Africa's future AI talent through partnerships and programs.",
      color: "secondary" as const,
    },
    {
      icon: Building2,
      title: "Organizations",
      description: "Partnering with KONOV on youth innovation and workforce-readiness initiatives.",
      color: "accent" as const,
    },
  ];

  return (
    <section className="py-14 md:py-20 relative overflow-hidden halftone-bg">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-fredoka font-bold mb-4">
            Built For Learners, Schools, And{" "}
            <span className="text-primary">Future-Focused Organizations</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            KONOV Technologies serves young learners, parents, schools, educators, tertiary students,
            NGOs, corporate sponsors, and organizations investing in Africa's future talent.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {audiences.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ComicPanel key={idx} color={item.color} delay={idx * 0.08}>
                <div className="p-6">
                  <motion.div
                    className={`w-14 h-14 rounded-2xl ${
                      item.color === 'primary' ? 'bg-primary' :
                      item.color === 'secondary' ? 'bg-secondary' :
                      'bg-accent'
                    } flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-7 h-7 text-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-space leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </ComicPanel>
            );
          })}
        </div>
      </div>
    </section>
  );
};
