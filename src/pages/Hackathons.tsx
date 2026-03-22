import { useState, useEffect, useCallback } from 'react';
import { SEO } from '@/components/SEO';
import { HackathonCard } from '@/components/hackathon/HackathonCard';
import { RegistrationModal } from '@/components/hackathon/RegistrationModal';

import { SubmissionModal } from '@/components/hackathon/SubmissionModal';
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
import { JudgeDashboardPanel } from '@/components/hackathon/JudgeDashboardPanel';
import { BotBattleArena } from '@/components/hackathon/BotBattleArena';
import { LiveReactionFeed } from '@/components/hackathon/LiveReactionFeed';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code, Trophy, ArrowLeft, Brain,
  Rocket, Zap, Circle, Calendar, Hash,
  Users, MessageSquare, Terminal, HelpCircle, BookOpen, Award, Image, GraduationCap, X, Shield, Swords
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

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
type HackathonSubView = 'all-events' | 'live-now' | 'upcoming' | 'past-events' | 'leaderboard' | 'showcase' | 'battle-arena' | 'getting-started' | 'faq' | 'judge';

const ACCESS_CODE = 'Forge2039';

const Hackathons = () => {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  
  const [quickSubmitOpen, setQuickSubmitOpen] = useState(false);
  const [communityChatOpen, setCommunityChatOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Access code gate
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('forge-access-unlocked') === 'true');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeError, setAccessCodeError] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<MainTab>('templates');
  const [hackathonSubView, setHackathonSubView] = useState<HackathonSubView>('all-events');
  
  // Build tab state
  const [buildCode, setBuildCode] = useState<string | undefined>(undefined);
  const [buildTemplate, setBuildTemplate] = useState<ProjectType | undefined>(undefined);
  const [buildKey, setBuildKey] = useState(0);

  // First-time onboarding
  useEffect(() => {
    if (!isUnlocked) return;
    const visited = localStorage.getItem('hackathons_visited');
    if (!visited) {
      setShowOnboarding(true);
      setActiveTab('templates');
      localStorage.setItem('hackathons_visited', 'true');
    }
  }, [isUnlocked]);

  useEffect(() => {
    fetchHackathons();

    const hackathonsChannel = supabase
      .channel('hackathons-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathons' }, () => fetchHackathons())
      .subscribe();

    return () => {
      supabase.removeChannel(hackathonsChannel);
    };
  }, []);

  const fetchHackathons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .order('start_date', { ascending: true });

      if (!error && data) {
        setHackathons(data as Hackathon[]);
      }
    } catch (e) {
      console.error('Failed to fetch hackathons:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) { setSelectedHackathon(hackathon); setRegistrationModalOpen(true); }
  };


  const handleSubmitProject = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) { setSelectedHackathon(hackathon); setSubmissionModalOpen(true); }
  };

  const liveHackathons = hackathons.filter(h => h.status === 'live');
  const upcomingHackathons = hackathons.filter(h => h.status === 'upcoming');
  const endedHackathons = hackathons.filter(h => h.status === 'ended');
  const onlineMembers = hackathons.reduce((acc, h) => acc + h.current_participants, 0);
  const hasLiveEvent = liveHackathons.length > 0;

  const handleStartBuilding = (code: string, templateId: string) => {
    setBuildCode(code || undefined);
    setBuildTemplate(templateId as ProjectType);
    setBuildKey(prev => prev + 1);
    setActiveTab('build');
  };

  const handleViewCode = (code: string) => {
    if (buildCode) {
      toast.info('Loading project code into the editor...');
    }
    setBuildCode(code);
    setBuildTemplate(undefined);
    setActiveTab('build');
  };

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
    { id: 'ai-models' as MainTab, name: 'Visual Builder', icon: Brain, color: '#9B59B6', desc: 'Build Visually' },
    { id: 'learn' as MainTab, name: 'Learn', icon: GraduationCap, color: '#006600', desc: 'Tutorials & Guides' },
  ];

  // Render the active hackathon sub-view content directly (no AnimatePresence for instant switching)
  const renderHackathonContent = () => {
    switch (hackathonSubView) {
      case 'showcase':
        return <ProjectGallery onViewCode={handleViewCode} />;
      case 'battle-arena':
        return <BotBattleArena />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'getting-started':
        return <GettingStarted onNavigate={(ch) => setHackathonSubView(ch as HackathonSubView)} />;
      case 'faq':
        return <HackathonFAQ />;
      case 'judge':
        return <JudgeDashboardPanel onRefreshHackathons={fetchHackathons} />;
      default:
        return (
          <>
            {/* Welcome Banner */}
            <div 
              className="rounded-lg p-6 mb-8 relative overflow-hidden tech-grid"
              style={{ background: 'linear-gradient(135deg, #1a0a0f 0%, #C70110 50%, #0d1117 100%)' }}
            >
              <div className="absolute inset-0 opacity-10">
                <Rocket className="w-32 h-32 text-white absolute top-4 right-4" />
                <Zap className="w-24 h-24 text-white absolute bottom-4 left-4" />
              </div>
              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  <Rocket className="w-8 h-8" />
                  Forge Your Way Up!
                </h1>
                <p className="text-white/90 text-lg max-w-2xl">
                  Design, build, and showcase your own AI solutions alongside the brightest minds of the next generation.
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
            </div>

            {/* Hackathon Cards */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[hsl(var(--discord-text-muted))]">Loading hackathons...</p>
                </div>
              </div>
            ) : getFilteredHackathons().length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
                  <Code className="w-12 h-12 text-[hsl(var(--discord-text-muted))]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No hackathons found</h3>
                <p className="text-[hsl(var(--discord-text-muted))] mb-4">Check back soon for new events!</p>
                <Button onClick={() => setActiveTab('templates')} className="bg-primary hover:bg-primary/90">
                  <Rocket className="w-4 h-4 mr-2" />
                  Start Building Instead
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {getFilteredHackathons().map((hackathon) => (
                  <HackathonCard
                    key={hackathon.id}
                    hackathon={hackathon}
                    onRegister={handleRegister}
                    onSubmitProject={handleSubmitProject}
                  />
                ))}
              </div>
            )}
          </>
        );
    }
  };

  const handleAccessCodeSubmit = () => {
    if (accessCodeInput.trim() === ACCESS_CODE) {
      setIsUnlocked(true);
      localStorage.setItem('forge-access-unlocked', 'true');
      setAccessCodeError(false);
      toast.success('🔓 Access granted! Welcome to FORGE Studio.');
    } else {
      setAccessCodeError(true);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="h-screen bg-[hsl(var(--discord-darker))] flex items-center justify-center p-4">
        <SEO title="FORGE — Access Code" description="Enter your access code to enter FORGE Studio." />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[hsl(var(--discord-dark))] border border-[hsl(var(--discord-light)/0.3)] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/20 border border-primary/30">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Enter FORGE Studio</h1>
          <p className="text-[hsl(var(--discord-text-muted))] text-sm mb-6">
            Enter your access code to begin building AI projects.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={accessCodeInput}
              onChange={e => { setAccessCodeInput(e.target.value); setAccessCodeError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleAccessCodeSubmit()}
              placeholder="Access code..."
              autoFocus
              className={`w-full h-12 text-center text-lg font-mono tracking-widest rounded-xl border-2 bg-[hsl(var(--discord-darker))] text-white placeholder:text-[hsl(var(--discord-text-muted))] focus:outline-none transition-colors ${
                accessCodeError ? 'border-red-500 focus:border-red-400' : 'border-[hsl(var(--discord-light)/0.3)] focus:border-primary'
              }`}
            />
            {accessCodeError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm">
                Invalid access code. Please try again.
              </motion.p>
            )}
            <Button onClick={handleAccessCodeSubmit} className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90">
              <Rocket className="w-4 h-4 mr-2" />
              Enter Studio
            </Button>
          </div>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-[hsl(var(--discord-text-muted))] hover:text-white transition-colors">
            ← Back to home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-[hsl(var(--discord-darker))] flex flex-col md:flex-row overflow-hidden">
        <LiveReactionFeed />
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
                    style={{ background: '#C70110' }}>
                    <Rocket className="w-8 h-8 text-white" />
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

                <Button onClick={() => { setShowOnboarding(false); setActiveTab('templates'); }}
                  className="w-full bg-primary hover:bg-primary/90">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started — Pick a Template
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Icon Rail */}
        <div className="w-full md:w-[72px] bg-[hsl(var(--discord-darker))] flex md:flex-col items-center py-2 md:py-3 gap-2 border-b md:border-b-0 md:border-r border-[hsl(var(--discord-light)/0.2)] overflow-x-auto md:overflow-x-visible flex-shrink-0 relative tech-scanline">
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
                className="w-12 h-12 rounded-[24px] bg-primary flex items-center justify-center cursor-pointer"
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
                { id: 'battle-arena' as HackathonSubView, name: 'Bot Battle', icon: Swords, count: 0 },
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setHackathonSubView(ch.id)}
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
                </button>
              ))}

              <div className="my-3 h-px bg-[hsl(var(--discord-light)/0.2)]" />

              {/* Resources */}
              {[
                { id: 'getting-started' as HackathonSubView, name: 'Getting Started', icon: BookOpen },
                { id: 'faq' as HackathonSubView, name: 'FAQ & Help', icon: HelpCircle },
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setHackathonSubView(ch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                    hackathonSubView === ch.id
                      ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                      : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                  }`}
                >
                  <ch.icon className="w-4 h-4" />
                  <span>{ch.name}</span>
                </button>
              ))}

              <div className="my-3 h-px bg-[hsl(var(--discord-light)/0.2)]" />

              {/* Judge Dashboard — integrated as sub-view */}
              <button
                onClick={() => setHackathonSubView('judge')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5 ${
                  hackathonSubView === 'judge'
                    ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                    : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#FFD700]" />
                <span>Judge Dashboard</span>
              </button>

              {/* Past events info */}
              {endedHackathons.length > 0 && (
                <>
                  <div className="my-3 h-px bg-[hsl(var(--discord-light)/0.2)]" />
                  <p className="px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">Past Events</p>
                  {endedHackathons.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setHackathonSubView('past-events')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)]"
                    >
                      <Trophy className="w-3.5 h-3.5 text-[hsl(var(--discord-yellow))]" />
                      <span className="truncate">{h.title}</span>
                    </button>
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
          {/* BUILD TAB */}
          {activeTab === 'build' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ProjectEditor key={`${buildTemplate}-${buildKey}`} initialType={buildTemplate} initialCode={buildCode} hackathonStartDate={liveHackathons[0]?.start_date || null} hackathonStatus={liveHackathons[0]?.status || null} hasLiveEvent={hasLiveEvent} />
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="flex-1 overflow-auto">
              <TemplatesTab onStartBuilding={handleStartBuilding} />
            </div>
          )}

          {/* AI MODELS TAB */}
          {activeTab === 'ai-models' && (
            <div className="flex-1 overflow-auto">
              <AIModelsTab onViewCode={handleViewCode} />
            </div>
          )}

          {/* LEARN TAB */}
          {activeTab === 'learn' && (
            <div className="flex-1 overflow-auto">
              <LearnTab onNavigateToBuild={() => setActiveTab('build')} onNavigateToTemplates={() => setActiveTab('templates')} projectType={buildTemplate} />
            </div>
          )}

          {/* HACKATHONS TAB — instant sub-view switching */}
          {activeTab === 'hackathons' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Bar */}
              <div className="h-12 px-4 flex items-center gap-4 border-b border-[hsl(var(--discord-darker))] shadow-sm flex-shrink-0">
                {hackathonSubView === 'leaderboard' ? (
                  <Award className="w-5 h-5 text-[hsl(var(--discord-yellow))]" />
                ) : hackathonSubView === 'judge' ? (
                  <Shield className="w-5 h-5 text-[#FFD700]" />
                ) : (
                  <Hash className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />
                )}
                <span className="font-semibold text-white">
                  {hackathonSubView === 'judge' ? 'Judge Dashboard' : hackathonSubView.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              </div>

              <ScrollArea className="flex-1 p-6">
                {renderHackathonContent()}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Modals */}
        <RegistrationModal
          hackathonId={selectedHackathon?.id || null}
          hackathonTitle={selectedHackathon?.title || ''}
          isOpen={registrationModalOpen}
          onClose={() => setRegistrationModalOpen(false)}
          onSuccess={fetchHackathons}
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
