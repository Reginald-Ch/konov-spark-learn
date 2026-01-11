import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { HackathonCard } from '@/components/hackathon/HackathonCard';
import { RegistrationModal } from '@/components/hackathon/RegistrationModal';
import { TeamsModal } from '@/components/hackathon/TeamsModal';
import { SubmissionModal } from '@/components/hackathon/SubmissionModal';
import { SubmissionsGallery } from '@/components/hackathon/SubmissionsGallery';
import { Leaderboard } from '@/components/hackathon/Leaderboard';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, Calendar, Trophy, Code, Hash, Users, Rocket, 
  Terminal, MessageSquare, Bell, Settings, Plus, 
  ChevronDown, Circle, Sparkles, ArrowLeft, Award, 
  HelpCircle, BookOpen, Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const Hackathons = () => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState('all-events');
  const [selectedEndedHackathon, setSelectedEndedHackathon] = useState<Hackathon | null>(null);

  useEffect(() => {
    fetchHackathons();

    // Real-time subscriptions
    const hackathonsChannel = supabase
      .channel('hackathons-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hackathons' },
        () => fetchHackathons()
      )
      .subscribe();

    const registrationsChannel = supabase
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hackathon_registrations' },
        () => fetchHackathons()
      )
      .subscribe();

    const teamsChannel = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hackathon_teams' },
        () => fetchHackathons()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hackathonsChannel);
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(teamsChannel);
    };
  }, []);

  const fetchHackathons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathons' as any)
      .select('*')
      .order('start_date', { ascending: true });

    if (!error && data) {
      setHackathons(data as unknown as Hackathon[]);
    }
    setIsLoading(false);
  };

  const handleRegister = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
      setSelectedHackathon(hackathon);
      setRegistrationModalOpen(true);
    }
  };

  const handleViewTeams = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
      setSelectedHackathon(hackathon);
      setTeamsModalOpen(true);
    }
  };

  const handleSubmitProject = (hackathonId: string) => {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
      setSelectedHackathon(hackathon);
      setSubmissionModalOpen(true);
    }
  };

  const liveHackathons = hackathons.filter(h => h.status === 'live');
  const upcomingHackathons = hackathons.filter(h => h.status === 'upcoming');
  const endedHackathons = hackathons.filter(h => h.status === 'ended');

  const getFilteredHackathons = () => {
    switch (activeChannel) {
      case 'live-now':
        return liveHackathons;
      case 'upcoming':
        return upcomingHackathons;
      case 'past-events':
        return endedHackathons;
      default:
        return hackathons;
    }
  };

  const channels = [
    { id: 'all-events', name: 'all-events', icon: Hash, count: hackathons.length },
    { id: 'live-now', name: 'live-now', icon: Zap, count: liveHackathons.length, live: true },
    { id: 'upcoming', name: 'upcoming', icon: Calendar, count: upcomingHackathons.length },
    { id: 'past-events', name: 'past-events', icon: Trophy, count: endedHackathons.length },
    { id: 'leaderboard', name: 'leaderboard', icon: Award, count: 0, special: true },
  ];

  const onlineMembers = hackathons.reduce((acc, h) => acc + h.current_participants, 0);

  return (
    <div className="min-h-screen bg-[hsl(var(--discord-darker))] flex">
      <SEO 
        title="Hackathons - Tech Kids Africa"
        description="Join our exciting hackathons! Collaborate, innovate, and build amazing projects with fellow tech enthusiasts."
      />

      {/* Server Sidebar */}
      <div className="w-[72px] bg-[hsl(var(--discord-darker))] flex flex-col items-center py-3 gap-2 border-r border-[hsl(var(--discord-light)/0.2)]">
        {/* Back to Home */}
        <Link to="/">
          <motion.div 
            whileHover={{ scale: 1.1, borderRadius: '16px' }}
            className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-light))] flex items-center justify-center cursor-pointer transition-all hover:bg-primary hover:rounded-[16px] group"
          >
            <ArrowLeft className="w-5 h-5 text-[hsl(var(--discord-text))] group-hover:text-white" />
          </motion.div>
        </Link>
        
        <div className="w-8 h-0.5 bg-[hsl(var(--discord-light))] rounded-full my-1" />
        
        {/* Tech Kids Server */}
        <motion.div 
          whileHover={{ scale: 1.1, borderRadius: '16px' }}
          className="w-12 h-12 rounded-[24px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer transition-all relative"
        >
          <Rocket className="w-6 h-6 text-white" />
          <div className="absolute -left-1 w-1 h-10 bg-white rounded-r-full" />
        </motion.div>

        {/* Hackathon Categories */}
        <motion.div 
          whileHover={{ scale: 1.1, borderRadius: '16px' }}
          className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-blurple))] flex items-center justify-center cursor-pointer transition-all"
        >
          <Code className="w-6 h-6 text-white" />
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.1, borderRadius: '16px' }}
          className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-green))] flex items-center justify-center cursor-pointer transition-all"
        >
          <Terminal className="w-6 h-6 text-white" />
        </motion.div>

        <div className="mt-auto">
          <motion.div 
            whileHover={{ scale: 1.1, borderRadius: '16px' }}
            className="w-12 h-12 rounded-[24px] bg-[hsl(var(--discord-light))] flex items-center justify-center cursor-pointer transition-all hover:bg-[hsl(var(--discord-green))]"
          >
            <Plus className="w-6 h-6 text-[hsl(var(--discord-green))]" />
          </motion.div>
        </div>
      </div>

      {/* Channels Sidebar */}
      <div className="w-60 bg-[hsl(var(--discord-dark))] flex flex-col">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[hsl(var(--discord-darker))] shadow-sm hover:bg-[hsl(var(--discord-light)/0.3)] cursor-pointer">
          <span className="font-semibold text-white truncate">Tech Kids Hackathons</span>
          <ChevronDown className="w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
        </div>

        {/* Channels */}
        <ScrollArea className="flex-1 px-2 py-4">
          {/* Event Channels */}
          <div className="mb-4">
            <div className="flex items-center gap-1 px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">
              <ChevronDown className="w-3 h-3" />
              Hackathon Events
            </div>
            {channels.map((channel) => (
              <motion.button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors group ${
                  activeChannel === channel.id 
                    ? 'bg-[hsl(var(--discord-light)/0.6)] text-white' 
                    : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                }`}
              >
                <channel.icon className={`w-4 h-4 ${channel.live ? 'text-[hsl(var(--discord-red))] animate-pulse' : ''}`} />
                <span className="flex-1 text-left truncate">{channel.name}</span>
                {channel.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    channel.live 
                      ? 'bg-[hsl(var(--discord-red))] text-white' 
                      : 'bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))]'
                  }`}>
                    {channel.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Community Stats */}
          <div className="mb-4">
            <div className="flex items-center gap-1 px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">
              <ChevronDown className="w-3 h-3" />
              Community Stats
            </div>
            <div className="px-2 py-2 text-sm text-[hsl(var(--discord-text-muted))]">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="w-2 h-2 fill-[hsl(var(--discord-green))] text-[hsl(var(--discord-green))]" />
                <span>{onlineMembers} Active Hackers</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
                <span>{hackathons.length} Total Events</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--discord-blurple))]" />
                <span>{upcomingHackathons.length + liveHackathons.length} Active Now</span>
              </div>
            </div>
          </div>

          {/* Resources Section */}
          <div className="mb-4">
            <div className="flex items-center gap-1 px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">
              <ChevronDown className="w-3 h-3" />
              Resources
            </div>
            <div className="space-y-0.5">
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))] transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Getting Started</span>
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))] transition-colors"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Project Ideas</span>
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))] transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>FAQ & Help</span>
              </motion.a>
            </div>
          </div>

          {/* Past Events with Submissions */}
          {endedHackathons.length > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 text-xs font-semibold text-[hsl(var(--discord-text-muted))] uppercase tracking-wide mb-1">
                <ChevronDown className="w-3 h-3" />
                Project Showcase
              </div>
              {endedHackathons.map((hackathon) => (
                <motion.button
                  key={hackathon.id}
                  onClick={() => setSelectedEndedHackathon(
                    selectedEndedHackathon?.id === hackathon.id ? null : hackathon
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedEndedHackathon?.id === hackathon.id
                      ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
                      : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-[hsl(var(--discord-text))]'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
                  <span className="flex-1 text-left truncate text-xs">{hackathon.title}</span>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* User Panel */}
        <div className="h-[52px] bg-[hsl(var(--discord-darker)/0.8)] px-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Hacker</p>
            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Online</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light)/0.3)]">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[hsl(var(--discord-dark))]">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center gap-4 border-b border-[hsl(var(--discord-darker))] shadow-sm">
          {activeChannel === 'leaderboard' ? (
            <Award className="w-5 h-5 text-[hsl(var(--discord-yellow))]" />
          ) : (
            <Hash className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />
          )}
          <span className="font-semibold text-white">{activeChannel}</span>
          <div className="w-px h-6 bg-[hsl(var(--discord-light))]" />
          <span className="text-sm text-[hsl(var(--discord-text-muted))]">
            {activeChannel === 'all-events' && 'Browse all hackathon events'}
            {activeChannel === 'live-now' && 'Currently running hackathons'}
            {activeChannel === 'upcoming' && 'Register for upcoming events'}
            {activeChannel === 'past-events' && 'View completed hackathons'}
            {activeChannel === 'leaderboard' && 'Top hackers and teams rankings'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-[hsl(var(--discord-text-muted))] hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-[hsl(var(--discord-text-muted))] hover:text-white">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {/* Show leaderboard */}
            {activeChannel === 'leaderboard' ? (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Leaderboard />
              </motion.div>
            ) : selectedEndedHackathon ? (
              <motion.div
                key="submissions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedEndedHackathon(null)}
                    className="text-[hsl(var(--discord-text-muted))] hover:text-white mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to events
                  </Button>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-[hsl(var(--discord-yellow))]" />
                    {selectedEndedHackathon.title} - Project Showcase
                  </h2>
                  <p className="text-[hsl(var(--discord-text-muted))] mt-2">
                    Check out the amazing projects submitted by our hackers!
                  </p>
                </div>
                <SubmissionsGallery hackathonId={selectedEndedHackathon.id} />
              </motion.div>
            ) : (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Welcome Banner - Konov Brand Colors */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg p-6 mb-8 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #C70110 0%, #F7941D 50%, #006600 100%)'
                  }}
                >
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4">
                      <Code className="w-32 h-32 text-white" />
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <Terminal className="w-24 h-24 text-white" />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                      <Zap className="w-8 h-8" />
                      Welcome to Hackathons!
                    </h1>
                    <p className="text-white/90 text-lg max-w-2xl">
                      Build. Innovate. Win. Join our tech community hackathons to collaborate, 
                      learn, and create amazing projects with fellow developers!
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
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                  >
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
                      <Code className="w-12 h-12 text-[hsl(var(--discord-text-muted))]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No hackathons found</h3>
                    <p className="text-[hsl(var(--discord-text-muted))]">
                      {activeChannel === 'live-now' 
                        ? 'No hackathons are currently live. Check upcoming events!' 
                        : 'Check back soon for new hackathons!'}
                    </p>
                  </motion.div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {getFilteredHackathons().map((hackathon, index) => (
                      <motion.div
                        key={hackathon.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
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
    </div>
  );
};

export default Hackathons;