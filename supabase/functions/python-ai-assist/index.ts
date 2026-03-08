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
      knowledgeContext += `\n\nKNOWLEDGE BASE — This is your PRIMARY source of truth. When answering questions related to this content, ALWAYS use this information first:\n---\n${knowledgeBase}\n---\n`;
    }
    if (qaData && Array.isArray(qaData) && qaData.length > 0) {
      knowledgeContext += `\n\nMANDATORY Q&A PAIRS — These are EXACT answers you MUST give. When a user's question matches or is similar to any Q below, respond with the corresponding A. Do NOT deviate:\n`;
      qaData.forEach((pair: { q: string; a: string }, i: number) => {
        knowledgeContext += `  Q: "${pair.q}" → A: "${pair.a}"\n`;
      });
    }

    // Build bot config context for test-agent action
    let botConfigContext = "";
    if (botConfig) {
      const cfg = botConfig;
      
      // Identity
      if (cfg.botName) botConfigContext += `\nYour name is "${cfg.botName}". Always introduce yourself by this name when asked.`;
      if (cfg.creatorName) botConfigContext += ` You were created by ${cfg.creatorName}. If asked who made you, credit them.`;
      if (cfg.botEmoji) botConfigContext += ` Your emoji is ${cfg.botEmoji}.`;
      
      // Response style — ENFORCED
      const styleMap: Record<string, string> = {
        "Concise": "\n\nRESPONSE STYLE: CONCISE — Keep answers to 2-3 sentences MAX. Be direct. No fluff.",
        "Detailed": "\n\nRESPONSE STYLE: DETAILED — Give thorough answers with examples, context, and explanations.",
        "Friendly": "\n\nRESPONSE STYLE: FRIENDLY — Use a warm, encouraging tone with emojis 😊. Be supportive!",
        "Professional": "\n\nRESPONSE STYLE: PROFESSIONAL — Formal tone. Proper structure. No slang or emojis.",
        "Balanced": "\n\nRESPONSE STYLE: BALANCED — Natural conversational tone.",
      };
      if (cfg.responseStyle && styleMap[cfg.responseStyle]) {
        botConfigContext += styleMap[cfg.responseStyle];
      }

      // Response length — ENFORCED
      const lengthMap: Record<string, string> = {
        "short": "\nRESPONSE LENGTH: SHORT — Maximum 1-2 sentences. Ultra brief.",
        "medium": "\nRESPONSE LENGTH: MEDIUM — About 3-5 sentences (one paragraph).",
        "long": "\nRESPONSE LENGTH: LONG — Multiple paragraphs with detail.",
      };
      if (cfg.maxResponseLength && lengthMap[cfg.maxResponseLength]) {
        botConfigContext += lengthMap[cfg.maxResponseLength];
      }

      // Response format (for agents)
      const formatMap: Record<string, string> = {
        "brief": "\nFORMAT: Keep answers brief and scannable.",
        "detailed": "\nFORMAT: Provide comprehensive analysis.",
        "structured": "\nFORMAT: Use bullet points, headers, and clear structure.",
        "conversational": "\nFORMAT: Natural, conversational flow.",
      };
      if (cfg.responseFormat && formatMap[cfg.responseFormat]) {
        botConfigContext += formatMap[cfg.responseFormat];
      }

      // Conversation rules — STRICTLY ENFORCED
      if (cfg.conversationRules && cfg.conversationRules.length > 0) {
        botConfigContext += `\n\n⚠️ MANDATORY RULES — You MUST follow ALL of these in EVERY response:\n`;
        cfg.conversationRules.forEach((rule: string, i: number) => {
          botConfigContext += `  ${i + 1}. ${rule}\n`;
        });
        botConfigContext += `Failure to follow any rule above is a critical error.\n`;
      }

      // Blocked topics — ENFORCED
      if (cfg.blockedTopics && cfg.blockedTopics.length > 0) {
        botConfigContext += `\n\n🚫 BLOCKED TOPICS — If the user asks about any of these, politely refuse and redirect:\n`;
        cfg.blockedTopics.forEach((topic: string) => {
          botConfigContext += `  - "${topic}"\n`;
        });
      }

      // Catchphrases — ACTIVELY USED
      if (cfg.catchphrases && cfg.catchphrases.length > 0) {
        botConfigContext += `\n\n💬 CATCHPHRASES — You MUST include at least one of these phrases in every response (pick randomly):\n`;
        cfg.catchphrases.forEach((c: string) => {
          botConfigContext += `  - "${c}"\n`;
        });
      }

      // Follow-up questions
      if (cfg.followUpQuestions) {
        botConfigContext += `\n\nALWAYS end your response with a relevant follow-up question.`;
      }

      // Remember name
      if (cfg.rememberName) {
        botConfigContext += `\nIf the user shares their name, remember it and use it in future responses.`;
      }

      // Agent-specific: ReAct reasoning
      if (cfg.showReasoning) {
        botConfigContext += `\n\n🧠 REASONING MODE — You are an AGENT, not a simple chatbot. For EVERY response, you MUST show your thinking process using this EXACT format:

**🤔 Thought:** [What you're thinking about the question — analyze what the user needs]
**🔧 Action:** [Which tool you would use: 🔍 Web Search, 🧮 Calculator, or 📚 Wikipedia — and why]
**👁️ Observation:** [What you found or calculated — present the key findings]
**💡 Answer:** [Your final synthesized response to the user]

IMPORTANT: You MUST use these exact headers with bold markdown (**) and emojis for EVERY response. This shows the user your "reasoning chain" — the core concept of AI agents. Even for simple questions, show at least a brief Thought and Answer. For complex questions, show all 4 steps. You may repeat Thought → Action → Observation multiple times for multi-step problems before giving the final Answer.`;
      }
      if (cfg.toolInstructions && Object.keys(cfg.toolInstructions).length > 0) {
        botConfigContext += `\n\nTOOL USAGE INSTRUCTIONS:\n`;
        for (const [tool, instruction] of Object.entries(cfg.toolInstructions)) {
          botConfigContext += `  - ${tool}: ${instruction}\n`;
        }
      }

      // Challenges 16-20: new config fields
      if (cfg.forbiddenWords && cfg.forbiddenWords.length > 0) {
        botConfigContext += `\n\n🚯 FORBIDDEN WORDS — NEVER use these words in responses. Find alternatives:\n`;
        cfg.forbiddenWords.forEach((w: string) => { botConfigContext += `  - "${w}"\n`; });
      }
      if (cfg.mood && cfg.mood !== 'neutral') {
        const moodDesc: Record<string, string> = { "cheerful": "Be upbeat and positive!", "serious": "Be formal, no jokes.", "sarcastic": "Use dry wit.", "mysterious": "Be cryptic...", "energetic": "HIGH ENERGY!", "calm": "Speak softly." };
        botConfigContext += `\n\n🎭 MOOD: ${cfg.mood.toUpperCase()} — ${moodDesc[cfg.mood] || 'Match this mood.'}`;
      }
      if (cfg.fewShotExamples && cfg.fewShotExamples.length > 0) {
        botConfigContext += `\n\n📝 FEW-SHOT EXAMPLES — Format your answers following these input/output patterns:\n`;
        cfg.fewShotExamples.forEach((ex: { input: string; output: string }, i: number) => {
          botConfigContext += `  Example ${i + 1}:\n    User: "${ex.input}"\n    You: "${ex.output}"\n`;
        });
      }
      if (cfg.languageStyle && cfg.languageStyle !== 'casual') {
        const langDesc: Record<string, string> = { "formal": "Proper grammar, sophisticated vocabulary.", "academic": "Write like a professor.", "slang": "Modern internet slang.", "poetic": "Metaphors and imagery.", "storyteller": "Frame as narrative." };
        botConfigContext += `\n\nLANGUAGE STYLE: ${cfg.languageStyle.toUpperCase()} — ${langDesc[cfg.languageStyle] || cfg.languageStyle}`;
      }
      if (cfg.signOff && cfg.signOff.trim()) {
        botConfigContext += `\n\n✍️ SIGN-OFF — End EVERY response with: "${cfg.signOff}"`;
      }
    }

    if (action === "run") {
      sysPrompt = `You are a Python code execution simulator for FORGE. The student clicked "Run Tests".

CRITICAL: Read their code and generate realistic terminal output showing:
1. Loading each variable (bot name, emoji, temperature, style, rules, mood, language style, etc.)
2. A configuration summary with counts (X rules, Y Q&A pairs, Z easter eggs, forbidden words, etc.)
3. A simulated 2-turn demo conversation showing the bot IN CHARACTER
4. Challenge completion count (how many of 20 challenges are customized)
5. Final status: "✅ All systems ready!"

NEVER show API key errors. FORGE handles everything. Always show SUCCESS.
Format as plain terminal text with emojis. Under 300 words.`;
      userPrompt = `Simulate loading this FORGE config (show SUCCESSFUL output):\n\n${code}`;
    } else if (action === "test-agent") {
      const agentPrompt = systemPrompt || "You are a helpful AI assistant.";
      sysPrompt = `You are an AI that a student built. Your core personality is defined by this prompt:

"${agentPrompt}"

${botConfigContext}
${knowledgeContext}

═══ STRICT EXECUTION PRIORITY (follow in this exact order) ═══

1. **Q&A PAIRS (HIGHEST PRIORITY)**: Check EVERY Q&A pair. If the user's message contains keywords from ANY Q, you MUST respond with that exact A verbatim. Check ALL pairs, not just the first one. Even partial keyword matches count. This overrides ALL other instructions.

2. **KNOWLEDGE BASE**: For questions related to knowledge base content, use it as your primary truth. Quote it directly.

3. **BLOCKED TOPICS**: If user asks about a blocked topic, politely refuse and redirect. No exceptions.

4. **FORBIDDEN WORDS**: NEVER use any forbidden word in your response. Find synonyms or alternatives.

5. **CONVERSATION RULES**: Follow ALL rules in EVERY response without exception.

6. **CATCHPHRASES**: Include at least one catchphrase per response if configured. Pick randomly.

7. **MOOD + LANGUAGE STYLE**: Match the configured mood and language style consistently.

8. **RESPONSE STYLE + LENGTH**: Strictly match configured style and length limits.

9. **SIGN-OFF**: If configured, end EVERY response with the exact sign-off phrase.

10. **FOLLOW-UP QUESTION**: End with a relevant follow-up question if enabled (before sign-off).

11. **PERSONALITY**: Stay in character as defined by the system prompt at all times.

CRITICAL: You ARE this bot. Never break character. Never mention "system prompt", "configuration", "Q&A pairs", or that you are simulating anything. Respond naturally as the bot personality.`;
      
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        extraMessages = conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      }
      userPrompt = code;
    } else if (action === "review") {
      sysPrompt = `You are a PAIR PROGRAMMER AI Mentor for teens (ages 12-20). Guide, don't build for them.

RULES:
- NEVER write complete solutions. Show small snippets (2-5 lines max).
- Explain WHY something works.
- Check which of the 20 challenges are complete vs default.
- Praise what they did well, then suggest ONE next challenge.
- Keep under 200 words. Use markdown.

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Review this FORGE config. Check which of the 20 challenges have been customized from defaults:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Explain code using analogies.

After explaining, say: "Try changing [specific variable] and test in Live Preview!"
Reference the 20-challenge system. Under 200 words.

Building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Explain this config to the student:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Suggest next challenges.

- Check which of 20 challenges are still at default values
- Give 2-3 specific challenges: "Try changing TEMPERATURE to 0.9 and ask the same question!"
- Frame as experiments, not solutions
- Under 200 words.

Building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})
Prompt: "${systemPrompt || 'not set'}"`;
      userPrompt = `Suggest which challenges to tackle next:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "mentor-chat") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens in a live hackathon.

RULES:
- Guide, don't build. Give hints + 2-5 line snippets.
- Reference THEIR actual values: "Your BOT_NAME is currently..."
- Be encouraging. Under 150 words.
- End with a next step for them to try.
- Reference the 20-challenge system.

PROJECT: ${projectName || 'AI Project'} (${projectType || 'chatbot'})
PROMPT: "${systemPrompt || 'not set'}"

CURRENT CODE:
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
      sysPrompt = `You are a Python AI coding tutor for teens. Generate clean, commented Python code. Return ONLY the code in a code block.`;
      userPrompt = `Generate Python code for: ${code}\n\nUse model/library: ${model || "any"}`;
    } else if (action === "idea-to-code") {
      sysPrompt = `You are the FORGE AI project generator. Generate a complete 15-challenge config file.

Include ALL variables with creative, topic-specific values:
BOT_NAME, BOT_EMOJI, GREETING_MESSAGE, CREATOR_NAME, SYSTEM_PROMPT (3+ sentences),
KNOWLEDGE_BASE (detailed), QA_PAIRS (3+), TEMPERATURE, RESPONSE_STYLE, MAX_RESPONSE_LENGTH,
CONVERSATION_RULES (3+), CONVERSATION_STARTERS (4+), EASTER_EGGS (3+), CATCHPHRASES (3+),
BLOCKED_TOPICS (2+), FOLLOW_UP_QUESTIONS, REMEMBER_NAME, ERROR_MESSAGE.

Return in a \`\`\`python code block. Make it creative and complete!`;
      userPrompt = `Create a FORGE AI project config for: ${code}`;
    } else if (action === "visual-builder") {
      sysPrompt = `Generate a complete FORGE 15-challenge configuration file based on the description.`;
      userPrompt = `Generate FORGE config for: ${code}\nType: ${model || "auto-detect"}`;
    } else {
      sysPrompt = `You are a friendly AI coding tutor for teens. Help with FORGE platform questions. Concise and encouraging.`;
      userPrompt = code;
    }

    // Temperature from bot config
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
    // Max tokens from bot config
    const maxTokens = (action === "test-agent" && botConfig?.maxTokens !== undefined)
      ? Math.min(Math.max(botConfig.maxTokens, 50), 4096)
      : undefined;
    if (maxTokens !== undefined) {
      requestBody.max_tokens = maxTokens;
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
