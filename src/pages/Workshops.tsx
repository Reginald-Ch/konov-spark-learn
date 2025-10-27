import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  age: z.string().min(1, "Please enter age"),
});

const Workshops = () => {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
  });

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .eq("is_active", true)
      .order("date", { ascending: true });

    if (error) {
      toast.error("Error loading workshops");
    } else {
      setWorkshops(data || []);
    }
  };

  const handleRegister = (workshop: any) => {
    setSelectedWorkshop(workshop);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = registrationSchema.parse(formData);

      const { error } = await supabase.from("workshop_registrations").insert({
        workshop_id: selectedWorkshop.id,
        participant_name: validated.name,
        participant_email: validated.email,
        participant_phone: validated.phone || null,
        participant_age: parseInt(validated.age),
      });

      if (error) throw error;

      toast.success("Registration Successful!", {
        description: "You're all set! Check your email for details.",
      });

      setFormData({ name: "", email: "", phone: "", age: "" });
      setIsModalOpen(false);
      fetchWorkshops();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Error", {
          description: "Registration failed. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6">
              Tech <span className="gradient-text">Workshops</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
              Hands-on learning experiences where kids build robots, create AI apps, and explore the future of technology
            </p>
          </div>

          {workshops.length === 0 ? (
            <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border border-primary/20">
              <p className="text-base text-muted-foreground font-space">
                No upcoming workshops at the moment. Check back soon!
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => (
                <Card key={workshop.id} className="glow-card bg-card/50 backdrop-blur-sm border border-primary/20 overflow-hidden group">
                  {workshop.image_url && (
                    <div className="h-36 overflow-hidden">
                      <img 
                        src={workshop.image_url} 
                        alt={workshop.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-orbitron font-bold mb-2 text-foreground">
                      {workshop.title}
                    </h3>
                    <p className="text-muted-foreground font-space mb-3 text-sm leading-snug">
                      {workshop.description}
                    </p>
                    
                    <div className="space-y-1.5 mb-4 font-space text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(workshop.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {workshop.duration_hours} hours
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {workshop.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {workshop.current_participants}/{workshop.max_participants} registered
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-orbitron font-bold gradient-text">
                        ${workshop.price}
                      </span>
                      <Button 
                        onClick={() => handleRegister(workshop)}
                        disabled={workshop.current_participants >= workshop.max_participants}
                        className="font-space group text-sm py-2"
                      >
                        {workshop.current_participants >= workshop.max_participants ? "Full" : "Register"}
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-orbitron gradient-text">
              Register for {selectedWorkshop?.title}
            </DialogTitle>
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
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Complete Registration"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Workshops;
