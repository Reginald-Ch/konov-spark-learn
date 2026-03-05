import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, model, action, systemPrompt, messages: conversationHistory, knowledgeBase, qaData, projectType, projectName, botConfig } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let sysPrompt = "";
    let userPrompt = "";
    let extraMessages: { role: string; content: string }[] = [];

    // Build knowledge context string if available
    let knowledgeContext = "";
    if (knowledgeBase && knowledgeBase.trim()) {
      knowledgeContext += `\n\nKNOWLEDGE BASE (you MUST reference this information when answering related questions — treat it as your primary source of truth):\n${knowledgeBase}\n`;
    }
    if (qaData && Array.isArray(qaData) && qaData.length > 0) {
      knowledgeContext += `\n\nEXACT Q&A PAIRS — CRITICAL RULE: When a user asks a question that matches or closely resembles any Q below, you MUST use the corresponding A as your answer. Do NOT ignore these or make up a different answer. You may rephrase slightly but the core answer MUST match:\n`;
      qaData.forEach((pair: { q: string; a: string }, i: number) => {
        knowledgeContext += `Q${i + 1}: "${pair.q}" → A${i + 1}: "${pair.a}"\n`;
      });
    }

    // Build bot config context for test-agent action
    let botConfigContext = "";
    if (botConfig) {
      const cfg = botConfig;
      
      if (cfg.botName) botConfigContext += `\nYour name is "${cfg.botName}".`;
      if (cfg.creatorName) botConfigContext += ` You were created by ${cfg.creatorName}.`;
      if (cfg.botEmoji) botConfigContext += ` Your emoji/icon is ${cfg.botEmoji}.`;
      
      // Response style modifiers
      const styleMap: Record<string, string> = {
        "Concise": "\nKeep your answers short — 2-3 sentences max. Be direct and to the point.",
        "Detailed": "\nProvide thorough, well-structured answers with examples and explanations.",
        "Friendly": "\nUse a warm, encouraging tone with emojis. Be supportive and conversational!",
        "Professional": "\nMaintain a formal, professional tone. Use proper structure and terminology.",
        "Balanced": "",
      };
      if (cfg.responseStyle && styleMap[cfg.responseStyle]) {
        botConfigContext += styleMap[cfg.responseStyle];
      }

      // Response length
      const lengthMap: Record<string, string> = {
        "short": "\nLimit responses to 1-2 sentences.",
        "medium": "\nKeep responses to about 1 paragraph (3-5 sentences).",
        "long": "\nProvide detailed responses with multiple paragraphs when appropriate.",
      };
      if (cfg.maxResponseLength && lengthMap[cfg.maxResponseLength]) {
        botConfigContext += lengthMap[cfg.maxResponseLength];
      }

      // Response format (for agents)
      const formatMap: Record<string, string> = {
        "brief": "\nKeep answers brief and scannable.",
        "detailed": "\nProvide comprehensive analysis.",
        "structured": "\nPresent information using bullet points, headers, and clear structure.",
        "conversational": "\nRespond in a natural, conversational way.",
      };
      if (cfg.responseFormat && formatMap[cfg.responseFormat]) {
        botConfigContext += formatMap[cfg.responseFormat];
      }

      // Conversation rules
      if (cfg.conversationRules && cfg.conversationRules.length > 0) {
        botConfigContext += `\n\nSTRICT RULES YOU MUST FOLLOW:\n`;
        cfg.conversationRules.forEach((rule: string, i: number) => {
          botConfigContext += `${i + 1}. ${rule}\n`;
        });
      }

      // Blocked topics
      if (cfg.blockedTopics && cfg.blockedTopics.length > 0) {
        botConfigContext += `\n\nTOPICS YOU MUST REFUSE TO DISCUSS (politely decline):\n`;
        cfg.blockedTopics.forEach((topic: string) => {
          botConfigContext += `- ${topic}\n`;
        });
      }

      // Catchphrases
      if (cfg.catchphrases && cfg.catchphrases.length > 0) {
        botConfigContext += `\n\nNaturally incorporate these catchphrases occasionally: ${cfg.catchphrases.map((c: string) => `"${c}"`).join(', ')}`;
      }

      // Follow-up questions
      if (cfg.followUpQuestions) {
        botConfigContext += `\n\nEnd your responses with a relevant follow-up question to keep the conversation going.`;
      }

      // Remember name
      if (cfg.rememberName) {
        botConfigContext += `\n\nIf the user shares their name, remember it and use it naturally in conversation.`;
      }

      // Agent tool instructions
      if (cfg.showReasoning) {
        botConfigContext += `\n\nShow your reasoning process step by step when answering complex questions.`;
      }
      if (cfg.toolInstructions && Object.keys(cfg.toolInstructions).length > 0) {
        botConfigContext += `\n\nTOOL USAGE GUIDELINES:\n`;
        for (const [tool, instruction] of Object.entries(cfg.toolInstructions)) {
          botConfigContext += `- ${tool}: ${instruction}\n`;
        }
      }
    }

    if (action === "run") {
      sysPrompt = `You are a Python code execution simulator for FORGE, a student AI hackathon platform. The student has written Python code and clicked "Run Tests". 

CRITICAL RULES:
1. Read their code carefully — it's a configuration file that drives an AI chatbot/agent
2. Simulate what would happen when this configuration is loaded
3. Return realistic terminal-style output showing:
   - Loading each configured variable (bot name, temperature, style, etc.)
   - A configuration summary
   - A simulated 2-turn conversation demonstrating the bot working WITH its configured personality
   - Show easter eggs being registered if any
   - Show knowledge base being loaded if any
   - A final status line: "✅ All systems ready — your AI is configured and working!"

IMPORTANT:
- NEVER show API key errors or missing key warnings. FORGE handles ALL API keys automatically.
- Always show a SUCCESSFUL run that demonstrates the student's configuration working.
- If the code has actual Python syntax errors, show those with a helpful hint.
- Show which stages appear complete vs incomplete.

Format as terminal output (no markdown, just plain text). Use emojis.
Keep output under 300 words.`;
      userPrompt = `Simulate loading this FORGE configuration file (all infrastructure is pre-configured, show SUCCESSFUL output):\n\n${code}`;
    } else if (action === "test-agent") {
      const agentPrompt = systemPrompt || "You are a helpful AI assistant.";
      sysPrompt = `You are simulating an AI project that a student built. Act according to this system prompt the student configured:

"${agentPrompt}"
${botConfigContext}
${knowledgeContext}

IMPORTANT BEHAVIOUR RULES:
- You ARE the AI the student built. Stay in character at all times.
- If the student configured a bot name, introduce yourself by that name.
- If the student added a Knowledge Base or Q&A pairs above, prioritize that information when answering relevant questions.
- For Q&A pairs, if the user's question closely matches a Q, use the corresponding A as the basis of your response.
- Follow ALL conversation rules strictly.
- Refuse to discuss blocked topics politely.
- Use the configured response style and length.
- Be helpful, conversational, and engaging.
- If asked something outside your knowledge/prompt scope, politely redirect to what you CAN help with.
- Use markdown formatting (bold, lists, code blocks) when it improves readability.`;
      
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
- Check which STAGES are complete and suggest working on incomplete ones.

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Their system prompt is: "${systemPrompt || 'not set'}"

Keep responses under 200 words. Use markdown formatting.`;
      userPrompt = `Review this FORGE configuration file and guide the student (pair-programmer style — explain, don't build for them). Check which stages are complete:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20). Explain code in a way that helps them UNDERSTAND, not just copy.

RULES:
- Break the configuration into sections and explain what each variable does
- Use analogies: "TEMPERATURE is like a creativity dial — turn it up for more random/creative answers"
- After explaining, ask: "Try changing [specific variable] and test in Live Preview to see the difference!"
- Focus on building their understanding of HOW each variable affects the chatbot
- Reference the stage system

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Keep it under 200 words.`;
      userPrompt = `Explain this FORGE configuration to the student (help them understand how each variable affects their chatbot):\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20). Suggest next steps that the STUDENT should try themselves.

RULES:
- Look at which STAGES are incomplete and suggest working on those
- Give 2-3 suggestions as CHALLENGES, not solutions
- Frame as: "Try adding X — here's a hint: [small example]"  
- Show just enough to point them in the right direction (1-3 lines max)
- Ask them what THEY want their AI to do better
- Encourage experimentation: "What happens if you change TEMPERATURE to 0.9?"

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Their system prompt is: "${systemPrompt || 'not set'}"
Keep it under 200 words.`;
      userPrompt = `Suggest improvements the student can TRY (challenges, not solutions). Check which stages need work:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "mentor-chat") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20) in a live hackathon. You can see their configuration file and you're building WITH them.

CRITICAL RULES:
- You are NOT building the project for them. You are GUIDING them.
- When they ask "how do I do X?", give a HINT and a small snippet (2-5 lines), then say "try this and test in Live Preview"
- When they share an error, explain what caused it and ask them to try fixing it
- Always reference THEIR actual configuration — say "your BOT_NAME is currently set to X..."
- Be encouraging: "Great question!", "You're on the right track!"
- Keep responses concise (under 150 words)
- End responses with a guiding question or next step for them to try
- Reference the 6-stage system

STUDENT'S PROJECT:
- Name: ${projectName || 'AI Project'}
- Type: ${projectType || 'chatbot'}
- System Prompt: "${systemPrompt || 'not set'}"

STUDENT'S CURRENT CONFIGURATION:
\`\`\`python
${code}
\`\`\``;
      
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        extraMessages = conversationHistory.slice(0, -1).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      }
      userPrompt = conversationHistory && conversationHistory.length > 0 
        ? conversationHistory[conversationHistory.length - 1].content 
        : code;
    } else if (action === "generate") {
      sysPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Generate clean, well-commented Python code based on the description. Use the specified AI model/library if mentioned. Return ONLY the Python code in a code block.`;
      userPrompt = `Generate Python code for: ${code}\n\nUse model/library: ${model || "any appropriate one"}`;
    } else if (action === "idea-to-code") {
      sysPrompt = `You are the FORGE AI project generator. The student will describe an AI project idea. Generate a complete FORGE configuration file following the 6-stage structure (Identity, Personality, Knowledge, Behaviour, Special Features, Advanced).

Include:
- BOT_NAME, BOT_EMOJI, GREETING_MESSAGE, CREATOR_NAME
- A detailed SYSTEM_PROMPT (3+ sentences)
- KNOWLEDGE_BASE with relevant content
- QA_PAIRS with 3+ entries
- TEMPERATURE, RESPONSE_STYLE, MAX_RESPONSE_LENGTH
- CONVERSATION_RULES with 3+ rules
- CONVERSATION_STARTERS with 4+ starters
- EASTER_EGGS with 2+ entries
- CATCHPHRASES with 2+ entries
- All Stage 6 settings

Return the code inside a \`\`\`python code block. Make it creative and fun!`;
      userPrompt = `Create a FORGE AI project configuration for this idea: ${code}`;
    } else if (action === "visual-builder") {
      sysPrompt = `You are the FORGE visual builder. Generate a FORGE configuration file based on the user's description.`;
      userPrompt = `Generate FORGE configuration for: ${code}\nModel type: ${model || "auto-detect"}`;
    } else {
      sysPrompt = `You are a friendly AI coding tutor for teens (ages 12-20). Help with any coding question about the FORGE platform. Keep responses concise and encouraging.`;
      userPrompt = code;
    }

    // Determine temperature from bot config or use default
    const modelTemperature = (action === "test-agent" && botConfig?.temperature !== undefined) 
      ? Math.min(Math.max(botConfig.temperature, 0), 1.5) 
      : undefined;

    const aiMessages = [
      { role: "system", content: sysPrompt },
      ...extraMessages,
      { role: "user", content: userPrompt },
    ];

    const requestBody: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: aiMessages,
      stream: true,
    };
    if (modelTemperature !== undefined) {
      requestBody.temperature = modelTemperature;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
