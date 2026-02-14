import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Terminal, Rocket, Link, Github, FileCode, ExternalLink } from 'lucide-react';

const quickSubmitSchema = z.object({
  project_name: z.string().trim().min(2, 'Project name required').max(100),
  demo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  repo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

interface Hackathon {
  id: string;
  title: string;
  status: string;
}

interface Team {
  id: string;
  team_name: string;
  hackathon_id: string;
}

interface QuickSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickSubmitModal = ({ isOpen, onClose, onSuccess }: QuickSubmitModalProps) => {
  const { toast } = useToast();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    demo_url: '',
    repo_url: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchHackathons();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedHackathonId) {
      fetchTeams(selectedHackathonId);
    } else {
      setTeams([]);
      setSelectedTeamId('');
    }
  }, [selectedHackathonId]);

  const fetchHackathons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathons' as any)
      .select('id, title, status')
      .in('status', ['live', 'upcoming'])
      .order('start_date');

    if (!error && data) {
      setHackathons(data as unknown as Hackathon[]);
    }
    setIsLoading(false);
  };

  const fetchTeams = async (hackathonId: string) => {
    const { data, error } = await supabase
      .from('hackathon_teams' as any)
      .select('id, team_name, hackathon_id')
      .eq('hackathon_id', hackathonId)
      .order('team_name');

    if (!error && data) {
      setTeams(data as unknown as Team[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHackathonId || !selectedTeamId) {
      toast({
        title: 'Selection Required',
        description: 'Please select a hackathon and team.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const validated = quickSubmitSchema.parse(formData);
      setIsSubmitting(true);

      const { error } = await supabase
        .from('hackathon_submissions' as any)
        .insert({
          hackathon_id: selectedHackathonId,
          team_id: selectedTeamId,
          project_name: validated.project_name,
          description: 'Quick submission - details to be updated',
          demo_url: validated.demo_url || null,
          repo_url: validated.repo_url || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Submitted',
            description: 'Your team has already submitted a project.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: '🚀 Quick Submit Success!',
        description: 'Your project links have been submitted.',
      });

      setFormData({ project_name: '', demo_url: '', repo_url: '' });
      setSelectedHackathonId('');
      setSelectedTeamId('');
      onSuccess?.();
      onClose();
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
          description: 'Failed to submit. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Terminal className="w-5 h-5 text-[hsl(var(--discord-green))]" />
            Quick Submit
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
            Quickly submit your project demo and repository links
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Select Hackathon *
            </Label>
            {isLoading ? (
              <div className="h-10 bg-[hsl(var(--discord-darker))] rounded animate-pulse" />
            ) : hackathons.length === 0 ? (
              <p className="text-sm text-[hsl(var(--discord-text-muted))]">No active hackathons available.</p>
            ) : (
              <Select value={selectedHackathonId} onValueChange={setSelectedHackathonId}>
                <SelectTrigger className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
                  <SelectValue placeholder="Choose a hackathon" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))]">
                  {hackathons.map((hackathon) => (
                    <SelectItem
                      key={hackathon.id}
                      value={hackathon.id}
                      className="text-white focus:bg-[hsl(var(--discord-blurple))]"
                    >
                      <span className="flex items-center gap-2">
                        {hackathon.title}
                        {hackathon.status === 'live' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--discord-red))] text-white">
                            LIVE
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedHackathonId && (
            <div className="space-y-2">
              <Label className="text-[hsl(var(--discord-text))]">Select Team *</Label>
              {teams.length === 0 ? (
                <p className="text-sm text-[hsl(var(--discord-red))]">No teams found. Create a team first.</p>
              ) : (
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
                    <SelectValue placeholder="Choose your team" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))]">
                    {teams.map((team) => (
                      <SelectItem
                        key={team.id}
                        value={team.id}
                        className="text-white focus:bg-[hsl(var(--discord-blurple))]"
                      >
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Project Name *
            </Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="e.g., AI Chatbot with LangChain"
              required
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo_url" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Demo URL
            </Label>
            <Input
              id="demo_url"
              type="url"
              value={formData.demo_url}
              onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
              placeholder="https://colab.research.google.com/... or Streamlit URL"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repo_url" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <Github className="w-4 h-4" />
              Repository URL
            </Label>
            <Input
              id="repo_url"
              type="url"
              value={formData.repo_url}
              onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
              placeholder="https://github.com/your-python-ai-project"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white"
              disabled={isSubmitting || !selectedTeamId}
            >
              {isSubmitting ? 'Submitting...' : '⚡ Quick Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
