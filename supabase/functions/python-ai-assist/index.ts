import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, model, action, systemPrompt, messages: conversationHistory, knowledgeBase, qaData, projectType, projectName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let sysPrompt = "";
    let userPrompt = "";
    let extraMessages: { role: string; content: string }[] = [];

    // Build knowledge context string if available
    let knowledgeContext = "";
    if (knowledgeBase && knowledgeBase.trim()) {
      knowledgeContext += `\n\nKNOWLEDGE BASE (reference this when answering):\n${knowledgeBase}\n`;
    }
    if (qaData && Array.isArray(qaData) && qaData.length > 0) {
      knowledgeContext += `\n\nQ&A PAIRS (use these for specific questions):\n`;
      qaData.forEach((pair: { q: string; a: string }, i: number) => {
        knowledgeContext += `Q${i + 1}: ${pair.q}\nA${i + 1}: ${pair.a}\n`;
      });
    }

    if (action === "run") {
      sysPrompt = `You are a Python code execution simulator for a student hackathon platform called FORGE. The student has written Python code and clicked "Run Tests". 

CRITICAL RULES:
1. Read their code carefully
2. Simulate what would happen if this code ran
3. Return realistic terminal-style output showing:
   - Import messages (e.g. "✓ Loaded langchain", "✓ Loaded streamlit")
   - Print statement outputs
   - A configuration summary showing what the AI does
   - A final status line: "✅ All systems ready — your AI is working!"

IMPORTANT:
- NEVER show API key errors or missing key warnings. The platform handles all API keys automatically.
- NEVER mention OPENAI_API_KEY, missing keys, or authentication errors.
- Always assume all libraries are installed and all API keys are configured.
- Show a SUCCESSFUL run that demonstrates the student's code working.
- If the code has actual Python syntax errors, show those with a helpful hint.
- For chatbot projects, simulate a sample conversation exchange.
- For agent projects, simulate the agent using its tools.

Format your response as terminal output (no markdown, just plain text like a real terminal). Use emojis where the code uses them.

Keep output under 300 words.`;
      userPrompt = `Simulate running this Python code and show SUCCESSFUL terminal output (all API keys are pre-configured, don't show any key errors):\n\n${code}`;
    } else if (action === "test-agent") {
      const agentPrompt = systemPrompt || "You are a helpful AI assistant.";
      sysPrompt = `You are simulating an AI project that a student built. Act according to this system prompt the student configured:

"${agentPrompt}"
${knowledgeContext}

Respond naturally as if you are the AI the student built. Keep responses concise (under 150 words). Be helpful and conversational. The student is testing their project in a live preview.`;
      
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        extraMessages = conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      }
      userPrompt = code;
    } else if (action === "review") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20) in a hackathon. You are NOT building the project for them — you are building WITH them.

RULES:
- NEVER write complete code solutions. Instead, explain concepts and show small snippets (2-5 lines max).
- Always explain WHY something works, not just WHAT to do.
- Ask the student "what do you think should happen next?" or "can you try changing X?"
- Point out what they did WELL before suggesting improvements.
- Use simple language and analogies a secondary school student would understand.
- When showing code, always explain every line.
- End with a question or challenge to keep them engaged.

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Their system prompt is: "${systemPrompt || 'not set'}"

Keep responses under 200 words. Use markdown formatting.`;
      userPrompt = `Review this Python code and guide the student (pair-programmer style — explain, don't build for them):\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20). Explain code in a way that helps them UNDERSTAND, not just copy.

RULES:
- Break the code into sections and explain each one
- Use analogies: "This is like a recipe — the function is the instructions, the parameters are the ingredients"
- After explaining, ask: "Does this make sense? Try changing [specific thing] and see what happens!"
- NEVER just rewrite their code
- Focus on building their understanding

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Keep it under 200 words.`;
      userPrompt = `Explain this Python code to the student (help them understand, don't just describe):\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20). Suggest next steps that the STUDENT should try themselves.

RULES:
- Give 2-3 suggestions as CHALLENGES, not solutions
- Frame as: "Try adding X — here's a hint to get started: [small snippet]"  
- Show just enough code to point them in the right direction (1-3 lines max)
- Ask them what THEY want their AI to do better
- Encourage experimentation: "What happens if you change the temperature to 0.9?"

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Their system prompt is: "${systemPrompt || 'not set'}"
Keep it under 200 words.`;
      userPrompt = `Suggest improvements the student can TRY (challenges, not solutions):\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "mentor-chat") {
      // Interactive pair-programmer chat — the mentor can see their code and guides them
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20) in a live hackathon. You can see their code and you're building WITH them.

CRITICAL RULES:
- You are NOT building the project for them. You are GUIDING them.
- When they ask "how do I do X?", give a HINT and a small snippet (2-5 lines), then say "try this and tell me what happens"
- When they share an error, explain what caused it and ask them to try fixing it before you show the fix
- Always reference THEIR actual code — say "on line X where you have Y..."
- Be encouraging: "Great question!", "You're on the right track!"
- Keep responses concise (under 150 words)
- End responses with a guiding question or next step for them to try

STUDENT'S PROJECT:
- Name: ${projectName || 'AI Project'}
- Type: ${projectType || 'chatbot'}
- System Prompt: "${systemPrompt || 'not set'}"

STUDENT'S CURRENT CODE:
\`\`\`python
${code}
\`\`\``;
      
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        extraMessages = conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      }
      // The actual user question comes as the last message
      userPrompt = conversationHistory && conversationHistory.length > 0 
        ? conversationHistory[conversationHistory.length - 1].content 
        : code;
    } else if (action === "generate") {
      sysPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Generate clean, well-commented Python code based on the description. Use the specified AI model/library if mentioned. Return ONLY the Python code in a code block.`;
      userPrompt = `Generate Python code for: ${code}\n\nUse model/library: ${model || "any appropriate one"}`;
    } else if (action === "idea-to-code") {
      sysPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). The student will describe an AI project idea. Generate a complete, working Python starter project with:
- Clear comments explaining each section
- All necessary imports
- A main function or script that runs
- Sample data or placeholders
- Print statements showing output
Return the code inside a \`\`\`python code block. Keep it under 60 lines. Use simple, beginner-friendly code.`;
      userPrompt = `Create a Python AI project for this idea: ${code}`;
    } else if (action === "visual-builder") {
      sysPrompt = `You are a Python AI coding tutor. Generate training code for an AI model based on the data type and model type described. Include:
- Data loading
- Model setup
- Training loop
- Accuracy evaluation
- Clear comments
Return code in a \`\`\`python block.`;
      userPrompt = `Generate Python training code for: ${code}\nModel type: ${model || "auto-detect"}`;
    } else {
      sysPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Help with any Python AI coding question. Keep responses concise and encouraging.`;
      userPrompt = code;
    }

    const aiMessages = [
      { role: "system", content: sysPrompt },
      ...extraMessages,
      { role: "user", content: userPrompt },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("python-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
