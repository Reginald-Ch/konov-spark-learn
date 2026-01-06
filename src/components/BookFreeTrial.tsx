import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Users, Sparkles, Gift, ArrowRight, School, GraduationCap, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";
import { SpeechBubble } from "@/components/SpeechBubble";
import { SignupModal } from "@/components/SignupModal";
import { cn } from "@/lib/utils";

type BookingType = "trial" | "school" | null;

export const BookFreeTrial = () => {
  const [showModal, setShowModal] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);

  const trialBenefits = [
    { icon: Clock, text: "1-Hour Free Session" },
    { icon: Users, text: "Small Group Learning" },
    { icon: Gift, text: "Free Learning Kit" },
  ];

  const schoolBenefits = [
    { icon: School, text: "On-site Demo" },
    { icon: Users, text: "For Entire Classes" },
    { icon: GraduationCap, text: "Teacher Training" },
  ];

  const handleBookingSelect = (type: BookingType) => {
    setBookingType(type);
    setShowCalendar(true);
    setSelectedDate(undefined);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleConfirmBooking = () => {
    setShowModal(true);
    setShowCalendar(false);
  };

  const handleBack = () => {
    if (selectedDate) {
      setSelectedDate(undefined);
    } else if (showCalendar) {
      setShowCalendar(false);
      setBookingType(null);
    }
  };

  // Disable past dates and weekends
  const disabledDays = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <ComicPanel color="primary" className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {!showCalendar ? (
                /* Initial Selection View */
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid md:grid-cols-2 gap-8 items-center"
                >
                  {/* Left Content */}
                  <div className="text-center md:text-left">
                    <ActionBurst color="accent" className="mb-4 inline-block">
                      FREE DEMO!
                    </ActionBurst>
                    
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-fredoka font-bold mb-4">
                      Book Your{" "}
                      <span className="gradient-text">Free Demo</span>{" "}
                      Today!
                    </h2>
                    
                    <SpeechBubble direction="up" className="mb-6">
                      <p className="text-base md:text-lg font-space">
                        Experience the magic of AI learning with a free introductory session. 
                        No commitment required!
                      </p>
                    </SpeechBubble>

                    {/* Two booking options */}
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      {/* Free Trial Option */}
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleBookingSelect("trial")}
                        className="cursor-pointer bg-background/90 backdrop-blur-sm p-6 rounded-2xl border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-fredoka font-bold text-lg">Free Trial</h3>
                        </div>
                        <p className="text-sm text-muted-foreground font-space mb-4">
                          Book a 1-hour free trial session for your child
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {trialBenefits.slice(0, 2).map((benefit, idx) => (
                            <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                              {benefit.text}
                            </span>
                          ))}
                        </div>
                      </motion.div>

                      {/* School Demo Option */}
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleBookingSelect("school")}
                        className="cursor-pointer bg-background/90 backdrop-blur-sm p-6 rounded-2xl border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                            <School className="w-6 h-6 text-secondary" />
                          </div>
                          <h3 className="font-fredoka font-bold text-lg">School Demo</h3>
                        </div>
                        <p className="text-sm text-muted-foreground font-space mb-4">
                          Schedule a demo session for your school or class
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {schoolBenefits.slice(0, 2).map((benefit, idx) => (
                            <span key={idx} className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full font-medium">
                              {benefit.text}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </div>

                    <p className="text-sm text-muted-foreground font-space">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      Limited spots available each week
                    </p>
                  </div>

                  {/* Right Content - Mascot */}
                  <div className="flex flex-col items-center justify-center">
                    <motion.div
                      animate={{ 
                        y: [0, -10, 0],
                        rotate: [-2, 2, -2]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <RobotMascot type="excited" size="lg" />
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <SpeechBubble direction="up" className="text-center">
                        <p className="font-fredoka font-bold text-lg">
                          "Try before you enroll!"
                        </p>
                        <p className="text-sm text-muted-foreground font-space">
                          100% Free • No strings attached
                        </p>
                      </SpeechBubble>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                /* Calendar View */
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid md:grid-cols-2 gap-8 items-start"
                >
                  {/* Left - Calendar */}
                  <div>
                    <button 
                      onClick={handleBack}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 font-space text-sm"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back
                    </button>

                    <ActionBurst 
                      color={bookingType === "trial" ? "primary" : "secondary"} 
                      className="mb-4 inline-block"
                    >
                      {bookingType === "trial" ? "FREE TRIAL" : "SCHOOL DEMO"}
                    </ActionBurst>

                    <h3 className="text-2xl md:text-3xl font-fredoka font-bold mb-2">
                      Select a Date
                    </h3>
                    <p className="text-muted-foreground font-space mb-6">
                      {bookingType === "trial" 
                        ? "Choose a convenient date for your child's free trial session"
                        : "Pick a date for your school demo session"
                      }
                    </p>

                    {/* Calendar */}
                    <div className="bg-background rounded-2xl border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] p-4 inline-block">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={disabledDays}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </div>
                  </div>

                  {/* Right - Selection Summary */}
                  <div className="flex flex-col items-center md:items-start justify-center h-full">
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="mb-6"
                    >
                      <RobotMascot type={selectedDate ? "happy" : "thinking"} size="md" />
                    </motion.div>

                    {selectedDate ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-sm"
                      >
                        <SpeechBubble direction="up" className="mb-6">
                          <p className="font-fredoka font-bold text-lg mb-2">
                            Great choice!
                          </p>
                          <div className="flex items-center gap-2 text-primary">
                            <CalendarIcon className="w-5 h-5" />
                            <span className="font-space font-medium">
                              {format(selectedDate, "EEEE, MMMM d, yyyy")}
                            </span>
                          </div>
                        </SpeechBubble>

                        {/* Benefits summary */}
                        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border-2 border-foreground/20 mb-6">
                          <h4 className="font-fredoka font-bold mb-3">What's Included:</h4>
                          <div className="space-y-2">
                            {(bookingType === "trial" ? trialBenefits : schoolBenefits).map((benefit, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm font-space">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>{benefit.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            size="lg"
                            onClick={handleConfirmBooking}
                            className={cn(
                              "w-full font-fredoka font-bold text-lg px-8 py-6 rounded-full border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all group",
                              bookingType === "school" && "bg-secondary hover:bg-secondary/90"
                            )}
                          >
                            Confirm Booking
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <SpeechBubble direction="up" className="text-center">
                        <p className="font-fredoka font-bold">
                          Pick a date from the calendar!
                        </p>
                        <p className="text-sm text-muted-foreground font-space">
                          Select your preferred session date
                        </p>
                      </SpeechBubble>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ComicPanel>
        </motion.div>
      </div>

      <SignupModal 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setShowCalendar(false);
            setBookingType(null);
            setSelectedDate(undefined);
          }
        }} 
        source={bookingType === "school" ? "school_demo" : "free_trial"}
        prefilledDate={selectedDate}
      />
    </section>
  );
};
