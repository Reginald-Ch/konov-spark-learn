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
import Resources from "./pages/Resources";
import BestAIToolsForKids from "./pages/BestAIToolsForKids";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Hackathons from "./pages/Hackathons";
import ProjectView from "./pages/ProjectView";
import JudgeDashboard from "./pages/JudgeDashboard";
import AdminPanel from "./pages/AdminPanel";
import Waitlist from "./pages/Waitlist";
import TertiaryHub from "./pages/TertiaryHub";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Retired pages that now live on another site (MeAI moved to meaitech.com).
const LeaveTo = ({ href }: { href: string }) => {
  useEffect(() => { window.location.replace(href); }, [href]);
  return null;
};

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
        <Route path="/resources" element={<PageTransition><Resources /></PageTransition>} />
        <Route path="/resources/best-ai-tools-for-kids" element={<PageTransition><BestAIToolsForKids /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
        <Route path="/hackathons" element={<PageTransition><Hackathons /></PageTransition>} />
        <Route path="/projects/:id" element={<PageTransition><ProjectView /></PageTransition>} />
        <Route path="/judge" element={<PageTransition><JudgeDashboard /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
        <Route path="/waitlist" element={<PageTransition><Waitlist /></PageTransition>} />
        <Route path="/tertiary-ai-innovation-hub" element={<PageTransition><TertiaryHub /></PageTransition>} />
        <Route path="/programs" element={<Navigate to="/classes" replace />} />
        <Route path="/ai-classes-for-kids-accra" element={<Navigate to="/classes" replace />} />
        <Route path="/summer-ai-tech-camp" element={<Navigate to="/classes" replace />} />
        <Route path="/machine-learning-for-kids" element={<Navigate to="/classes" replace />} />
        <Route path="/for-schools" element={<Navigate to="/classes" replace />} />
        <Route path="/ai-curriculum-support" element={<Navigate to="/classes" replace />} />
        <Route path="/teacher-training" element={<Navigate to="/classes" replace />} />
        <Route path="/youth-hackathons" element={<Navigate to="/ai-builder-sprint" replace />} />
        <Route path="/me-ai" element={<LeaveTo href="https://meaitech.com" />} />
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
