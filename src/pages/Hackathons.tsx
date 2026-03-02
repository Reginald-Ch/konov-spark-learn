import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { HackathonCard } from '@/components/hackathon/HackathonCard';
import { RegistrationModal } from '@/components/hackathon/RegistrationModal';
import { TeamsModal } from '@/components/hackathon/TeamsModal';
import { SubmissionModal } from '@/components/hackathon/SubmissionModal';
// SubmissionsGallery removed - Showcase tab uses ProjectGallery instead
import { Leaderboard } from '@/components/hackathon/Leaderboard';
import { GettingStarted } from '@/components/hackathon/GettingStarted';
import { HackathonFAQ } from '@/components/hackathon/HackathonFAQ';
import { ProjectEditor, ProjectType } from '@/components/hackathon/ProjectEditor';
import { QuickSubmitModal } from '@/components/hackathon/QuickSubmitModal';
import { CommunityChat } from '@/components/hackathon/CommunityChat';
import { TemplatesTab } from '@/components/hackathon/TemplatesTab';
import { AIModelsTab } from '@/components/hackathon/AIModelsTab';
import { ProjectGallery } from '@/components/hackathon/ProjectGallery';
import { LearnTab } from '@/components/hackathon/LearnTab';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code, Trophy, Sparkles, ArrowLeft, Brain,
  Rocket, Zap, Circle, Calendar, Hash,
  Users, MessageSquare, Terminal, HelpCircle, BookOpen, Award, Image, GraduationCap, X, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Hackathon {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  status: 'upcoming' | 'live' | 'ended';
  prizes: string | null;
}

type MainTab = 'build' | 'templates' | 'hackathons' | 'ai-models' | 'learn';
type HackathonSubView = 'all-events' | 'live-now' | 'upcoming' | 'past-events' | 'leaderboard' | 'showcase' | 'getting-started' | 'faq';

const Hackathons = () => {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  
  const [quickSubmitOpen, setQuickSubmitOpen] = useState(false);
  const [communityChatOpen, setCommunityChatOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<MainTab>('templates');
  const [hackathonSubView, setHackathonSubView] = useState<HackathonSubView>('all-events');
  
  // Build tab state
  const [buildCode, setBuildCode] = useState<string | undefined>(undefined);
  const [buildTemplate, setBuildTemplate] = useState<ProjectType | undefined>(undefined);

  // First-time onboarding
  useEffect(() => {
    const visited = localStorage.getItem('hackathons_visited');
    if (!visited) {
      setShowOnboarding(true);
      setActiveTab('templates');
      localStorage.setItem('hackathons_visited', 'true');
    }
  }, []);

  useEffect(() => {
    fetchHackathons();

    const hackathonsChannel = supabase
      .channel('hackathons-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathons' }, () => fetchHackathons())
      .subscribe();

    const registrationsChannel = supabase
      .channel('registrations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathon_registrations' }, () => fetchHackathons())
      .subscribe();

    return () => {
      supabase.removeChannel(hackathonsChannel);
      supabase.removeChannel(registrationsChannel);
    };
  }, []);

  const fetchHackathons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .order('start_date', { ascending: true });

    if (!error && data) {
      setHackathons(data as Hackathon[]);
    }
    setIsLoading(false);
  };

  const handleRegister = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) { setSelectedHackathon(hackathon); setRegistrationModalOpen(true); }
  };

  const handleViewTeams = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) { setSelectedHackathon(hackathon); setTeamsModalOpen(true); }
  };

  const handleSubmitProject = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) { setSelectedHackathon(hackathon); setSubmissionModalOpen(true); }
  };

  const handleStartBuilding = (code: string, templateId: string) => {
    setBuildCode(code || undefined);
    setBuildTemplate(templateId as ProjectType);
    setActiveTab('build');
  };

  const handleViewCode = (code: string) => {
    // Open code in read-only view — don't destroy current build session
    const confirmed = !buildCode || confirm('This will load new code into the editor. Any unsaved changes will be lost. Continue?');
    if (!confirmed) return;
    setBuildCode(code);
    setBuildTemplate(undefined);
    setActiveTab('build');
  };

  const liveHackathons = hackathons.filter(h => h.status === 'live');
  const upcomingHackathons = hackathons.filter(h => h.status === 'upcoming');
  const endedHackathons = hackathons.filter(h => h.status === 'ended');
  const onlineMembers = hackathons.reduce((acc, h) => acc + h.current_participants, 0);

  const getFilteredHackathons = () => {
    switch (hackathonSubView) {
      case 'live-now': return liveHackathons;
      case 'upcoming': return upcomingHackathons;
      case 'past-events': return endedHackathons;
      default: return hackathons;
    }
  };

  const MAIN_TABS = [
    { id: 'build' as MainTab, name: 'Build', icon: Code, color: '#5865F2', desc: 'Python AI IDE' },
    { id: 'templates' as MainTab, name: 'Templates', icon: Rocket, color: '#F7941D', desc: '1-Click Starters' },
    { id: 'hackathons' as MainTab, name: 'Hackathons', icon: Trophy, color: '#C70110', desc: 'Events & Leaderboard' },
    { id: 'ai-models' as MainTab, name: 'AI Models', icon: Brain, color: '#9B59B6', desc: 'Train & Export' },
    { id: 'learn' as MainTab, name: 'Learn', icon: GraduationCap, color: '#006600', desc: 'Tutorials & Guides' },
  ];

  return (
    <TooltipProvider>
      <div className="h-screen bg-[hsl(var(--discord-darker))] flex flex-col md:flex-row overflow-hidden">
        <SEO 
          title="FORGE — Build AI Projects"
          description="Build AI projects with Python. 1-click templates, AI models, hackathons, and more!"
        />

        {/* Onboarding Overlay */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
              onClick={() => setShowOnboarding(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-[hsl(var(--discord-dark))] rounded-xl border border-[hsl(var(--discord-light)/0.3)] max-w-md w-full p-6 relative"
              >
                <button onClick={() => setShowOnboarding(false)} className="absolute top-3 right-3 text-[hsl(var(--discord-text-muted))] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #C70110 0%, #F7941D 50%, #006600 100%)' }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Welcome to FORGE! 🎉</h2>
                  <p className="text-[hsl(var(--discord-text-muted))] text-sm">Build AI projects with Python in 3 easy steps</p>
                </div>

                <div className="space-y-4 mb-6">
                  {[
                    { step: 1, icon: Rocket, text: 'Pick a template', desc: 'Choose from AI Chatbot or AI Agent', color: '#F7941D' },
                    { step: 2, icon: Code, text: 'Write your code', desc: 'Edit Python code in our browser IDE with AI help', color: '#5865F2' },
                    { step: 3, icon: Zap, text: 'Deploy & share', desc: 'Publish your project and earn leaderboard points', color: '#006600' },
                  ].map(item => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}40` }}>
                        <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{item.step}. {item.text}</p>
                        <p className="text-[hsl(var(--discord-text-muted))] text-xs">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={() => { setShowOnboarding(false); setActiveTab('templates'); }} className="w-full"
                  style={{ background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)' }}>
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started — Pick a Template
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Icon Rail */}
        <div className="w-full md:w-[72px] bg-[hsl(var(--discord-darker))] flex md:flex-col items-center py-2 md:py-3 gap-2 border-b md:border-b-0 md:border-r border-[hsl(var(--discord-light)/0.2)] overflow-x-auto md:overflow-x-visible flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                whileHover={{ scale: 1.1, borderRadius: '16px' }}
                onClick={() => {
                  if (activeTab === 'templates') {
                    navigate('/');
                  } else {
                    setActiveTab('templates');
                  }
                }}
                className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-light))] flex items-center justify-center cursor-pointer transition-all hover:bg-primary hover:rounded-[16px] group"
              >
                <ArrowLeft className="w-5 h-5 text-[hsl(var(--discord-text))] group-hover:text-white" />
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right"><p>{activeTab === 'templates' ? 'Back to Home' : 'Back to Templates'}</p></TooltipContent>
          </Tooltip>
          
          <div className="w-8 h-0.5 bg-[hsl(var(--discord-light))] rounded-full my-1" />

          {/* Main Tab Icons */}
          {MAIN_TABS.map(tab => (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <motion.div 
                  whileHover={{ scale: 1.1, borderRadius: '16px' }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-12 h-12 rounded-[24px] flex items-center justify-center cursor-pointer transition-all relative ${
                    activeTab === tab.id ? 'rounded-[16px]' : ''
                  }`}
                  style={{ backgroundColor: activeTab === tab.id ? tab.color : 'hsl(var(--discord-light))' }}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-[hsl(var(--discord-text-muted))]'}`} />
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -left-[6px] w-1 h-8 rounded-r-full bg-white"
                    />
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-semibold">{tab.name}</p>
                <p className="text-xs text-muted-foreground">{tab.desc}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="w-8 h-0.5 bg-[hsl(var(--discord-light))] rounded-full my-1" />

          {/* Community & Quick Submit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                whileHover={{ scale: 1.1, borderRadius: '16px' }}
                onClick={() => setCommunityChatOpen(true)}
                className="w-12 h-12 rounded-[24px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 text-white" />
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right"><p className="font-semibold">Community</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                whileHover={{ scale: 1.1, borderRadius: '16px' }}
                onClick={() => setQuickSubmitOpen(true)}
                className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-green))] flex items-center justify-center cursor-pointer"
              >
                <Terminal className="w-5 h-5 text-white" />
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right"><p className="font-semibold">Quick Submit</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Hackathons Sub-sidebar (only for hackathons tab) */}
        {activeTab === 'hackathons' && (
          <div className="hidden md:flex w-56 bg-[hsl(var(--discord-dark))] flex-col border-r border-[hsl(var(--discord-darker))]">
            <div className="h-12 px-4 flex items-center border-b border-[hsl(var(--discord-darker))] shadow-sm">
              <span className="font-semibold text-white truncate">Python AI Hackathons</span>
            </div>
            <ScrollArea className="flex-1 px-2 py-3">
              {[
                { id: 'all-events' as HackathonSubView, name: 'All Events', icon: Hash, count: hackathons.length },
                { id: 'live-now' as HackathonSubView, name: 'Live Now', icon: Zap, count: liveHackathons.length, live: true },
                { id: 'upcoming' as HackathonSubView, name: 'Upcoming', icon: Calendar, count: upcomingHackathons.length },
                { id: 'past-events' as HackathonSubView, name: 'Past Events', icon: Trophy, count: endedHackathons.length },
              { id: 'leaderboard' as HackathonSubView, name: 'Leaderboard', icon: Award, count: 0 },
              { id: 'showcase' as HackathonSubView, name: 'Showcase', icon: Image, count: 0 },
              ].map(ch => (
                <motion.button
                  key={ch.id}
                  onClick={() => { setHackathonSubView(ch.id); }}
                  whileHover={{ scale: 1.02 }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                    hackathonSubView === ch.id 
                      ? 'bg-[hsl(var(--discord-light)/0.6)] text-white' 
                      : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                  }`}
                >
                  <ch.icon className={`w-4 h-4 ${ch.live ? 'text-[hsl(var(--discord-red))] animate-pulse' : ''}`} />
                  <span className="flex-1 text-left truncate">{ch.name}</span>
                  {ch.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      ch.live ? 'bg-[hsl(var(--discord-red))] text-white' : 'bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))]'
                    }`}>{ch.count}</span>
                  )}
                </motion.button>
              ))}

              <div className="my-3 h-px bg-[hsl(var(--discord-light)/0.2)]" />

              {/* Resources */}
              {[
                { id: 'getting-started' as HackathonSubView, name: 'Getting Started', icon: BookOpen },
                { id: 'faq' as HackathonSubView, name: 'FAQ & Help', icon: HelpCircle },
              ].map(ch => (
                <motion.button
                  key={ch.id}
                  onClick={() => setHackathonSubView(ch.id)}
                  whileHover={{ scale: 1.02 }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                    hackathonSubView === ch.id
                      ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                      : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                  }`}
                >
                  <ch.icon className="w-4 h-4" />
                  <span>{ch.name}</span>
                </motion.button>
              ))}

              <a href="/judge" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))] transition-colors mb-0.5">
                <Shield className="w-4 h-4 text-[#FFD700]" />
                <span>Judge Dashboard</span>
              </a>

              {/* Past events info */}
              {endedHackathons.length > 0 && (
                <>
                  <div className="my-3 h-px bg-[hsl(var(--discord-light)/0.2)]" />
                  <p className="px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">Past Events</p>
                  {endedHackathons.map(h => (
                    <motion.button
                      key={h.id}
                      onClick={() => setHackathonSubView('past-events')}
                      whileHover={{ scale: 1.02 }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)]"
                    >
                      <Trophy className="w-3.5 h-3.5 text-[hsl(var(--discord-yellow))]" />
                      <span className="truncate">{h.title}</span>
                    </motion.button>
                  ))}
                </>
              )}
            </ScrollArea>

            {/* Stats */}
            <div className="p-3 border-t border-[hsl(var(--discord-darker))]">
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--discord-text-muted))]">
                <Circle className="w-2 h-2 fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))]" />
                {onlineMembers} hackers • {hackathons.length} events
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-[hsl(var(--discord-dark))] overflow-hidden">
          <AnimatePresence mode="wait">
            {/* BUILD TAB */}
            {activeTab === 'build' && (
              <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
                <ProjectEditor key={`${buildTemplate}-${buildCode?.slice(0, 20)}`} initialType={buildTemplate} initialCode={buildCode} />
              </motion.div>
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
              <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
                <TemplatesTab onStartBuilding={handleStartBuilding} />
              </motion.div>
            )}

            {/* AI MODELS TAB */}
            {activeTab === 'ai-models' && (
              <motion.div key="ai-models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
                <AIModelsTab onViewCode={handleViewCode} />
              </motion.div>
            )}

            {/* GALLERY TAB */}
            {activeTab === 'gallery' && (
              <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto p-6">
                <ProjectGallery onViewCode={handleViewCode} />
              </motion.div>
            )}

            {/* LEARN TAB */}
            {activeTab === 'learn' && (
              <motion.div key="learn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
                <LearnTab onNavigateToBuild={() => setActiveTab('build')} onNavigateToTemplates={() => setActiveTab('templates')} />
              </motion.div>
            )}

            {/* HACKATHONS TAB */}
            {activeTab === 'hackathons' && (
              <motion.div key="hackathons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
                {/* Header Bar */}
                <div className="h-12 px-4 flex items-center gap-4 border-b border-[hsl(var(--discord-darker))] shadow-sm flex-shrink-0">
                  {hackathonSubView === 'leaderboard' ? (
                    <Award className="w-5 h-5 text-[hsl(var(--discord-yellow))]" />
                  ) : (
                    <Hash className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />
                  )}
                  <span className="font-semibold text-white">
                    {hackathonSubView.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <AnimatePresence mode="wait">
                    {hackathonSubView === 'leaderboard' ? (
                      <motion.div key="lb" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <Leaderboard />
                      </motion.div>
                    ) : hackathonSubView === 'getting-started' ? (
                      <motion.div key="gs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <GettingStarted onNavigate={(ch) => setHackathonSubView(ch as HackathonSubView)} />
                      </motion.div>
                    ) : hackathonSubView === 'faq' ? (
                      <motion.div key="faq" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <HackathonFAQ />
                      </motion.div>
                    ) : (
                      <motion.div key="events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        {/* Welcome Banner */}
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg p-6 mb-8 relative overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, #C70110 0%, #F7941D 50%, #006600 100%)' }}
                        >
                          <div className="absolute inset-0 opacity-10">
                            <Sparkles className="w-32 h-32 text-white absolute top-4 right-4" />
                            <Zap className="w-24 h-24 text-white absolute bottom-4 left-4" />
                          </div>
                          <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                              <Sparkles className="w-8 h-8" />
                              Build AI Projects with Python!
                            </h1>
                            <p className="text-white/90 text-lg max-w-2xl">
                              Use Python, PyTorch, TensorFlow, and AI models to build innovative solutions.
                            </p>
                            <div className="flex flex-wrap items-center gap-6 mt-4">
                              <div className="flex items-center gap-2 text-white">
                                <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                                <span className="font-medium">{onlineMembers} hackers active</span>
                              </div>
                              <div className="flex items-center gap-2 text-white">
                                <Rocket className="w-4 h-4" />
                                <span className="font-medium">{liveHackathons.length} live events</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Hackathon Cards */}
                        {isLoading ? (
                          <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-12 h-12 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
                              <p className="text-[hsl(var(--discord-text-muted))]">Loading hackathons...</p>
                            </div>
                          </div>
                        ) : getFilteredHackathons().length === 0 ? (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
                              <Code className="w-12 h-12 text-[hsl(var(--discord-text-muted))]" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No hackathons found</h3>
                            <p className="text-[hsl(var(--discord-text-muted))] mb-4">Check back soon for new events!</p>
                            <Button onClick={() => setActiveTab('templates')} style={{ background: 'linear-gradient(135deg, #C70110, #F7941D)' }}>
                              <Rocket className="w-4 h-4 mr-2" />
                              Start Building Instead
                            </Button>
                          </motion.div>
                        ) : (
                          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {getFilteredHackathons().map((hackathon, index) => (
                              <motion.div key={hackathon.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                <HackathonCard
                                  hackathon={hackathon}
                                  onRegister={handleRegister}
                                  onViewTeams={handleViewTeams}
                                  onSubmitProject={handleSubmitProject}
                                />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals */}
        <RegistrationModal
          hackathonId={selectedHackathon?.id || null}
          hackathonTitle={selectedHackathon?.title || ''}
          isOpen={registrationModalOpen}
          onClose={() => setRegistrationModalOpen(false)}
          onSuccess={fetchHackathons}
        />
        <TeamsModal
          hackathonId={selectedHackathon?.id || null}
          hackathonTitle={selectedHackathon?.title || ''}
          isOpen={teamsModalOpen}
          onClose={() => setTeamsModalOpen(false)}
        />
        <SubmissionModal
          hackathonId={selectedHackathon?.id || null}
          hackathonTitle={selectedHackathon?.title || ''}
          isOpen={submissionModalOpen}
          onClose={() => setSubmissionModalOpen(false)}
          onSuccess={fetchHackathons}
        />
        <QuickSubmitModal
          isOpen={quickSubmitOpen}
          onClose={() => setQuickSubmitOpen(false)}
          onSuccess={fetchHackathons}
        />
        <CommunityChat
          isOpen={communityChatOpen}
          onClose={() => setCommunityChatOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
};

export default Hackathons;
