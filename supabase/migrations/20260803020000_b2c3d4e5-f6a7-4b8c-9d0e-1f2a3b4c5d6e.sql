-- Module 4 (Build Your Own Chatbot in FORGE): the hands-on module, tied
-- directly to the real FORGE variables from the existing 24-challenge builder
-- (BOT_NAME, SYSTEM_MESSAGE, KNOWLEDGE_BASE, QA_PAIRS, RESPONSE_STYLE, MOOD,
-- RULES, FORBIDDEN_WORDS, BLOCKED_TOPICS). No expansion flagged for this
-- module; publishes full content + quizzes for all 6 existing stubs.

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Before your bot says a single smart thing, it needs a name, a face, and a reason to exist. This is the fastest lesson in the whole course — and skipping it is the #1 reason FORGE bots feel generic.",
  "explanation": "Every FORGE bot starts with four identity variables: BOT_NAME (shown in the chat header), BOT_EMOJI (its visual avatar next to every message), AI_MESSAGE (the very first thing users see), and CREATOR_NAME (crediting you as the builder). These might look like small cosmetic details, but they do real work: a bot named ''Assistant'' with a generic robot emoji signals ''generic tool,'' while a bot with a specific name, emoji, and punchy opening line signals ''someone made a real character here.'' Users form an opinion about whether your bot is worth taking seriously within the first message, often before asking it anything real. A weak default AI_MESSAGE works for literally any bot ever built, which is exactly the problem — it says nothing specific about THIS bot.",
  "analogy": "Think of BOT_NAME, BOT_EMOJI, and AI_MESSAGE as a business''s storefront sign, logo, and the greeting a shopkeeper gives you walking in. You could build the same quality product behind two different storefronts — but a forgettable sign and a mumbled greeting make people assume the product inside is forgettable too, before they''ve seen it.",
  "fun_fact": "In UX research, this is sometimes called the ''first 3 seconds'' effect — users form snap judgments about digital products within just a few seconds of first contact, and that impression measurably colors how they interpret everything that follows.",
  "try_it": "Open your FORGE project and read your BOT_NAME, BOT_EMOJI, and AI_MESSAGE out loud, back to back, as a brand-new user would. Does it sound like a specific character, or could it swap into any other bot with zero changes?"
}'::jsonb
FROM public.lessons WHERE slug = 'bot-identity';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "You already learned WHY the system prompt matters back in Module 3. Now it''s time to actually write one that''s genuinely good — using a concrete formula, not guesswork.",
  "explanation": "In FORGE, your bot''s entire personality lives inside SYSTEM_MESSAGE. A reliable formula, building on WHO/HOW/WHAT/RULES: WHO — state the bot''s name and role in the first sentence. HOW — describe tone and communication style concretely. WHAT — define its actual domain of expertise, so it knows what it''s confidently qualified to discuss versus what to redirect. RULES — list specific behavioral instructions. A common beginner mistake is writing something too short and generic — ''You are a helpful assistant that answers questions clearly'' — producing a bot indistinguishable from every default bot ever made. Another mistake is instructions that contradict each other (''be extremely concise'' AND ''always explain your full reasoning in detail'' can''t both be honored). The single highest-leverage move: replace vague adjectives with concrete, specific instructions. ''Be friendly'' is vague; ''use casual language, include a relevant emoji per response, and celebrate the user''s questions enthusiastically'' is specific enough to actually execute consistently.",
  "analogy": "Writing a SYSTEM_MESSAGE is like writing a new employee''s first-day training document. ''Be professional and helpful'' leaves them guessing what that looks like in practice. ''Greet every customer by name if known, always offer the loyalty program, never discuss competitor pricing'' gives exact, actionable behavior they can follow consistently, even without ever meeting you.",
  "fun_fact": "Some of the most detailed real-world system prompts used by professional AI products run to several thousand words — far longer than most beginners expect — because specific, comprehensive instructions genuinely produce more reliable behavior than a short, vague paragraph.",
  "try_it": "Take one vague adjective from your current SYSTEM_MESSAGE (like ''friendly'' or ''fun'') and rewrite it as a concrete instruction the model could actually follow step by step."
}'::jsonb
FROM public.lessons WHERE slug = 'great-system-message';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Your bot doesn''t automatically know anything about YOUR specific topic. Two FORGE variables fix that: KNOWLEDGE_BASE and QA_PAIRS, and they work very differently from each other.",
  "explanation": "KNOWLEDGE_BASE is a block of reference text the model treats as background information to draw from when relevant — like giving it a textbook chapter to consult. It''s flexible: the model reads it and rephrases relevant facts naturally in its own words, blending them into a conversational response — powerful for general depth, but it means the model is ''interpreting'' rather than reciting exactly. QA_PAIRS solve that precision problem: each pair is an exact question paired with an exact required answer. When a user''s message closely matches a Q, FORGE instructs the model to use that EXACT answer, word for word, guaranteeing accuracy on your most important facts. The rule of thumb: use KNOWLEDGE_BASE for broad background context; use QA_PAIRS for your highest-stakes, must-be-exact facts (dates, names, specific numbers) where a reworded answer could actually be wrong or misleading. Using both together is how the strongest FORGE bots balance natural conversation with real accuracy.",
  "analogy": "KNOWLEDGE_BASE is like giving your bot a textbook to study and explain in its own words — flexible, natural-sounding, occasionally imprecise on fine details. QA_PAIRS are like giving it a strict answer key for questions you absolutely cannot afford to get wrong, the way a tour guide memorizes a historic site''s exact opening date rather than risk paraphrasing it slightly wrong.",
  "fun_fact": "This KNOWLEDGE_BASE + QA_PAIRS pattern mirrors a real, widely-used professional AI technique called RAG (Retrieval-Augmented Generation) — giving a language model extra reference material at request time, specifically to reduce made-up or outdated answers.",
  "try_it": "Pick one fact about your bot''s topic that would be genuinely embarrassing to get wrong. Check: is it sitting loosely in KNOWLEDGE_BASE, or locked down precisely as a QA_PAIRS entry? If the former, consider moving it."
}'::jsonb
FROM public.lessons WHERE slug = 'knowledge-base-qa';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Same facts, same knowledge, wildly different vibe — that''s entirely the job of FORGE''s tone and style controls, often the difference between a bot people enjoy talking to and one they tolerate.",
  "explanation": "Beyond WHAT your bot knows, several variables shape HOW it sounds. RESPONSE_STYLE (Concise, Detailed, Friendly, Professional, Balanced) sets the overall approach. MAX_RESPONSE_LENGTH constrains how much it says at once — genuinely underrated, since even great content feels exhausting in an overly long response. MOOD (cheerful, serious, sarcastic, mysterious, energetic, calm) adds emotional flavor. LANGUAGE_STYLE (formal, academic, slang, poetic, storyteller) shapes vocabulary and sentence construction. CATCHPHRASES gives signature phrases woven naturally into responses, creating a memorable voice when used sparingly. The genuine skill is coherence: a MOOD of ''serious'' paired with silly CATCHPHRASES sends mixed signals the model has to reconcile, often producing an inconsistent-feeling bot. A kids'' tutoring bot probably wants Friendly + short-to-medium + cheerful + simple language, all reinforcing one vibe — while a formal research assistant wants Professional + detailed + calm + academic, again all pulling the same direction.",
  "analogy": "Think of these settings like choosing an actor''s voice, pacing, and costume for one character — you wouldn''t dress someone in a clown costume while directing flat, serious monotone delivery. Individually each choice might be fine; together, mismatched choices read as confusing, not interesting.",
  "fun_fact": "Voice and tone consistency is such a well-studied branding area that many major companies maintain official internal ''tone of voice'' guideline documents, sometimes dozens of pages long, to keep every piece of writing sounding like one consistent personality, even written by different people.",
  "try_it": "Read your bot''s RESPONSE_STYLE, MOOD, and LANGUAGE_STYLE together as one sentence: ''This bot is ___, feels ___, and talks in a ___ way.'' Does that sound like one coherent character?"
}'::jsonb
FROM public.lessons WHERE slug = 'tone-and-style';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "A genuinely great bot isn''t just one that answers well — it''s one that knows exactly what NOT to say, and reliably holds that line even when a user pushes.",
  "explanation": "FORGE gives you several boundary tools. RULES is a flexible list of behavioral instructions the bot should always follow. FORBIDDEN_WORDS are specific words the bot must never use — a ''soft'' restriction on vocabulary, finding alternative phrasing when relevant. BLOCKED_TOPICS are full subjects the bot should refuse to discuss entirely, redirecting instead — a ''hard'' restriction on entire subject areas. FORBIDDEN_WORDS changes HOW something might get said; BLOCKED_TOPICS changes WHETHER it gets discussed at all. A well-designed bot layers these: RULES for general behavior, FORBIDDEN_WORDS for specific vocabulary to avoid, BLOCKED_TOPICS for genuinely off-limits subjects (medical diagnosis, legal advice, anything outside appropriate scope for the intended audience). A common mistake is treating boundaries as an afterthought bolted on after something already went wrong in testing, rather than designed alongside the bot''s core purpose from the start.",
  "analogy": "Think of RULES, FORBIDDEN_WORDS, and BLOCKED_TOPICS like a tour guide''s general etiquette (always speak clearly), specific phrases avoided out of respect, and entire places on the route they simply don''t take the group — an area under active construction, off-limits regardless of how interesting it might be.",
  "fun_fact": "In professional AI development this practice is called ''guardrails,'' and major AI companies employ entire dedicated Trust & Safety or Responsible AI teams whose full-time job is designing and continuously improving exactly this kind of boundary system at massive scale.",
  "try_it": "List one BLOCKED_TOPIC your bot genuinely should have, based on its actual audience and purpose, that isn''t currently in your code. Add it now — designing boundaries proactively is the real skill here."
}'::jsonb
FROM public.lessons WHERE slug = 'rules-and-boundaries';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "You''ve written a great system message, taught it facts, shaped its tone, and set its boundaries — now comes the step most beginners skip: actually trying to break your own bot before a real user does.",
  "explanation": "Testing a FORGE bot isn''t chatting with it once and calling it done — it''s deliberately trying inputs designed to reveal weaknesses. A solid pass covers four categories. Happy path testing: ask the questions your bot is clearly designed for, confirm accurate, on-brand answers. Edge case testing: ask oddly-phrased, incomplete, or typo-filled versions of legitimate questions, to see if the bot still understands the intent. Boundary testing: deliberately try to trigger BLOCKED_TOPICS and FORBIDDEN_WORDS to confirm your safety rules hold under direct pressure, not just casual conversation. Consistency testing: ask the same underlying question multiple different ways, checking whether personality, tone, and facts stay stable. When something goes wrong, debugging follows a repeatable loop: reproduce the issue (confirm it''s a real pattern, not a one-off), isolate the cause (vague SYSTEM_MESSAGE? missing QA_PAIRS entry? RULES conflict?), make one focused change, and retest that exact input before moving to the next issue. Changing five variables at once and hoping something improves is how bugs hide, not how they get fixed.",
  "analogy": "Testing your bot is like a chef tasting a dish throughout cooking, not just once at the very end. A single taste-test right before serving catches almost nothing; tasting after each major ingredient goes in — and specifically trying different conditions — catches real problems while they''re still cheap and easy to fix.",
  "fun_fact": "In professional software testing, deliberately trying to break a system on purpose is called ''adversarial testing'' or ''red teaming'' — for AI specifically, entire specialized job roles now exist just to creatively find ways a model might misbehave, before real users ever encounter those issues.",
  "try_it": "Right now, try to make your FORGE bot break one of its own BLOCKED_TOPICS or FORBIDDEN_WORDS rules on purpose, using slightly indirect phrasing. If it holds the line, you''ve confirmed a real boundary. If it doesn''t, you just found a genuinely valuable bug before a real user did."
}'::jsonb
FROM public.lessons WHERE slug = 'testing-debugging-bot';

UPDATE public.lessons SET is_published = true WHERE slug IN ('bot-identity', 'great-system-message', 'knowledge-base-qa', 'tone-and-style', 'rules-and-boundaries', 'testing-debugging-bot');

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does the BOT_NAME variable control in FORGE?', '["The bot''s underlying AI model", "What the bot is called, shown in the chat header", "The bot''s temperature setting", "The bot''s knowledge base"]', 1, 'BOT_NAME sets the displayed name of the bot in the chat interface.'),
    (2, 'What is AI_MESSAGE?', '["An error message shown on crashes", "The very first message users see when they open a conversation", "The bot''s system prompt", "A hidden debugging log"]', 1, 'AI_MESSAGE is the opening greeting a user sees first.'),
    (3, 'Why does this lesson argue identity variables "do real work," despite seeming cosmetic?', '["They don''t actually matter at all", "They shape users'' first impressions, which color how the rest of the interaction is perceived", "They directly change the AI model''s training", "They only affect loading speed"]', 1, 'First impressions from identity elements measurably affect how users perceive everything that follows.'),
    (4, 'What''s the problem with a generic default AI_MESSAGE?', '["It''s too long", "It''s generic enough to work for literally any bot, saying nothing specific about this one", "It contains a coding error", "It uses too many emojis"]', 1, 'A generic greeting fails to signal any distinct personality or purpose.'),
    (5, 'In the storefront analogy, what does a "forgettable sign and mumbled greeting" represent?', '["A strong, specific bot identity", "A weak, generic bot identity that undersells the product behind it", "The bot''s knowledge base", "The bot''s temperature setting"]', 1, 'A weak storefront (identity) makes people assume the product is forgettable, regardless of actual quality.'),
    (6, 'What does UX research call the effect where users form snap judgments within seconds?', '["The ''first 3 seconds'' effect", "The ''infinite loop'' effect", "The ''overfitting'' effect", "The ''token limit'' effect"]', 0, 'This lesson refers to it as the "first 3 seconds" effect.'),
    (7, 'Should two very different bots sound similar in their AI_MESSAGE, even using the same LLM?', '["Yes, they should sound identical", "No — distinct purposes and personalities should produce clearly distinct opening lines", "AI_MESSAGE has no effect on how a bot sounds", "Only CREATOR_NAME needs to differ"]', 1, 'Distinct bot identities should be reflected in genuinely distinct AI_MESSAGE content.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'bot-identity';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'In FORGE, which single variable holds your bot''s entire personality instructions?', '["BOT_NAME", "SYSTEM_MESSAGE", "TEMPERATURE", "AI_MESSAGE"]', 1, 'SYSTEM_MESSAGE is where the bot''s core personality and behavior instructions live.'),
    (2, 'What does the "WHO" part of the formula establish?', '["The bot''s temperature setting", "The bot''s name and role, stated early in the system message", "The user''s name", "The bot''s knowledge base size"]', 1, 'WHO establishes identity and role right at the start.'),
    (3, 'What is a common beginner mistake when writing a SYSTEM_MESSAGE?', '["Making it too specific", "Writing it too short and generic, producing a bot indistinguishable from any default", "Including too many rules", "Using the bot''s real name"]', 1, 'Vague, generic system messages fail to produce distinctive bot behavior.'),
    (4, 'Why can contradictory instructions cause problems?', '["They never cause any issues", "The model has to guess which instruction takes priority, leading to inconsistent behavior", "Contradictions automatically crash the bot", "FORGE auto-fixes all contradictions"]', 1, 'Conflicting instructions leave the model without a clear priority to follow consistently.'),
    (5, 'What is the "single highest-leverage move" this lesson recommends?', '["Making it as short as possible", "Replacing vague adjectives with concrete, specific instructions", "Removing all rules entirely", "Using only one-word sentences"]', 1, 'Concrete, actionable instructions are the highest-leverage improvement over vague adjectives.'),
    (6, 'In the new-employee analogy, what does a specific, actionable instruction represent?', '["A vague instruction", "A concrete, specific instruction that produces consistent behavior", "The bot''s AI_MESSAGE", "A knowledge base entry"]', 1, 'Specific, actionable instructions mirror well-written concrete system message rules.'),
    (7, 'How long can real professional system prompts sometimes run?', '["Always under 5 words", "Sometimes several thousand words", "Exactly one sentence, always", "System prompts cannot exceed 10 words"]', 1, 'Detailed, comprehensive real-world system prompts can run quite long.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'great-system-message';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'How does the model typically use information from KNOWLEDGE_BASE?', '["It recites it word-for-word every time", "It reads it as background context and rephrases relevant facts naturally", "It ignores KNOWLEDGE_BASE completely", "It deletes KNOWLEDGE_BASE after the first message"]', 1, 'KNOWLEDGE_BASE is treated as flexible background reference the model rephrases.'),
    (2, 'How does QA_PAIRS differ from KNOWLEDGE_BASE in precision?', '["QA_PAIRS provides exact required answers, guaranteeing precision; KNOWLEDGE_BASE is more flexible", "They work identically", "QA_PAIRS is less precise than KNOWLEDGE_BASE", "Neither affects precision"]', 0, 'QA_PAIRS locks in exact wording for specific questions, unlike flexible KNOWLEDGE_BASE.'),
    (3, 'When should you prefer QA_PAIRS over KNOWLEDGE_BASE?', '["Never", "For your highest-stakes, must-be-exact facts like dates, names, or numbers", "Only for greeting messages", "For every single fact with no exceptions"]', 1, 'QA_PAIRS is best reserved for facts where precision genuinely matters.'),
    (4, 'What professional AI technique does this pattern resemble?', '["Retrieval-Augmented Generation (RAG)", "Overfitting", "Temperature scaling", "Dimensionality reduction"]', 0, 'This mirrors RAG — giving a model extra reference material to improve accuracy.'),
    (5, 'In the tour-guide analogy, what does "memorizing the exact date word-for-word" represent?', '["KNOWLEDGE_BASE usage", "QA_PAIRS usage", "The bot''s temperature setting", "The bot''s identity variables"]', 1, 'Exact, memorized facts mirror the precision guarantee of QA_PAIRS.'),
    (6, 'What is the recommended best practice for the strongest FORGE bots?', '["Use only QA_PAIRS", "Use only KNOWLEDGE_BASE", "Combine broad KNOWLEDGE_BASE with locked-down critical QA_PAIRS", "Use neither"]', 2, 'Combining both balances natural conversation with guaranteed accuracy.'),
    (7, 'What risk does relying only on KNOWLEDGE_BASE for a high-stakes fact create?', '["No risk at all", "The model might paraphrase in a way that loses precision or is subtly wrong", "KNOWLEDGE_BASE facts are auto-fact-checked", "It would only slow response time"]', 1, 'Since the model rephrases KNOWLEDGE_BASE content, precision isn''t guaranteed.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'knowledge-base-qa';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does RESPONSE_STYLE control in a FORGE bot?', '["The bot''s knowledge base content", "The overall communication approach (Concise, Detailed, Friendly, Professional)", "The bot''s name", "The temperature setting"]', 1, 'RESPONSE_STYLE sets the general communication approach.'),
    (2, 'Why is MAX_RESPONSE_LENGTH described as "underrated"?', '["It has no real effect on user experience", "Even great content can feel exhausting if responses run too long", "It only controls the bot''s name length", "It''s actually the most well-known setting"]', 1, 'Response length significantly affects how a response feels, regardless of content quality.'),
    (3, 'What does CATCHPHRASES add, when used well?', '["Faster response times", "A memorable, recognizable voice through signature phrases used sparingly", "A larger knowledge base", "Lower temperature"]', 1, 'Sparingly-used signature phrases create a distinctive bot voice.'),
    (4, 'Why might a "serious" MOOD paired with silly CATCHPHRASES cause a problem?', '["It never causes issues", "It sends mixed signals the model has to reconcile, producing an inconsistent bot", "FORGE automatically blocks this combination", "Mood and catchphrases don''t interact"]', 1, 'Conflicting tone settings can create an incoherent bot personality.'),
    (5, 'What settings combination does this lesson suggest for a kids'' tutoring bot?', '["Professional + detailed + calm + academic", "Friendly + short-to-medium + cheerful + simple language", "Sarcastic + long + mysterious + poetic", "Random settings with no alignment"]', 1, 'A coherent, kid-friendly combination reinforces one consistent vibe.'),
    (6, 'In the actor analogy, what does a clown costume with flat, serious delivery represent?', '["A well-coordinated bot personality", "Mismatched, conflicting tone settings", "The ideal FORGE bot setup", "A bot with no MOOD setting"]', 1, 'Mismatched individual choices create confusing overall coherence.'),
    (7, 'Why do many companies maintain "tone of voice" guideline documents?', '["To keep writing across different people sounding like one consistent personality", "It''s purely a legal requirement", "To make every employee use identical sentences", "These documents don''t actually exist"]', 0, 'Tone-of-voice guidelines maintain consistent brand personality across different writers.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'tone-and-style';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is the difference between FORBIDDEN_WORDS and BLOCKED_TOPICS?', '["They are exactly the same thing", "FORBIDDEN_WORDS restricts specific vocabulary; BLOCKED_TOPICS restricts entire subjects", "FORBIDDEN_WORDS is always stricter", "Neither affects bot behavior"]', 1, 'FORBIDDEN_WORDS is a "soft" vocabulary restriction; BLOCKED_TOPICS is a "hard" subject restriction.'),
    (2, 'What does RULES control in a FORGE bot?', '["Only the bot''s name", "A flexible list of general behavioral instructions the bot should always follow", "The bot''s knowledge base content only", "The exact temperature value"]', 1, 'RULES sets general, always-followed behavioral instructions.'),
    (3, 'When should safety boundaries ideally be designed?', '["Only after something goes wrong in testing", "Alongside the bot''s core purpose from the very start", "Boundaries are unnecessary", "Only for adult-audience bots"]', 1, 'Designing boundaries proactively is the recommended practice.'),
    (4, 'What is the professional term for this boundary-setting practice?', '["Overfitting", "Guardrails", "Dimensionality reduction", "Clustering"]', 1, 'This practice is called "guardrails" in professional AI development.'),
    (5, 'What kind of team focuses full-time on this work at major AI companies?', '["Marketing teams only", "Trust & Safety or Responsible AI teams", "Sales teams", "Hardware repair teams"]', 1, 'Trust & Safety / Responsible AI teams focus on these boundary systems.'),
    (6, 'In the tour guide analogy, what does an off-limits construction area represent?', '["A FORBIDDEN_WORDS entry", "A BLOCKED_TOPICS entry", "A RULES entry", "The bot''s AI_MESSAGE"]', 1, 'An entirely off-limits area mirrors a full subject being blocked.'),
    (7, 'What is the real purpose of good boundaries, according to this lesson?', '["To make the bot less capable for no reason", "To make the bot trustworthy enough that people feel safe using it", "Boundaries serve no real purpose", "To slow down response time"]', 1, 'Good boundaries build trust and safety, not restriction for its own sake.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'rules-and-boundaries';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is "happy path testing"?', '["Testing only with sad or angry messages", "Asking the questions your bot is clearly designed for and confirming accurate answers", "A type of neural network testing", "Testing that ignores answer correctness"]', 1, 'Happy path testing checks the bot''s core intended use cases work as expected.'),
    (2, 'What is "boundary testing" specifically designed to check?', '["The bot''s response speed", "Whether BLOCKED_TOPICS and FORBIDDEN_WORDS rules actually hold under direct pressure", "The bot''s knowledge base file size", "The bot''s temperature setting only"]', 1, 'Boundary testing deliberately probes safety rules to confirm they hold.'),
    (3, 'What does "consistency testing" check for?', '["Whether personality/tone/facts stay stable when the same question is asked different ways", "Whether the bot uses identical words every time with zero variation", "Only response speed under 1 second", "Whether the knowledge base is alphabetized"]', 0, 'Consistency testing checks stability across differently-phrased versions of the same question.'),
    (4, 'What is the recommended first step in the debugging loop?', '["Change five variables at once immediately", "Reproduce the issue to confirm it''s a real, repeatable pattern", "Delete the entire bot and start over", "Ignore the issue"]', 1, 'Reproducing the issue first confirms it''s a genuine, repeatable problem.'),
    (5, 'Why does this lesson warn against changing five variables at once when debugging?', '["It''s actually the recommended fast approach", "It makes it hard to know which specific change fixed (or caused) the problem", "FORGE prevents changing more than one variable at a time", "There is no downside"]', 1, 'Changing multiple things at once obscures which change was responsible.'),
    (6, 'In the chef analogy, what does tasting only once at the very end represent?', '["A thorough testing process", "A weak testing approach that catches almost nothing until too late", "The recommended best practice", "A type of boundary testing"]', 1, 'Testing only once at the end mirrors insufficient testing practices.'),
    (7, 'What is the professional term for deliberately trying to break a system on purpose?', '["Overfitting", "Adversarial testing / red teaming", "Dimensionality reduction", "Supervised learning"]', 1, 'Deliberately probing a system for weaknesses is known as adversarial testing or red teaming.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'testing-debugging-bot';
