import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Rocket, FileCode, Link, Github, Video, Cpu, Users } from 'lucide-react';

const submissionSchema = z.object({
  project_name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  demo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  repo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  video_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  technologies: z.string().trim().max(500).optional(),
});

interface Team {
  id: string;
  team_name: string;
}

interface SubmissionModalProps {
  hackathonId: string | null;
  hackathonTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmissionModal = ({
  hackathonId,
  hackathonTitle,
  isOpen,
  onClose,
  onSuccess,
}: SubmissionModalProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    demo_url: '',
    repo_url: '',
    video_url: '',
    technologies: '',
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
      .select('id, team_name')
      .eq('hackathon_id', hackathonId)
      .order('team_name');

    if (error) {
      toast({ title: 'Error', description: 'Failed to load teams.', variant: 'destructive' });
    } else {
      setTeams((data as unknown as Team[]) || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hackathonId || !selectedTeamId) {
      toast({
        title: 'Team Required',
        description: 'Please select your team.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const validated = submissionSchema.parse(formData);
      setIsSubmitting(true);

      const { error } = await supabase
        .from('hackathon_submissions' as any)
        .insert({
          hackathon_id: hackathonId,
          team_id: selectedTeamId,
          project_name: validated.project_name,
          description: validated.description,
          demo_url: validated.demo_url || null,
          repo_url: validated.repo_url || null,
          video_url: validated.video_url || null,
          technologies: validated.technologies || null,
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
        title: '🚀 Project Submitted!',
        description: 'Your project has been submitted successfully.',
      });

      setFormData({
        project_name: '',
        description: '',
        demo_url: '',
        repo_url: '',
        video_url: '',
        technologies: '',
      });
      setSelectedTeamId('');
      onSuccess();
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
          description: 'Failed to submit project. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-[hsl(var(--discord-green))]" />
            Submit Your Project
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--discord-text-muted))]">
            {hackathonTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="team" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Team *
            </Label>
            {isLoading ? (
              <div className="h-10 bg-[hsl(var(--discord-darker))] rounded animate-pulse" />
            ) : teams.length === 0 ? (
              <p className="text-sm text-[hsl(var(--discord-red))]">No teams available. Create a team first.</p>
            ) : (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white">
                  <SelectValue placeholder="Select your team" />
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

          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Project Name *
            </Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="Enter your project name"
              required
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[hsl(var(--discord-text))]">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project, what problem it solves, and how it works"
              rows={4}
              required
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="technologies" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Technologies Used
            </Label>
            <Input
              id="technologies"
              value={formData.technologies}
              onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
              placeholder="e.g., React, Node.js, Python, TensorFlow"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="demo_url" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
                <Link className="w-4 h-4" />
                Demo URL
              </Label>
              <Input
                id="demo_url"
                type="url"
                value={formData.demo_url}
                onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                placeholder="https://your-demo.com"
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
                placeholder="https://github.com/..."
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light))] text-white placeholder:text-[hsl(var(--discord-text-muted))]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url" className="text-[hsl(var(--discord-text))] flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video/Presentation URL
            </Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/..."
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
              disabled={isSubmitting || teams.length === 0}
            >
              {isSubmitting ? 'Submitting...' : '🚀 Submit Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};