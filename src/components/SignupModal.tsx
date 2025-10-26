import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { analytics } from "@/hooks/useAnalytics";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  programInterest: z.string().min(1, "Please select a program"),
  message: z.string().optional(),
});

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export const SignupModal = ({ open, onOpenChange, source = "modal" }: SignupModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    programInterest: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = signupSchema.parse(formData);

      const { error } = await supabase.from("newsletter_signups").insert({
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        program_interest: validated.programInterest,
        source,
      });

      if (error) throw error;

      analytics.trackFormSubmission('newsletter_signup', true);
      analytics.track({
        category: 'Conversion',
        action: 'Newsletter Signup',
        label: `${source} - ${validated.programInterest}`,
      });

      toast.success("Success!", {
        description: "Thank you for signing up! We'll be in touch soon.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        programInterest: "",
        message: "",
      });
      onOpenChange(false);
    } catch (error) {
      analytics.trackFormSubmission('newsletter_signup', false);
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Error", {
          description: "Something went wrong. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-orbitron gradient-text">Join the Innovation</DialogTitle>
          <DialogDescription className="font-space">
            Fill in your details and we'll get you started on your AI learning journey!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="programInterest">Program Interest *</Label>
            <Select
              value={formData.programInterest}
              onValueChange={(value) => setFormData({ ...formData, programInterest: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workshops">Workshops</SelectItem>
                <SelectItem value="comics">Comics</SelectItem>
                <SelectItem value="edtech">EdTech Platform</SelectItem>
                <SelectItem value="schools">School Programs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Sign Up Now"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
