-- Adds 1 new Module 6 lesson filling the gap flagged in review against
-- Anthropic's "Building Effective Agents" and DeepLearning.AI's Agentic AI
-- course: this module went straight into full agent territory (Chatbot vs.
-- Agent, then tools/ReAct/planning/memory/autonomy/reflection/multi-agent)
-- without ever establishing the single most-cited piece of practical advice
-- in the field -- that a fixed, code-defined WORKFLOW (prompt chaining,
-- routing) is usually the right first move, and a full autonomous agent loop
-- is something you reach for only once a workflow genuinely can't handle a
-- task's unpredictability. Placed FIRST in the module, right before
-- "Chatbot vs. Agent" (slug 'chatbot-vs-agent'), so the whole rest of the
-- module is read through this framing rather than after it.
--
-- Anchored to a stable slug (not a title string or hardcoded order_index),
-- safe regardless of what else has already run.
--
-- FIRST ATTEMPT AT THIS MIGRATION FAILED with "duplicate key value violates
-- unique constraint lessons_order_index_key" on order_index=44. Root cause:
-- it used the same negate-then-restore renumbering trick as this session's
-- other lesson insertions, but then re-queried
-- "SELECT order_index FROM lessons WHERE slug = 'chatbot-vs-agent'" for the
-- new row's position AFTER the renumbering had already shifted that exact
-- row -- so the insert collided with the anchor's own new position. (Every
-- prior insertion this session placed the new lesson AFTER its anchor via
-- "anchor's order_index + 1", which never touched the anchor itself in the
-- shift and so never hit this; this is the first one placing a lesson
-- BEFORE its anchor, which needed the anchor's ORIGINAL position captured
-- once, before any shift.) Confirmed via diagnostic SELECT that the failed
-- attempt rolled back cleanly with nothing partially applied (chatbot-vs-
-- agent still at its original order_index, no gap) -- so this is a clean
-- retry, not a partial-application recovery.
--
-- Fixed by capturing the anchor's order_index into a variable ONCE, before
-- any renumbering, in a DO block -- immune to the row it's reading ever
-- changing under it.

DO $$
DECLARE
  v_pos INTEGER;
  v_lesson_id UUID;
BEGIN
  SELECT order_index INTO v_pos FROM public.lessons WHERE slug = 'chatbot-vs-agent';

  UPDATE public.lessons SET order_index = -order_index WHERE order_index >= v_pos;
  UPDATE public.lessons SET order_index = -order_index + 1 WHERE order_index < 0;

  INSERT INTO public.lessons (module_number, order_index, title, slug, summary, coin_cost, is_published)
  VALUES (
    6,
    v_pos,
    'Workflows vs. Agents: Start Simple',
    'workflows-vs-agents',
    'The most-repeated advice in real agent design: most tasks don''t need a full autonomous agent -- a fixed workflow is usually the better first move.',
    10,
    true
  )
  RETURNING id INTO v_lesson_id;

  INSERT INTO public.lesson_content (lesson_id, content)
  VALUES (v_lesson_id, '{"hook":"Before you build an agent that decides everything for itself, ask one question: does this task actually need that? Most of the time, the honest answer is no.","explanation":"Not every multi-step AI task needs a full autonomous agent. A WORKFLOW is a fixed sequence of steps that YOUR code defines and controls -- the LLM fills in each step, but your code decides what happens next, in what order, every time. An AGENT is different: the model itself decides, dynamically, what to do next based on what it observes, which is more flexible but also less predictable and harder to debug when something goes wrong. Two of the most common workflow patterns: PROMPT CHAINING -- a fixed sequence of steps, each one feeding the next (extract information, then draft a response, then check it). ROUTING -- your code inspects the input and sends it down one of several FIXED paths, each handled differently, without the model ever choosing its own path. The practical advice real teams follow: start with the simplest workflow that could possibly work. Only reach for a full agent loop -- letting the model choose its own tools and steps -- once you have a concrete task where the NEXT step genuinely can''t be known in advance. Every lesson after this one covers real agent techniques you will need for that second case -- but most of what you build won''t need them.","analogy":"A workflow is a recipe -- fixed steps, followed in the same order every time, and you always know what happens next. An agent is a chef improvising -- deciding what to do next based on how the dish tastes as they go. A recipe is more predictable and easier to get right; improvising is more powerful, but only worth it when you genuinely can''t plan the steps ahead of time.","fun_fact":"This exact distinction -- workflows with fixed, code-defined steps versus agents that dynamically direct their own process -- comes directly from how leading AI labs describe their own production systems: most of what actually ships is a workflow, with true autonomous agents reserved for the harder, genuinely unpredictable slice of tasks.","try_it":"Think of a task you might want an AI to help with. Could you write it as a FIXED sequence of steps (a workflow), or does it genuinely need to decide its own next step as it goes (an agent)? Explain which one, and why.","code":"# WORKFLOW PATTERN 1: PROMPT CHAINING -- fixed steps, always run in the same order\ndef extract_key_facts(email_text):\n    return \"Order #4521, wants a refund\"  # stands in for what an LLM extraction step would return\n\ndef draft_response(facts):\n    return f\"Drafted reply based on: {facts}\"\n\ndef chaining_workflow(email_text):\n    facts = extract_key_facts(email_text)\n    reply = draft_response(facts)\n    return reply\n\nprint(chaining_workflow(\"Hi, I''d like a refund for order 4521...\"))\n\n# WORKFLOW PATTERN 2: ROUTING -- your code decides which FIXED path to take\ndef classify_request(email_text):\n    if \"refund\" in email_text.lower():\n        return \"refund\"\n    elif \"shipping\" in email_text.lower():\n        return \"shipping\"\n    return \"general\"\n\ndef routing_workflow(email_text):\n    category = classify_request(email_text)\n    handlers = {\n        \"refund\": lambda t: \"Routed to: Refund Handler\",\n        \"shipping\": lambda t: \"Routed to: Shipping Handler\",\n        \"general\": lambda t: \"Routed to: General Support\",\n    }\n    return handlers[category](email_text)\n\nprint(routing_workflow(\"Where is my shipping update?\"))\n# Neither of these ever lets the model choose its own steps -- YOUR code\n# decides the path every time. That is exactly what makes a workflow\n# predictable, debuggable, and usually cheaper than a full agent loop.","visual":{"caption":"The real first question: does this task need an agent at all?","steps":[{"emoji":"📋","label":"Workflow: Fixed Steps","caption":"Your code decides what happens next, every time -- predictable and easy to debug."},{"emoji":"🔀","label":"Routing","caption":"Inspect the input, send it down one of several FIXED paths."},{"emoji":"⛓️","label":"Prompt Chaining","caption":"Step 1''s output feeds directly into step 2, in a fixed order."},{"emoji":"🤖","label":"Agent: Dynamic Steps","caption":"The MODEL decides what to do next -- more flexible, harder to predict."},{"emoji":"✅","label":"Start Simple","caption":"Reach for a full agent only once a workflow genuinely cannot handle it."}]},"practice":{"prompt":"A task always follows the exact same three steps in the exact same order, no matter what the input is. Should this be built as a workflow or a full autonomous agent?","options":["A workflow -- the steps are fixed and predictable, so there is no need for the model to decide its own path","A full autonomous agent, since agents are always the more powerful choice","Neither approach can handle a three-step task","It must be an agent, because workflows can only have one step"],"correct_index":0,"feedback":"When the steps are fixed and known in advance, a workflow is simpler, more predictable, and easier to debug than a full agent loop -- exactly the case where you should NOT reach for an agent."}}'::jsonb);

  INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
  VALUES
    (v_lesson_id, 1, 'What is the key difference between a workflow and an agent?', '["In a workflow, your code decides what happens next; in an agent, the model itself decides dynamically","Workflows and agents are just two different names for the exact same thing","Agents can only ever complete one step total, unlike workflows","Workflows always require more code than agents"]'::jsonb, 0, 'A workflow is fixed and code-controlled at every step; an agent lets the model choose its own next step based on what it observes.'),
    (v_lesson_id, 2, 'What is "routing" as a workflow pattern?', '["Inspecting the input and sending it down one of several fixed, predefined paths","Letting the model invent a brand new path for every single request","A synonym for prompt chaining with no real difference","A technique that only works for image inputs"]'::jsonb, 0, 'Routing still uses fixed, predefined paths -- your code decides which one applies, the model never invents a new path.'),
    (v_lesson_id, 3, 'In the code example, why did "Where is my shipping update?" get routed to the Shipping Handler?', '["classify_request found the word \"shipping\" in the lowercased input, matching the shipping branch","The routing was chosen at random","Every request always goes to the Shipping Handler regardless of content","The email was sent directly to a human"]'::jsonb, 0, 'classify_request checks for keywords like "shipping" and "refund" in the lowercased text to pick a fixed path.'),
    (v_lesson_id, 4, 'What is prompt chaining?', '["A fixed sequence of steps where one step''s output feeds directly into the next, in the same order every time","A technique for making a single prompt run faster","A synonym for an agent choosing its own tools","A pattern that requires no code at all"]'::jsonb, 0, 'Prompt chaining is a workflow pattern -- extract, then draft, then whatever comes next -- always in the same fixed order.'),
    (v_lesson_id, 5, 'What is the recommended practical approach when starting a new AI-powered task?', '["Start with the simplest workflow that could work, and only reach for a full agent once a workflow genuinely cannot handle it","Always start with the most powerful, fully autonomous agent possible","Never use workflows under any circumstances","Flip a coin to decide between a workflow and an agent"]'::jsonb, 0, 'This is the most-repeated practical advice from real agent design -- simplicity and predictability first, autonomy only when genuinely needed.'),
    (v_lesson_id, 6, 'Why are workflows generally easier to debug than full agent loops?', '["Every step and path is fixed and known in advance, so there is no unpredictable model-chosen path to trace through","Workflows never contain any bugs at all","Agents cannot be debugged under any circumstances","Debugging difficulty has nothing to do with how predictable the steps are"]'::jsonb, 0, 'Because your code defines every step and path ahead of time, you always know exactly what should happen next -- unlike an agent, which chooses its own path at runtime.'),
    (v_lesson_id, 7, 'According to this lesson, does every multi-step AI task need a full autonomous agent?', '["No -- most tasks are better served by a workflow, with a full agent reserved for genuinely unpredictable cases","Yes, every multi-step task requires a full autonomous agent","Only tasks involving more than 10 steps ever need an agent","Workflows can only ever have exactly one step, so multi-step tasks always need an agent"]'::jsonb, 0, 'The lesson''s core point: start simple, and reach for a full agent only when a fixed workflow genuinely cannot handle the task''s unpredictability.');
END $$;

NOTIFY pgrst, 'reload schema';
