import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, UserPlus, Hash, Crown, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { motion } from 'framer-motion';

const teamSchema = z.object({
  team_name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(50),
  description: z.string().trim().max(500).optional(),
  created_by_email: z.string().trim().email('Invalid email address'),
});

interface Team {
  id: string;
  team_name: string;
  description: string | null;
  looking_for_members: boolean;
  max_members: number;
  created_by_email: string;
}

interface TeamsModalProps {
  hackathonId: string | null;
  hackathonTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamsModal = ({ hackathonId, hackathonTitle, isOpen, onClose }: TeamsModalProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    team_name: '',
    description: '',
    created_by_email: '',
  });

  useEffect(() => {
    if (isOpen && hackathonId) {
      fetchTeams();
    }
  }, [isOpen, hackathonId]);

  const fetchTeams = async () => {
    if (!hackathonId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathon_teams' as any)
      .select('*')
      .eq('hackathon_id', hackathonId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load teams.', variant: 'destructive' });
    } else {
      setTeams((data as unknown as Team[]) || []);
    }
    setIsLoading(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hackathonId) return;

    try {
      const validated = teamSchema.parse(formData);
      setIsSubmitting(true);

      const { error } = await supabase
        .from('hackathon_teams' as any)
        .insert({
          hackathon_id: hackathonId,
          team_name: validated.team_name,
          description: validated.description || null,
          created_by_email: validated.created_by_email,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Team Name Taken',
            description: 'A team with this name already exists.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: '🎉 Team Created!',
        description: 'Your team has been created successfully.',
      });

      setFormData({ team_name: '', description: '', created_by_email: '' });
      setActiveTab('browse');
      fetchTeams();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create team. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async (teamId: string, email: string) => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email to join a team.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('hackathon_registrations' as any)
        .update({ team_id: teamId })
        .eq('hackathon_id', hackathonId)
        .eq('participant_email', email);

      if (error) throw error;

      toast({
        title: '🎉 Team Joined!',
        description: 'You have successfully joined the team.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join team. Make sure you are registered for this hackathon.',
        variant: 'destructive',
      });
    }
  };

  const filteredTeams = teams.filter(team => 
    team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white p-0">
        <DialogHeader className="p-4 border-b border-[hsl(var(--discord-light)/0.2)]">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Hash className="w-5 h-5 text-[hsl(var(--discord-text-muted))]" />
            hackathon-teams
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
            {hackathonTitle}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2 bg-[hsl(var(--discord-darker))]">
              <TabsTrigger 
                value="browse" 
                className="data-[state=active]:bg-[hsl(var(--discord-blurple))] data-[state=active]:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Browse Teams
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-[hsl(var(--discord-blurple))] data-[state=active]:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="mt-0 flex-1">
            <div className="p-4 border-b border-[hsl(var(--discord-light)/0.2)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--discord-text-muted))]" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
                />
              </div>
            </div>
            
            <ScrollArea className="h-[350px] px-4 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[hsl(var(--discord-blurple))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--discord-light))] flex items-center justify-center">
                    <Users className="w-8 h-8 text-[hsl(var(--discord-text-muted))]" />
                  </div>
                  <p className="text-[hsl(var(--discord-text-muted))]">
                    {searchQuery ? 'No teams found matching your search.' : 'No teams yet. Be the first to create one!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTeams.map((team, index) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TeamCard team={team} onJoin={(email) => handleJoinTeam(team.id, email)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="mt-0 p-4">
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_name" className="text-[hsl(var(--discord-text))]">Team Name *</Label>
                <Input
                  id="team_name"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  placeholder="Enter a unique team name"
                  required
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_email" className="text-[hsl(var(--discord-text))]">Your Email *</Label>
                <Input
                  id="team_email"
                  type="email"
                  value={formData.created_by_email}
                  onChange={(e) => setFormData({ ...formData, created_by_email: e.target.value })}
                  placeholder="Enter your email"
                  required
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_description" className="text-[hsl(var(--discord-text))]">Description</Label>
                <Textarea
                  id="team_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your team and what you're looking for"
                  rows={3}
                  className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveTab('browse')} 
                  className="flex-1 border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const TeamCard = ({ team, onJoin }: { team: Team; onJoin: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  return (
    <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-4 border border-[hsl(var(--discord-light)/0.2)] hover:border-[hsl(var(--discord-blurple)/0.5)] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--discord-blurple))] to-primary flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <h4 className="font-semibold text-white">{team.team_name}</h4>
        </div>
        {team.looking_for_members && (
          <Badge className="bg-[hsl(var(--discord-green))] text-white border-0 text-xs">
            <UserPlus className="w-3 h-3 mr-1" />
            Recruiting
          </Badge>
        )}
      </div>
      
      {team.description && (
        <p className="text-sm text-[hsl(var(--discord-text-muted))] mb-3 line-clamp-2">
          {team.description}
        </p>
      )}
      
      {team.looking_for_members && (
        <>
          {showJoinInput ? (
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your registered email"
                className="flex-1 h-8 text-sm bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
              />
              <Button 
                size="sm" 
                className="h-8 bg-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.8)]"
                onClick={() => onJoin(email)}
              >
                Join
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowJoinInput(true)}
              className="border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Request to Join
            </Button>
          )}
        </>
      )}
    </div>
  );
};