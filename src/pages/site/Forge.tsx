import { usePageTracking } from "@/hooks/useAnalytics";
import forgeBuilderChat from "@/assets/site/forge-builder-chat.webp";
import forgeBuilderHands from "@/assets/site/forge-builder-hands.webp";
import { LINKS, SPRINT_LIST } from "@/site/links";
import { ToolPage, type Tool } from "@/site/ToolPage";

const forge: Tool = {
  seo: {
    title: "FORGE – Build Your Own AI, For Teenagers",
    description: "FORGE is KONOV's platform where teenagers build their own AI, team up, race the clock and battle other bots. It's home to the AI Builder Sprint.",
    path: "/forge",
    keywords: ["FORGE", "build your own AI teens", "AI platform for teenagers Ghana", "bot battle", "AI Builder Sprint"],
  },
  name: "FORGE",
  eyebrow: "a KONOV tool · for teenagers",
  headline: "Build your own AI. Team up. Race the clock. Battle other bots.",
  intro: "FORGE is KONOV's platform where teenagers build real AI, together. It's home to the AI Builder Sprint.",
  primary: { label: "Join the next Sprint", to: SPRINT_LIST },
  secondary: { label: "Sign in · Sprint teams", to: LINKS.forge, placeholder: "[ADD FORGE URL]" },
  facts: [
    { label: "For", value: "Teenagers, in teams" },
    { label: "Access", value: "Through the AI Builder Sprint" },
  ],
  heroShot: { src: forgeBuilderHands, alt: "Hands typing a chatbot's knowledge base in FORGE Builder on a laptop", caption: "FORGE Builder, Accra", position: "50% 45%" },
  wall: {
    title: "Teens use AI every day. Few ever get to build one.",
    paragraphs: [
      "Most AI tools are made for using, not making. FORGE flips that. It gives teenagers a real place to design, train and test their own AI, then put it up against other teams' bots.",
      "It's competitive, social and a lot of fun, and it's built around how young people actually work together.",
    ],
  },
  features: [
    { tag: "builder", title: "Build your own AI", text: "A builder made for young developers: design how your AI thinks, train it, test it, improve it.", shot: { src: forgeBuilderChat, alt: "A teen building a chatbot in FORGE Builder while the bot replies in the chat panel", caption: "building a chatbot in FORGE Builder" } },
    { tag: "community", title: "Team channels", text: "Discord-style channels where your team chats, shares ideas and plans the next move.", shot: "SCREENSHOT: a team channel" },
    { tag: "timer", title: "Race the clock", text: "A built-in timer keeps every round tight and every team focused.", shot: "SCREENSHOT: the round timer" },
    { tag: "battle", title: "Bot vs bot", text: "When time is up, your AI goes head to head with other teams' bots.", shot: "SCREENSHOT: a bot battle" },
  ],
  access: {
    title: "Your way into FORGE is the Sprint.",
    aside: "For teenagers, in teams. FORGE opens to teams taking part in the AI Builder Sprint.",
    steps: [
      { fn: "join_list()", title: "Get notified", text: "Join the Sprint list." },
      { fn: "register()", title: "Register your team", text: "When registration opens." },
      { fn: "log_in()", title: "Get your FORGE login", text: "Sent to your team before the Sprint." },
      { fn: "battle()", title: "Build and battle", text: "With mentors beside you." },
    ],
    cta: { label: "Join the next Sprint", to: SPRINT_LIST },
  },
  safety: {
    title: "Built for teenagers, with parents in mind.",
    points: [
      "Channels are for your team and the Sprint only, moderated by KONOV mentors.",
      "No private messages with strangers.",
      "Under-16s join with a parent's permission.",
    ],
  },
  more: {
    text: "For younger builders, there's MeAI, our coding and AI game for kids aged 6–14.",
    link: { label: "Meet MeAI", to: LINKS.meai },
  },
  sticky: [
    { to: SPRINT_LIST, label: "Join the Sprint", variant: "orange" },
    // Until the FORGE address is supplied, the second button goes to Contact instead of a dead sign-in link.
    LINKS.forge ? { to: LINKS.forge, label: "Sign in", variant: "ink" } : { to: "/contact", label: "Contact us", variant: "ink" },
  ],
};

const Forge = () => {
  usePageTracking("/forge");
  return <ToolPage tool={forge} />;
};

export default Forge;
