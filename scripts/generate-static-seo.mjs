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
    description: "KONOV builds interactive tools that make tech fun to learn and create for ages 6–16. Meet MeAI, and join our AI & coding classes in Accra.",
    keywords: ["EdTech company Ghana", "interactive learning tools for kids", "technology education for kids", "MeAI", "coding for kids Ghana"],
    h1: "KONOV — Interactive Tools For Young Learners",
    intro: "KONOV builds interactive tools that make technology fun to learn and create for young learners aged 6–16. MeAI, our first product, is a fun AI learning app for kids aged 6–14. We also run AI &amp; coding classes in Accra — weekend classes, after-school programs, and summer school.",
    main: `<h2>MeAI — Our First Product</h2><p>MeAI helps kids and teenagers learn coding and AI by building projects in an interactive game world inspired by African life. Through 3D game missions, kids learn to code, train AI and build chatbots, gaining the skills and confidence to become creators who use technology to solve real-world problems. <a href="https://meaitech.com">Open MeAI</a>.</p><h2>Learning By Doing</h2><p>Play with an idea, build something of your own, and understand what happens.</p><h2>Workshops and School Partnerships</h2><p>Hands-on AI workshops and school partnerships connect our products with guided learning experiences.</p><p><a href="/about">Meet KONOV</a> · <a href="/programs">Workshops and programs</a> · <a href="/for-schools">For schools</a></p>`,
  },
  {
    path: "/about",
    title: "About KONOV – Making Tech Fun To Learn & Create | KONOV Technologies",
    description: "KONOV Technologies is a Ghanaian company building interactive tools that make technology fun to learn and create for young learners ages 6–16.",
    keywords: ["about KONOV", "EdTech company Ghana", "interactive technology learning", "MeAI creator"],
    h1: "KONOV. Built around young curiosity.",
    intro: "We are an EdTech company that builds interactive tools to make technology education fun for young learners aged 6–16.",
    main: `<h2>From Curiosity to Creation</h2><p>We want young learners to understand technology, ask questions, and create with it—not only consume it.</p><h2>Our Mission</h2><p>Make technology education fun, interactive, and meaningful for young learners.</p><h2>MeAI — Our First Product</h2><p>MeAI brings interactive AI learning to families and classrooms. AI is where our first product begins; making technology fun to learn is the bigger mission.</p><h2>Workshops and School Partnerships</h2><p>We run guided workshops and partner with schools to connect learning tools with hands-on experiences.</p><p><a href="/me-ai">Explore MeAI</a> · <a href="/for-schools">Partner with KONOV</a></p>`,
  },
  {
    path: "/programs",
    title: "AI & Coding Programs For Kids In Accra | KONOV Technologies",
    description: "Explore KONOV's AI & coding programs for kids ages 6–16 in Accra: weekend classes, after-school programs, and summer school, plus MeAI, our 3D coding and AI game.",
    keywords: ["AI and coding programs for kids Accra", "coding classes for kids Ghana", "weekend coding classes Accra", "after-school coding Accra", "summer school for kids Accra"],
    h1: "AI &amp; Coding Programs For Kids In Accra",
    intro:
      "KONOV Technologies runs AI &amp; coding programs for kids ages 6–16 in Accra — weekend classes, after-school programs, and summer school — alongside MeAI, our first product. Learners write code, build chatbots, train AI models, and create their own projects.",
    main: `
        <h2>Our Programs</h2>
        <ul>
          <li><strong>KONOV Weekend AI Creators</strong> — an 8-week weekend AI program for ages 6-16, building chatbots, working with models, and learning responsible AI.</li>
          <li><strong>KONOV School AI Program</strong> — a term-based AI enrichment program for schools: after-school AI clubs, termly workshops, or school-wide ICT enrichment for Grade 1 to Grade 9.</li>
          <li><strong>KONOV AI &amp; Coding Workshops</strong> — short, practical AI and coding workshops using MeAI, in half-day, one-day, or multi-session formats.</li>
          <li><strong>KONOV Summer AI & Tech Camp</strong> — a vacation camp for primary, junior high, and senior high learners.</li>
          <li><strong>KONOV Youth AI Challenges</strong> — AI hackathons, competitions, and school AI showcases.</li>
          <li><strong>KONOV Tertiary AI Innovation Program</strong> — applied AI for tertiary students and young adults, including the free 7-day AI Builder Sprint, ending in a capstone hackathon with cash prizes.</li>
        </ul>
        <h2>Powered By MeAI</h2>
        <p>MeAI supports hands-on learning across every KONOV program — learners use it to complete guided AI activities, train models, build chatbots, and create AI-powered projects.</p>
        <p><a href="/">Back to home</a> · <a href="/me-ai">About MeAI</a> · <a href="/for-schools">For schools</a> · <a href="/contact">Contact us</a></p>`,
  },
  {
    path: "/me-ai",
    title: "MeAI | Learn Coding & AI In A Game World | KONOV Technologies",
    description: "MeAI helps kids and teenagers learn coding and AI by building projects in an interactive game world inspired by African life. Ages 6–14.",
    keywords: ["MeAI", "AI learning app for kids", "AI learning for classrooms", "chatbot building for kids", "machine learning for kids"],
    h1: "MeAI — Learn Coding And AI In A Game World",
    intro:
      "MeAI helps kids and teenagers (ages 6-14) learn coding and AI by building projects in an interactive game world inspired by African life. It is KONOV's first product. Through 3D game missions, kids learn to code, train AI and build chatbots, gaining the skills and confidence to become creators who use technology to solve real-world problems.",
    main: `
        <h2>Who MeAI Is For</h2>
        <p>Learners ages 6-14, and the parents and schools who support them — a safe, guided space with no unsupervised internet access.</p>
        <h2>What Learners Build</h2>
        <ul>
          <li><strong>Chatbots</strong> — a bot with real personality, knowledge, and rules.</li>
          <li><strong>Trained Models</strong> — real work with data and machine learning.</li>
          <li><strong>AI-Powered Projects</strong> — creative, working AI projects to show off.</li>
        </ul>
        <p>Try MeAI: <a href="https://meaitech.com">meaitech.com</a> · <a href="/for-schools">Request school access</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/for-schools",
    title: "MeAI For Schools And Educators | KONOV Technologies",
    description: "Bring MeAI and KONOV's AI & coding workshops to your school: classroom access for MeAI, after-school clubs, student workshops, and innovation challenges.",
    keywords: ["school partnerships Ghana", "AI workshops for schools Ghana", "MeAI for classrooms", "interactive learning tools for schools"],
    h1: "MeAI For Schools And Educators",
    intro:
      "KONOV brings AI &amp; coding into schools through MeAI classroom access, workshops, after-school clubs, and student innovation challenges.",
    main: `
        <h2>What KONOV Offers Schools</h2>
        <ul>
          <li>Student AI &amp; Coding Workshops</li>
          <li>MeAI For Classrooms</li>
          <li>AI Clubs & After-School Programs</li>
          <li>Hackathons & Showcases</li>
        </ul>
        <p><a href="/ai-curriculum-support">Curriculum support</a> · <a href="/contact">Book a school workshop</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/ai-classes-for-kids-accra",
    title: "AI & Coding Classes For Kids In Accra | KONOV Technologies",
    description:
      "Fun AI & coding classes for kids ages 6–16 in Accra: weekend classes, after-school programs, and summer school. No prior coding experience needed.",
    h1: "AI &amp; Coding Classes For Kids In Accra",
    intro:
      "Fun AI &amp; coding classes for kids ages 6-16 in Accra, Ghana — weekend classes, after-school programs, and summer school. No prior coding experience needed.",
    main: `
        <h2>What Kids Build</h2>
        <ul>
          <li>Chatbots with real personality, knowledge, and rules</li>
          <li>Trained machine learning models</li>
          <li>Creative AI-powered projects</li>
        </ul>
        <p><a href="/programs">See all programs</a> · <a href="/">Back to home</a></p>`,
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
        <p><a href="/programs">See all programs</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/youth-hackathons",
    title: "Youth AI Hackathons And Innovation Challenges | KONOV Technologies",
    description:
      "KONOV organizes AI hackathons and innovation challenges where young people solve problems, build prototypes, and present AI-powered ideas.",
    h1: "Build. Compete. Present.",
    intro:
      "KONOV organizes AI hackathons and innovation challenges where young people solve problems, build prototypes, and present AI-powered ideas.",
    main: `
        <h2>What A KONOV Hackathon Looks Like</h2>
        <ul>
          <li>Teams & Mentors</li>
          <li>Real AI Prototypes</li>
          <li>Showcase & Prizes</li>
        </ul>
        <p>Live hackathons run in <a href="/hackathons">FORGE Studio</a>, KONOV's AI hackathon platform. <a href="/">Back to home</a></p>`,
  },
  {
    path: "/machine-learning-for-kids",
    title: "Machine Learning For Kids | KONOV Technologies",
    description:
      "KONOV Technologies teaches machine learning for kids through practical, hands-on projects — training real models with real data, built for young African learners.",
    h1: "How Machines Actually Learn",
    intro:
      "Pattern recognition, not magic — KONOV Technologies teaches machine learning for kids through real, hands-on projects with real data.",
    main: `
        <h2>What Kids Actually Do</h2>
        <ul>
          <li>Train Image Models</li>
          <li>Work With Data</li>
          <li>Build Smarter Chatbots</li>
        </ul>
        <p><a href="/programs">See all programs</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/summer-ai-tech-camp",
    title: "Summer School For Kids In Accra – AI & Coding | KONOV Technologies",
    description:
      "KONOV's summer school in Accra: a fun, hands-on holiday program where kids ages 6–16 learn AI and coding, build projects, and show them off.",
    h1: "A Full AI Adventure",
    intro:
      "Vacation programs where learners explore AI, coding, creativity, and problem-solving through hands-on projects — a full-day immersive experience, not passive screen time.",
    main: `
        <h2>Camp Highlights</h2>
        <ul>
          <li>Full-Day Immersion</li>
          <li>Small Groups</li>
          <li>Showcase Day</li>
        </ul>
        <p><a href="/programs">See all programs</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/ai-curriculum-support",
    title: "AI Curriculum Support For Schools | KONOV Technologies",
    description:
      "KONOV Technologies helps schools design and deliver a practical AI curriculum — aligned to grade levels and built for African classrooms.",
    h1: "AI Curriculum Support For Schools",
    intro:
      "A practical AI curriculum framework, adapted to your school's grade levels and existing subjects.",
    main: `
        <h2>What Curriculum Support Includes</h2>
        <ul>
          <li>A Practical Framework</li>
          <li>Grade-Level Alignment</li>
        </ul>
        <p><a href="/for-schools">For schools</a> · <a href="/">Back to home</a></p>`,
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
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a> · <a href="/contact">Not sure which path is right for you? Contact us</a></p>`,
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
    title: "MeAI Waitlist — Real AI Education for Kids | KONOV Technologies",
    description:
      "Join the MeAI waitlist. MeAI helps kids and teenagers learn coding and AI by building projects in an interactive game world inspired by African life.",
    h1: "Join the MeAI Waitlist",
    intro:
      "MeAI helps kids and teenagers (ages 6-14) learn coding and AI by building projects in an interactive game world inspired by African life.",
    main: `
        <h2>Why Join</h2>
        <p>Be first to know when MeAI opens up new seats and features for kids ages 6-14 learning AI &amp; machine learning at home.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
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
        <p><a href="/youth-hackathons">About youth AI hackathons</a> · <a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/contact",
    title: "Contact KONOV Technologies | AI Education In Ghana",
    description:
      "Contact KONOV Technologies to bring practical AI learning to your child, school, or organization.",
    h1: "Get in Touch",
    intro: "Have questions? We'd love to hear from you! Send us a message and we'll respond super fast.",
    main: `
        <h2>Contact</h2>
        <p>Email: <a href="mailto:hello@konovtech.com">hello@konovtech.com</a> · WhatsApp: <a href="https://wa.me/233208741417">Chat with us</a> · Website: <a href="https://konovartechtist.com">konovartechtist.com</a> · Based in Accra, Ghana.</p>
        <p><a href="/">Back to home</a></p>`,
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
