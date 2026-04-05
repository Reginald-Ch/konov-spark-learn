import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rocket,
  Brain,
  Bot,
  Sparkles,
  Users,
  Share2,
  Copy,
  CheckCircle2,
  Star,
  BookOpen,
  Zap,
  MessageCircle,
  Mail,
  Phone,
  ArrowRight,
  Bell,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import meaiLogo from "@/assets/meai-logo.png";

type ContactMethod = "whatsapp" | "email";

const Waitlist = () => {
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupData, setSignupData] = useState<{
    position: number;
    referralCode: string;
    id?: string;
  } | null>(null);
  const [totalSignups, setTotalSignups] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const { subscribe, isSubscribing, isSubscribed, isSupported } = usePushNotifications();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferredBy(ref);
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("waitlist_signups")
        .select("*", { count: "exact", head: true });
      setTotalSignups(count || 0);
    };
    fetchCount();
  }, [signupData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contactValue.trim();
    if (!trimmed) return;

    // Validate
    if (contactMethod === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else {
      // WhatsApp: accept digits, spaces, +, -, min 8 chars
      const cleaned = trimmed.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{8,15}$/.test(cleaned)) {
        toast.error("Please enter a valid WhatsApp number (e.g. +233 24 123 4567)");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Generate a 6-char referral code
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const insertData = {
        referral_code: referralCode,
        referred_by: referredBy,
        ...(contactMethod === "email"
          ? { email: trimmed.toLowerCase() }
          : { whatsapp: trimmed.replace(/[\s\-()]/g, "") }),
      };

      const { data, error } = await supabase
        .from("waitlist_signups")
        .insert([insertData])
        .select("id, position, referral_code")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Duplicate — fetch existing
          let query = supabase.from("waitlist_signups").select("id, position, referral_code");
          if (contactMethod === "email") {
            query = query.eq("email", trimmed.toLowerCase());
          } else {
            query = query.eq("whatsapp", trimmed.replace(/[\s\-()]/g, ""));
          }
          const { data: existing } = await query.single();
          if (existing) {
            setSignupData({
              id: existing.id,
              position: existing.position,
              referralCode: existing.referral_code,
            });
            toast.info("You're already on the waitlist! Here's your spot.");
          }
        } else {
          throw error;
        }
      } else if (data) {
        setSignupData({
          id: data.id,
          position: data.position,
          referralCode: data.referral_code,
        });
        toast.success("You're in! Welcome to the waitlist 🎉");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const siteOrigin = "https://konovartechtist.com";
  const referralLink = signupData
    ? `${siteOrigin}/waitlist?ref=${signupData.referralCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Charley, check this out! MeAI is teaching kids real AI & machine learning — not just robot toys. My pikin go learn how ChatGPT actually works 🤯\n\nJoin the waitlist: ${referralLink}`
    );
    // Use wa.me with fallback — most reliable cross-platform
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      "Just joined the MeAI waitlist! 🚀 Real AI & ML education for kids. Join me:"
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const features = [
    {
      icon: Brain,
      title: "Real AI & ML Concepts",
      desc: "Not robot toys — kids learn how neural networks, training data, and intelligent machines actually work.",
      gradient: "from-primary to-accent",
    },
    {
      icon: Bot,
      title: "Build Chatbots & AI Models",
      desc: "Hands-on projects where kids build conversational AI and train machine learning models.",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: BookOpen,
      title: "Interactive Comic Lessons",
      desc: "Fun, story-driven learning with African characters that makes complex concepts simple.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Sparkles,
      title: "No Experience Needed",
      desc: "Designed for ages 6–15. Zero coding background required — just curiosity and imagination.",
      gradient: "from-blue-500 to-cyan-600",
    },
  ];

  const trustQuotes = [
    { text: "Finally something that teaches REAL AI, not just Scratch.", author: "— Parent, Accra" },
    { text: "My daughter built her first chatbot in one session!", author: "— Parent, Kumasi" },
    { text: "This is what AI education should look like in Africa.", author: "— Educator, Tema" },
  ];

  return (
    <>
      <SEO
        title="MeAI Waitlist — Real AI Education for Kids"
        description="Join the waitlist for MeAI: the interactive platform teaching kids real AI & machine learning through comics, chatbot building, and hands-on projects."
      />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
        {/* Hero — Mobile-first, CTA above fold */}
        <section className="pt-8 pb-12 md:pt-16 md:pb-20 relative overflow-hidden">
          <div className="container mx-auto px-4 max-w-lg md:max-w-2xl text-center relative z-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="mb-5"
            >
              <img src={meaiLogo} alt="MeAI" className="h-20 md:h-28 w-auto mx-auto" />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-700 dark:text-amber-300 font-bold text-sm mb-4 border-2 border-amber-300 dark:border-amber-700 shadow-md font-fredoka"
            >
              <Star className="h-4 w-4" />
              Limited Early Access
            </motion.div>

            {/* Headline — shorter for mobile */}
            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl lg:text-5xl font-fredoka font-bold mb-3 leading-tight"
            >
              <span className="text-foreground">Your Kids Use AI Every Day.</span>
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-primary bg-clip-text text-transparent">
                Now They Can Understand It.
              </span>
            </motion.h1>

            {/* Problem statement */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed"
            >
              Most programs teach robot toys, not real AI.{" "}
              <strong className="text-foreground">MeAI is different.</strong>{" "}
              Interactive comics, chatbot building, and hands-on ML for ages 6–15.
            </motion.p>

            {/* Social proof counter — near the form */}
            {totalSignups > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-2 mb-5"
              >
                <Users className="w-4 h-4 text-primary" />
                <span className="font-fredoka font-bold">
                  <AnimatedCounter end={totalSignups} duration={1200} />
                </span>
                <span className="text-muted-foreground font-fredoka text-sm">
                  parents already joined
                </span>
              </motion.div>
            )}

            {/* Form / Post-Signup */}
            <AnimatePresence mode="wait">
              {!signupData ? (
                <motion.div
                  key="form"
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -15, opacity: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {/* Contact method toggle */}
                  <div className="flex gap-2 mb-4 justify-center">
                    <button
                      type="button"
                      onClick={() => { setContactMethod("whatsapp"); setContactValue(""); }}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-fredoka font-bold text-sm transition-all ${
                        contactMethod === "whatsapp"
                          ? "bg-[#25D366] text-white shadow-lg scale-105"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => { setContactMethod("email"); setContactValue(""); }}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-fredoka font-bold text-sm transition-all ${
                        contactMethod === "email"
                          ? "bg-primary text-primary-foreground shadow-lg scale-105"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      type={contactMethod === "email" ? "email" : "tel"}
                      placeholder={
                        contactMethod === "email"
                          ? "your@email.com"
                          : "+233 24 123 4567"
                      }
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      required
                      className="h-14 text-lg rounded-xl border-2 border-foreground/20 focus:border-primary font-fredoka text-center"
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 font-fredoka font-bold text-lg rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-white"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        <>
                          <Rocket className="w-5 h-5 mr-2" />
                          Get Early Access
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground mt-3 font-fredoka">
                    🔒 We'll only notify you when spots open. No spam, ever.
                  </p>

                  {/* Urgency */}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-fredoka font-bold">
                    🔥 Only 100 early access spots remaining
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-card rounded-3xl border-3 border-primary/30 p-6 md:p-8 shadow-2xl"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                  </motion.div>
                  <h3 className="text-2xl font-fredoka font-bold mb-1">
                    You're In! 🎉
                  </h3>
                  <p className="text-4xl font-fredoka font-bold text-primary mb-1">
                    #{signupData.position}
                  </p>
                  <p className="text-muted-foreground mb-5 font-fredoka text-sm">
                    on the waitlist
                  </p>

                  {/* What happens next */}
                  <div className="bg-muted/30 rounded-2xl p-4 mb-5 text-left">
                    <p className="font-fredoka font-bold text-sm mb-3 text-center">What happens next?</p>
                    <div className="space-y-3">
                      {[
                        { step: "1", text: "We're building something amazing for your kids" },
                        { step: "2", text: "You'll get early access before everyone else" },
                        { step: "3", text: "Share to move up — the higher you are, the sooner you get in!" },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {item.step}
                          </span>
                          <p className="text-sm text-muted-foreground font-fredoka">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referral Section */}
                  <div className="bg-muted/50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3 justify-center">
                      <Share2 className="w-5 h-5 text-primary" />
                      <p className="font-fredoka font-bold text-sm">
                        Share with 3 friends to move up! 🚀
                      </p>
                    </div>

                    {/* WhatsApp share — PRIMARY */}
                    <Button
                      onClick={shareOnWhatsApp}
                      className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-fredoka font-bold text-base mb-3"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Share on WhatsApp
                    </Button>

                    {/* Copy link */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={referralLink}
                        readOnly
                        className="text-xs font-mono rounded-xl h-10"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyReferralLink}
                        className="rounded-xl shrink-0 border-2 h-10 w-10"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Twitter — secondary */}
                    <Button
                      onClick={shareOnTwitter}
                      variant="outline"
                      className="w-full h-10 rounded-xl font-fredoka font-bold text-sm"
                    >
                      𝕏 Share on Twitter
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Trust Quotes — near the form */}
        <section className="pb-10 md:pb-16">
          <div className="container mx-auto px-4 max-w-lg md:max-w-2xl">
            <div className="grid gap-3">
              {trustQuotes.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ x: i % 2 === 0 ? -20 : 20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-foreground/10 p-4 shadow-sm"
                >
                  <p className="text-sm font-fredoka italic text-foreground">"{q.text}"</p>
                  <p className="text-xs text-muted-foreground font-fredoka mt-1">{q.author}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-lg md:max-w-3xl">
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-fredoka font-bold mb-2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  What Your Kids Will Learn
                </span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Real AI literacy that prepares them for the future
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-2xl border border-foreground/10 p-5 shadow-sm"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-3 shadow-md`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-fredoka font-bold mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        {/* Always show bottom CTA — scroll back to form if already signed up */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 max-w-lg md:max-w-2xl text-center">
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl border-2 border-amber-300/30 p-8"
              >
                <Zap className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-xl md:text-2xl font-fredoka font-bold mb-2">
                  Don't Let Your Kids Fall Behind
                </h3>
                <p className="text-sm text-muted-foreground mb-4 font-fredoka">
                  AI is the future. Early access spots are limited.
                </p>
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="h-12 px-8 font-fredoka font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  {signupData ? "Share & Move Up" : "Join the Waitlist"}
                </Button>
              </motion.div>
            </div>
          </section>
      </div>
      <Footer />
    </>
  );
};

export default Waitlist;
