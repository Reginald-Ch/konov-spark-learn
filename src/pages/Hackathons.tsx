import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HackathonCard } from '@/components/hackathon/HackathonCard';
import { RegistrationModal } from '@/components/hackathon/RegistrationModal';
import { TeamsModal } from '@/components/hackathon/TeamsModal';
import { SubmissionModal } from '@/components/hackathon/SubmissionModal';
import { SubmissionsGallery } from '@/components/hackathon/SubmissionsGallery';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Calendar, Trophy, Code } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchHackathons();
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

  const filteredHackathons = hackathons.filter(h => {
    if (activeTab === 'all') return true;
    return h.status === activeTab;
  });

  const liveHackathons = hackathons.filter(h => h.status === 'live');
  const upcomingHackathons = hackathons.filter(h => h.status === 'upcoming');
  const endedHackathons = hackathons.filter(h => h.status === 'ended');

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Hackathons - Tech Kids Africa"
        description="Join our exciting hackathons! Collaborate, innovate, and build amazing projects with fellow tech enthusiasts."
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden">
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Hackathons</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Build. <span className="text-primary">Innovate.</span> Win.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join our hackathons to collaborate with fellow innovators, solve real-world challenges, 
              and showcase your skills. Amazing prizes await!
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-12"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Zap className="w-5 h-5" />
                <span className="text-3xl font-bold">{liveHackathons.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Live Now</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Calendar className="w-5 h-5" />
                <span className="text-3xl font-bold">{upcomingHackathons.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Trophy className="w-5 h-5" />
                <span className="text-3xl font-bold">{endedHackathons.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hackathons List */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="live" className="relative">
                  Live
                  {liveHackathons.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="ended">Ended</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading hackathons...
                </div>
              ) : filteredHackathons.length === 0 ? (
                <div className="text-center py-12">
                  <Code className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hackathons found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'live' 
                      ? 'No hackathons are currently live. Check upcoming events!' 
                      : 'Check back soon for new hackathons!'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {filteredHackathons.map((hackathon) => (
                    <HackathonCard
                      key={hackathon.id}
                      hackathon={hackathon}
                      onRegister={handleRegister}
                      onViewTeams={handleViewTeams}
                      onSubmitProject={handleSubmitProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Submissions Gallery for ended hackathons */}
      {endedHackathons.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Past Submissions</h2>
              <p className="text-muted-foreground">Check out the amazing projects from previous hackathons</p>
            </motion.div>

            {endedHackathons.slice(0, 1).map((hackathon) => (
              <div key={hackathon.id}>
                <h3 className="text-xl font-semibold mb-6">{hackathon.title}</h3>
                <SubmissionsGallery hackathonId={hackathon.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />

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
