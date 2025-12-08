import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { motion } from "framer-motion";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ActionBurst } from "@/components/ActionBurst";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  programInterest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const Contact = () => {
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
      const validated = contactSchema.parse(formData);

      const { error } = await supabase.from("contact_submissions").insert({
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        program_interest: validated.programInterest || null,
        message: validated.message,
      });

      if (error) throw error;

      toast.success("Message Sent!", {
        description: "Thank you for contacting us. We'll get back to you soon!",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        programInterest: "",
        message: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Error", {
          description: "Failed to send message. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      content: "hello@konovartechtist.com",
      color: "from-primary to-accent",
      mascot: "happy" as const,
    },
    {
      icon: Phone,
      title: "Call Us",
      content: "+234 (0) 123 456 7890",
      color: "from-accent to-secondary",
      mascot: "excited" as const,
    },
    {
      icon: MapPin,
      title: "Visit Us",
      content: "Lagos, Nigeria",
      color: "from-secondary to-primary",
      mascot: "cool" as const,
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section with Comic Style */}
      <div className="w-full py-12 halftone-bg border-b-4 border-foreground relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <ActionBurst color="primary" className="mb-4">
              SAY HELLO!
            </ActionBurst>
            <div className="flex items-center gap-4 mb-4">
              <RobotMascot type="happy" size="md" />
              <RobotMascot type="excited" size="md" />
            </div>
          </div>
        </div>
      </div>
      
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-fredoka font-bold mb-6">
              Get in <span className="gradient-text">Touch</span>
            </h1>
            <div className="flex justify-center">
              <SpeechBubble direction="up" className="max-w-2xl">
                <p className="text-xl font-space leading-relaxed">
                  Have questions? We'd love to hear from you! Send us a message and we'll respond super fast!
                </p>
              </SpeechBubble>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-16">
            {contactInfo.map((info, idx) => {
              const Icon = info.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30, rotate: idx % 2 === 0 ? -3 : 3 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <ComicPanel className="p-6 text-center h-full group hover:scale-105 transition-transform">
                    <div className="flex justify-center mb-4">
                      <RobotMascot type={info.mascot} size="sm" />
                    </div>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg border-3 border-foreground group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-foreground" />
                    </div>
                    <h3 className="text-xl font-fredoka font-bold mb-2 text-foreground">
                      {info.title}
                    </h3>
                    <p className="text-muted-foreground font-space">{info.content}</p>
                  </ComicPanel>
                </motion.div>
              );
            })}
          </div>

          <div className="max-w-2xl mx-auto">
            <ComicPanel className="p-8 md:p-12">
              <div className="flex items-center gap-3 mb-8">
                <RobotMascot type="thinking" size="sm" />
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-fredoka font-bold text-foreground">
                    Send us a Message
                  </h2>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-fredoka text-lg">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isLoading}
                    className="font-space border-3 border-foreground rounded-xl shadow-[3px_3px_0_hsl(var(--foreground))] focus:shadow-[5px_5px_0_hsl(var(--primary))] transition-shadow"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-fredoka text-lg">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isLoading}
                    className="font-space border-3 border-foreground rounded-xl shadow-[3px_3px_0_hsl(var(--foreground))] focus:shadow-[5px_5px_0_hsl(var(--primary))] transition-shadow"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-fredoka text-lg">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isLoading}
                    className="font-space border-3 border-foreground rounded-xl shadow-[3px_3px_0_hsl(var(--foreground))] focus:shadow-[5px_5px_0_hsl(var(--primary))] transition-shadow"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="programInterest" className="font-fredoka text-lg">Program Interest (optional)</Label>
                  <Select
                    value={formData.programInterest}
                    onValueChange={(value) => setFormData({ ...formData, programInterest: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="font-space border-3 border-foreground rounded-xl shadow-[3px_3px_0_hsl(var(--foreground))]">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent className="border-3 border-foreground rounded-xl">
                      <SelectItem value="workshops">Workshops</SelectItem>
                      <SelectItem value="tech_camp">Tech Camp</SelectItem>
                      <SelectItem value="tech_fair">Tech Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="font-fredoka text-lg">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    required
                    disabled={isLoading}
                    className="font-space border-3 border-foreground rounded-xl shadow-[3px_3px_0_hsl(var(--foreground))] focus:shadow-[5px_5px_0_hsl(var(--primary))] transition-shadow"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full font-fredoka font-bold text-lg border-3 border-foreground rounded-full shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all" 
                  size="lg" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Send Message!
                    </>
                  )}
                </Button>
              </form>
            </ComicPanel>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;