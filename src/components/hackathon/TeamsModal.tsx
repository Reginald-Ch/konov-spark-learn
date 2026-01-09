import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

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
        title: 'Team Created!',
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
      // Update registration with team_id
      const { error } = await supabase
        .from('hackathon_registrations' as any)
        .update({ team_id: teamId })
        .eq('hackathon_id', hackathonId)
        .eq('participant_email', email);

      if (error) throw error;

      toast({
        title: 'Team Joined!',
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hackathon Teams</DialogTitle>
          <DialogDescription>{hackathonTitle}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">
              <Users className="w-4 h-4 mr-2" />
              Browse Teams
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No teams yet. Be the first to create one!</p>
              </div>
            ) : (
              teams.map((team) => (
                <TeamCard 
                  key={team.id} 
                  team={team} 
                  onJoin={(email) => handleJoinTeam(team.id, email)} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Team Name *</Label>
                <Input
                  id="team_name"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  placeholder="Enter a unique team name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_email">Your Email *</Label>
                <Input
                  id="team_email"
                  type="email"
                  value={formData.created_by_email}
                  onChange={(e) => setFormData({ ...formData, created_by_email: e.target.value })}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_description">Description</Label>
                <Textarea
                  id="team_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your team and what you're looking for"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setActiveTab('browse')} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{team.team_name}</CardTitle>
          {team.looking_for_members && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <UserPlus className="w-3 h-3 mr-1" />
              Recruiting
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {team.description && (
          <p className="text-sm text-muted-foreground">{team.description}</p>
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
                  className="flex-1"
                />
                <Button size="sm" onClick={() => onJoin(email)}>Join</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowJoinInput(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Request to Join
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
