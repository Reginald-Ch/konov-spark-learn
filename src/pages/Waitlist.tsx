import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { analytics, usePageTracking } from "@/hooks/useAnalytics";
import { toast } from "sonner";
import {
  Rocket,
  Brain,
  Bot,
  Users,
  Share2,
  Copy,
  CheckCircle2,
  Gift,
  Gamepad2,
  Sparkles,
  MessageCircle,
  Mail,
  ArrowLeft,
  ArrowRight,
  Bell,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import meaiLogo from "@/assets/meai-logo.png";

type ContactMethod = "whatsapp" | "email";
type Step = "join" | "profile" | "done";

type Profile = {
  role?: string;
  childAgeBands: string[];
  goal?: string;
  device?: string;
  location?: string;
  classInterest?: string;
  schoolName: string;
  learnerCount?: string;
  wishlist: string;
};

type Option = { value: string; label: string };
type Question =
  | { key: "role" | "goal" | "device" | "location" | "classInterest" | "learnerCount"; kind: "single"; title: string; options: Option[] }
  | { key: "childAgeBands"; kind: "multi"; title: string; options: Option[] }
  | { key: "schoolName" | "wishlist"; kind: "text"; title: string; placeholder: string };

const EMPTY_PROFILE: Profile = { childAgeBands: [], schoolName: "", wishlist: "" };

// The answer values must match the lists accepted by save_waitlist_profile
// (drizzle/migrations/0002_waitlist_profile_and_attribution.sql).
const buildQuestions = (p: Profile): Question[] => {
  const school = p.role === "school";
  const qs: Question[] = [
    { key: "role", kind: "single", title: "Who are you?", options: [
      { value: "parent", label: "Parent or guardian" },
      { value: "school", label: "Teacher or school" },
    ] },
  ];
  if (school) {
    qs.push(
      { key: "schoolName", kind: "text", title: "What's your school called?", placeholder: "School name" },
      { key: "learnerCount", kind: "single", title: "How many learners could use MeAI?", options: [
        { value: "under_50", label: "Under 50" },
        { value: "50_200", label: "50–200" },
        { value: "200_500", label: "200–500" },
        { value: "over_500", label: "Over 500" },
      ] },
    );
  } else {
    qs.push({ key: "childAgeBands", kind: "multi", title: "How old are your children?", options: [
      { value: "6-8", label: "6–8" },
      { value: "9-11", label: "9–11" },
      { value: "12-14", label: "12–14" },
      { value: "other", label: "Another age" },
    ] });
  }
  qs.push(
    { key: "goal", kind: "single", title: school ? "What do you most want for your learners?" : "What do you most want for your child?", options: [
      { value: "coding", label: "Learn to code" },
      { value: "ai", label: "Understand AI" },
      { value: "screen_time", label: "Make screen time count" },
      { value: "confidence", label: "Build confidence" },
      { value: "future_careers", label: "Prepare for future careers" },
    ] },
    { key: "device", kind: "single", title: school ? "What devices do your learners use?" : "What will they mostly play MeAI on?", options: [
      { value: "phone", label: "Phone" },
      { value: "tablet", label: "Tablet" },
      { value: "laptop", label: "Laptop or computer" },
      { value: "none", label: "We don't have one yet" },
    ] },
    { key: "location", kind: "single", title: "Where are you based?", options: [
      { value: "accra", label: "Accra" },
      { value: "kumasi", label: "Kumasi" },
      { value: "ghana_other", label: "Elsewhere in Ghana" },
      { value: "outside_ghana", label: "Outside Ghana" },
    ] },
  );
  // Classes only run in Accra, so only Accra families are asked.
  if (!school && p.location === "accra") {
    qs.push({ key: "classInterest", kind: "single", title: "Would your child like to join our AI & coding classes in Accra?", options: [
      { value: "weekend", label: "Weekend classes" },
      { value: "after_school", label: "After-school classes" },
      { value: "summer", label: "Summer school" },
      { value: "not_now", label: "Not right now" },
    ] });
  }
  qs.push({ key: "wishlist", kind: "text", title: "Anything you'd love MeAI to do? (optional)", placeholder: "e.g. help my daughter make her own game" });
  return qs;
};

// Stores Ghana numbers as +233… so one parent can't appear twice and every
// number works in a wa.me link. Mirrors normalize_waitlist_whatsapp in SQL.
const normalizeWhatsApp = (value: string) => {
  const cleaned = value.replace(/[\s\-()]/g, "");
  if (/^0\d{9}$/.test(cleaned)) return `+233${cleaned.slice(1)}`;
  if (/^233\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
};

// The Akwaaba Discount goes to the first 100 families on the waitlist.
const AKWAABA_SPOTS = 100;

// PostgREST answers PGRST202 when a function isn't deployed yet.
const isMissingFunction = (error: { code?: string } | null) => error?.code === "PGRST202";

const Waitlist = () => {
  usePageTracking("/waitlist");
  const [step, setStep] = useState<Step>("join");
  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupData, setSignupData] = useState<{
    position: number;
    referralCode: string;
    id?: string;
  } | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalSignups, setTotalSignups] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<{ source: string; medium: string; campaign: string; referrer: string }>({ source: "", medium: "", campaign: "", referrer: "" });
  const { subscribe, isSubscribing, isSubscribed, isSupported } = usePushNotifications();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferredBy(ref);
    // Where this visitor came from: UTM tags on ad/flyer links, or the site that linked here.
    const external = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
    setAttribution({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      referrer: external,
    });
  }, []);

  useEffect(() => {
    // Routed through get_waitlist_count (SECURITY DEFINER) instead of a
    // raw table select — waitlist_signups no longer grants anon/
    // authenticated any direct access at all (see migration
    // 20260915010000), since a full-row SELECT policy that existed only
    // for this counter was readable by anyone for every signup's email
    // and phone number, not just a count.
    const fetchCount = async () => {
      const { data } = await supabase.rpc("get_waitlist_count");
      setTotalSignups(data || 0);
    };
    fetchCount();
  }, [signupData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = name.trim();
    const trimmed = contactValue.trim();
    if (!firstName || !trimmed) return;

    // Validate
    if (contactMethod === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else if (!/^\+?\d{8,15}$/.test(normalizeWhatsApp(trimmed))) {
      toast.error("Please enter a valid WhatsApp number, starting with 0 or +233");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate a 6-char referral code
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const email = contactMethod === "email" ? trimmed.toLowerCase() : null;
      const whatsapp = contactMethod === "whatsapp" ? normalizeWhatsApp(trimmed) : null;

      // join_waitlist (SECURITY DEFINER) also stores the name and where the
      // signup came from. Until its migration is deployed, fall back to the
      // older submit_waitlist_signup so nobody is turned away.
      let { data, error } = await supabase.rpc("join_waitlist", {
        p_name: firstName,
        p_email: email,
        p_whatsapp: whatsapp,
        p_referral_code: referralCode,
        p_referred_by: referredBy,
        p_utm_source: attribution.source || null,
        p_utm_medium: attribution.medium || null,
        p_utm_campaign: attribution.campaign || null,
        p_referrer: attribution.referrer || null,
      });
      if (isMissingFunction(error)) {
        ({ data, error } = await supabase.rpc("submit_waitlist_signup", {
          p_email: email,
          p_whatsapp: whatsapp,
          p_referral_code: referralCode,
          p_referred_by: referredBy,
        }));
      }

      if (error) throw error;

      const row = data?.[0];
      if (row) {
        setSignupData({
          id: row.id,
          position: row.position,
          referralCode: row.referral_code,
        });
        setStep("profile");
        analytics.track({ category: "Waitlist", action: row.is_new ? "Join" : "Rejoin", label: attribution.source || "direct" });
        toast[row.is_new ? "success" : "info"](
          row.is_new ? `Akwaaba, ${firstName}! Your discount is reserved 🎉` : "You're already on the waitlist. Your discount is still reserved."
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const spotsLeft = Math.max(0, AKWAABA_SPOTS - totalSignups);
  const hasDiscount = !!signupData && signupData.position <= AKWAABA_SPOTS;

  const questions = buildQuestions(profile);
  const question = questions[Math.min(questionIndex, questions.length - 1)];

  const finishProfile = async (answers: Profile) => {
    setStep("done");
    const answered = answers.role || answers.childAgeBands.length || answers.goal || answers.device || answers.location || answers.wishlist.trim();
    if (!answered || !signupData?.id) {
      analytics.track({ category: "Waitlist", action: "Profile Skipped" });
      return;
    }
    const { error } = await supabase.rpc("save_waitlist_profile", {
      p_id: signupData.id,
      p_role: answers.role ?? "",
      p_child_age_bands: answers.childAgeBands,
      p_goal: answers.goal ?? "",
      p_device: answers.device ?? "",
      p_location: answers.location ?? "",
      p_class_interest: answers.classInterest ?? "",
      p_school_name: answers.schoolName,
      p_learner_count: answers.learnerCount ?? "",
      p_wishlist: answers.wishlist,
    });
    if (error) console.error("[waitlist] profile not saved", error);
    else analytics.track({ category: "Waitlist", action: "Profile Complete", label: answers.role });
  };

  // Moves to the next question for these answers; the list can change as answers come in.
  const advance = (answers: Profile) => {
    const next = questionIndex + 1;
    if (next >= buildQuestions(answers).length) finishProfile(answers);
    else setQuestionIndex(next);
  };

  const answerSingle = (key: Question["key"], value: string) => {
    const answers = { ...profile, [key]: value };
    setProfile(answers);
    advance(answers);
  };

  const toggleAgeBand = (value: string) =>
    setProfile((p) => ({
      ...p,
      childAgeBands: p.childAgeBands.includes(value) ? p.childAgeBands.filter((b) => b !== value) : [...p.childAgeBands, value],
    }));

  const siteOrigin = "https://konovartechtist.com";
  const referralLink = signupData
    ? `${siteOrigin}/waitlist?ref=${signupData.referralCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    analytics.track({ category: "Waitlist", action: "Share", label: "copy" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Turn screen time into skill time! MeAI teaches kids 6–14 to code and understand AI through missions set in real African places 🎮🤖\n\nJoin the parents' waitlist and get the Akwaaba Discount too: ${referralLink}`
    );
    analytics.track({ category: "Waitlist", action: "Share", label: "whatsapp" });
    // Use wa.me with fallback — most reliable cross-platform
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      "Just joined the MeAI parents' waitlist 🚀 Coding & AI for kids 6–14, set in real African places. Join and get the Akwaaba Discount:"
    );
    analytics.track({ category: "Waitlist", action: "Share", label: "twitter" });
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const features = [
    {
      icon: Brain,
      title: "Understand How AI Works",
      desc: "Kids discover how AI learns from data, makes predictions and shows up in everyday life.",
      color: "bg-primary",
    },
    {
      icon: Bot,
      title: "Learn to Code by Building",
      desc: "Kids build real projects — chatbots, games and simple AI models — step by step.",
      color: "bg-accent",
    },
    {
      icon: Gamepad2,
      title: "Quest World Missions",
      desc: "Missions set in real African places, where every quest teaches coding and AI.",
      color: "bg-secondary",
    },
    {
      icon: Rocket,
      title: "No Experience Needed",
      desc: "Designed for ages 6–14. Works on the phone or laptop you already have — no coding background needed.",
      color: "bg-primary",
    },
  ];

  const optionClass = (selected: boolean) =>
    `w-full min-h-12 px-4 py-3 rounded-xl border-2 font-fredoka font-bold text-base text-left transition-all ${
      selected ? "border-primary bg-primary/10 text-foreground" : "border-foreground/15 bg-background hover:border-primary/60"
    }`;

  return (
    <>
      <SEO
        title="MeAI Parents' Waitlist – Akwaaba Discount"
        description="Turn screen time into skill time. Join the MeAI parents' waitlist and get the Akwaaba Discount: kids 6–14 learn to code and understand AI through missions set in real African places."
        canonical="/waitlist"
        keywords={["MeAI waitlist", "MeAI parents waitlist", "Akwaaba Discount", "coding for kids Ghana", "AI for kids Ghana", "screen time into skill time", "MeAI"]}
      />
      <Navbar />
      <div className="min-h-screen bg-background">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary font-bold text-sm mb-4 border-2 border-secondary/30 shadow-md font-fredoka"
            >
              <Gift className="h-4 w-4" />
              Akwaaba Discount for founding families
            </motion.div>

            {/* Headline — shorter for mobile */}
            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl lg:text-5xl font-fredoka font-bold mb-3 leading-tight"
            >
              <span className="text-foreground">Turn Screen Time</span>
              <br />
              <span className="text-secondary">
                Into Skill Time.
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed"
            >
              Your child learns to code and understands how AI works, through missions set in real African places.{" "}
              <strong className="text-foreground">For ages 6 to 14, on the phone or laptop you already have.</strong>{" "}
              MeAI at home opens soon — join the parents' waitlist to hear first.
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
                  families already joined
                </span>
              </motion.div>
            )}

            {/* Join → optional profile → done */}
            <AnimatePresence mode="wait">
              {step === "join" && (
                <motion.div
                  key="form"
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -15, opacity: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="waitlist-name" className="sr-only">Your first name</label>
                    <Input
                      id="waitlist-name"
                      autoComplete="given-name"
                      placeholder="Your first name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={80}
                      className="h-14 text-lg rounded-xl border-2 border-foreground/20 focus:border-primary font-fredoka text-center"
                    />

                    {/* Contact method toggle */}
                    <div className="flex gap-2 justify-center" role="group" aria-label="How should we contact you?">
                      <button
                        type="button"
                        aria-pressed={contactMethod === "whatsapp"}
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
                        aria-pressed={contactMethod === "email"}
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

                    <label htmlFor="waitlist-contact" className="sr-only">
                      {contactMethod === "email" ? "Your email address" : "Your WhatsApp number"}
                    </label>
                    <Input
                      id="waitlist-contact"
                      type={contactMethod === "email" ? "email" : "tel"}
                      autoComplete={contactMethod === "email" ? "email" : "tel"}
                      placeholder={
                        contactMethod === "email"
                          ? "your@email.com"
                          : "Your WhatsApp number"
                      }
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      required
                      className="h-14 text-lg rounded-xl border-2 border-foreground/20 focus:border-primary font-fredoka text-center"
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 font-fredoka font-bold text-lg rounded-xl bg-secondary hover:bg-secondary/90 border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-white"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <Rocket className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Claim My Akwaaba Discount
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground mt-3 font-fredoka">
                    🔒 No ads · No chatting with strangers · Time limits you set
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-fredoka">
                    Free to join. We'll only message you about MeAI, your Akwaaba Discount and KONOV classes. Reply STOP anytime.
                  </p>

                  {/* Urgency — a live count, never a fixed number */}
                  {totalSignups > 0 && spotsLeft > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-fredoka font-bold">
                      🔥 {spotsLeft} of {AKWAABA_SPOTS} Akwaaba Discount spots left
                    </p>
                  )}
                </motion.div>
              )}

              {step === "profile" && question && (
                <motion.div
                  key="profile"
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -15, opacity: 0 }}
                  className="bg-card rounded-3xl border-3 border-primary/30 p-6 md:p-8 shadow-2xl text-left"
                >
                  <p className="font-fredoka font-bold text-primary text-sm text-center mb-1">
                    ✅ You're in!{hasDiscount ? " Your Akwaaba Discount is reserved." : ""}
                  </p>
                  <p className="text-muted-foreground text-sm font-fredoka text-center mb-4">
                    A few quick taps help us get MeAI ready for your family.
                  </p>
                  <div
                    className="h-2 rounded-full bg-muted mb-5 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={questions.length}
                    aria-valuenow={questionIndex + 1}
                    aria-label={`Question ${questionIndex + 1} of ${questions.length}`}
                  >
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
                  </div>

                  <fieldset key={question.key}>
                    <legend className="text-xl md:text-2xl font-fredoka font-bold mb-4">{question.title}</legend>

                    {question.kind === "single" && (
                      <div className="grid gap-2">
                        {question.options.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            aria-pressed={profile[question.key] === o.value}
                            onClick={() => answerSingle(question.key, o.value)}
                            className={optionClass(profile[question.key] === o.value)}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {question.kind === "multi" && (
                      <>
                        <p className="text-sm text-muted-foreground -mt-2 mb-3">Choose all that apply.</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {question.options.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              aria-pressed={profile.childAgeBands.includes(o.value)}
                              onClick={() => toggleAgeBand(o.value)}
                              className={optionClass(profile.childAgeBands.includes(o.value))}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <Button type="button" onClick={() => advance(profile)} disabled={!profile.childAgeBands.length} className="w-full h-12 rounded-xl font-fredoka font-bold">
                          Next <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </>
                    )}

                    {question.kind === "text" && (
                      <form onSubmit={(e) => { e.preventDefault(); advance(profile); }}>
                        <Input
                          aria-label={question.title}
                          placeholder={question.placeholder}
                          value={profile[question.key]}
                          onChange={(e) => setProfile((p) => ({ ...p, [question.key]: e.target.value }))}
                          maxLength={question.key === "wishlist" ? 500 : 150}
                          className="h-12 rounded-xl border-2 border-foreground/20 mb-3"
                        />
                        <Button type="submit" className="w-full h-12 rounded-xl font-fredoka font-bold">
                          {questionIndex + 1 >= questions.length ? "Finish" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </form>
                    )}
                  </fieldset>

                  <div className="flex items-center justify-between mt-4 text-sm font-fredoka">
                    <button
                      type="button"
                      onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                      disabled={questionIndex === 0}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:invisible"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="button" onClick={() => advance(profile)} className="text-muted-foreground hover:text-foreground">
                      Skip
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "done" && signupData && (
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
                    Akwaaba{name.trim() ? `, ${name.trim()}` : ""}! 🎉
                  </h3>
                  <p className="text-muted-foreground font-fredoka text-sm">You're founding family</p>
                  <p className="text-4xl font-fredoka font-bold text-primary mb-5">
                    #{signupData.position}
                  </p>

                  {/* What happens next */}
                  <div className="bg-muted/30 rounded-2xl p-4 mb-5 text-left">
                    <p className="font-fredoka font-bold text-sm mb-3 text-center">What happens next?</p>
                    <div className="space-y-3">
                      {[
                        { step: "1", text: hasDiscount
                          ? `Your Akwaaba Discount is reserved for this ${contactMethod === "email" ? "email" : "WhatsApp number"}.`
                          : "All Akwaaba Discount spots are taken, but you're on the list for MeAI at home." },
                        { step: "2", text: "We'll message you as soon as MeAI at home opens." },
                        { step: "3", text: spotsLeft > 0 ? "Share your link: friends who join while spots last get the Akwaaba Discount too." : "Share your link so friends hear about MeAI too." },
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

                  <div className="bg-muted/50 rounded-2xl p-5 mb-5">
                    <div className="flex items-center gap-2 mb-3 justify-center">
                      <Share2 className="w-5 h-5 text-primary" />
                      <p className="font-fredoka font-bold text-sm">
                        Share the Akwaaba Discount with other parents
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
                        aria-label="Your invite link"
                        className="text-xs font-mono rounded-xl h-10"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyReferralLink}
                        aria-label="Copy invite link"
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

                  {/* Push Notification Opt-in */}
                  {isSupported && !isSubscribed && (
                    <div className="bg-secondary/10 rounded-2xl border border-secondary/30 p-4">
                      <div className="flex items-center gap-2 mb-2 justify-center">
                        <Bell className="w-5 h-5 text-amber-500" />
                        <p className="font-fredoka font-bold text-sm">
                          Also get notified on this device
                        </p>
                      </div>
                      <Button
                        onClick={() => subscribe({ waitlistSignupId: signupData?.id })}
                        disabled={isSubscribing}
                        variant="outline"
                        className="w-full h-11 rounded-xl font-fredoka font-bold text-sm"
                      >
                        {isSubscribing ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                            <Bell className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Enable Notifications
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {isSubscribed && (
                    <div className="flex items-center gap-2 justify-center text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="font-fredoka font-bold text-xs">Notifications enabled! We'll ping you 🎉</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
                <span className="text-secondary">
                  What Your Kids Will Learn
                </span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Skill time, safely: no ads, no strangers, time limits you set
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
                  <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
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

        {/* Bottom CTA — scrolls back to the form, or to sharing once joined */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 max-w-lg md:max-w-2xl text-center">
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-secondary/10 rounded-3xl border-2 border-secondary/30 p-8"
              >
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-xl md:text-2xl font-fredoka font-bold mb-2">
                  Make Tech Fun To Learn And Create
                </h3>
                <p className="text-sm text-muted-foreground mb-4 font-fredoka">
                  {spotsLeft > 0
                    ? `Only ${AKWAABA_SPOTS} families get the Akwaaba Discount. Be first when MeAI at home opens.`
                    : "Be first when MeAI at home opens."}
                </p>
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="h-12 px-8 font-fredoka font-bold text-base rounded-xl bg-secondary hover:bg-secondary/90 text-white"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  {signupData ? "Share The Discount" : "Join the Parents' Waitlist"}
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
