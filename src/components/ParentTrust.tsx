import { motion } from "framer-motion";
import { Shield, Award, Users, GraduationCap } from "lucide-react";
import { SectionReveal } from "./SectionReveal";

const trustPoints = [
  {
    icon: Shield,
    title: "Safe Learning Environment",
    description: "All sessions are supervised by trained instructors. No unsupervised internet access.",
  },
  {
    icon: GraduationCap,
    title: "Expert-Led Curriculum",
    description: "Developed by AI professionals and educators with age-appropriate progression.",
  },
  {
    icon: Users,
    title: "Small Class Sizes",
    description: "Maximum 15 students per session ensures personalized attention for every child.",
  },
  {
    icon: Award,
    title: "Proven Results",
    description: "500+ students trained. Kids build real AI projects they can show off to family.",
  },
];

const parentTestimonials = [
  {
    quote: "My daughter now explains AI concepts at dinner — she went from a consumer to a creator of technology!",
    name: "Adjoa M.",
    role: "Parent, Accra",
  },
  {
    quote: "The instructors are patient and brilliant. My son has never been this excited about learning.",
    name: "Kwame A.",
    role: "Parent, Tema",
  },
  {
    quote: "Worth every cedi. The confidence my kids gained is priceless.",
    name: "Ama K.",
    role: "Parent, Kumasi",
  },
];

export const ParentTrust = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <SectionReveal>
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
              For Parents
            </p>
            <h2 className="text-3xl md:text-4xl font-fredoka font-bold text-foreground mb-4">
              Why Parents Choose KONOV
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              We understand your child's safety and growth come first. Here's why families across Ghana trust us.
            </p>
          </div>
        </SectionReveal>

        {/* Trust points grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {trustPoints.map((point, idx) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border-2 border-foreground/10 rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <point.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-fredoka font-bold text-foreground mb-2">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Parent testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {parentTestimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="bg-card border border-foreground/10 rounded-2xl p-6"
            >
              <p className="text-foreground italic mb-4 leading-relaxed">"{t.quote}"</p>
              <div>
                <p className="font-fredoka font-bold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
