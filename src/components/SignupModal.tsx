import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { analytics } from "@/hooks/useAnalytics";
import { format } from "date-fns";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  programInterest: z.string().min(1, "Please select a program"),
  childAge: z.string().optional(),
  schoolName: z.string().optional(),
  message: z.string().optional(),
});

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  prefilledDate?: Date;
}

export const SignupModal = ({ open, onOpenChange, source = "modal", prefilledDate }: SignupModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    programInterest: "",
    childAge: "",
    schoolName: "",
    message: "",
  });

  // Pre-fill message with date if provided
  useEffect(() => {
    if (prefilledDate && open) {
      const dateStr = format(prefilledDate, "EEEE, MMMM d, yyyy");
      const bookingType = source === "school_demo" ? "School Demo" : "Free Trial";
      setFormData(prev => ({
        ...prev,
        message: `Preferred date for ${bookingType}: ${dateStr}`,
      }));
    }
  }, [prefilledDate, source, open]);

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
        childAge: "",
        schoolName: "",
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

  const isSchoolDemo = source === "school_demo";
  const isFreeTrial = source === "free_trial";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-orbitron gradient-text">
            {isSchoolDemo ? "Book School Demo" : isFreeTrial ? "Book Free Trial" : "Application Form"}
          </DialogTitle>
          <DialogDescription className="font-space">
            {isSchoolDemo 
              ? "Fill in your details to schedule a demo for your school or class!"
              : isFreeTrial
              ? "Fill in your details to book your free trial session!"
              : "Complete this application to join our AI learning community!"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Show selected date if provided */}
        {prefilledDate && (
          <div className="bg-primary/10 rounded-lg p-3 flex items-center gap-3 border border-primary/20">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">Selected Date</p>
              <p className="text-sm text-muted-foreground">{format(prefilledDate, "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{isSchoolDemo ? "Contact Name *" : "Name *"}</Label>
            <Input
              id="name"
              placeholder={isSchoolDemo ? "Your name" : "Child's name or parent name"}
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
              placeholder={isSchoolDemo ? "school@example.com" : "parent@example.com"}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+233 XX XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          {!isSchoolDemo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="childAge">Child's Age *</Label>
                <Select
                  value={formData.childAge}
                  onValueChange={(value) => setFormData({ ...formData, childAge: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 6).map(age => (
                      <SelectItem key={age} value={age.toString()}>{age} years</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  placeholder="Child's school"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
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
                <SelectItem value="tech_camp">Tech Camp</SelectItem>
                <SelectItem value="tech_fair">Tech Fair</SelectItem>
                {isSchoolDemo && <SelectItem value="school_program">School Program</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">
              {isSchoolDemo ? "Additional Information" : "Message"} (optional)
            </Label>
            <Textarea
              id="message"
              placeholder={isSchoolDemo 
                ? "School name, class size, preferred time, etc."
                : "Any questions or special requirements?"
              }
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
              isSchoolDemo ? "Request School Demo" : isFreeTrial ? "Book Free Trial" : "Sign Up Now"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
