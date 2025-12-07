import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Calendar, Award } from "lucide-react";
import { motion } from "framer-motion";
import { ComicPanel } from "@/components/ComicPanel";

export const SocialProof = () => {
  const [stats, setStats] = useState({
    weeklySignups: 0,
    totalWorkshops: 0,
    activeStudents: 0,
  });
  const [recentSignup, setRecentSignup] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
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

    const channel = supabase
      .channel('social-proof-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'newsletter_signups' },
        (payload: any) => {
          const name = payload.new.name || 'Someone';
          setRecentSignup(name);
          setStats(prev => ({ ...prev, weeklySignups: prev.weeklySignups + 1 }));
          setTimeout(() => setRecentSignup(null), 5000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const proofCards = [
    { icon: TrendingUp, value: stats.weeklySignups, label: "Students enrolled this week", color: "primary" as const },
    { icon: Calendar, value: stats.totalWorkshops, label: "Active workshops available", color: "secondary" as const },
    { icon: Users, value: stats.activeStudents, label: "Total participants", color: "accent" as const },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {proofCards.map((proof, idx) => (
          <ComicPanel key={idx} color={proof.color} delay={idx * 0.1}>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <motion.div 
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                    proof.color === 'primary' ? 'from-primary to-primary/70' :
                    proof.color === 'secondary' ? 'from-secondary to-secondary/70' :
                    'from-accent to-accent/70'
                  } flex items-center justify-center`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <proof.icon className="w-6 h-6 text-foreground" />
                </motion.div>
                <div>
                  <div className="text-3xl font-fredoka font-bold text-foreground">
                    {proof.value}+
                  </div>
                  <div className="text-sm text-muted-foreground font-space">
                    {proof.label}
                  </div>
                </div>
              </div>
            </div>
          </ComicPanel>
        ))}
      </div>

      {recentSignup && (
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          className="fixed bottom-24 left-6 z-50"
        >
          <ComicPanel color="secondary" className="p-4 max-w-sm">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-secondary" />
              <div>
                <p className="font-fredoka font-bold text-foreground">{recentSignup}</p>
                <p className="text-xs text-muted-foreground font-space">just joined the program!</p>
              </div>
            </div>
          </ComicPanel>
        </motion.div>
      )}
    </>
  );
};
