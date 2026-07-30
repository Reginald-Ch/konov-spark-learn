export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedDate: string;
  updatedDate?: string;
  keywords: string[];
  content: string;
  faqs?: BlogFAQ[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "ai-education-for-schools-in-africa",
    title: "AI Education for Schools in Africa: A Practical Framework",
    description:
      "A practical framework for teaching AI in African schools — mapped to Ghana's 2026 curriculum reform and UNESCO's AI competency standards.",
    category: "For Schools & Teachers",
    publishedDate: "2026-07-30",
    keywords: [
      "AI education for schools in Africa",
      "AI curriculum for schools Ghana",
      "teacher AI training Africa",
      "how to teach AI in schools",
      "AI literacy framework for schools",
      "Ghana AI curriculum 2026",
    ],
    content: `In July 2026, Ghana's Education Minister confirmed something most African school leaders had assumed was years away: artificial intelligence is joining the basic school curriculum, from kindergarten through junior high, before the end of the year. The National Council for Curriculum and Assessment (NaCCA) is folding it into two existing subjects — Mathematics will introduce coding concepts as "quantitative thinking," and Computing will teach the same underlying skills as "computational thinking." ([Graphic Online](https://www.graphic.com.gh/news/general-news/kg-pupils-to-start-coding-ai-and-electronic-subjects-in-revised-curriculum-in-ghana-schools.html), [Adomonline](https://www.adomonline.com/revised-curriculum-to-introduce-ai-robotics-and-coding-in-basic-schools-education-minister/))

If you lead a school or teach in one, the policy headline isn't the hard part. The hard part is Monday morning: what do you actually put in front of a nine-year-old, and how do you support a teacher who has never used AI themselves? This framework answers both questions, and it isn't Ghana-specific by accident — every school across the continent is facing the same gap between policy and classroom.

## What "AI education" actually means for a school

UNESCO published the clearest answer to this in 2024, with two companion frameworks — one for students, one for teachers — designed for exactly this moment. Neither is abstract theory. Both are built to be taught.

The [student framework](https://www.unesco.org/en/articles/ai-competency-framework-students) defines 12 competencies across four dimensions: a human-centred mindset (understanding your own agency around AI), the ethics of AI, AI techniques and applications, and AI system design. Each competency is taught at three progression levels — Understanding, Applying, and Creating — so a six-year-old and a sixteen-year-old can be on the same framework at different depths.

The [teacher framework](https://www.unesco.org/en/articles/ai-competency-framework-teachers) mirrors this with 15 competencies across five dimensions, covering not just what teachers need to know about AI, but how to redesign a lesson, a classroom, and an assessment around it.

In plain terms: "AI education" for a school doesn't mean buying software. It means picking a handful of these competencies per term and teaching toward them — the same way a school already does with numeracy or literacy strands.

## The reality check before you write a single lesson plan

Three constraints shape every recommendation that follows, and ignoring them is where most curriculum rollouts fail before they start:

- **38%** of people in Africa were online in 2024, versus a 67% global average.
- **~3%** fixed broadband subscription rate in Africa, versus 15% globally.
- **17 million** more teachers are needed across Sub-Saharan Africa by 2030 to reach universal basic education.

*(Sources: [World Economic Forum](https://www.weforum.org/stories/2025/12/bridging-the-digital-talent-crisis/), [ODI](https://odi.org/en/insights/brains-bytes-and-bottlenecks-fixing-africas-ai-talent-gap/))*

None of this means AI education is out of reach — it means the plan has to work without assuming a computer lab, and it has to make a stretched teacher's job lighter, not heavier. That's the design brief for the rollout below.

## A three-term rollout schools can actually run

1. **Term 1 — Concepts before computers.** Teach the "human-centred mindset" and "ethics of AI" dimensions unplugged: what a dataset is, why an AI's answer depends on what it was trained on, when to ask an adult before sharing something with an AI tool. Zero devices required. This maps directly onto Ghana's Computing syllabus framing of "computational thinking."

2. **Term 2 — Hands-on, one device at a time.** Move into "AI techniques and applications" with shared-device or offline-first tools — pattern recognition games, a single classroom tablet running through a project as a group. This is where Mathematics' "quantitative thinking" strand and Computing overlap: prediction, patterns, and data.

3. **Term 3 — Build something real.** Students reach the "Creating" progression level: a simple trained model, a chatbot with a defined personality, or a basic automation — evaluated the way a school already evaluates a science-fair project, not a written exam.

## Training the teacher who's never touched AI

The honest starting point for most teachers is competency 1 of UNESCO's framework, not competency 15. Effective teacher training for this rollout has three characteristics:

- **It's hands-on, not a lecture.** Teachers need to have built one small AI-assisted lesson themselves before they teach it.
- **It's paced with the curriculum**, not delivered as a single one-off workshop months before it's needed.
- **It treats AI as a force-multiplier, not a threat** — especially important given how stretched the teaching workforce already is across the region.

## What this looks like in practice

KONOV runs exactly this model in Accra: weekend workshops and school partnerships that take teachers and students from "never used AI" to "built and presented a working project," reaching more than 500 young learners in its first year without requiring a computer lab or reliable broadband as a prerequisite. The pattern holds regardless of country — start unplugged, add one shared device, then let students build.

## Common mistakes to avoid

- **Buying software before teaching concepts.** A subscription doesn't substitute for the "human-centred mindset" and "ethics" groundwork — skipping it produces students who can use a tool but not reason about it.
- **Training teachers once, then moving on.** A single workshop without a paced follow-up rarely survives contact with a real term.
- **Assuming device access.** Plans that require 1:1 devices stall in most schools; shared-device and unplugged formats don't.

## Where this is headed

Ghana's revised curriculum still has to clear the Ministry of Education, Cabinet and Parliament before final approval — but the direction is set, and other African education systems are watching closely. Schools that start building teacher capacity and a term-by-term plan now will be ready regardless of the exact date it's signed into policy.`,
    faqs: [
      {
        question: "What is AI education for schools?",
        answer:
          "Teaching students, in age-appropriate stages, to understand how AI systems work, use them responsibly, and eventually build with them — following frameworks like UNESCO's AI competencies for students rather than simply using AI-powered software in class.",
      },
      {
        question: "How is Ghana teaching AI in schools?",
        answer:
          "Ghana's National Council for Curriculum and Assessment (NaCCA) is integrating AI and coding into the basic school curriculum from kindergarten through junior high, framing it as \"computational thinking\" within Computing and \"quantitative thinking\" within Mathematics, pending final government approval.",
      },
      {
        question: "What age should children start learning about AI?",
        answer:
          "From age six, provided lessons are visual, playful, unplugged where needed, and supervised — UNESCO's framework is explicitly designed to scale in depth from early primary through secondary school.",
      },
      {
        question: "Do teachers need to know how to code to teach AI?",
        answer:
          "No. UNESCO's teacher framework starts with foundational understanding and ethics before any technical skill — a teacher can begin at the \"Understanding\" level and build toward \"Creating\" alongside their students.",
      },
      {
        question: "What is the UNESCO AI competency framework?",
        answer:
          "Two companion frameworks published by UNESCO in 2024 — 12 competencies across 4 dimensions for students, and 15 competencies across 5 dimensions for teachers — designed to guide how AI is taught safely and effectively in schools.",
      },
    ],
  },
];

export const getBlogPost = (slug: string) => blogPosts.find((post) => post.slug === slug);
