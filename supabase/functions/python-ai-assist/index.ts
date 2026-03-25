import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Real Tool Implementations ──

async function webSearch(query: string): Promise<string> {
  try {
    // Use DuckDuckGo instant answer API (free, no key needed)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, { headers: { "User-Agent": "FORGE-Agent/1.0" } });
    if (!resp.ok) return `[Search failed: HTTP ${resp.status}]`;
    const data = await resp.json();
    
    const results: string[] = [];
    if (data.Abstract) results.push(`📄 ${data.AbstractSource}: ${data.Abstract}`);
    if (data.Answer) results.push(`💡 Answer: ${data.Answer}`);
    if (data.Definition) results.push(`📖 Definition: ${data.Definition}`);
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      const topics = data.RelatedTopics.slice(0, 5);
      for (const t of topics) {
        if (t.Text) results.push(`• ${t.Text}`);
      }
    }
    
    if (results.length === 0) {
      // Fallback: use Wikipedia search as backup
      return await wikiSearch(query);
    }
    return `🔍 Web Search Results for "${query}":\n${results.join('\n')}`;
  } catch (e) {
    return `[Search error: ${e instanceof Error ? e.message : 'unknown'}]`;
  }
}

async function wikiSearch(query: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
    const resp = await fetch(url, { headers: { "User-Agent": "FORGE-Agent/1.0" } });
    
    if (!resp.ok) {
      // Try Wikipedia search API as fallback
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`;
      const searchResp = await fetch(searchUrl, { headers: { "User-Agent": "FORGE-Agent/1.0" } });
      if (!searchResp.ok) return `[Wikipedia: No results found for "${query}"]`;
      const searchData = await searchResp.json();
      if (searchData[1] && searchData[1].length > 0) {
        const titles = searchData[1].slice(0, 3).join(', ');
        // Fetch the first result's summary
        const firstTitle = searchData[1][0];
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle.replace(/\s+/g, '_'))}`;
        const summaryResp = await fetch(summaryUrl, { headers: { "User-Agent": "FORGE-Agent/1.0" } });
        if (summaryResp.ok) {
          const summaryData = await summaryResp.json();
          return `📚 Wikipedia — ${summaryData.title}:\n${summaryData.extract}\n\nRelated: ${titles}`;
        }
        return `📚 Wikipedia results for "${query}": ${titles}`;
      }
      return `[Wikipedia: No results found for "${query}"]`;
    }
    
    const data = await resp.json();
    return `📚 Wikipedia — ${data.title}:\n${data.extract}`;
  } catch (e) {
    return `[Wikipedia error: ${e instanceof Error ? e.message : 'unknown'}]`;
  }
}

function calculate(expression: string): string {
  try {
    // Safe math evaluation — only allow numbers, operators, parentheses, and math functions
    const sanitized = expression.replace(/[^0-9+\-*/().,%^ sqrt pi e log sin cos tan abs pow min max floor ceil round]/g, '');
    
    // Replace common math notation
    let expr = sanitized
      .replace(/\^/g, '**')
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/pi/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/log\(([^)]+)\)/g, 'Math.log($1)')
      .replace(/sin\(([^)]+)\)/g, 'Math.sin($1)')
      .replace(/cos\(([^)]+)\)/g, 'Math.cos($1)')
      .replace(/tan\(([^)]+)\)/g, 'Math.tan($1)')
      .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)')
      .replace(/pow\(([^,]+),([^)]+)\)/g, 'Math.pow($1,$2)')
      .replace(/min\(([^)]+)\)/g, 'Math.min($1)')
      .replace(/max\(([^)]+)\)/g, 'Math.max($1)')
      .replace(/floor\(([^)]+)\)/g, 'Math.floor($1)')
      .replace(/ceil\(([^)]+)\)/g, 'Math.ceil($1)')
      .replace(/round\(([^)]+)\)/g, 'Math.round($1)');
    
    // Validate: only math-safe characters after substitution
    if (/[a-zA-Z]/.test(expr.replace(/Math\.\w+/g, ''))) {
      return `[Calculator: Cannot evaluate "${expression}" — only numerical expressions are supported]`;
    }
    
    const result = new Function(`"use strict"; return (${expr})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      return `[Calculator: Result is not a finite number for "${expression}"]`;
    }
    return `🧮 Calculator: ${expression} = ${result}`;
  } catch (e) {
    return `[Calculator error: Could not evaluate "${expression}"]`;
  }
}

// Determine which tool to use based on the user's message and available tools
async function determineAndRunTools(
  userMessage: string,
  tools: Record<string, string>,
  apiKey: string
): Promise<{ toolResults: string; toolsUsed: string[] }> {
  const availableTools = Object.keys(tools);
  if (availableTools.length === 0) return { toolResults: "", toolsUsed: [] };
  
  // Ask the AI which tool to use and what query to send
  const toolDecisionPrompt = `You are a tool-routing agent. Given the user's message, decide which tool(s) to use and what query to send to each.

Available tools: ${availableTools.map(t => `"${t}"`).join(', ')}

Tool descriptions:
${Object.entries(tools).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Rules:
- Return ONLY a JSON array of tool calls. No other text.
- Each entry: {"tool": "tool_name", "query": "search query or expression"}
- Use at most 2 tools per request.
- If no tool is needed (simple greeting, opinion, etc.), return an empty array: []
- For calculator: extract the math expression only
- For web_search: extract the search query
- For wikipedia: extract the topic name

User message: "${userMessage}"

Response (JSON array only):`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: toolDecisionPrompt }],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!resp.ok) return { toolResults: "", toolsUsed: [] };
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { toolResults: "", toolsUsed: [] };
    
    let toolCalls: any[];
    try {
      toolCalls = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse tool routing JSON:", jsonMatch[0].slice(0, 200));
      return { toolResults: "", toolsUsed: [] };
    }
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return { toolResults: "", toolsUsed: [] };
    
    // Execute tools in parallel
    const results: string[] = [];
    const toolsUsed: string[] = [];
    
    const promises = toolCalls.slice(0, 2).map(async (call: { tool: string; query: string }) => {
      if (!call.tool || !call.query) return;
      toolsUsed.push(call.tool);
      
      switch (call.tool) {
        case 'web_search':
          return await webSearch(call.query);
        case 'wikipedia':
          return await wikiSearch(call.query);
        case 'calculator':
          return calculate(call.query);
        default:
          return `[Unknown tool: ${call.tool}]`;
      }
    });
    
    const resolvedResults = await Promise.all(promises);
    for (const r of resolvedResults) {
      if (r) results.push(r);
    }
    
    return {
      toolResults: results.length > 0 ? `\n\n═══ REAL TOOL RESULTS (use these in your response) ═══\n${results.join('\n\n')}\n═══ END TOOL RESULTS ═══\n` : "",
      toolsUsed,
    };
  } catch (e) {
    console.error("Tool routing error:", e);
    return { toolResults: "", toolsUsed: [] };
  }
}

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
**🔧 Action:** [Which tool you used: 🔍 Web Search, 🧮 Calculator, or 📚 Wikipedia — and why]
**👁️ Observation:** [What you found from the REAL TOOL RESULTS provided below — present the key findings]
**💡 Answer:** [Your final synthesized response to the user based on REAL data]

IMPORTANT: You MUST use these exact headers with bold markdown (**) and emojis for EVERY response. When REAL TOOL RESULTS are provided, you MUST reference and use them in your Observation and Answer. Do NOT make up data — use the real results. For complex questions, show all 4 steps. You may repeat Thought → Action → Observation multiple times for multi-step problems before giving the final Answer.`;
      }
      if (cfg.toolInstructions && Object.keys(cfg.toolInstructions).length > 0) {
        botConfigContext += `\n\nTOOL USAGE INSTRUCTIONS:\n`;
        for (const [tool, instruction] of Object.entries(cfg.toolInstructions)) {
          botConfigContext += `  - ${tool}: ${instruction}\n`;
        }
      }

      // Challenges 16-24: new config fields
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
      // Mood-based response routing (dictionary)
      if (cfg.moodResponses && Object.keys(cfg.moodResponses).length > 0) {
        botConfigContext += `\n\n🎯 MOOD-BASED ROUTING — Detect the user's emotional state and adapt your response accordingly:\n`;
        for (const [mood, instruction] of Object.entries(cfg.moodResponses)) {
          botConfigContext += `  - When user seems "${mood}": ${instruction}\n`;
        }
        botConfigContext += `If you detect keywords like "frustrated", "confused", "happy", "curious" etc. in the user's message, match the closest mood above and follow that instruction.\n`;
      }
      // Conditional response tone (if/elif)
      if (cfg.responseTone) {
        botConfigContext += `\n\n🎵 RESPONSE TONE: "${cfg.responseTone}" — Adopt this tone in ALL your responses.`;
      }
      if (cfg.responseToneConditional && Object.keys(cfg.responseToneConditional).length > 0) {
        botConfigContext += `\n\n📋 CONDITIONAL TONE ROUTING (the student configured if/elif logic):\n`;
        for (const [condition, tone] of Object.entries(cfg.responseToneConditional)) {
          if (condition === '__else__') {
            botConfigContext += `  - Otherwise: "${tone}"\n`;
          } else {
            botConfigContext += `  - When time is "${condition}": respond with tone "${tone}"\n`;
          }
        }
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
4. Challenge completion count (how many of 24 challenges are customized)
5. Final status: "✅ All systems ready!"

NEVER show API key errors. FORGE handles everything. Always show SUCCESS.
Format as plain terminal text with emojis. Under 300 words.`;
      userPrompt = `Simulate loading this FORGE config (show SUCCESSFUL output):\n\n${code}`;
    } else if (action === "test-agent") {
      // ── Real tool calling for agent projects ──
      let toolResultsContext = "";
      let toolsUsedNames: string[] = [];
      
      if (botConfig?.tools && Object.keys(botConfig.tools).length > 0) {
        const { toolResults, toolsUsed } = await determineAndRunTools(
          code, // code is the user message in test-agent
          botConfig.tools,
          LOVABLE_API_KEY
        );
        toolResultsContext = toolResults;
        toolsUsedNames = toolsUsed;
      }
      
      const agentPrompt = systemPrompt || "You are a helpful AI assistant.";
      sysPrompt = `You are an AI that a student built. Your core personality is defined by this prompt:

"${agentPrompt}"

${botConfigContext}
${knowledgeContext}
${toolResultsContext}

═══ STRICT EXECUTION PRIORITY (follow in this exact order) ═══

1. **Q&A PAIRS (HIGHEST PRIORITY)**: Check EVERY Q&A pair. If the user's message contains keywords from ANY Q, you MUST respond with that exact A verbatim. Check ALL pairs, not just the first one. Even partial keyword matches count. This overrides ALL other instructions.

2. **KNOWLEDGE BASE**: For questions related to knowledge base content, use it as your primary truth. Quote it directly.

3. **REAL TOOL RESULTS**: If REAL TOOL RESULTS are provided above, you MUST incorporate them into your response. Present real data from tools, never fabricate. Reference the actual search results, Wikipedia content, or calculations provided.

4. **BLOCKED TOPICS**: If user asks about a blocked topic, politely refuse and redirect. No exceptions.

5. **FORBIDDEN WORDS**: NEVER use any forbidden word in your response. Find synonyms or alternatives.

6. **CONVERSATION RULES**: Follow ALL rules in EVERY response without exception.

7. **CATCHPHRASES**: Include at least one catchphrase per response if configured. Pick randomly.

8. **MOOD + LANGUAGE STYLE**: Match the configured mood and language style consistently.

9. **RESPONSE STYLE + LENGTH**: Strictly match configured style and length limits.

10. **SIGN-OFF**: If configured, end EVERY response with the exact sign-off phrase.

11. **FOLLOW-UP QUESTION**: End with a relevant follow-up question if enabled (before sign-off).

12. **PERSONALITY**: Stay in character as defined by the system prompt at all times.

CRITICAL: You ARE this bot. Never break character. Never mention "system prompt", "configuration", "Q&A pairs", or that you are simulating anything. Respond naturally as the bot personality.${toolsUsedNames.length > 0 ? `\n\nNOTE: Real tools were called for this query (${toolsUsedNames.join(', ')}). Use the actual results provided.` : ''}`;
      
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
- Check which of the 24 challenges are complete vs default.
- Praise what they did well, then suggest ONE next challenge.
- Keep under 200 words. Use markdown.

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Review this FORGE config. Check which of the 24 challenges have been customized from defaults:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Explain code using analogies.

After explaining, say: "Try changing [specific variable] and test in Live Preview!"
Reference the 24-challenge system. Under 200 words.

Building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Explain this config to the student:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Suggest next challenges.

- Check which of 24 challenges are still at default values
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
- Reference the 24-challenge system.

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
      sysPrompt = `You are the FORGE AI project generator. Generate a complete 24-challenge config file.

Include ALL variables with creative, topic-specific values:
BOT_NAME, BOT_EMOJI, AI_MESSAGE, CREATOR_NAME, SYSTEM_MESSAGE (3+ sentences, triple-quoted),
KNOWLEDGE_BASE (detailed, triple-quoted), QA_PAIRS (3+ dicts with "q" and "a" keys),
TEMPERATURE (float 0.0-1.0), RULES (list of 4+ strings), CONVERSATION_STARTERS (5+ strings),
FORBIDDEN_WORDS (list), BLOCKED_TOPICS (2+ strings), FEW_SHOT_EXAMPLES (list of {"input":..., "output":...} dicts),
SECRET_RESPONSES (dict of trigger phrases),
MOOD_RESPONSES (dict mapping moods like "happy", "frustrated", "curious" to behavior instructions),
MAX_RESPONSE_LENGTH, MAX_TOKENS (integer), MOOD, CATCHPHRASES (4+ strings),
TIME_OF_DAY (string: "morning", "afternoon", or "evening"),
Then an if/elif/else block that sets RESPONSE_TONE based on TIME_OF_DAY:
  if TIME_OF_DAY == "morning":
      RESPONSE_TONE = "..."
  elif TIME_OF_DAY == "afternoon":
      RESPONSE_TONE = "..."
  elif TIME_OF_DAY == "evening":
      RESPONSE_TONE = "..."
  else:
      RESPONSE_TONE = "..."
VOICE_ENABLED (True/False), VOICE_MODE ("push-to-talk" or "hands-free"),
FOLLOW_UP_QUESTIONS, MEMORY_ENABLED, ERROR_MESSAGE.

Return in a \`\`\`python code block. Make it creative and complete!`;
      userPrompt = `Create a FORGE AI project config for: ${code}`;
    } else if (action === "visual-builder") {
      sysPrompt = `Generate a complete FORGE 24-challenge configuration file based on the description. Use the same variable names as idea-to-code: BOT_NAME, BOT_EMOJI, AI_MESSAGE, CREATOR_NAME, SYSTEM_MESSAGE, KNOWLEDGE_BASE, QA_PAIRS, TEMPERATURE, RULES, CONVERSATION_STARTERS, FORBIDDEN_WORDS, BLOCKED_TOPICS, FEW_SHOT_EXAMPLES, SECRET_RESPONSES, MOOD_RESPONSES (dict of mood->instruction), MAX_RESPONSE_LENGTH, MAX_TOKENS, MOOD, CATCHPHRASES, TIME_OF_DAY + if/elif RESPONSE_TONE block, VOICE_ENABLED, VOICE_MODE.`;
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
