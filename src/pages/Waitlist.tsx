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
  ArrowRight,
  Star,
  BookOpen,
  Zap,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import meaiLogo from "@/assets/meai-logo.png";

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupData, setSignupData] = useState<{
    position: number;
    referralCode: string;
  } | null>(null);
  const [totalSignups, setTotalSignups] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferredBy(ref);
  }, []);

  // Fetch total signups count
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
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("waitlist_signups")
        .insert({
          email: email.trim().toLowerCase(),
          referral_code: "", // trigger will generate
          referred_by: referredBy,
        })
        .select("position, referral_code")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Duplicate email - fetch existing record
          const { data: existing } = await supabase
            .from("waitlist_signups")
            .select("position, referral_code")
            .eq("email", email.trim().toLowerCase())
            .single();
          if (existing) {
            setSignupData({
              position: existing.position,
              referralCode: existing.referral_code,
            });
            toast.info("You're already on the waitlist!");
          }
        } else {
          throw error;
        }
      } else if (data) {
        setSignupData({
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

  const referralLink = signupData
    ? `${window.location.origin}/waitlist?ref=${signupData.referralCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      "I just joined the MeAI waitlist! 🚀 Real AI & ML education for kids — not robot toys. Join me:"
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out MeAI — real AI education for kids! Join the waitlist: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
      desc: "Hands-on projects where kids build their own conversational AI and train machine learning models.",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: BookOpen,
      title: "Interactive Comic Lessons",
      desc: "Fun, story-driven learning with African characters that makes complex concepts simple and engaging.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Sparkles,
      title: "No Experience Needed",
      desc: "Designed for ages 6–15. Zero coding background required — just curiosity and imagination.",
      gradient: "from-blue-500 to-cyan-600",
    },
  ];

  return (
    <>
      <SEO
        title="MeAI Waitlist — Real AI Education for Kids"
        description="Join the waitlist for MeAI: the interactive platform teaching kids real AI & machine learning through comics, chatbot building, and hands-on projects."
      />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          {/* Background particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary/20"
                style={{
                  left: `${15 + i * 10}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="mb-8"
            >
              <img
                src={meaiLogo}
                alt="MeAI"
                className="h-24 md:h-32 w-auto mx-auto"
              />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-700 dark:text-amber-300 font-bold text-sm mb-6 border-2 border-amber-300 dark:border-amber-700 shadow-lg font-fredoka"
            >
              <Star className="h-4 w-4" />
              Limited Early Access
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-fredoka font-bold mb-6 leading-tight max-w-4xl mx-auto"
            >
              <span className="text-foreground">Your Kids Use AI Every Day.</span>
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-primary bg-clip-text text-transparent">
                Now They Can Understand How It Works.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              MeAI teaches kids{" "}
              <strong className="text-foreground">real AI & machine learning</strong>{" "}
              — not robot toys or basic coding. Interactive comics, chatbot building,
              and hands-on ML projects for ages 6–15.
            </motion.p>

            {/* Form / Post-Signup */}
            <AnimatePresence mode="wait">
              {!signupData ? (
                <motion.form
                  key="form"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ delay: 0.5 }}
                  onSubmit={handleSubmit}
                  className="max-w-md mx-auto"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 text-lg rounded-xl border-3 border-foreground/20 focus:border-primary font-fredoka"
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 px-8 font-fredoka font-bold text-lg rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-white whitespace-nowrap"
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
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 font-fredoka">
                    🔒 No spam, ever. Unsubscribe anytime.
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-lg mx-auto bg-card rounded-3xl border-4 border-primary/30 p-8 shadow-2xl"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-fredoka font-bold mb-2">
                    You're In! 🎉
                  </h3>
                  <p className="text-4xl font-fredoka font-bold text-primary mb-2">
                    #{signupData.position}
                  </p>
                  <p className="text-muted-foreground mb-6 font-fredoka">
                    on the waitlist
                  </p>

                  {/* Referral Section */}
                  <div className="bg-muted/50 rounded-2xl p-6 mb-4">
                    <div className="flex items-center gap-2 mb-3 justify-center">
                      <Share2 className="w-5 h-5 text-primary" />
                      <p className="font-fredoka font-bold text-sm">
                        Share to move up the list!
                      </p>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={referralLink}
                        readOnly
                        className="text-sm font-mono rounded-xl"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyReferralLink}
                        className="rounded-xl shrink-0 border-2"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={shareOnTwitter}
                        className="rounded-xl bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-fredoka font-bold"
                      >
                        𝕏 Tweet
                      </Button>
                      <Button
                        onClick={shareOnWhatsApp}
                        className="rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-fredoka font-bold"
                      >
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Social Proof Counter */}
            {totalSignups > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8 flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5 text-primary" />
                <span className="font-fredoka font-bold text-lg">
                  <AnimatedCounter end={totalSignups} duration={1500} />
                </span>
                <span className="text-muted-foreground font-fredoka">
                  {" "}
                  already joined
                </span>
              </motion.div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-fredoka font-bold mb-4">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  What Your Kids Will Learn
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real AI literacy that prepares them for the future
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-3xl border-3 border-foreground/10 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-md`}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-fredoka font-bold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        {!signupData && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="max-w-2xl mx-auto bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl border-3 border-amber-300/30 p-10"
              >
                <Zap className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                <h3 className="text-2xl md:text-3xl font-fredoka font-bold mb-3">
                  Don't Let Your Kids Fall Behind
                </h3>
                <p className="text-muted-foreground mb-6 font-fredoka">
                  AI is the future. Early access spots are limited.
                </p>
                <Button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="h-14 px-10 font-fredoka font-bold text-lg rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all text-white"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Join the Waitlist
                </Button>
              </motion.div>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Waitlist;
