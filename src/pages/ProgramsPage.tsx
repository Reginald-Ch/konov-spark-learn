import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Programs } from "@/components/Programs";
import { Button } from "@/components/ui/button";
import { SignupModal } from "@/components/SignupModal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Rocket, CalendarCheck, GraduationCap, Zap } from "lucide-react";
import { usePageTracking, useScrollTracking } from "@/hooks/useAnalytics";
import { motion } from "framer-motion";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";
import { SEO, createCourseSchema, createBreadcrumbSchema } from "@/components/SEO";

// Course schemas for structured data
const coursesJsonLd = [
  createCourseSchema({
    name: "KONOV Weekend AI Creators",
    description: "An 8-week weekend AI program for ages 6–16 covering AI and machine learning fundamentals, chatbots, and AI-powered projects.",
    ageRange: "Ages 6-16",
    duration: "P8W",
  }),
  createCourseSchema({
    name: "KONOV Summer AI & Tech Camp",
    description: "A vacation camp for primary, junior high, and senior high learners focused on AI, coding, creative technology, and project building.",
    ageRange: "Ages 6-16",
    duration: "P4W",
  }),
  createCourseSchema({
    name: "KONOV Tertiary AI Innovation Program",
    description: "A practical AI course program for tertiary students focused on applied AI, automation, chatbot development, and real-world problem solving, ending in a capstone hackathon.",
    ageRange: "Tertiary students",
  }),
  createBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Programs", url: "/programs" },
  ]),
];

type DetailBlock =
  | { heading: string; kind: "list"; items: string[] }
  | { heading: string; kind: "subitems"; items: { title: string; description: string }[] }
  | { heading: string; kind: "note"; note: string };

interface ProgramDetail {
  tabValue: string;
  tabLabel: string;
  mascot: "happy" | "excited" | "thinking" | "cool" | "teaching";
  headline: string;
  paragraphs: string[];
  blocks: DetailBlock[];
  ctaLabel: string;
  ctaSource: string;
}

const PROGRAM_DETAILS: ProgramDetail[] = [
  {
    tabValue: "weekend",
    tabLabel: "Weekend Programs",
    mascot: "happy",
    headline: "8-Week Weekend AI Program For Ages 6–16",
    paragraphs: [
      "KONOV Weekend AI Creators is a hands-on weekend program that helps children and teens understand how artificial intelligence works and build their own AI-powered projects.",
      "Over 8 weeks, learners explore AI and machine learning fundamentals, learn how machines work with data, understand how models are trained, build chatbots and conversational AI projects, explore responsible AI, and create simple AI apps using Me AI.",
    ],
    blocks: [
      {
        heading: "What Learners Study",
        kind: "list",
        items: [
          "AI and machine learning fundamentals",
          "How machines learn from data",
          "How AI models work",
          "Chatbots and conversational AI",
          "Working with AI models",
          "Building AI-powered apps",
          "AI ethics and responsible AI",
          "Final project building and presentation",
        ],
      },
      {
        heading: "What Learners Build",
        kind: "list",
        items: ["Chatbots", "Conversational AI projects", "AI-powered apps", "Model-based projects", "Creative AI tools", "Final AI project"],
      },
      {
        heading: "Program Outcome",
        kind: "note",
        note: "By the end of the program, learners will be able to explain basic AI concepts, understand how models work, build a chatbot, use models in a project, and present an AI-powered solution.",
      },
    ],
    ctaLabel: "Enroll For Weekend AI Creators",
    ctaSource: "free_trial",
  },
  {
    tabValue: "school",
    tabLabel: "School Programs",
    mascot: "teaching",
    headline: "Term-Based AI Enrichment For Schools",
    paragraphs: [
      "KONOV School AI Program helps schools introduce practical AI education through after-school AI clubs, termly workshops, and school-wide AI enrichment programs.",
      "The program is designed to complement ICT learning and give students hands-on experience with AI, data, machine learning, chatbots, and project-based problem solving.",
    ],
    blocks: [
      {
        heading: "Delivery Options",
        kind: "subitems",
        items: [
          { title: "After-School AI Club", description: "A term-based AI club for interested students after normal school hours." },
          { title: "Termly AI Workshops", description: "Hands-on AI workshops delivered during the school term." },
          { title: "School-Wide AI Enrichment", description: "A structured AI enrichment program for Grade 1 to Grade 9 learners, delivered as part of ICT enrichment or digital skills development." },
        ],
      },
      {
        heading: "What Schools Get",
        kind: "list",
        items: [
          "Student AI workshops",
          "After-school AI club setup",
          "Termly AI learning sessions",
          "Me AI classroom activities",
          "Teacher support",
          "Project-based learning",
          "Student showcases",
          "Optional school AI fair",
        ],
      },
    ],
    ctaLabel: "Book A School AI Program",
    ctaSource: "school_demo",
  },
  {
    tabValue: "workshops",
    tabLabel: "Workshops",
    mascot: "excited",
    headline: "Practical AI Workshops For Schools, Learners, And Organizations",
    paragraphs: [
      "KONOV AI Workshops are short, hands-on sessions that introduce learners to artificial intelligence in a simple and practical way.",
      "Participants use Me AI to explore AI concepts, train simple models, build chatbots, and complete guided AI activities.",
    ],
    blocks: [
      {
        heading: "Workshop Formats",
        kind: "list",
        items: ["Half-day workshop", "One-day workshop", "Multi-session workshop", "Termly school workshop", "Partner or organization workshop"],
      },
      {
        heading: "Best For",
        kind: "list",
        items: ["Schools", "Parents", "NGOs", "Youth organizations", "Learning centers", "Community programs", "Holiday events"],
      },
      {
        heading: "What Learners Do",
        kind: "list",
        items: ["Learn what AI is", "Explore data and patterns", "Use Me AI", "Train a simple model", "Build a chatbot", "Complete a guided AI challenge"],
      },
    ],
    ctaLabel: "Book An AI Workshop",
    ctaSource: "school_demo",
  },
  {
    tabValue: "camp",
    tabLabel: "Summer Camp",
    mascot: "excited",
    headline: "Vacation AI And Tech Camp For Young Learners",
    paragraphs: [
      "KONOV Summer AI & Tech Camp is a vacation learning experience where primary, junior high, and senior high learners explore AI, coding, creative technology, teamwork, and project building.",
      "The camp helps learners use their school break to develop practical future-ready skills while building fun and meaningful AI-powered projects.",
    ],
    blocks: [
      {
        heading: "Learner Groups",
        kind: "list",
        items: ["Lower Primary", "Upper Primary", "Junior High School", "Senior High School"],
      },
      {
        heading: "What Learners Do",
        kind: "list",
        items: ["Learn AI basics", "Use Me AI", "Build chatbots", "Train simple models", "Explore creative technology", "Work in teams", "Present final projects"],
      },
      {
        heading: "Recommended Timing",
        kind: "subitems",
        items: [
          { title: "Main Camp", description: "August" },
          { title: "Mini Camps", description: "April and December" },
        ],
      },
    ],
    ctaLabel: "Join The Summer AI & Tech Camp",
    ctaSource: "free_trial",
  },
  {
    tabValue: "hackathons",
    tabLabel: "Hackathons",
    mascot: "cool",
    headline: "AI Hackathons, Challenges, And Project Showcases",
    paragraphs: [
      "KONOV Youth AI Challenges give learners the opportunity to apply their AI skills, solve problems, build prototypes, present ideas, and compete in innovation-focused events.",
    ],
    blocks: [
      {
        heading: "Challenge Types",
        kind: "subitems",
        items: [
          { title: "Junior AI Challenge", description: "For Grade 1 to Grade 9 learners." },
          { title: "Senior AI Challenge", description: "For senior high school learners." },
          { title: "School AI Showcase", description: "For schools participating in KONOV school programs." },
        ],
      },
      {
        heading: "What Learners Do",
        kind: "list",
        items: ["Form teams", "Choose a challenge theme", "Design an AI-powered solution", "Build a prototype", "Present their idea", "Receive feedback from judges or mentors"],
      },
    ],
    ctaLabel: "Join An AI Challenge",
    ctaSource: "hackathon_interest",
  },
  {
    tabValue: "tertiary",
    tabLabel: "Tertiary Program",
    mascot: "thinking",
    headline: "Practical AI Course Program For Tertiary Students",
    paragraphs: [
      "KONOV Tertiary AI Innovation Program is a practical AI course for tertiary students, university students, and young adults who want to explore artificial intelligence, learn how AI works, and build their own AI-powered project.",
      "Participants learn AI fundamentals, prompt engineering, automation, data and machine learning basics, product thinking, and real-world problem solving.",
      "The program ends with a capstone AI hackathon where participants present their solutions and compete for cash prizes.",
    ],
    blocks: [
      {
        heading: "What Students Learn",
        kind: "list",
        items: [
          "AI fundamentals",
          "Prompt engineering",
          "Data and machine learning basics",
          "AI tools and automation",
          "Chatbot and conversational AI development",
          "Product thinking",
          "Problem-solving with AI",
          "Project presentation",
        ],
      },
      {
        heading: "Final Phase",
        kind: "note",
        note: "Tertiary AI Capstone Hackathon with cash prizes.",
      },
    ],
    ctaLabel: "Apply For The Tertiary AI Innovation Program",
    ctaSource: "free_trial",
  },
  {
    tabValue: "techfair",
    tabLabel: "Tech Fair",
    mascot: "cool",
    headline: "A Showcase For Young AI Builders",
    paragraphs: [
      "KONOV AI & Tech Fair is a showcase event where learners present AI and technology projects, schools experience practical AI learning, and partners connect with young innovators.",
    ],
    blocks: [
      {
        heading: "Best For",
        kind: "list",
        items: ["Student project showcases", "Parent engagement", "School engagement", "Partner visibility", "Sponsor visibility", "Community awareness", "AI education promotion"],
      },
    ],
    ctaLabel: "Partner With The AI & Tech Fair",
    ctaSource: "school_demo",
  },
];

const DetailBlockView = ({ block, accent }: { block: DetailBlock; accent: "primary" | "accent" }) => {
  if (block.kind === "list") {
    return (
      <div>
        <h4 className="text-lg font-fredoka font-bold mb-3 text-foreground">{block.heading}</h4>
        <ul className="space-y-2.5">
          {block.items.map((item, idx) => (
            <motion.li
              key={idx}
              className="flex items-start gap-2.5 font-space"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ x: 4 }}
            >
              <CheckCircle2 className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${accent === "primary" ? "text-primary" : "text-accent"}`} />
              <span className="text-muted-foreground text-sm">{item}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.kind === "subitems") {
    return (
      <div>
        <h4 className="text-lg font-fredoka font-bold mb-3 text-foreground">{block.heading}</h4>
        <div className="space-y-3">
          {block.items.map((item, idx) => (
            <div key={idx} className="rounded-xl border-2 border-foreground/15 bg-card/50 p-3">
              <p className="font-fredoka font-bold text-sm text-foreground">{item.title}</p>
              <p className="text-muted-foreground text-sm font-space">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h4 className="text-lg font-fredoka font-bold mb-3 text-foreground">{block.heading}</h4>
      <p className="text-muted-foreground text-sm font-space leading-relaxed">{block.note}</p>
    </div>
  );
};

const ProgramsPage = () => {
  usePageTracking('/programs');
  useScrollTracking();
  const navigate = useNavigate();

  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupSource, setSignupSource] = useState("free_trial");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const openSignup = (source: string) => {
    setSignupSource(source);
    setShowSignupModal(true);
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="AI Programs For Young Learners, Schools And Future Innovators"
        description="KONOV Technologies offers practical AI learning programs — weekend classes, school programs, workshops, camps, hackathons, and tertiary innovation programs — for young people, schools, and organizations."
        canonical="/programs"
        type="course"
        keywords={["AI programs for young learners", "AI classes for kids in Accra", "AI workshops for schools in Ghana", "youth AI hackathons", "Tertiary AI Innovation Hub", "Summer AI and Tech Camp Ghana"]}
        jsonLd={coursesJsonLd}
      />
      <Navbar />

      {/* Programs Hero */}
      <div className="w-full py-16 halftone-bg border-b-4 border-foreground relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <ActionBurst color="accent" className="mb-4 text-2xl">
              LEARN &amp; BUILD!
            </ActionBurst>
            <div className="flex items-center gap-4 mb-4">
              <RobotMascot type="excited" size="lg" />
            </div>
            <h1 className="text-4xl md:text-6xl font-fredoka font-bold mb-4 max-w-4xl">
              AI Programs For Young Learners, Schools, And <span className="gradient-text">Future Innovators</span>
            </h1>
            <SpeechBubble direction="up" className="max-w-2xl">
              <p className="text-lg font-space leading-relaxed">
                KONOV Technologies offers practical AI learning programs that help young people understand,
                create, and build with artificial intelligence. From weekend classes and school programs to
                workshops, camps, hackathons, and tertiary innovation programs, learners gain hands-on
                experience with data, models, chatbots, conversational AI, and AI-powered projects.
              </p>
            </SpeechBubble>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary" onClick={() => openSignup('free_trial')}>
                <Rocket className="w-4 h-4 mr-2" /> Enroll Your Child
              </Button>
              <Button size="lg" variant="outline" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground)/0.4)] hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.4)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-card" onClick={() => openSignup('school_demo')}>
                <CalendarCheck className="w-4 h-4 mr-2" /> Book A School Program
              </Button>
              <Button size="lg" variant="outline" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground)/0.4)] hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.4)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-card" onClick={() => openSignup('free_trial')}>
                <GraduationCap className="w-4 h-4 mr-2" /> Apply For Tertiary Program
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section ref={sectionRef} className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Program Overview */}
          <div className={`text-center mb-16 max-w-3xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
              Practical AI Learning For <span className="gradient-text">Every Stage</span>
            </h2>
            <p className="text-lg font-space text-muted-foreground leading-relaxed mb-4">
              KONOV programs are designed to help learners move from simply using AI tools to understanding
              how AI works and building their own intelligent systems.
            </p>
            <p className="text-lg font-space text-muted-foreground leading-relaxed">
              Our programs serve children, teens, schools, tertiary students, and partner organizations
              through structured learning experiences powered by Me AI, KONOV's AI creation platform for
              young learners.
            </p>
          </div>

          {/* All Programs Overview — six cards */}
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Programs />
          </div>

          {/* Detailed Program Information */}
          <div className={`mt-16 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center justify-center gap-4 mb-12">
              <ActionBurst color="primary">DETAILS</ActionBurst>
              <h2 className="text-4xl font-fredoka font-bold">
                Program <span className="gradient-text">Details</span>
              </h2>
              <ActionBurst color="secondary">INFO!</ActionBurst>
            </div>

            <Tabs defaultValue="weekend" className="w-full">
              <TabsList className="flex flex-wrap h-auto justify-center gap-1 mb-8 max-w-4xl mx-auto border-3 border-foreground rounded-2xl shadow-[4px_4px_0_hsl(var(--foreground))] p-1.5 bg-card">
                {PROGRAM_DETAILS.map((d) => (
                  <TabsTrigger key={d.tabValue} value={d.tabValue} className="font-fredoka text-xs md:text-sm rounded-full data-[state=active]:shadow-[2px_2px_0_hsl(var(--foreground))]">
                    {d.tabLabel}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PROGRAM_DETAILS.map((detail) => (
                <TabsContent key={detail.tabValue} value={detail.tabValue}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <ComicPanel className="p-6 md:p-10">
                      <div className="flex items-center gap-3 mb-4">
                        <RobotMascot type={detail.mascot} size="sm" />
                        <h3 className="text-2xl md:text-3xl font-fredoka font-bold gradient-text">{detail.headline}</h3>
                      </div>
                      <div className="space-y-3 mb-8 max-w-3xl">
                        {detail.paragraphs.map((p, i) => (
                          <p key={i} className="text-muted-foreground font-space leading-relaxed">{p}</p>
                        ))}
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                        {detail.blocks.map((block, idx) => (
                          <DetailBlockView key={idx} block={block} accent={idx % 2 === 0 ? "primary" : "accent"} />
                        ))}
                      </div>
                      <Button
                        size="lg"
                        className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-primary"
                        onClick={() => openSignup(detail.ctaSource)}
                      >
                        <Zap className="w-4 h-4 mr-2" /> {detail.ctaLabel}
                      </Button>
                    </ComicPanel>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Me AI Connection */}
          <div className="mt-24 max-w-3xl mx-auto text-center">
            <ComicPanel color="primary" className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-fredoka font-bold mb-4">
                Powered By <span className="text-primary">Me AI</span>
              </h2>
              <p className="text-muted-foreground font-space leading-relaxed mb-3">
                Me AI supports hands-on learning across KONOV programs. Learners use the platform to
                complete guided AI activities, train models, build chatbots, explore conversational AI, and
                create AI-powered projects.
              </p>
              <p className="text-muted-foreground font-space leading-relaxed mb-6">
                Me AI helps learners move from theory to practice by giving them a safe and guided space to
                build with artificial intelligence.
              </p>
              <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => navigate('/me-ai')}>
                Explore Me AI
              </Button>
            </ComicPanel>
          </div>
        </div>
      </section>

      {/* Final Programs Page CTA */}
      <section className="py-16 md:py-24 halftone-bg border-y-4 border-foreground">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-fredoka font-bold mb-6">
            Ready To Start Building <span className="text-primary">With AI?</span>
          </h2>
          <p className="text-lg text-muted-foreground font-space leading-relaxed mb-8">
            Whether you are a parent, school leader, student, or organization, KONOV has a practical AI
            learning pathway for you.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] bg-primary" onClick={() => openSignup('free_trial')}>
              <Rocket className="w-4 h-4 mr-2" /> Enroll Your Child
            </Button>
            <Button size="lg" variant="outline" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground)/0.4)] bg-card" onClick={() => openSignup('school_demo')}>
              <CalendarCheck className="w-4 h-4 mr-2" /> Book A School Program
            </Button>
            <Button size="lg" variant="outline" className="font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground)/0.4)] bg-card" onClick={() => openSignup('free_trial')}>
              <GraduationCap className="w-4 h-4 mr-2" /> Apply For Tertiary Program
            </Button>
            <WhatsAppButton />
          </div>
        </div>
      </section>

      <SignupModal open={showSignupModal} onOpenChange={setShowSignupModal} source={signupSource} />
      <Footer />
    </div>
  );
};

export default ProgramsPage;
