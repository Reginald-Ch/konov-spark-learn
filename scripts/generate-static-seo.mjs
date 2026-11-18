// Post-build step: gives every route its own static <title>/meta/H1/body content in dist/.
//
// Why this exists: this app is a client-rendered SPA. Vercel's catch-all rewrite
// ("/(.*)" -> "/index.html") means every URL — /about, /programs, /contact, etc. —
// serves the exact same index.html to any crawler or bot that does not execute
// JavaScript (social share bots, link unfurlers, AI/LLM crawlers like GPTBot,
// ClaudeBot, and PerplexityBot, and Google's first-pass HTML fetch before the
// render queue picks it up). Without an entry here, a route is invisible/duplicate
// content to those clients — they'd see the homepage's title and body instead of
// the real page's. This script writes a real, route-specific dist/<route>.html for
// each route so non-JS clients see distinct, accurate content
// per page, while React still mounts and takes over #root for real visitors.
//
// Keep this in sync with each page's <SEO title=.../description=.../canonical=...>
// props and with App.tsx's route list — a route missing here silently falls back
// to the homepage's static content for every non-JS client, even once App.tsx and
// the real component are live and correct.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const SITE_URL = "https://konovartechtist.com";
const SITE_NAME = "KONOV Technologies";

const escapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROUTES = [
  {
    path: "/",
    title: "Interactive Tools For Young Learners | KONOV Technologies",
    description: "KONOV is a Ghanaian edtech company. We build fun, creative tools like MeAI and FORGE, run coding and AI classes in Accra and online, and host the yearly AI Builder Sprint for ages 6–16.",
    keywords: ["KONOV","edtech company Ghana","coding and AI classes Accra","AI Builder Sprint","MeAI","FORGE","coding for kids Ghana"],
    h1: "Where young imaginations come to life with tech.",
    intro: "We're a Ghanaian edtech company. We find the walls in tech education and build fun, creative tools to break them, so young people go from using tech to creating with it.",
    main: `<h2>What we do</h2><p>MeAI turns AI into a game kids can teach. FORGE lets teens build their own AI and battle it against others. Our classes and the Sprint turn using into creating, with guidance, together.</p><h2>Classes</h2><p>Weekend course: 10 weeks in person in Accra, ages 6–14, GH₵1,200. One-week online class: ages 8–14, GH₵500, each vacation. 5-Day Tech Camp: August, in person and online.</p><h2>AI Builder Sprint</h2><p>Once a year, kids and teens team up to take an idea from a sketch to a working project with code and AI, then show it to everyone.</p><p><a href="/classes">Classes</a> · <a href="/ai-builder-sprint">AI Builder Sprint</a> · <a href="/forge">FORGE</a> · <a href="/about">About</a> · <a href="https://meaitech.com">MeAI</a> · <a href="/contact">Contact</a></p>`,
  },
  {
    path: "/about",
    title: "About KONOV – Knowledge And Innovation, Together | KONOV Technologies",
    description: "KONOV is a Ghanaian edtech company. We find the walls in tech education and build interactive tools to break them, so young people aged 6–16 go from using tech to creating with it.",
    keywords: ["about KONOV","edtech company Ghana","KONOV Technologies","MeAI","FORGE","AI Builder Sprint"],
    h1: "Young people aren't just users of technology. They're creators.",
    intro: "KONOV is a Ghanaian edtech company. We find the walls in tech education and build interactive tools to break them, taking complex, emerging tech like AI and shaping it to fit how young people aged 6–16 see the world.",
    main: `<h2>Our name</h2><p>KONOV means Knowledge and Innovation, together. Knowledge is understanding how technology works. Innovation is being creative with it.</p><h2>Tools, classes and a community</h2><p>MeAI, a coding and AI game for kids aged 6–14. FORGE, our platform for teens to build their own AI. Classes in Accra and online, and the yearly AI Builder Sprint.</p><p><a href="/classes">Classes</a> · <a href="/ai-builder-sprint">AI Builder Sprint</a> · <a href="/forge">FORGE</a> · <a href="/contact">Contact</a></p>`,
  },
  {
    path: "/classes",
    title: "AI & Coding Classes For Kids In Accra | KONOV Technologies",
    description: "Small-group coding and AI classes for ages 6–14: a 10-week weekend course in Accra (GH₵1,200), one-week online classes (GH₵500) and a 5-Day Tech Camp. No experience needed.",
    keywords: ["coding classes for kids Accra","AI classes for kids Ghana","weekend coding course Accra","online coding class for kids","tech camp Accra"],
    h1: "Classes where young creators build real things",
    intro: "Small groups, hands-on coding and AI, and something they built to show you every time. No experience needed.",
    main: `<h2>Three ways to start building</h2><ul><li><strong>Weekend course</strong>: ten weeks of hands-on coding and AI in Accra. Ages 6–14. GH₵1,200.</li><li><strong>One-week online class</strong>: a focused week of coding and AI from home, during school vacations. Ages 8–14. GH₵500.</li><li><strong>5-Day Tech Camp</strong>: five days of making in August, in person in Accra or online. Prices coming soon.</li></ul><p><a href="/classes#book">Book a class</a> · <a href="/ai-builder-sprint">AI Builder Sprint</a></p>`,
  },
  {
    path: "/ai-builder-sprint",
    title: "AI Builder Sprint – Yearly AI Hackathon For Kids & Teens | KONOV Technologies",
    description: "KONOV's yearly coding and AI hackathon for kids and teenagers in Ghana. Team up, build with code and AI on FORGE, and show it off on demo day. The first official Sprint is planned for 2027.",
    keywords: ["AI hackathon for kids Ghana","AI Builder Sprint","coding hackathon for teens Accra","FORGE","kids AI competition Ghana"],
    h1: "AI Builder Sprint",
    intro: "Got an idea? Team up, build it with code and AI, and show it off on demo day. Once a year, it's the heart of the KONOV community.",
    main: `<h2>How it works</h2><p>Register, form a team, build it on FORGE with mentors beside you, battle and demo day, then celebrate with certificates and a closing ceremony.</p><p>2026 was a pilot. The first official Sprint is planned for 2027.</p><p><a href="/forge">Explore FORGE</a> · <a href="/classes">See classes</a></p>`,
  },
  {
    path: "/forge",
    title: "FORGE – Build Your Own AI, For Teenagers | KONOV Technologies",
    description: "FORGE is KONOV's platform where teenagers build their own AI, team up, race the clock and battle other bots. It's home to the AI Builder Sprint.",
    keywords: ["FORGE","build your own AI teens","AI platform for teenagers Ghana","bot battle","AI Builder Sprint"],
    h1: "FORGE",
    intro: "Build your own AI. Team up. Race the clock. Battle other bots. FORGE is KONOV's platform where teenagers build real AI, together.",
    main: `<h2>Your way into FORGE is the Sprint</h2><p>FORGE opens to teams taking part in the AI Builder Sprint.</p><p><a href="/ai-builder-sprint">Join the next Sprint</a></p>`,
  },
  {
    path: "/tertiary-ai-innovation-hub",
    noindex: true,
    title: "Tertiary AI Innovation Hub In Ghana | KONOV Technologies",
    description:
      "KONOV's Tertiary AI Innovation Hub helps students apply AI to product building, automation, data, and research — starting with the free 7-day AI Builder Sprint.",
    h1: "Applied AI For Tertiary Students",
    intro:
      "KONOV helps tertiary students, university students, and young adults apply artificial intelligence to product building, automation, data, research, and real-world problem solving — starting with the free, 7-day AI Builder Sprint.",
    main: `
        <h2>The AI Builder Sprint</h2>
        <p>A free 7-day virtual experience for tertiary students who want to explore artificial intelligence, learn how AI works, and build their own AI-powered project. Covers AI fundamentals, prompt engineering, data and machine learning basics, automation, chatbot development, product thinking, and problem-solving — ending in a capstone AI hackathon with cash prizes.</p>
        <h2>What You'll Apply AI To</h2>
        <ul>
          <li>Product Building</li>
          <li>Automation & Data</li>
          <li>Research</li>
          <li>Real-World Innovation</li>
        </ul>
        <p><a href="/classes">See all classes</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/community",
    noindex: true,
    title: "Community - Join Our Tech Learning Paths | KONOV Technologies",
    description:
      "Join KONOV Technologies' learning community. Choose from AI Explorers (ages 6-9), Young Builders (ages 9-11), or Tech Ambassadors (ages 12-16) programs.",
    h1: "Join Our Tech Community!",
    intro: "Choose your learning path and start building the future today.",
    main: `
        <h2>Learning Paths</h2>
        <ul>
          <li><strong>AI Explorers</strong> — ages 6-9, a first hands-on introduction to AI concepts.</li>
          <li><strong>Young Builders</strong> — ages 9-11, building real projects with code and AI tools.</li>
          <li><strong>Tech Ambassadors</strong> — ages 12-16, advanced AI, ML and app-development tracks.</li>
        </ul>
        <p><a href="/">Back to home</a> · <a href="/classes">See our classes</a> · <a href="/contact">Not sure which path is right for you? Contact us</a></p>`,
  },
  {
    path: "/resources",
    title: "AI Learning Resources for Young Learners | KONOV Technologies",
    description:
      "Interactive AI & ML resources for young learners ages 6-16. Explore machine learning, computer vision, NLP, creative AI and safe AI tools.",
    h1: "AI Learning Lab for Students",
    intro:
      "Master Artificial Intelligence concepts through interactive lessons, hands-on projects, and real-world applications.",
    main: `
        <h2>What You'll Find Here</h2>
        <p>Free lessons and guides covering machine learning, computer vision, natural language processing, creative AI and safe AI tools for young learners ages 6-16.</p>
        <p><a href="/resources/best-ai-tools-for-kids">Read: Best AI Tools for Kids in Ghana</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/resources/best-ai-tools-for-kids",
    title: "Best AI Tools for Kids in Ghana | KONOV Technologies",
    description:
      "A practical parent and school guide to safe AI tools for kids ages 6-16, covering MeAI, machine learning, robotics, coding and creative AI.",
    h1: "Best AI Tools for Kids: A Safe, Project-Based Guide for Ages 6-16",
    intro:
      "AI learning should help children build, question and create. This guide shows parents and schools how to choose tools that teach real AI literacy: prompting, data, machine learning, computer vision, robotics, coding and responsible use.",
    main: `
        <h2>Choosing AI Tools Safely</h2>
        <p>The best AI education balances curiosity with guardrails. Children should understand what AI is doing, what data it uses, and when to ask an adult before sharing or publishing anything.</p>
        <p>Start with guided, age-appropriate projects. Younger learners can explore pattern recognition, prompts and creative AI. Older learners can build chatbots, train simple models, control robots and publish apps — the path KONOV Technologies uses across MeAI, workshops, weekend programs and FORGE Studio.</p>
        <p><a href="/resources">Back to Resources</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/blog",
    title: "AI Education Resources For Parents And Schools | KONOV Technologies",
    description:
      "Read practical articles on AI literacy, machine learning for kids, school AI programs, and youth AI innovation in Ghana and Africa.",
    h1: "AI Education Insights",
    intro:
      "Practical, research-backed guidance for schools, teachers and parents navigating AI education across Africa — grounded in real frameworks, not buzzwords.",
    main: `
        <h2>Latest</h2>
        <ul>
          <li><a href="/blog/ai-education-for-schools-in-africa">AI Education for Schools in Africa: A Practical Framework</a></li>
        </ul>
        <p><a href="/">Back to home</a></p>`,
  },
  {
    path: "/blog/ai-education-for-schools-in-africa",
    title: "AI Education for Schools in Africa: A Practical Framework | KONOV Technologies",
    description:
      "A practical framework for teaching AI in African schools — mapped to Ghana's 2026 curriculum reform and UNESCO's AI competency standards.",
    h1: "AI Education for Schools in Africa: A Practical Framework",
    intro:
      "Ghana's 2026 curriculum reform is adding AI to the classroom, KG through JHS. Here's a term-by-term framework any African school can use, mapped to UNESCO's AI competency standards.",
    main: `
        <h2>What This Covers</h2>
        <p>What "AI education" actually means for a school, the infrastructure reality (low bandwidth, teacher shortages), a three-term rollout plan, and how to train teachers who've never used AI — grounded in Ghana's NaCCA curriculum reform and UNESCO's 2024 AI competency frameworks for students and teachers.</p>
        <p><a href="/blog">Back to Blog</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/waitlist",
    title: "MeAI Parents' Waitlist – Akwaaba Discount | KONOV Technologies",
    description:
      "Turn screen time into skill time. Join the MeAI parents' waitlist and get the Akwaaba Discount: kids 6–14 learn to code and understand AI through missions set in real African places.",
    keywords: ["MeAI waitlist", "MeAI parents waitlist", "Akwaaba Discount", "coding for kids Ghana", "AI for kids Ghana", "screen time into skill time", "MeAI"],
    h1: "Turn Screen Time Into Skill Time",
    intro:
      "Your child learns to code and understands how AI works, through missions set in real African places. For ages 6 to 14, on the phone or laptop you already have. MeAI at home opens soon.",
    main: `
        <h2>The Akwaaba Discount</h2>
        <p>The first 100 families on the MeAI parents' waitlist get the Akwaaba Discount. Joining is free, and we'll message you as soon as MeAI at home opens.</p>
        <p><a href="/">Back to home</a> · <a href="/classes">See our classes</a></p>`,
  },
  {
    path: "/hackathons",
    noindex: true,
    title: "FORGE Studio — AI Hackathon Platform | KONOV Technologies",
    description: "Build, learn, and compete in AI hackathons designed for young innovators.",
    h1: "FORGE Studio",
    intro:
      "FORGE is KONOV Technologies' AI hackathon platform where young innovators build Python-powered AI projects, compete in hackathons, and showcase their creations — all in the browser.",
    main: `
        <h2>What's Inside FORGE</h2>
        <ul>
          <li><strong>Build Studio</strong> — write Python code with AI assistance, powered by MeAI.</li>
          <li><strong>Hackathons</strong> — compete and win prizes.</li>
          <li><strong>Bot Battles</strong> — pit your bots against others.</li>
        </ul>
        <p>Access to the studio requires an access code from your instructor.</p>
        <p><a href="/ai-builder-sprint">About the AI Builder Sprint</a> · <a href="/">Back to home</a> · <a href="/classes">See our classes</a></p>`,
  },
  {
    path: "/contact",
    title: "Contact KONOV – Classes, Workshops & The Sprint | KONOV Technologies",
    description: "Questions about classes, the AI Builder Sprint, workshops or partnering with KONOV? Call us on 020 874 1517 or email hello@konovtech.com.",
    keywords: ["contact KONOV","coding classes Accra contact","school coding workshop Ghana"],
    h1: "Let's talk",
    intro: "Questions about classes, the Sprint, workshops or partnering with us? Call us, email us, or send a message.",
    main: `<h2>Contact</h2><p>Phone: <a href="tel:+233208741517">020 874 1517</a> · Email: <a href="mailto:hello@konovtech.com">hello@konovtech.com</a> · Accra, Ghana.</p><p><a href="/classes">Book a class</a> · <a href="/ai-builder-sprint">AI Builder Sprint</a></p>`,
  },
];

function applyRoute(template, route) {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(route.title)}</title>`);

  html = html.replace(
    /(<meta(?: data-rh="true")? name="description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(/(<meta(?: data-rh="true")? name="keywords" content=")[^"]*(")/, (_, before, after) =>
    `${before}${escapeAttr((route.keywords || ["KONOV", "EdTech company Ghana", route.h1]).join(", "))}${after}`
  );

  html = html.replace(/(<meta(?: data-rh="true")? name="author" content=")[^"]*(")/, `$1${escapeAttr(SITE_NAME)}$2`);

  // Mirrors SEO.tsx so non-JS crawlers see the same robots directive as the rendered page.
  html = html.replace(
    /(<meta(?: data-rh="true")? name="robots" content=")[^"]*(")/,
    `$1${route.noindex ? "noindex, nofollow" : "index, follow"}$2`
  );

  html = html.replace(/(<link(?: data-rh="true")? rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`);

  html = html.replace(/(<meta(?: data-rh="true")? property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta(?: data-rh="true")? property="og:title" content=")[^"]*(")/, `$1${escapeAttr(route.title)}$2`);
  html = html.replace(
    /(<meta(?: data-rh="true")? property="og:description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(/(<meta(?: data-rh="true")? name="twitter:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta(?: data-rh="true")? name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(route.title)}$2`);
  html = html.replace(
    /(<meta(?: data-rh="true")? name="twitter:description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(
    /"name":\s*"[^"]*"/,
    `"name": "${SITE_NAME.replace(/"/g, '\\"')}"`
  );


  html = html.replace(
    /<header>[\s\S]*?<\/header>/,
    `<header>\n        <h1>${route.h1}</h1>\n        <p>${route.intro}</p>\n      </header>`
  );

  html = html.replace(/<main>[\s\S]*?<\/main>/, `<main>${route.main}\n      </main>`);

  return html;
}

async function main() {
  const templatePath = path.join(DIST_DIR, "index.html");
  const template = await readFile(templatePath, "utf8");

  for (const route of ROUTES) {
    const html = applyRoute(template, route);
    // Write /me-ai as dist/me-ai.html, not dist/me-ai/index.html: static hosts
    // (Netlify, and Vercel with cleanUrls) serve a directory index only after a
    // 301 to the trailing-slash URL, which contradicts our slashless canonicals
    // and sitemap entries and stops Google from indexing the page.
    const outFile = route.path === "/" ? path.join(DIST_DIR, "index.html") : path.join(DIST_DIR, `${route.path}.html`);
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    console.log(`[generate-static-seo] wrote ${outFile}`);
  }
}

main().catch((err) => {
  console.error("[generate-static-seo] failed:", err);
  process.exit(1);
});
