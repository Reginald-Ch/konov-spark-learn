import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const registrationSchema = z.object({
  participant_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  participant_email: z.string().trim().email('Invalid email address').max(255),
  participant_phone: z.string().trim().max(20).optional(),
  skills: z.string().trim().max(500).optional(),
  experience_level: z.string().optional(),
  looking_for_team: z.boolean(),
});

interface RegistrationModalProps {
  hackathonId: string | null;
  hackathonTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrationModal = ({ 
  hackathonId, 
  hackathonTitle, 
  isOpen, 
  onClose,
  onSuccess 
}: RegistrationModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_email: '',
    participant_phone: '',
    skills: '',
    experience_level: '',
    looking_for_team: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hackathonId) return;

    try {
      const validated = registrationSchema.parse(formData);
      setIsSubmitting(true);

      const { error } = await supabase
        .from('hackathon_registrations' as any)
        .insert({
          hackathon_id: hackathonId,
          ...validated,
          skills: validated.skills || null,
          experience_level: validated.experience_level || null,
          participant_phone: validated.participant_phone || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Registered',
            description: 'You have already registered for this hackathon.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Registration Successful!',
        description: 'You have been registered for the hackathon.',
      });

      setFormData({
        participant_name: '',
        participant_email: '',
        participant_phone: '',
        skills: '',
        experience_level: '',
        looking_for_team: false,
      });
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
          description: 'Failed to register. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for Hackathon</DialogTitle>
          <DialogDescription>{hackathonTitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.participant_name}
              onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.participant_email}
              onChange={(e) => setFormData({ ...formData, participant_email: e.target.value })}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.participant_phone}
              onChange={(e) => setFormData({ ...formData, participant_phone: e.target.value })}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="e.g., React, Python, UI/UX Design, Machine Learning"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience Level</Label>
            <Select
              value={formData.experience_level}
              onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="looking_for_team"
              checked={formData.looking_for_team}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, looking_for_team: checked as boolean })
              }
            />
            <Label htmlFor="looking_for_team" className="text-sm">
              I'm looking for a team to join
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
