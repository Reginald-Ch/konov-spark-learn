import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Calendar, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

export const SocialProof = () => {
  const [stats, setStats] = useState({
    weeklySignups: 0,
    totalWorkshops: 0,
    activeStudents: 0,
  });
  const [recentSignup, setRecentSignup] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      // Get signups from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: signupCount } = await supabase
        .from('newsletter_signups')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: workshopCount } = await supabase
        .from('workshops')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: registrationCount } = await supabase
        .from('workshop_registrations')
        .select('*', { count: 'exact', head: true });

      setStats({
        weeklySignups: signupCount || 0,
        totalWorkshops: workshopCount || 0,
        activeStudents: registrationCount || 0,
      });
    };

    fetchStats();

    // Subscribe to new signups
    const channel = supabase
      .channel('social-proof-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'newsletter_signups'
        },
        (payload: any) => {
          const name = payload.new.name || 'Someone';
          setRecentSignup(name);
          setStats(prev => ({ ...prev, weeklySignups: prev.weeklySignups + 1 }));
          
          // Hide notification after 5 seconds
          setTimeout(() => setRecentSignup(null), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const proofCards = [
    {
      icon: TrendingUp,
      value: stats.weeklySignups,
      label: "Students enrolled this week",
      color: "from-primary to-primary-glow",
    },
    {
      icon: Calendar,
      value: stats.totalWorkshops,
      label: "Active workshops available",
      color: "from-secondary to-accent",
    },
    {
      icon: Users,
      value: stats.activeStudents,
      label: "Total participants",
      color: "from-accent to-primary",
    },
  ];

  return (
    <>
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {proofCards.map((proof, idx) => (
          <Card 
            key={idx}
            className="p-6 bg-card/50 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${proof.color} flex items-center justify-center`}>
                <proof.icon className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <div className="text-3xl font-orbitron font-bold text-foreground">
                  {proof.value}+
                </div>
                <div className="text-sm text-muted-foreground font-space">
                  {proof.label}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Signup Notification */}
      {recentSignup && (
        <div className="fixed bottom-24 left-6 z-50 animate-slide-in-left">
          <Card className="p-4 bg-card border-2 border-primary/50 shadow-lg flex items-center gap-3 max-w-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-space text-sm text-foreground font-semibold truncate">
                {recentSignup}
              </p>
              <p className="text-xs text-muted-foreground">
                just joined the program!
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
