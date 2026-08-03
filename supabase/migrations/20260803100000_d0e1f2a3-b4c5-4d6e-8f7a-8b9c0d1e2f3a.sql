-- Module 6 content upgrade: adds "visual" and "practice" fields, tightens explanation text.

UPDATE public.lesson_content SET content = '{
  "hook": "AI doesn''t invent bias — it inherits it. Understanding where bias sneaks in is the first step to actually catching it before it does harm.",
  "explanation": "Bias in AI usually comes from the data, not the code. Historical bias happens when past data reflects real-world inequality (like past hiring decisions favoring one group), and the model learns to repeat it. Representation bias happens when certain groups are under-represented in training data, so the model performs worse for them. Measurement bias happens when the data used as a stand-in for what you actually care about is a flawed proxy — like using arrest rates as a stand-in for crime rates, when arrest rates themselves reflect biased policing.\n\nBias isn''t always obvious from a single output — it usually shows up as a pattern across many outputs, which is why testing across diverse groups and scenarios matters so much.\n\nCatching bias early is far cheaper than fixing it after a model is already deployed and making real decisions about real people.",
  "visual": {
    "caption": "Common sources of bias",
    "steps": [
      { "emoji": "📜", "label": "Historical bias", "caption": "Past inequality in the data" },
      { "emoji": "👥", "label": "Representation bias", "caption": "Groups under-represented" },
      { "emoji": "📏", "label": "Measurement bias", "caption": "A flawed stand-in metric" }
    ]
  },
  "analogy": "Training on biased data is like learning geography only from maps drawn by people who''d never left their hometown — the model confidently reproduces whatever gaps and distortions were already baked into what it was shown.",
  "practice": {
    "prompt": "A hiring model trained only on resumes of people hired in the last 10 years starts favoring candidates from a small set of schools. What''s the most likely cause?",
    "options": ["The model is malfunctioning randomly", "Historical bias — past hiring patterns were baked into the training data", "This proves the model is working perfectly"],
    "correct_index": 1,
    "feedback": "If the training data reflects a narrow past hiring pattern, the model learns and repeats that same narrowness — it has no way to know that pattern should be corrected rather than continued."
  },
  "fun_fact": "One widely studied real case found a hiring tool trained on past resumes learned to penalize resumes containing the phrase ''women''s chess club captain'' because historical hires skewed male — the company scrapped the tool once this was discovered.",
  "try_it": "Think of one dataset (grades, social media likes, sports stats) that might reflect real-world bias if used to train an AI. Name the bias in one sentence."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'bias-in-ai');

UPDATE public.lesson_content SET content = '{
  "hook": "The most dangerous AI mistake isn''t a wrong answer — it''s a private detail it should have never repeated.",
  "explanation": "Privacy in AI means being deliberate about what data goes into a system and what a chatbot is allowed to say back out. Personal information shared in a conversation shouldn''t be stored or repeated carelessly, and systems should minimize collecting data they don''t actually need.\n\nGuardrails are the deliberate limits placed on an AI system to prevent harmful, unsafe, or inappropriate outputs — things like refusing dangerous requests, not generating harmful content, and not revealing sensitive data. Good guardrails are built in layers: instructions in the system prompt, content filtering, and human review for high-stakes situations.\n\nSafety isn''t a one-time checkbox — it requires ongoing testing, because new ways to misuse a system get discovered after launch, not just during initial design.",
  "visual": {
    "caption": "Layers of protection",
    "steps": [
      { "emoji": "📝", "label": "System instructions", "caption": "Rules built into the prompt" },
      { "emoji": "🛡️", "label": "Content filtering", "caption": "Catches unsafe outputs" },
      { "emoji": "👤", "label": "Human review", "caption": "For high-stakes cases" }
    ]
  },
  "analogy": "It''s like a building with multiple safety layers — a locked door, an alarm system, and security staff. No single layer is perfect alone, but together they catch far more than any one layer would by itself.",
  "practice": {
    "prompt": "A user shares their home address in a chat, and the bot repeats it back later in an unrelated context. What guardrail failed?",
    "options": ["Nothing failed, this is normal behavior", "A privacy guardrail — sensitive shared info shouldn''t be casually repeated or resurfaced", "The user made a mistake, not the bot"],
    "correct_index": 1,
    "feedback": "Sensitive personal information shared in one context shouldn''t be casually resurfaced elsewhere — that''s a privacy guardrail failure, not something the user did wrong."
  },
  "fun_fact": "Many AI companies run dedicated ''red teaming'' programs — where people are paid specifically to try to break a system''s safety guardrails before real users can — because guardrails that look solid on paper often have gaps that only show up under deliberate pressure.",
  "try_it": "Write one guardrail rule you''d want in a chatbot that talks with teenagers — be specific about what it protects against."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'privacy-safety-guardrails');

UPDATE public.lesson_content SET content = '{
  "hook": "AI isn''t just changing apps — it''s reshaping jobs, information, and trust at a societal scale. Understanding both sides of that is part of building responsibly.",
  "explanation": "AI creates real benefits: faster medical diagnosis support, accessibility tools for people with disabilities, personalized education, and automation of tedious tasks. It also creates real risks: job displacement in certain industries, the spread of convincing misinformation (including deepfakes), and growing gaps between people and organizations who have access to powerful AI tools and those who don''t.\n\nNeither the purely optimistic view (''AI will fix everything'') nor the purely pessimistic view (''AI will ruin everything'') tends to be accurate — the real impact depends heavily on the specific choices made by the people building and regulating these systems.\n\nThis is exactly why the builders, ethicists, and policy people in this field matter so much — the technology''s trajectory isn''t fixed, it''s actively being shaped by decisions happening right now.",
  "visual": {
    "caption": "Two sides of the same coin",
    "steps": [
      { "emoji": "✨", "label": "Benefits", "caption": "Access, speed, personalization" },
      { "emoji": "⚠️", "label": "Risks", "caption": "Jobs, misinformation, gaps" },
      { "emoji": "🧭", "label": "Depends on choices", "caption": "Not fixed — actively shaped" }
    ]
  },
  "analogy": "It''s like the invention of the printing press — it massively expanded access to knowledge, but also spread propaganda faster than ever. The technology wasn''t inherently good or bad; the outcome depended on who used it and how.",
  "practice": {
    "prompt": "Which statement best reflects a balanced view of AI''s impact on society?",
    "options": ["AI will definitely fix every major problem automatically", "AI''s impact — good or harmful — depends heavily on the choices made by the people building and governing it", "AI has no meaningful impact on society"],
    "correct_index": 1,
    "feedback": "The realistic view treats AI as a powerful tool whose impact is shaped by human decisions — design choices, regulations, and access — not as something with a predetermined, automatic outcome."
  },
  "fun_fact": "Economists studying past waves of automation (like the printing press and industrial machinery) have found that new technologies tend to eliminate some jobs while creating entirely new categories of jobs that didn''t exist before — the same pattern is actively being studied for AI right now.",
  "try_it": "Name one AI benefit and one AI risk relevant to a field you''re personally interested in (medicine, art, education, etc.)."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'ai-impact-on-society');

UPDATE public.lesson_content SET content = '{
  "hook": "You just finished a real AI & ML curriculum — foundations, machine learning, chatbots, agents, and ethics. This last lesson is about what you do with it next.",
  "explanation": "You now understand how AI actually learns (not magic — patterns from data), how language models generate text, how to design a chatbot''s identity and guardrails, how agents plan and use tools, and where bias and safety risks come from. That''s a genuinely rare, practical foundation — most people who use AI daily have none of this understanding.\n\nThe fastest way to deepen this further is to keep building: iterate on your FORGE chatbot, try prompting techniques on other AI tools, and stay curious about how the products you use every day are actually built.\n\nWhichever path pulls you — engineer, ethicist, designer, researcher, or something not invented yet — the habit that matters most is the one you''ve been practicing this whole course: asking ''how does this actually work, and who does it affect?'' instead of just accepting the surface answer.",
  "visual": {
    "caption": "What you''ve built up",
    "steps": [
      { "emoji": "🧠", "label": "Foundations", "caption": "How AI actually learns" },
      { "emoji": "💬", "label": "Chatbots", "caption": "Identity, prompts, guardrails" },
      { "emoji": "🧰", "label": "Agents", "caption": "Tools, planning, memory" },
      { "emoji": "⚖️", "label": "Ethics", "caption": "Bias, privacy, impact" }
    ]
  },
  "analogy": "Finishing this curriculum is like learning to read blueprints instead of just living in the building. You''ll never look at a chatbot, recommendation feed, or AI headline the same way again — you now know roughly what''s actually happening underneath.",
  "practice": {
    "prompt": "What''s the single most valuable habit to carry forward from this entire course?",
    "options": ["Trusting every confident-sounding AI answer without question", "Asking how a system actually works and who it affects, instead of accepting the surface answer", "Avoiding AI tools entirely"],
    "correct_index": 1,
    "feedback": "That question — how does this work, and who does it affect — is the thread running through every module, from spotting narrow AI to catching bias to designing good guardrails."
  },
  "fun_fact": "Every field this course touched — ML engineering, AI ethics, prompt design, agent research — is less than 15 years old in its current form. You''re not late to this field. You''re early.",
  "try_it": "Write one sentence on what you want to build, learn, or explore next in AI — keep it somewhere you''ll actually see it again."
}'::jsonb
WHERE lesson_id = (SELECT id FROM public.lessons WHERE slug = 'your-path-forward');
