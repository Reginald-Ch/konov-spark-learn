import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
import Home from "./pages/site/Home";
import Classes from "./pages/site/Classes";
import Sprint from "./pages/site/Sprint";
import Forge from "./pages/site/Forge";
import About from "./pages/site/About";
import Contact from "./pages/site/Contact";
import Privacy from "./pages/site/Privacy";
import { showPrivacy } from "./site/links";
import Community from "./pages/Community";
import ProgramsPage from "./pages/ProgramsPage";
import Resources from "./pages/Resources";
import BestAIToolsForKids from "./pages/BestAIToolsForKids";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Hackathons from "./pages/Hackathons";
import ProjectView from "./pages/ProjectView";
import JudgeDashboard from "./pages/JudgeDashboard";
import AdminPanel from "./pages/AdminPanel";
import Waitlist from "./pages/Waitlist";
import MeAI from "./pages/MeAI";
import ForSchools from "./pages/ForSchools";
import AIClassesForKids from "./pages/AIClassesForKids";
import TertiaryHub from "./pages/TertiaryHub";
import YouthHackathons from "./pages/YouthHackathons";
import MachineLearningForKids from "./pages/MachineLearningForKids";
import SummerCamp from "./pages/SummerCamp";
import CurriculumSupport from "./pages/CurriculumSupport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* The redesigned pages skip PageTransition: its transform would break their fixed phone bar and menu. */}
        <Route path="/" element={<Home />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/ai-builder-sprint" element={<Sprint />} />
        <Route path="/forge" element={<Forge />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        {showPrivacy && <Route path="/privacy" element={<Privacy />} />}
        <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
        <Route path="/programs" element={<PageTransition><ProgramsPage /></PageTransition>} />
        <Route path="/resources" element={<PageTransition><Resources /></PageTransition>} />
        <Route path="/resources/best-ai-tools-for-kids" element={<PageTransition><BestAIToolsForKids /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
        <Route path="/hackathons" element={<PageTransition><Hackathons /></PageTransition>} />
        <Route path="/projects/:id" element={<PageTransition><ProjectView /></PageTransition>} />
        <Route path="/judge" element={<PageTransition><JudgeDashboard /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
        <Route path="/waitlist" element={<PageTransition><Waitlist /></PageTransition>} />
        <Route path="/me-ai" element={<PageTransition><MeAI /></PageTransition>} />
        <Route path="/for-schools" element={<PageTransition><ForSchools /></PageTransition>} />
        <Route path="/ai-classes-for-kids-accra" element={<PageTransition><AIClassesForKids /></PageTransition>} />
        <Route path="/teacher-training" element={<Navigate to="/for-schools" replace />} />
        <Route path="/tertiary-ai-innovation-hub" element={<PageTransition><TertiaryHub /></PageTransition>} />
        <Route path="/youth-hackathons" element={<PageTransition><YouthHackathons /></PageTransition>} />
        <Route path="/machine-learning-for-kids" element={<PageTransition><MachineLearningForKids /></PageTransition>} />
        <Route path="/summer-ai-tech-camp" element={<PageTransition><SummerCamp /></PageTransition>} />
        <Route path="/ai-curriculum-support" element={<PageTransition><CurriculumSupport /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("An error occurred. Please try again.");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
