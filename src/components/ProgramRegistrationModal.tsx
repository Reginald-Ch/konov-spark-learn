import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProgramRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  programTitle?: string;
}

export const ProgramRegistrationModal = ({ 
  open, 
  onOpenChange, 
  sessionId,
  programTitle 
}: ProgramRegistrationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    participantName: "",
    participantAge: "",
    participantEmail: "",
    participantPhone: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    specialRequirements: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast.error("Please select a program session");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("registrations").insert({
        session_id: sessionId,
        participant_name: formData.participantName,
        participant_age: parseInt(formData.participantAge),
        participant_email: formData.participantEmail,
        participant_phone: formData.participantPhone || null,
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        parent_phone: formData.parentPhone,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        payment_status: "pending",
        special_requirements: formData.specialRequirements || null,
      });

      if (error) throw error;

      toast.success("Registration submitted successfully! We'll contact you soon with payment details.");
      onOpenChange(false);
      setFormData({
        participantName: "",
        participantAge: "",
        participantEmail: "",
        participantPhone: "",
        parentName: "",
        parentEmail: "",
        parentPhone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        specialRequirements: "",
      });
    } catch (error) {
      console.error("Error submitting registration:", error);
      toast.error("Failed to submit registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl">
            Register for {programTitle || "Program"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Participant Information */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-lg font-bold">Participant Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="participantName">Full Name *</Label>
              <Input
                id="participantName"
                value={formData.participantName}
                onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="participantAge">Age *</Label>
                <Input
                  id="participantAge"
                  type="number"
                  min="6"
                  max="14"
                  value={formData.participantAge}
                  onChange={(e) => setFormData({ ...formData, participantAge: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantPhone">Phone (Optional)</Label>
                <Input
                  id="participantPhone"
                  type="tel"
                  value={formData.participantPhone}
                  onChange={(e) => setFormData({ ...formData, participantPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="participantEmail">Email *</Label>
              <Input
                id="participantEmail"
                type="email"
                value={formData.participantEmail}
                onChange={(e) => setFormData({ ...formData, participantEmail: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-lg font-bold">Parent/Guardian Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="parentName">Full Name *</Label>
              <Input
                id="parentName"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email *</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone *</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-lg font-bold">Emergency Contact</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Full Name *</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Phone *</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="specialRequirements">Special Requirements (Optional)</Label>
            <Textarea
              id="specialRequirements"
              value={formData.specialRequirements}
              onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
              placeholder="Any allergies, dietary restrictions, or special needs we should know about"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full font-space" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Complete Registration"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
