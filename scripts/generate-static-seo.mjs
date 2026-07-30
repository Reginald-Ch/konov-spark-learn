// Post-build step: gives every route its own static <title>/meta/H1/body content in dist/.
//
// Why this exists: this app is a client-rendered SPA. Vercel's catch-all rewrite
// ("/(.*)" -> "/index.html") means every URL — /about, /programs, /contact, etc. —
// serves the exact same index.html to any crawler or bot that does not execute
// JavaScript (social share bots, link unfurlers, many SEO/LLM crawlers, and Google's
// first-pass HTML fetch before the render queue picks it up). Until now that shared
// index.html only had ONE hardcoded title/description/H1 (the homepage's), so every
// other page was indistinguishable from the homepage to those crawlers — effectively
// invisible/duplicate content. This script writes a real, route-specific index.html
// into dist/<route>/ for each static route so non-JS clients see distinct, accurate
// content per page, while React still mounts and takes over #root for real visitors.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const SITE_URL = "https://konovartechtist.com";

const escapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROUTES = [
  {
    path: "/",
    title: "KONOV | AI, Machine learning, Coding & robotics for Kids in Ghana (Ages 6-16)",
    description:
      "KONOV — Ghana's leading AI, robotics, coding & tech hub for kids ages 6-16. Weekend programs, hackathons, app development, tech camps & the MeAI app in Accra.",
    h1: "KONOV — AI, Machine Learning, Robotics, Coding &amp; Emerging Tech Programs for Kids in Ghana",
    intro:
      "KONOV is Ghana's leading AI &amp; ML literacy hub for children and teens ages 6–16. We run hands-on AI workshops, robotics classes, coding bootcamps, app-development studios, weekend tech programs, summer tech camps and youth hackathons across Accra and Africa — and we build the MeAI edtech app so kids can keep learning at home.",
    main: `
        <h2>What KONOV Teaches</h2>
        <p>Artificial Intelligence, Machine Learning, Robotics, Python coding, App Development, Prompt Engineering, Data Literacy and Creative emerging tech  — all designed for African learners ages 6 to 16.</p>
        <h2>Core Programs in Accra, Ghana</h2>
        <ul>
          <li><strong>AI &amp; ML Workshops</strong> — weekend and after-school sessions for schools and community groups in Accra and across Ghana.</li>
          <li><strong>Robotics &amp; Coding Classes</strong> — hands-on builds where kids program robots, train models and ship real projects.</li>
          <li><strong>Summer Tech Camp Ghana</strong> — an immersive multi-week camp where kids build AI-powered apps, games and hardware.</li>
          <li><strong>Youth Hackathons &amp; Tech Fairs</strong> — FORGE Studio hackathons with mentors, judges and prizes for young builders.</li>
          <li><strong>App Development Studio</strong> — teens learn to design and publish real web and mobile apps.</li>
          <li><strong>MeAI App</strong> — a comic-style, project-based AI learning app kids use at home (<a href="https://meaitech.com">meaitech.com</a>).</li>
        </ul>
        <h2>Why Parents &amp; Schools in Ghana Choose KONOV</h2>
        <p>Most edtech is designed for the West. KONOV is built for African classrooms, homes and internet speeds — with authentic African mentors, real projects kids can show off, and a curriculum spanning AI, robotics, coding, hackathons and tech. We partner with schools across Accra and Ghana to bring practical AI &amp; ML learning into every classroom.</p>
        <h2>Contact</h2>
        <p>Email: <a href="mailto:konovartechtist@gmail.com">konovartechtist@gmail.com</a> · Website: <a href="https://konovartechtist.com">konovartechtist.com</a> · Based in Accra, Ghana.</p>`,
  },
  {
    path: "/about",
    title: "About Us - Our Story & Mission | KONOV",
    description:
      "Learn about konov, Africa's first AI & ML literacy hub for kids. Founded in Accra, Ghana, we've reached 500+ students with innovative tech education.",
    h1: "About KONOV",
    intro:
      "AI &amp; ML literacy hub — teaching kids how intelligent systems think, how data drives decisions, and how algorithms power creativity.",
    main: `
        <h2>Our Story</h2>
        <p>Founded in Accra, Ghana, KONOV was born from a simple observation: while most tech hubs focus on robotics with a sprinkle of AI, the real future lies in AI and ML literacy — understanding how intelligent systems think.</p>
        <p>Our founder saw that children across Africa were fascinated by AI but had few opportunities to truly understand it. Not just use AI tools, but grasp how data drives decisions, how algorithms learn, and how machine learning powers creativity.</p>
        <p>We reimagined tech education around that idea — comic books featuring African child protagonists exploring AI concepts, a platform gamified around ML fundamentals, and workshops where kids understand neural networks through play.</p>
        <p>Today, we've reached over 500 young learners in a year, fully focused on AI and ML literacy — a scalable, future-oriented approach that doesn't require expensive hardware.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/programs",
    title: "Programs - AI Workshops, Tech Camps & Fairs | KONOV",
    description:
      "Explore KONOV's AI, robotics, coding and tech programs for kids ages 6-16, including workshops, tech camps and youth hackathons in Ghana.",
    h1: "Our Programs",
    intro: "A comprehensive ecosystem of tech education designed to inspire and empower the next generation.",
    main: `
        <h2>Discover Amazing Programs</h2>
        <p>Discover programs designed for young tech explorers, ages 6-16: AI &amp; ML workshops, robotics and coding classes, a summer tech camp, an app development studio, and youth hackathons via FORGE Studio — all run in Accra, Ghana.</p>
        <p><a href="/">Back to home</a> · <a href="/hackathons">FORGE Studio hackathons</a> · <a href="/community">Join the community</a></p>`,
  },
  {
    path: "/community",
    title: "Community - Join Our Tech Learning Paths | KONOV",
    description:
      "Join KONOV's learning community. Choose from AI Explorers (ages 6-9), Young Builders (ages 9-11), or Tech Ambassadors (ages 12-16) programs.",
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
    title: "AI Learning Resources for Kids and Teens | KONOV",
    description:
      "Interactive AI & ML resources for kids ages 6-16. Explore machine learning, computer vision, NLP, creative AI and safe AI tools.",
    h1: "AI Learning Lab for Students",
    intro:
      "Master Artificial Intelligence concepts through interactive lessons, hands-on projects, and real-world applications.",
    main: `
        <h2>What You'll Find Here</h2>
        <p>Free lessons and guides covering machine learning, computer vision, natural language processing, creative AI and safe AI tools for kids ages 6-16.</p>
        <p><a href="/resources/best-ai-tools-for-kids">Read: Best AI Tools for Kids in Ghana</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/resources/best-ai-tools-for-kids",
    title: "Best AI Tools for Kids in Ghana | KONOV",
    description:
      "A practical parent and school guide to safe AI tools for kids ages 6-16, covering MeAI, machine learning, robotics, coding and creative AI.",
    h1: "Best AI Tools for Kids: A Safe, Project-Based Guide for Ages 6-16",
    intro:
      "AI learning should help children build, question and create. This guide shows parents and schools how to choose tools that teach real AI literacy: prompting, data, machine learning, computer vision, robotics, coding and responsible use.",
    main: `
        <h2>Choosing AI Tools Safely</h2>
        <p>The best AI education balances curiosity with guardrails. Children should understand what AI is doing, what data it uses, and when to ask an adult before sharing or publishing anything.</p>
        <p>Start with guided, age-appropriate projects. Younger learners can explore pattern recognition, prompts and creative AI. Older learners can build chatbots, train simple models, control robots and publish apps — the path KONOV uses across MeAI, workshops, weekend programs and FORGE Studio.</p>
        <p><a href="/resources">Back to Resources</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/waitlist",
    title: "MeAI Waitlist — Real AI Education for Kids | KONOV",
    description:
      "Join the waitlist for MeAI: the interactive platform teaching kids real AI & machine learning through comics, chatbot building, and hands-on projects.",
    h1: "Join the MeAI Waitlist",
    intro:
      "MeAI is the interactive platform teaching kids real AI &amp; machine learning through comics, chatbot building, and hands-on projects.",
    main: `
        <h2>Why Join</h2>
        <p>Be first to know when MeAI opens up new seats and features for kids ages 6-16 learning AI &amp; machine learning at home.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/hackathons",
    title: "FORGE Studio — AI Hackathon Platform | KONOV",
    description: "Build, learn, and compete in AI hackathons designed for young innovators.",
    h1: "FORGE Studio",
    intro:
      "FORGE is KONOV's AI hackathon platform where young innovators build Python-powered AI projects, compete in hackathons, and showcase their creations — all in the browser.",
    main: `
        <h2>What's Inside FORGE</h2>
        <ul>
          <li><strong>Browser IDE</strong> — write Python code with AI assistance.</li>
          <li><strong>Hackathons</strong> — compete and win prizes.</li>
          <li><strong>Bot Battles</strong> — pit your bots against others.</li>
        </ul>
        <p>Access to the studio requires an access code from your instructor.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/contact",
    title: "Contact Us - Get in Touch | KONOV",
    description:
      "Contact KONOV for AI & ML education programs in Ghana. Reach us via email, phone, or visit us in Accra. We'd love to hear from you!",
    h1: "Get in Touch",
    intro: "Have questions? We'd love to hear from you! Send us a message and we'll respond super fast.",
    main: `
        <h2>Contact</h2>
        <p>Email: <a href="mailto:konovartechtist@gmail.com">konovartechtist@gmail.com</a> · Website: <a href="https://konovartechtist.com">konovartechtist.com</a> · Based in Accra, Ghana.</p>
        <p><a href="/">Back to home</a></p>`,
  },
];

function applyRoute(template, route) {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(route.title)}</title>`);

  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`);

  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(route.title)}$2`);
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(/(<meta name="twitter:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(route.title)}$2`);
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
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
    const outDir = route.path === "/" ? DIST_DIR : path.join(DIST_DIR, route.path);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`[generate-static-seo] wrote ${path.join(outDir, "index.html")}`);
  }
}

main().catch((err) => {
  console.error("[generate-static-seo] failed:", err);
  process.exit(1);
});
