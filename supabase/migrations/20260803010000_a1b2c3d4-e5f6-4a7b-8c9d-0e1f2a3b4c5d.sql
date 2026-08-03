-- Module 3 (How Chatbots & LLMs Think): publishes full content + 7-question
-- quizzes for all 5 existing stubs. No expansion here — no depth gap was
-- flagged for this module, unlike Modules 1-2. No order_index renumbering
-- needed since no lessons are being inserted.

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Every chatbot you build in FORGE is powered by something called a ''Large Language Model'' — but what is that, actually? Time to open the hood on the exact technology behind your bots.",
  "explanation": "A Large Language Model (LLM) is a neural network trained on a massive amount of text — books, websites, articles, conversations — with one deceptively simple job during training: predict the next word (technically, the next ''token'' — more on that next lesson) given everything that came before it. That single task, repeated across essentially all of the internet''s readable text, scaled up to billions of parameters, is what produces the surprisingly capable, conversational behavior you see in chatbots today. When you send a message to your FORGE bot, the LLM isn''t ''thinking'' about your question the way a person would — it''s calculating, one token at a time, which next word is statistically most likely, given your message plus its system prompt plus everything else in the conversation so far. ''Large'' refers to two things at once: the size of the training data and the size of the model itself (its parameter count — often hundreds of billions). Bigger models trained on more data generally produce noticeably better, more coherent, more knowledgeable output.",
  "analogy": "Imagine someone who has read an almost unimaginable number of books and conversations — but instead of understanding meaning the way you do, they''ve become extraordinarily good at finishing sentences the way a skilled improv performer finishes another actor''s line: not by truly knowing what comes next, but by having absorbed so many patterns that their guesses are eerily, consistently good.",
  "fun_fact": "GPT stands for ''Generative Pre-trained Transformer'' — ''Generative'' because it generates new text, ''Pre-trained'' because the heavy training happens once in advance, and ''Transformer'' after the 2017 architecture breakthrough from Module 1''s history lesson.",
  "try_it": "Next time you''re chatting with a FORGE bot, try typing an unfinished sentence like ''The capital of France is'' and see how confidently it completes it. That confident completion, scaled up to entire conversations, is the core trick behind every LLM."
}'::jsonb
FROM public.lessons WHERE slug = 'what-is-an-llm';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "An LLM doesn''t actually read words the way you do — it reads ''tokens,'' and understanding what that means unlocks why chatbots sometimes behave in surprising ways, like forgetting things or hitting length limits.",
  "explanation": "A token is the actual unit of text an LLM processes — often a whole word, but sometimes just part of a word, or even a single punctuation mark. Every message gets broken into tokens before any processing happens. A ''prompt'' is everything fed into the model in one go — your message, plus the system prompt, plus (in a multi-turn chat) earlier conversation history, all combined into one block of tokens the model reads before responding. This brings us to the ''context window'' — the maximum number of tokens a model can consider at once, input and output combined. Every model has a fixed limit. Once a conversation grows past that limit, older messages get dropped or summarized — exactly why a chatbot can seem to ''forget'' something said much earlier: it literally fell outside the context window. This has real implications for your bots: a longer, more detailed KNOWLEDGE_BASE gives your bot more to draw from, but eats into the token budget available for the conversation itself.",
  "analogy": "Think of the context window like a whiteboard of fixed size the model reads before answering. As the conversation grows, new sentences get written on — but once it''s full, old sentences at the top get erased to make room. Whatever''s still visible is all the model can actually ''see.''",
  "fun_fact": "As a rough rule of thumb, 1 token is often about 4 characters of English text — so roughly 750 words works out to about 1,000 tokens, which is why AI APIs often price and limit usage ''per token'' rather than per word.",
  "try_it": "Count roughly how many words are in your FORGE bot''s SYSTEM_MESSAGE and KNOWLEDGE_BASE combined. That entire block gets converted to tokens and re-read on every single message."
}'::jsonb
FROM public.lessons WHERE slug = 'tokens-prompts-context';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "The single most powerful lever you control when building a FORGE bot isn''t a fancy setting buried in a menu — it''s a block of plain English text called the system prompt. Get this right, and everything else gets easier.",
  "explanation": "A system prompt is a set of instructions given to the LLM before the conversation begins, establishing who the bot is, how it should behave, and what boundaries it should respect — invisible to the end user, but read by the model on every single response. Unlike a user''s message (treated as something to respond TO), the system prompt is treated as the model''s own instructions to follow. A strong system prompt covers four things: WHO the bot is, HOW it should communicate, WHAT it knows or specializes in, and RULES it must follow. ''You are a helpful assistant'' produces generic, forgettable responses, while a detailed, specific system prompt produces a bot with real, consistent character across every response. Because the system prompt gets re-read on every message, the model doesn''t ''lose'' its personality partway through a conversation, as long as instructions stay clear.",
  "analogy": "A system prompt is like the stage directions and character notes an actor receives before a play — ''You are playing a cheerful, overly-caffeinated barista who speaks in coffee puns and never breaks character.'' The actor then improvises every line live, but always within that established character framework.",
  "fun_fact": "Some professional AI companies keep their production system prompts confidential and treat them as valuable intellectual property — entire consulting businesses have emerged around helping companies write better ones.",
  "try_it": "Take your current FORGE bot''s SYSTEM_MESSAGE and check it against WHO, HOW, WHAT, and RULES. Pick whichever one is weakest and rewrite just that part."
}'::jsonb
FROM public.lessons WHERE slug = 'system-prompts';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Ask your FORGE bot the exact same question twice, and it might give you two different (but both reasonable) answers. That''s not a bug — it''s a setting called ''temperature,'' and understanding it lets you deliberately control how predictable or surprising your bot feels.",
  "explanation": "An LLM generates text by predicting the most statistically likely next token, but it actually calculates a whole ranked list of plausible next tokens with different probabilities. Temperature controls how the model chooses from that list. At low temperature (close to 0.0), the model almost always picks the single most probable token — consistent, focused, predictable, ideal for factual Q&A or code. At high temperature (closer to 1.0+), the model occasionally picks less-likely, more surprising tokens — more varied and creative, better for brainstorming or a spontaneous personality. Push temperature too high and responses can become incoherent or off-topic; push it too low and responses can feel robotic and repetitive. There''s no single ''correct'' temperature — a homework-help bot probably wants low temperature for reliability; a creative-writing companion probably wants higher temperature to feel imaginative.",
  "analogy": "Imagine a restaurant chef with a ranked list of dishes they think you''d enjoy most. At low temperature, they always bring their #1 recommendation, every time — reliable, but same-ish. At high temperature, they''ll sometimes surprise you with their #4 or #5 pick — more adventurous, occasionally a delightful surprise, occasionally a miss.",
  "fun_fact": "The term ''temperature'' in AI is borrowed from thermodynamics/statistical physics, where higher temperature literally means more randomness and energy in a physical system.",
  "try_it": "If your FORGE bot has a TEMPERATURE setting, try running the exact same test message at 0.1 and then at 0.9. Notice how differently worded (or how similar) the two responses are."
}'::jsonb
FROM public.lessons WHERE slug = 'temperature-creativity';

INSERT INTO public.lesson_content (lesson_id, content)
SELECT id, '{
  "hook": "Two people can ask an AI the exact same underlying question and get wildly different quality answers back — purely because of HOW they asked. That skill gap is exactly what ''prompt engineering'' means, and it''s genuinely learnable.",
  "explanation": "Prompt engineering is the practice of crafting inputs to reliably get better, more useful outputs from an AI model. A few well-established techniques: Be specific — vague prompts get vague answers. Give examples (''few-shot prompting'') — showing 1-2 examples of the exact format/style you want dramatically improves the match to your intent, exactly what FEW_SHOT_EXAMPLES does in FORGE bots. Break down complex tasks — asking step-by-step often produces more focused results than one giant vague ask. Ask the model to ''think step by step'' — explicitly requesting reasoning before the final answer often improves accuracy on hard questions, similar to the Thought → Action → Observation pattern you''ll see in the Agents module. Iterate — professional prompt engineers rarely nail it on the first try; they test, see what''s wrong, and refine. None of these techniques change the underlying model at all — they change what you''re asking, and how, which is exactly why prompt engineering is a genuinely learnable skill.",
  "analogy": "Prompt engineering is like giving directions to a very literal, very capable taxi driver who''s new to your city. ''Take me somewhere nice'' gets an unpredictable result. ''Take me to a quiet coffee shop within walking distance of the museum, with good wifi for studying'' gets you exactly what you wanted — same driver, wildly different result based purely on how you asked.",
  "fun_fact": "Some of the earliest large-scale prompt engineering research found that simply adding ''let''s think step by step'' to a math problem prompt could dramatically increase an AI model''s accuracy — with no other change to the model at all.",
  "try_it": "Take a question you''d normally ask a chatbot in one vague sentence. Rewrite it using at least 2 techniques from this lesson. Notice how much more deliberate the rewritten version feels."
}'::jsonb
FROM public.lessons WHERE slug = 'prompt-engineering-101';

UPDATE public.lessons SET is_published = true WHERE slug IN ('what-is-an-llm', 'tokens-prompts-context', 'system-prompts', 'temperature-creativity', 'prompt-engineering-101');

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is the core training task an LLM learns to do?', '["Predict the next word/token given everything that came before it", "Search the internet in real time", "Physically execute code on a server", "Memorize a fixed list of approved answers"]', 0, 'LLMs are trained primarily to predict the next token given prior context.'),
    (2, 'What does "Large" in Large Language Model refer to?', '["The physical size of the computer", "The size of the training data and the size of the model''s parameter count", "How long each response is", "The number of users chatting with it"]', 1, '"Large" refers to both massive training data and a huge number of internal parameters.'),
    (3, 'When an LLM responds to you, is it "thinking" the way a human does?', '["Yes, in exactly the same way", "No — it''s calculating statistically likely next tokens based on learned patterns", "It has no process at all, responses are random", "It searches a database of pre-written answers"]', 1, 'LLM responses come from statistical pattern completion, not human-style reasoning.'),
    (4, 'What does the "P" in GPT stand for?', '["Programmed", "Pre-trained", "Public", "Personal"]', 1, 'GPT = Generative Pre-trained Transformer.'),
    (5, 'What architecture does the "T" in GPT refer to?', '["Transformer", "Terminal", "Template", "Training"]', 0, 'The Transformer architecture is the breakthrough that enabled modern LLMs.'),
    (6, 'In the improv performer analogy, what does "finishing another actor''s line" represent?', '["Random guessing with no pattern at all", "Predicting likely continuations based on absorbed patterns, not true understanding", "Literally reading from a script", "Refusing to respond"]', 1, 'Like a practiced improv instinct, completions come from absorbed patterns, not comprehension.'),
    (7, 'Generally, how does model size/training data relate to output quality?', '["Bigger models with more training data generally produce more coherent, capable output", "Model size has no effect on output quality whatsoever", "Smaller models always outperform larger ones", "Training data amount is completely irrelevant"]', 0, 'Larger, better-trained models generally produce noticeably more capable output.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'what-is-an-llm';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is a "token" in the context of LLMs?', '["A type of cryptocurrency", "The actual unit of text (often a word or word-piece) the model processes", "A password used to log in", "A physical computer chip"]', 1, 'Tokens are the text units LLMs actually process.'),
    (2, 'What is a "prompt"?', '["Only the very first message ever sent to a bot", "Everything fed into the model at once: system prompt, message, and any conversation history combined", "A type of error message", "The bot''s name"]', 1, 'A prompt is the full combined input the model reads before generating a response.'),
    (3, 'What is a "context window"?', '["A physical window on a monitor", "The maximum number of tokens a model can consider at once", "A setting that changes the bot''s color scheme", "The time limit before a chat expires"]', 1, 'The context window is the token capacity limit for a single model call.'),
    (4, 'Why might a chatbot seem to "forget" something from much earlier in a long conversation?', '["The bot is being deliberately rude", "Earlier messages may have fallen outside the context window and are no longer being read", "Chatbots always forget everything instantly", "This never actually happens"]', 1, 'Once a conversation exceeds the context window, older content is dropped.'),
    (5, 'Roughly how many characters of English text does one token typically represent?', '["About 4 characters", "About 400 characters", "Exactly 1 character", "About 4,000 characters"]', 0, 'A common rough estimate is about 4 characters per token.'),
    (6, 'In the whiteboard analogy, what happens when the board (context window) fills up?', '["The model stops working permanently", "Older content gets erased to make room for new content", "The whiteboard grows infinitely with no limit", "Nothing changes at all"]', 1, 'Old context gets dropped once the window''s capacity is reached.'),
    (7, 'What practical tradeoff does a longer KNOWLEDGE_BASE create?', '["No tradeoff exists at all", "It gives the bot more to draw from but eats into the context window budget for conversation", "It makes the bot''s responses shorter automatically", "It has no effect on tokens whatsoever"]', 1, 'A longer knowledge base uses more of the limited token budget.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'tokens-prompts-context';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is a system prompt?', '["A message the user types to the bot", "Instructions given to the model before the conversation begins, establishing who the bot is and how it should behave", "An error message shown when something breaks", "The bot''s response history"]', 1, 'The system prompt sets the model''s instructions/persona, read on every response.'),
    (2, 'How does the model treat the system prompt differently from a user''s message?', '["Exactly the same way, no difference", "As its own instructions to follow, more like a job description than something to respond to", "It ignores the system prompt entirely", "It only reads the system prompt once at the very start, never again"]', 1, 'The system prompt functions as behavioral instructions, distinct from messages it responds to.'),
    (3, 'What four things should a strong system prompt typically cover?', '["Price, location, hours, contact info", "WHO the bot is, HOW it communicates, WHAT it knows, and RULES it follows", "Font, color, size, layout", "Username, password, email, phone number"]', 1, 'WHO, HOW, WHAT, and RULES form the core structure of an effective system prompt.'),
    (4, 'Why doesn''t a well-written bot "lose" its personality partway through a long conversation?', '["Personality is impossible to maintain in AI", "The system prompt gets re-read on every message, as long as it stays within the context window", "The bot randomly picks a new personality each message", "System prompts only apply to the first message"]', 1, 'Since the system prompt is included in every prompt, consistent behavior persists.'),
    (5, 'What is the key difference between "You are a helpful assistant" and a detailed system prompt?', '["There is no meaningful difference", "The detailed version produces a bot with real, consistent character; the generic one produces forgettable responses", "Generic prompts always perform better", "Detailed prompts are illegal to use"]', 1, 'Specificity dramatically improves how distinctive and consistent a bot feels.'),
    (6, 'In the actor analogy, what do "stage directions and character notes" represent?', '["The user''s messages", "The system prompt", "The context window limit", "The training data"]', 1, 'Like stage directions, the system prompt frames every line the model improvises.'),
    (7, 'Has "system prompt writing" become a real professional skill, according to this lesson?', '["No, it has no professional relevance at all", "Yes — some companies keep prompts confidential and consulting businesses exist around writing better ones", "It is exactly the same skill as software engineering", "System prompts are never used professionally"]', 1, 'System prompt writing has become a genuine specialized skill.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'system-prompts';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What does temperature control in an LLM?', '["The physical heat of the computer''s CPU", "How likely the model is to choose less-probable, more surprising next tokens", "The speed of the internet connection", "The length limit of a response"]', 1, 'Temperature controls the randomness of token selection during generation.'),
    (2, 'What kind of output does LOW temperature tend to produce?', '["Highly random, incoherent text", "Consistent, focused, predictable output", "No output at all", "Only single-word responses"]', 1, 'Low temperature favors the most probable next token repeatedly.'),
    (3, 'What kind of output does HIGH temperature tend to produce?', '["Exactly identical output every time", "More varied, creative, sometimes unexpected output", "Guaranteed factual accuracy", "No text generation at all"]', 1, 'High temperature allows less-likely token choices, producing more varied output.'),
    (4, 'What''s a risk of setting temperature too high?', '["Responses become perfectly accurate", "Responses can become incoherent or off-topic", "The bot stops responding entirely", "The context window shrinks"]', 1, 'Excessive randomness can degrade coherence and topic relevance.'),
    (5, 'What''s a risk of setting temperature too low?', '["Responses become overly creative and chaotic", "Responses can feel robotic and repetitive across conversations", "The model crashes immediately", "Nothing, there is no risk"]', 1, 'Very low temperature can lead to repetitive, same-feeling responses.'),
    (6, 'In the restaurant analogy, what does "always bringing the #1 recommendation" represent?', '["High temperature", "Low temperature", "No temperature setting at all", "A broken system"]', 1, 'Always picking the top choice mirrors low-temperature, predictable behavior.'),
    (7, 'What field did the term "temperature" originally come from?', '["Marine biology", "Thermodynamics/statistical physics", "Music theory", "Accounting"]', 1, 'The term is borrowed from physics, where higher temperature means more randomness.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'temperature-creativity';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT id, q.order_index, q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons, LATERAL (
  VALUES
    (1, 'What is prompt engineering?', '["Rebuilding an AI model''s neural network structure", "Crafting inputs to reliably get better, more useful outputs from an AI model", "A type of computer hardware repair", "Deleting an AI model''s training data"]', 1, 'Prompt engineering shapes inputs to improve AI outputs, without changing the model itself.'),
    (2, 'What is "few-shot prompting"?', '["Asking a very short question", "Giving the model 1-2 examples of the exact format/style you want", "Limiting the model to only a few responses per day", "A technique that reduces training data"]', 1, 'Few-shot prompting means providing examples to guide the output format/style.'),
    (3, 'Why might breaking a complex request into smaller steps improve results?', '["It never actually helps", "It often produces more focused, higher-quality results than one massive vague ask", "It makes the model run out of tokens faster", "Step-by-step requests are always rejected"]', 1, 'Breaking tasks into steps tends to focus the model''s attention and improve quality.'),
    (4, 'What effect did adding "let''s think step by step" famously have in early research?', '["No effect whatsoever", "It dramatically increased accuracy on reasoning/math problems, with no change to the model itself", "It made the model refuse to answer", "It slowed down response time only"]', 1, 'This simple phrase significantly boosted reasoning accuracy in research.'),
    (5, 'Does prompt engineering change the underlying AI model itself?', '["Yes, it retrains the model each time", "No — it changes what you''re asking and how, not the model", "It deletes and rebuilds the model", "It only works by changing the model''s parameters directly"]', 1, 'Prompt engineering works entirely through better inputs, not model changes.'),
    (6, 'In the taxi driver analogy, what does "take me somewhere nice" represent?', '["A highly specific, well-engineered prompt", "A vague prompt likely to produce an unpredictable result", "The model''s system prompt", "A few-shot example"]', 1, 'Vague instructions mirror a vague prompt, producing worse results.'),
    (7, 'Do professional prompt engineers usually get the perfect prompt on the first try?', '["Yes, always, on the very first attempt", "Rarely — they typically test, evaluate, and refine as an iterative process", "Prompt engineering doesn''t involve any testing", "Only beginners need to iterate; experts never do"]', 1, 'Iteration and refinement are a normal part of real prompt engineering work.')
) AS q(order_index, question, options, correct_index, explanation)
WHERE lessons.slug = 'prompt-engineering-101';
