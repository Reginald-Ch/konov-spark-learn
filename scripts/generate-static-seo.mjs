// Post-build step: gives every route its own static <title>/meta/H1/body content in dist/.
//
// Why this exists: this app is a client-rendered SPA. Vercel's catch-all rewrite
// ("/(.*)" -> "/index.html") means every URL — /about, /programs, /contact, etc. —
// serves the exact same index.html to any crawler or bot that does not execute
// JavaScript (social share bots, link unfurlers, AI/LLM crawlers like GPTBot,
// ClaudeBot, and PerplexityBot, and Google's first-pass HTML fetch before the
// render queue picks it up). Without an entry here, a route is invisible/duplicate
// content to those clients — they'd see the homepage's title and body instead of
// the real page's. This script writes a real, route-specific index.html into
// dist/<route>/ for each route so non-JS clients see distinct, accurate content
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
    title: "KONOV Technologies | AI Education For Kids And Young Learners In Ghana",
    description:
      "KONOV Technologies helps young people in Ghana and Africa learn AI, train models, build chatbots, and create real AI systems through Me AI, workshops, programs, and hackathons.",
    h1: "KONOV Technologies — Ghana's AI Literacy Hub for Young Innovators",
    intro:
      "KONOV Technologies helps young people in Ghana and across Africa understand how artificial intelligence works and build real AI systems — through hands-on AI programs, school workshops, youth hackathons, and the Me AI creation platform. Learners work with data, train machine learning models, build chatbots, and solve real-world problems using AI.",
    main: `
        <h2>What KONOV Technologies Teaches</h2>
        <p>Artificial Intelligence, Machine Learning, chatbot and conversational AI building, data literacy, prompt thinking, and creative problem-solving — all designed for young African learners ages 6 to 18.</p>
        <h2>Programs in Accra, Ghana</h2>
        <ul>
          <li><strong>KONOV Weekend AI Creators</strong> — an 8-week weekend AI program for ages 6-16.</li>
          <li><strong>KONOV School AI Program</strong> — term-based AI enrichment for schools, Grade 1 to Grade 9.</li>
          <li><strong>KONOV AI Workshops</strong> — short, practical AI workshops using Me AI.</li>
          <li><strong>KONOV Summer AI & Tech Camp</strong> — a vacation AI and tech camp for primary through senior high learners.</li>
          <li><strong>KONOV Youth AI Challenges</strong> — AI hackathons, challenges, and project showcases.</li>
          <li><strong>KONOV Tertiary AI Innovation Program</strong> — applied AI for tertiary students, including the free 7-day AI Builder Sprint.</li>
          <li><strong>Me AI</strong> — KONOV's AI creation platform for learners ages 6-18 (<a href="https://meaitech.com">meaitech.com</a>).</li>
        </ul>
        <h2>Why Parents & Schools in Ghana Choose KONOV Technologies</h2>
        <p>KONOV Technologies is AI-first, practical, and built for African learners. We don't only teach students how to use technology — we help them understand how intelligent systems work and give them the tools to create their own. We partner with schools across Accra and Ghana to bring practical AI education into every classroom.</p>
        <h2>Contact</h2>
        <p>Email: <a href="mailto:hello@konovtech.com">hello@konovtech.com</a> · WhatsApp: <a href="https://wa.me/233208741417">Chat with us</a> · Website: <a href="https://konovartechtist.com">konovartechtist.com</a> · Based in Accra, Ghana.</p>`,
  },
  {
    path: "/about",
    title: "Ghana's AI Literacy Hub | KONOV Technologies",
    description:
      "KONOV Technologies is an edtech company and AI literacy hub helping young people in Ghana and Africa understand, create, and build with artificial intelligence.",
    h1: "Building Africa's Next Generation Of AI Creators",
    intro:
      "KONOV Technologies is an edtech company and AI literacy hub helping young people in Ghana and Africa understand, create, and build with artificial intelligence. We deliver practical AI education through the Me AI platform, school programs, workshops, hackathons, and youth innovation experiences.",
    main: `
        <h2>Mission</h2>
        <p>To make AI education accessible, engaging, and practical for young Africans.</p>
        <h2>Vision</h2>
        <p>To prepare the next generation of African innovators to become creators of intelligent systems, not just users of technology.</p>
        <h2>Our Story</h2>
        <p>Founded in Accra, Ghana, KONOV Technologies was born from a simple observation: while most tech hubs focus on robotics with a sprinkle of AI, the real future lies in AI literacy — understanding how intelligent systems think. Our learners work with data, train machine learning models, build chatbots, and create AI-powered projects that develop confidence, creativity, and problem-solving skills.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/programs",
    title: "AI Programs For Young Learners, Schools And Future Innovators | KONOV Technologies",
    description:
      "KONOV Technologies offers practical AI learning programs — weekend classes, school programs, workshops, camps, hackathons, and tertiary innovation programs — for young people, schools, and organizations.",
    h1: "AI Programs For Young Learners, Schools, And Future Innovators",
    intro:
      "KONOV Technologies offers practical AI learning programs that help young people understand, create, and build with artificial intelligence. From weekend classes and school programs to workshops, camps, hackathons, and tertiary innovation programs, learners gain hands-on experience with data, models, chatbots, conversational AI, and AI-powered projects.",
    main: `
        <h2>Our Programs</h2>
        <ul>
          <li><strong>KONOV Weekend AI Creators</strong> — an 8-week weekend AI program for ages 6-16, building chatbots, working with models, and learning responsible AI.</li>
          <li><strong>KONOV School AI Program</strong> — a term-based AI enrichment program for schools: after-school AI clubs, termly workshops, or school-wide ICT enrichment for Grade 1 to Grade 9.</li>
          <li><strong>KONOV AI Workshops</strong> — short, practical AI workshops using Me AI, in half-day, one-day, or multi-session formats.</li>
          <li><strong>KONOV Summer AI & Tech Camp</strong> — a vacation camp for primary, junior high, and senior high learners.</li>
          <li><strong>KONOV Youth AI Challenges</strong> — AI hackathons, competitions, and school AI showcases.</li>
          <li><strong>KONOV Tertiary AI Innovation Program</strong> — applied AI for tertiary students and young adults, including the free 7-day AI Builder Sprint, ending in a capstone hackathon with cash prizes.</li>
        </ul>
        <h2>Powered By Me AI</h2>
        <p>Me AI supports hands-on learning across every KONOV program — learners use it to complete guided AI activities, train models, build chatbots, and create AI-powered projects.</p>
        <p><a href="/">Back to home</a> · <a href="/me-ai">About Me AI</a> · <a href="/for-schools">For schools</a> · <a href="/contact">Contact us</a></p>`,
  },
  {
    path: "/me-ai",
    title: "Me AI | AI Learning And Creation Platform For Kids And Teens | KONOV Technologies",
    description:
      "Me AI by KONOV Technologies helps young learners build chatbots, train AI models, complete guided AI projects, and understand artificial intelligence through practical learning.",
    h1: "Me AI — An AI Creation Platform For Young Learners",
    intro:
      "Me AI is KONOV's AI learning platform for learners ages 6-18. It helps young people learn AI through interactive lessons, guided projects, model training, chatbot creation, and hands-on activities designed for African learners.",
    main: `
        <h2>Who Me AI Is For</h2>
        <p>Learners ages 6-18, and the parents and schools who support them — a safe, guided space with no unsupervised internet access.</p>
        <h2>What Learners Build</h2>
        <ul>
          <li><strong>Chatbots</strong> — a bot with real personality, knowledge, and rules.</li>
          <li><strong>Trained Models</strong> — real work with data and machine learning.</li>
          <li><strong>AI-Powered Projects</strong> — creative, working AI projects to show off.</li>
        </ul>
        <p>Try Me AI: <a href="https://meaitech.com">meaitech.com</a> · <a href="/for-schools">Request school access</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/for-schools",
    title: "AI Education Programs For Schools In Ghana | KONOV Technologies",
    description:
      "KONOV helps schools introduce practical AI education through student workshops, teacher training, Me AI classroom access, AI clubs, and innovation challenges.",
    h1: "AI Education Programs For Schools In Ghana",
    intro:
      "KONOV helps schools introduce practical AI education through workshops, classroom programs, teacher training, Me AI access, and student innovation challenges.",
    main: `
        <h2>What KONOV Offers Schools</h2>
        <ul>
          <li>Student AI Workshops</li>
          <li>Teacher Training</li>
          <li>Me AI For Classrooms</li>
          <li>AI Clubs & After-School Programs</li>
          <li>Hackathons & Showcases</li>
        </ul>
        <p><a href="/teacher-training">Teacher training</a> · <a href="/ai-curriculum-support">Curriculum support</a> · <a href="/contact">Book a school workshop</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/ai-classes-for-kids-accra",
    title: "AI Classes For Kids In Accra And Ghana | KONOV Technologies",
    description:
      "KONOV offers practical AI classes for children and teens who want to understand how artificial intelligence works and build their own AI projects.",
    h1: "AI Classes For Kids In Accra",
    intro:
      "Practical AI classes for children and teens ages 6-16, in Accra, Ghana — no prior coding experience needed.",
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
    path: "/teacher-training",
    title: "AI Training For Teachers In Ghana | KONOV Technologies",
    description:
      "KONOV helps teachers and educators understand artificial intelligence and design practical AI learning experiences for students.",
    h1: "AI Training For Teachers In Ghana",
    intro:
      "KONOV helps teachers and educators understand artificial intelligence and design practical AI learning experiences for students — no AI background required.",
    main: `
        <h2>What Teacher Training Covers</h2>
        <ul>
          <li>AI Fundamentals</li>
          <li>Classroom-Ready Activities</li>
          <li>Supporting Student AI Projects</li>
        </ul>
        <p><a href="/for-schools">For schools</a> · <a href="/ai-curriculum-support">Curriculum support</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/tertiary-ai-innovation-hub",
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
    title: "Summer AI And Tech Camp In Ghana | KONOV Technologies",
    description:
      "KONOV Technologies' Summer AI & Tech Camp — vacation programs where learners explore AI, coding, creativity, and problem-solving through hands-on projects.",
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
      "KONOV Technologies helps schools design and deliver a practical AI curriculum — aligned to grade levels, backed by teacher training, and built for African classrooms.",
    h1: "AI Curriculum Support For Schools",
    intro:
      "A practical AI curriculum framework, adapted to your school's grade levels and existing subjects — backed by teacher training so your staff can own it long-term.",
    main: `
        <h2>What Curriculum Support Includes</h2>
        <ul>
          <li>A Practical Framework</li>
          <li>Grade-Level Alignment</li>
          <li>Teacher Ownership</li>
        </ul>
        <p><a href="/for-schools">For schools</a> · <a href="/teacher-training">Teacher training</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/community",
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
      "A practical parent and school guide to safe AI tools for kids ages 6-16, covering Me AI, machine learning, robotics, coding and creative AI.",
    h1: "Best AI Tools for Kids: A Safe, Project-Based Guide for Ages 6-16",
    intro:
      "AI learning should help children build, question and create. This guide shows parents and schools how to choose tools that teach real AI literacy: prompting, data, machine learning, computer vision, robotics, coding and responsible use.",
    main: `
        <h2>Choosing AI Tools Safely</h2>
        <p>The best AI education balances curiosity with guardrails. Children should understand what AI is doing, what data it uses, and when to ask an adult before sharing or publishing anything.</p>
        <p>Start with guided, age-appropriate projects. Younger learners can explore pattern recognition, prompts and creative AI. Older learners can build chatbots, train simple models, control robots and publish apps — the path KONOV Technologies uses across Me AI, workshops, weekend programs and FORGE Studio.</p>
        <p><a href="/resources">Back to Resources</a> · <a href="/">Back to home</a></p>`,
  },
  {
    path: "/blog",
    title: "AI Education Resources For Parents And Schools | KONOV Technologies",
    description:
      "Read practical articles on AI literacy, machine learning for kids, school AI programs, teacher training, and youth AI innovation in Ghana and Africa.",
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
    title: "Me AI Waitlist — Real AI Education for Kids | KONOV Technologies",
    description:
      "Join the waitlist for Me AI: the interactive platform teaching kids real AI & machine learning through comics, chatbot building, and hands-on projects.",
    h1: "Join the Me AI Waitlist",
    intro:
      "Me AI is the interactive platform teaching kids real AI &amp; machine learning through comics, chatbot building, and hands-on projects.",
    main: `
        <h2>Why Join</h2>
        <p>Be first to know when Me AI opens up new seats and features for kids ages 6-16 learning AI &amp; machine learning at home.</p>
        <p><a href="/">Back to home</a> · <a href="/programs">See our programs</a></p>`,
  },
  {
    path: "/hackathons",
    title: "FORGE Studio — AI Hackathon Platform | KONOV Technologies",
    description: "Build, learn, and compete in AI hackathons designed for young innovators.",
    h1: "FORGE Studio",
    intro:
      "FORGE is KONOV Technologies' AI hackathon platform where young innovators build Python-powered AI projects, compete in hackathons, and showcase their creations — all in the browser.",
    main: `
        <h2>What's Inside FORGE</h2>
        <ul>
          <li><strong>Build Studio</strong> — write Python code with AI assistance, powered by Me AI.</li>
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
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeAttr(route.description)}$2`
  );

  html = html.replace(/(<meta name="author" content=")[^"]*(")/, `$1${escapeAttr(SITE_NAME)}$2`);

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
    /"name":\s*"[^"]*"/,
    `"name": "${SITE_NAME.replace(/"/g, '\\"')}"`
  );
  html = html.replace(
    /("@type":\s*"EducationalOrganization"[\s\S]*?"description":\s*")[^"]*(")/,
    `$1${route.description.replace(/"/g, '\\"')}$2`
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
