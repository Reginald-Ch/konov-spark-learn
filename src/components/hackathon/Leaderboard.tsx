import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Users, Zap, Crown, Award, TrendingUp, Flame, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface TeamScore {
  id: string;
  team_name: string;
  description: string | null;
  hackathon_title: string;
  member_count: number;
  submission_count: number;
  points: number;
  achievements: string[];
}

interface ParticipantScore {
  id: string;
  name: string;
  email: string;
  hackathons_joined: number;
  teams_created: number;
  submissions: number;
  points: number;
  rank: number;
  achievements: string[];
}

export const Leaderboard = () => {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  useEffect(() => {
    fetchLeaderboardData();

    // Real-time updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathon_teams' }, () => fetchLeaderboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathon_registrations' }, () => fetchLeaderboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathon_submissions' }, () => fetchLeaderboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);

    // Fetch teams with their hackathon titles
    const { data: teamsData } = await supabase
      .from('hackathon_teams' as any)
      .select(`
        id,
        team_name,
        description,
        hackathon_id,
        created_at
      `)
      .order('created_at', { ascending: true });

    // Fetch hackathons for titles
    const { data: hackathonsData } = await supabase
      .from('hackathons' as any)
      .select('id, title');

    // Fetch submissions
    const { data: submissionsData } = await supabase
      .from('hackathon_submissions' as any)
      .select('team_id');

    // Fetch registrations
    const { data: registrationsData } = await supabase
      .from('hackathon_registrations' as any)
      .select('*');

    const hackathonMap = new Map((hackathonsData || []).map((h: any) => [h.id, h.title]));
    
    // Calculate team scores
    const teamScores: TeamScore[] = ((teamsData as any[]) || []).map((team, index) => {
      const memberCount = ((registrationsData as any[]) || []).filter((r: any) => r.team_id === team.id).length;
      const submissionCount = ((submissionsData as any[]) || []).filter((s: any) => s.team_id === team.id).length;
      
      // Points calculation
      const basePoints = 100; // For creating a team
      const memberPoints = memberCount * 50;
      const submissionPoints = submissionCount * 200;
      const points = basePoints + memberPoints + submissionPoints;

      // Achievements
      const achievements: string[] = [];
      if (index === 0) achievements.push('🏆 First Team');
      if (memberCount >= 3) achievements.push('👥 Full Squad');
      if (memberCount >= 5) achievements.push('🌟 Dream Team');
      if (submissionCount > 0) achievements.push('🚀 Ship It!');

      return {
        id: team.id,
        team_name: team.team_name,
        description: team.description,
        hackathon_title: hackathonMap.get(team.hackathon_id) || 'Unknown',
        member_count: memberCount,
        submission_count: submissionCount,
        points,
        achievements,
      };
    }).sort((a, b) => b.points - a.points);

    // Calculate participant scores
    const participantMap = new Map<string, ParticipantScore>();
    
    ((registrationsData as any[]) || []).forEach((reg: any) => {
      const existing = participantMap.get(reg.participant_email);
      if (existing) {
        existing.hackathons_joined += 1;
        existing.points += 100;
      } else {
        participantMap.set(reg.participant_email, {
          id: reg.id,
          name: reg.participant_name,
          email: reg.participant_email,
          hackathons_joined: 1,
          teams_created: 0,
          submissions: 0,
          points: 100,
          rank: 0,
          achievements: [],
        });
      }
    });

    // Count team creations
    ((teamsData as any[]) || []).forEach((team: any) => {
      const participant = participantMap.get(team.created_by_email);
      if (participant) {
        participant.teams_created += 1;
        participant.points += 150;
        if (!participant.achievements.includes('👑 Team Leader')) {
          participant.achievements.push('👑 Team Leader');
        }
      }
    });

    const participantScores = Array.from(participantMap.values())
      .sort((a, b) => b.points - a.points)
      .map((p, index) => {
        p.rank = index + 1;
        if (index === 0) p.achievements.push('🥇 Top Hacker');
        else if (index === 1) p.achievements.push('🥈 Runner Up');
        else if (index === 2) p.achievements.push('🥉 Bronze Star');
        if (p.hackathons_joined >= 2) p.achievements.push('🔥 Serial Hacker');
        return p;
      });

    setTeams(teamScores);
    setParticipants(participantScores);
    setIsLoading(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-[hsl(var(--discord-text-muted))] font-medium w-5 text-center">#{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
      case 1:
        return 'bg-gradient-to-r from-gray-400/20 to-transparent border-gray-400/30';
      case 2:
        return 'bg-gradient-to-r from-amber-600/20 to-transparent border-amber-600/30';
      default:
        return 'bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)]';
    }
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)'
          }}>
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-[hsl(var(--discord-text-muted))] text-sm">Top hackers & teams in real-time</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Teams</span>
          </div>
          <p className="text-xl font-bold text-white">{teams.length}</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Hackers</span>
          </div>
          <p className="text-xl font-bold text-white">{participants.length}</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[hsl(var(--discord-darker))] rounded-lg p-3 border border-[hsl(var(--discord-light)/0.2)]"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs">Total Points</span>
          </div>
          <p className="text-xl font-bold text-white">
            {teams.reduce((acc, t) => acc + t.points, 0) + participants.reduce((acc, p) => acc + p.points, 0)}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-2 bg-[hsl(var(--discord-darker))] mb-4">
          <TabsTrigger 
            value="teams" 
            className="data-[state=active]:bg-[hsl(var(--discord-blurple))] data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Top Teams
          </TabsTrigger>
          <TabsTrigger 
            value="participants"
            className="data-[state=active]:bg-[hsl(var(--discord-blurple))] data-[state=active]:text-white"
          >
            <Star className="w-4 h-4 mr-2" />
            Top Hackers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-0">
          <ScrollArea className="h-[400px] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : teams.length === 0 ? (
              <EmptyState type="teams" />
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {teams.slice(0, 10).map((team, index) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-lg p-3 border transition-all hover:scale-[1.02] cursor-pointer ${getRankBg(index)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getRankIcon(index)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white truncate">{team.team_name}</h4>
                            {team.achievements.slice(0, 2).map((achievement, i) => (
                              <span key={i} className="text-xs">{achievement.split(' ')[0]}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[hsl(var(--discord-text-muted))]">
                            <span>{team.member_count} members</span>
                            <span>•</span>
                            <span>{team.hackathon_title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-bold">{team.points}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="participants" className="mt-0">
          <ScrollArea className="h-[400px] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : participants.length === 0 ? (
              <EmptyState type="participants" />
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {participants.slice(0, 10).map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-lg p-3 border transition-all hover:scale-[1.02] cursor-pointer ${getRankBg(index)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getRankIcon(index)}
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                          background: `linear-gradient(135deg, ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#4752C4'} 0%, ${index === 0 ? '#F7941D' : index === 1 ? '#A9A9A9' : index === 2 ? '#8B4513' : '#5865F2'} 100%)`
                        }}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white truncate">{participant.name}</h4>
                            {participant.achievements.slice(0, 2).map((achievement, i) => (
                              <span key={i} className="text-xs">{achievement.split(' ')[0]}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[hsl(var(--discord-text-muted))]">
                            <span>{participant.hackathons_joined} hackathons</span>
                            {participant.teams_created > 0 && (
                              <>
                                <span>•</span>
                                <span>{participant.teams_created} teams led</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]">
                          <Flame className="w-4 h-4" />
                          <span className="font-bold">{participant.points}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Achievement Legend */}
      <div className="mt-6 p-4 bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)]">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[hsl(var(--discord-yellow))]" />
          Achievement Badges
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>🏆</span> First Team Created
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>👥</span> Full Squad (3+ members)
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>🚀</span> Submitted Project
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>🔥</span> Joined 2+ Hackathons
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>👑</span> Team Leader
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))]">
            <span>🥇</span> Top Ranked
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ type }: { type: 'teams' | 'participants' }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
      {type === 'teams' ? (
        <Users className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
      ) : (
        <Star className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
      )}
    </div>
    <p className="text-[hsl(var(--discord-text-muted))]">
      {type === 'teams' 
        ? 'No teams yet. Create one and climb the ranks!' 
        : 'No hackers yet. Register for a hackathon to join!'}
    </p>
  </div>
);
