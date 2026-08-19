import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { tryRealPythonReply } from "./realPythonReply.ts";
import { makeAiGenerateCallback } from "./aiGenerateCallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  // Without this, a cross-origin fetch's headers.get() returns null for
  // ANY header not on the browser's small CORS safelist — X-Python-Status
  // isn't on it, so ProjectEditor.tsx/ProjectView.tsx's `usedRealPython`
  // check always read false regardless of whether respond() actually ran.
  // The "🐍 Answered by your Python code" badge could never appear.
  "Access-Control-Expose-Headers": "X-Python-Status, X-Python-Error-Type",
};

// ── Concurrency gate ──
// Wraps the gateway's response stream so the acquired slot (see
// supabase/migrations/..._a4c1f7e2..., ai_gateway_slots) is only released once
// the stream is fully drained, errors, or is cancelled — not the instant the
// gateway responds with headers. A slot represents an actual open connection to
// the shared AI gateway for its whole duration, including the streamed tail.
function releaseSlotOnStreamEnd(
  body: ReadableStream<Uint8Array>,
  release: () => Promise<void>
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let released = false;
  const doRelease = async () => {
    if (released) return;
    released = true;
    await release();
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          await doRelease();
          return;
        }
        controller.enqueue(value);
      } catch (e) {
        controller.error(e);
        await doRelease();
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
      await doRelease();
    },
  });
}

// ── Real Tool Implementations ──

// None of the five fetches across webSearch/wikiSearch had a timeout —
// every other outbound call in this file (the AI gateway itself, the tool-
// routing call) is bounded, these weren't. Both functions are invoked via
// Promise.all in determineAndRunTools with no outer deadline of their own,
// so a single hung DuckDuckGo/Wikipedia connection stalled the ENTIRE
// request — including the ai_slot it was holding — for however long that
// connection stayed open. 8s is generous for a JSON API call; timing out
// still returns a clean fallback string rather than surfacing an abort as
// an unhandled failure.
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: { "User-Agent": "FORGE-Agent/1.0" }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function webSearch(query: string): Promise<string> {
  try {
    // Use DuckDuckGo instant answer API (free, no key needed)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetchWithTimeout(url);
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
    const resp = await fetchWithTimeout(url);

    if (!resp.ok) {
      // Try Wikipedia search API as fallback
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`;
      const searchResp = await fetchWithTimeout(searchUrl);
      if (!searchResp.ok) return `[Wikipedia: No results found for "${query}"]`;
      const searchData = await searchResp.json();
      if (searchData[1] && searchData[1].length > 0) {
        const titles = searchData[1].slice(0, 3).join(', ');
        // Fetch the first result's summary
        const firstTitle = searchData[1][0];
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle.replace(/\s+/g, '_'))}`;
        const summaryResp = await fetchWithTimeout(summaryUrl);
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

// Real recursive-descent arithmetic parser/evaluator — no `new Function`,
// no `eval`, ever. The version this replaced sanitized `expression` with a
// regex allowlist, string-substituted math-function calls into `Math.x(...)`
// text, and ran the RESULT through `new Function(...)()`. `expression`
// ultimately comes from an LLM's tool-call arguments, itself built from the
// raw, unauthenticated user message (see determineAndRunTools below) — a
// hand-rolled sanitizer standing in front of a real JS eval on an
// unauthenticated endpoint is exactly the shape that turns into RCE the
// moment the allowlist gains one word with a useful character in it (already
// demonstrated as weak: "e.e" sanitized to "Math.E.Math.E" and reached
// `new Function` cleanly). This tokenizes and parses the expression itself
// and only ever produces/combines plain numbers — there is no code string
// construction step for a payload to hide inside.
type CalcToken = { type: 'num'; value: number } | { type: 'name'; value: string } | { type: 'op'; value: string };

function tokenizeCalcExpr(expression: string): CalcToken[] {
  const tokens: CalcToken[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[0-9.]/.test(expression[j])) j++;
      const raw = expression.slice(i, j);
      const value = Number(raw);
      if (raw === '' || Number.isNaN(value)) throw new Error(`Invalid number "${raw}"`);
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[a-zA-Z]/.test(expression[j])) j++;
      tokens.push({ type: 'name', value: expression.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/%^(),'.includes(ch)) {
      // "**" is accepted as a single power operator alongside "^".
      if (ch === '*' && expression[i + 1] === '*') { tokens.push({ type: 'op', value: '^' }); i += 2; continue; }
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

const CALC_CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };
const CALC_UNARY_FNS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, log: Math.log, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
};
const CALC_VARIADIC_FNS: Record<string, (...xs: number[]) => number> = { min: Math.min, max: Math.max, pow: Math.pow };

class CalcParser {
  private pos = 0;
  constructor(private tokens: CalcToken[]) {}
  private peek(): CalcToken | undefined { return this.tokens[this.pos]; }
  private isOp(v: string): boolean { const t = this.peek(); return !!t && t.type === 'op' && t.value === v; }

  parseExpression(): number {
    const v = this.parseAddSub();
    if (this.pos < this.tokens.length) throw new Error(`Unexpected token near position ${this.pos}`);
    return v;
  }
  private parseAddSub(): number {
    let v = this.parseMulDiv();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.tokens[this.pos++] as { value: string }).value;
      const rhs = this.parseMulDiv();
      v = op === '+' ? v + rhs : v - rhs;
    }
    return v;
  }
  private parseMulDiv(): number {
    let v = this.parsePower();
    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const op = (this.tokens[this.pos++] as { value: string }).value;
      const rhs = this.parsePower();
      if ((op === '/' || op === '%') && rhs === 0) throw new Error('Division by zero');
      v = op === '*' ? v * rhs : op === '/' ? v / rhs : v % rhs;
    }
    return v;
  }
  // Right-associative, matching real exponentiation semantics (2^3^2 = 2^9).
  private parsePower(): number {
    const base = this.parseUnary();
    if (this.isOp('^')) { this.pos++; return Math.pow(base, this.parsePower()); }
    return base;
  }
  private parseUnary(): number {
    if (this.isOp('-')) { this.pos++; return -this.parseUnary(); }
    if (this.isOp('+')) { this.pos++; return this.parseUnary(); }
    return this.parseAtom();
  }
  private parseAtom(): number {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'num') { this.pos++; return t.value; }
    if (this.isOp('(')) {
      this.pos++;
      const v = this.parseAddSub();
      if (!this.isOp(')')) throw new Error("Expected ')'");
      this.pos++;
      return v;
    }
    if (t.type === 'name') {
      this.pos++;
      if (t.value in CALC_CONSTANTS) return CALC_CONSTANTS[t.value];
      if (!this.isOp('(')) throw new Error(`Unknown name "${t.value}"`);
      this.pos++;
      const args: number[] = [this.parseAddSub()];
      while (this.isOp(',')) { this.pos++; args.push(this.parseAddSub()); }
      if (!this.isOp(')')) throw new Error("Expected ')'");
      this.pos++;
      if (t.value in CALC_UNARY_FNS) {
        if (args.length !== 1) throw new Error(`${t.value}() takes exactly one argument`);
        return CALC_UNARY_FNS[t.value](args[0]);
      }
      if (t.value in CALC_VARIADIC_FNS) return CALC_VARIADIC_FNS[t.value](...args);
      throw new Error(`Unknown function "${t.value}"`);
    }
    throw new Error('Unexpected token');
  }
}

function calculate(expression: string): string {
  if (expression.length > 500) {
    return `[Calculator: expression is too long]`;
  }
  try {
    const result = new CalcParser(tokenizeCalcExpr(expression)).parseExpression();
    if (typeof result !== 'number' || !isFinite(result)) {
      return `[Calculator: Result is not a finite number for "${expression}"]`;
    }
    return `🧮 Calculator: ${expression} = ${result}`;
  } catch {
    return `[Calculator error: Could not evaluate "${expression}"]`;
  }
}

// Determine which tool to use based on the user's message and available tools
async function determineAndRunTools(
  userMessage: string,
  tools: Record<string, string>,
  apiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ toolResults: string; toolsUsed: string[] }> {
  const availableTools = Object.keys(tools);
  if (availableTools.length === 0) return { toolResults: "", toolsUsed: [] };

  // This is a quick, non-streaming classification call, but it shares the same
  // gateway key as the main call — gate it too, with a short TTL. If no slot is
  // free, skip tool use for this message rather than block/queue: this is a
  // best-effort enhancement to the response, not the core answer.
  let toolSlotId: number | null = null;
  const { data: acquiredToolSlot, error: acquireToolSlotError } = await supabaseAdmin.rpc("acquire_ai_slot", {
    p_ttl_seconds: 30,
  });
  if (acquireToolSlotError) {
    console.error("acquire_ai_slot (tool routing) error:", acquireToolSlotError);
  } else if (acquiredToolSlot === null) {
    return { toolResults: "", toolsUsed: [] };
  } else {
    toolSlotId = acquiredToolSlot;
  }

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
      // toolsUsed used to record call.tool unconditionally, before the
      // switch below ever checked whether it was a real tool — an LLM
      // hallucinating a tool name that doesn't exist got recorded as
      // "used" anyway, and the resulting "[Unknown tool: ...]" string
      // (itself LLM-controlled) still flowed into the system-role context
      // via toolResults below regardless. Now only a genuinely dispatched
      // tool counts as used, and an unknown one is dropped rather than
      // echoed back into the prompt.
      switch (call.tool) {
        case 'web_search':
          toolsUsed.push(call.tool);
          return await webSearch(call.query);
        case 'wikipedia':
          toolsUsed.push(call.tool);
          return await wikiSearch(call.query);
        case 'calculator':
          toolsUsed.push(call.tool);
          return calculate(call.query);
        default:
          return undefined;
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
  } finally {
    if (toolSlotId !== null) {
      const { error } = await supabaseAdmin.rpc("release_ai_slot", { p_slot_id: toolSlotId });
      if (error) console.error("release_ai_slot (tool routing) failed:", error);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  let slotId: number | null = null;
  const releaseSlot = async () => {
    if (slotId === null) return;
    const idToRelease = slotId;
    slotId = null;
    const { error } = await supabaseAdmin.rpc("release_ai_slot", { p_slot_id: idToRelease });
    if (error) console.error("release_ai_slot failed:", error);
  };

  try {
    const { code, model, action, systemPrompt, messages: conversationHistory, knowledgeBase, qaData, projectType, projectName, botConfig, studentCode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let sysPrompt = "";
    let userPrompt = "";
    let extraMessages: { role: string; content: string }[] = [];
    // Set below if respond() was attempted and genuinely failed (not just
    // absent/deferred) — carried through to whichever response actually
    // gets returned, since a real Python error still falls through to the
    // same AI-fallback response construction as a project with no
    // respond() at all.
    let pythonErrorType: string | null = null;

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
      if (cfg.timeOfDay) {
        botConfigContext += `\n\n🕐 CURRENT TIME OF DAY: "${cfg.timeOfDay}" — Use this to determine conditional tone routing above.`;
      }
      if (cfg.greeting) {
        botConfigContext += `\nYour configured greeting message is: "${cfg.greeting}". If asked what you say when starting a conversation, reference this.`;
      }
      if (cfg.signOff && cfg.signOff.trim()) {
        botConfigContext += `\n\n✍️ SIGN-OFF — End EVERY response with: "${cfg.signOff}"`;
      }
      if (cfg.errorMessage && cfg.errorMessage.trim()) {
        botConfigContext += `\n\n⚠️ ERROR MESSAGE — When you cannot answer a question or encounter confusion, respond with: "${cfg.errorMessage}"`;
      }
    }

    if (action === "run") {
      sysPrompt = `You are a Python code execution simulator for FORGE. The student clicked "Run Tests".

CRITICAL: Read their code and generate realistic terminal output showing:
1. Loading each variable (bot name, emoji, temperature, style, rules, mood, language style, etc.)
2. A configuration summary with counts (X rules, Y Q&A pairs, Z easter eggs, forbidden words, etc.)
3. A simulated 2-turn demo conversation showing the bot IN CHARACTER
4. Challenge completion count (how many of 34 challenges are customized)
5. Final status: if the config looks complete and internally consistent, "✅ All systems ready!" — if something is clearly broken or contradictory (e.g. a variable that's empty when it's clearly meant to hold something, or values that conflict), say so plainly and specifically instead of claiming success anyway. Being encouraging about an incomplete-but-valid config is good; papering over an actually broken one is not — the student already made it past real syntax checking to get here, this is the one place left that can tell them something's off.

Never fabricate irrelevant backend/API-key errors that have nothing to do with the student's own code — if the code itself is fine, say so plainly.
Format as plain terminal text with emojis. Under 300 words.`;
      userPrompt = `Simulate loading this FORGE config and report what you actually see — success if it's genuinely in good shape, a plain specific note if something's clearly broken:\n\n${code}`;
    } else if (action === "test-agent") {
      // Real Python takes priority over the LLM when main.py defines a real
      // respond() that returns an actual string — see realPythonReply.ts
      // for the full contract (None/"" is a deliberate defer-to-AI signal;
      // any real failure — missing entrypoint, a bug, a timeout — also
      // falls through to the AI below unchanged, never surfaced to an end
      // user chatting with someone else's published bot). `code` is
      // repurposed as the chat message on this action (pre-existing
      // overload, not something this change introduces).
      // ai_generate()'s real fetch/slot logic is injected here rather than
      // living inside the interpreter package — see aiGenerateCallback.ts.
      // It shares the exact same acquire_ai_slot/release_ai_slot pool as
      // every other gateway call in this function (no separate pool for v1).
      const aiGenerateForThisTurn = makeAiGenerateCallback(
        LOVABLE_API_KEY,
        async (ttlSeconds) => {
          const { data, error } = await supabaseAdmin.rpc("acquire_ai_slot", { p_ttl_seconds: ttlSeconds });
          if (error) { console.error("acquire_ai_slot (ai_generate) error:", error); return null; }
          return data;
        },
        async (slotId) => {
          const { error } = await supabaseAdmin.rpc("release_ai_slot", { p_slot_id: slotId });
          if (error) console.error("release_ai_slot (ai_generate) failed:", error);
        },
      );
      const pyReply = await tryRealPythonReply(
        typeof studentCode === "string" ? studentCode : "",
        code,
        Array.isArray(conversationHistory) ? conversationHistory : [],
        aiGenerateForThisTurn
      );
      if (pyReply.handled && "reply" in pyReply) {
        const encoder = new TextEncoder();
        const sseBody = new ReadableStream<Uint8Array>({
          start(controller) {
            const chunk = { choices: [{ delta: { content: pyReply.reply } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          },
        });
        return new Response(sseBody, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Python-Status": "handled" },
        });
      }
      // handled: false (no code / deferred / N/A for this action) still
      // falls through to the AI exactly as before. A genuine error — a
      // missing entrypoint, a real bug, an invalid return type, a timeout —
      // used to be silently discarded right here with zero signal, so a
      // student whose respond() crashed had no way to distinguish "my code
      // isn't running" from "it's working, the AI's tone is just different
      // today." Still doesn't block the response (same fallback-safe
      // contract, still falls through to the AI below) — just tracked so
      // the eventual response can carry a header the client can check.
      if (pyReply.handled && "error" in pyReply) {
        console.error("respond() failed:", pyReply.error.type, pyReply.error.message);
        pythonErrorType = pyReply.error.type;
      }

      // ── Real tool calling for agent projects ──
      let toolResultsContext = "";
      let toolsUsedNames: string[] = [];
      
      if (botConfig?.tools && Object.keys(botConfig.tools).length > 0) {
        const { toolResults, toolsUsed } = await determineAndRunTools(
          code, // code is the user message in test-agent
          botConfig.tools,
          LOVABLE_API_KEY,
          supabaseAdmin
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
- Check which of the 34 challenges are complete vs default.
- Praise what they did well, then suggest ONE next challenge.
- Keep under 200 words. Use markdown.

The student is building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Review this FORGE config. Check which of the 34 challenges have been customized from defaults:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Explain code using analogies.

After explaining, say: "Try changing [specific variable] and test in Live Preview!"
Reference the 34-challenge system. Under 200 words.

Building: ${projectName || 'an AI project'} (${projectType || 'chatbot'})`;
      userPrompt = `Explain this config to the student:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      sysPrompt = `You are a PAIR PROGRAMMER for teens. Suggest next challenges.

- Check which of 34 challenges are still at default values
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
- Reference the 34-challenge system.

PROJECT: ${projectName || 'AI Project'} (${projectType || 'chatbot'})
PROMPT: "${systemPrompt || 'not set'}"`;

      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        extraMessages = conversationHistory.slice(0, -1).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      }
      const latestQuestion = conversationHistory && conversationHistory.length > 0
        ? conversationHistory[conversationHistory.length - 1].content
        : code;
      // The student's code is untrusted content, not a trusted instruction —
      // keep it in the user role like review/explain/suggest do, instead of
      // folding it into sysPrompt where it'd carry system-level authority.
      userPrompt = `CURRENT CODE:\n\`\`\`python\n${code}\n\`\`\`\n\n${latestQuestion}`;
    } else if (action === "generate") {
      sysPrompt = `You are a Python AI coding tutor for teens. Generate clean, commented Python code. Return ONLY the code in a code block.`;
      userPrompt = `Generate Python code for: ${code}\n\nUse model/library: ${model || "any"}`;
    } else if (action === "idea-to-code") {
      sysPrompt = `You are the FORGE AI project generator. Generate a complete 34-challenge config file.

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
WAKE_WORD (string, e.g. "hey spark"), VOICE_GENDER ("male", "female", or "default"),
FOLLOW_UP_QUESTIONS, MEMORY_ENABLED, ERROR_MESSAGE.

Then Challenges 25-34, which teach real Python syntax rather than config editing —
include ALL of these too, using this exact shape (the app checks for these specific patterns):
- A function \`def build_fallback_message(bot_name): ... return "..."\` (or an f-string return),
  then \`FALLBACK_MESSAGE = build_fallback_message(BOT_NAME)\`.
- A for-loop that builds TOPIC_KEYWORDS from QA_PAIRS:
  \`TOPIC_KEYWORDS = []\` then \`for pair in QA_PAIRS:\n    TOPIC_KEYWORDS.append(pair["q"])\`.
- A list comprehension assigned to PHRASE_IDEAS, e.g.
  \`PHRASE_IDEAS = [phrase.upper() for phrase in CATCHPHRASES]\`.
- A parameterized function whose f-string actually uses its argument, e.g.
  \`def make_intro(name): return f"Hey, I'm {name}!"\`, then \`PERSONALIZED_INTRO = make_intro(BOT_NAME)\`.
- A safe dict lookup with a fallback: \`MOOD_INSTRUCTION = MOOD_RESPONSES.get(MOOD, "Be friendly and helpful.")\`.
- An accumulator loop with a literal-digit increment, e.g.
  \`RULE_COUNT = 0\nfor rule in RULES:\n    RULE_COUNT += 1\`.
- A print() call containing \`.upper()\`, e.g. \`print(BOT_NAME.upper())\`.
- \`IS_EXPRESSIVE = TEMPERATURE > 0.7 and len(CATCHPHRASES) > 2\` (a real boolean expression).
- A while-loop that prints each rule: \`i = 0\nwhile i < len(RULES):\n    print(RULES[i])\n    i += 1\`.
- A print() call containing \`str(MAX_TOKENS)\`, e.g. \`print("Max tokens: " + str(MAX_TOKENS))\`.

Return in a \`\`\`python code block. Make it creative and complete!`;
      userPrompt = `Create a FORGE AI project config for: ${code}`;
    } else if (action === "visual-builder") {
      sysPrompt = `Generate a complete FORGE 34-challenge configuration file based on the description. Use the same variable names as idea-to-code: BOT_NAME, BOT_EMOJI, AI_MESSAGE, CREATOR_NAME, SYSTEM_MESSAGE, KNOWLEDGE_BASE, QA_PAIRS, TEMPERATURE, RULES, CONVERSATION_STARTERS, FORBIDDEN_WORDS, BLOCKED_TOPICS, FEW_SHOT_EXAMPLES, SECRET_RESPONSES, MOOD_RESPONSES (dict of mood->instruction), MAX_RESPONSE_LENGTH, MAX_TOKENS, MOOD, CATCHPHRASES, TIME_OF_DAY + if/elif RESPONSE_TONE block, VOICE_ENABLED, VOICE_MODE, WAKE_WORD, VOICE_GENDER. Also include Challenges 25-34's real-Python constructs: a build_fallback_message(bot_name) function assigned to FALLBACK_MESSAGE; a for-loop over QA_PAIRS appending into TOPIC_KEYWORDS; a list comprehension assigned to PHRASE_IDEAS; a make_intro(name) function (using its argument in an f-string) assigned to PERSONALIZED_INTRO; MOOD_INSTRUCTION = MOOD_RESPONSES.get(MOOD, "..."); an accumulator loop building RULE_COUNT with += 1; a print() using .upper(); IS_EXPRESSIVE as a real boolean expression; a while-loop printing each RULE; a print() using str(MAX_TOKENS).`;
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

    // Acquire a concurrency slot before calling the shared gateway. Fail open if
    // the gate itself errors (e.g. a transient DB hiccup) — this table is a
    // smoother, not a feature the whole platform should become newly fragile to.
    const { data: acquiredSlot, error: acquireError } = await supabaseAdmin.rpc("acquire_ai_slot", {
      p_ttl_seconds: 120,
    });
    if (acquireError) {
      console.error("acquire_ai_slot error:", acquireError);
    } else if (acquiredSlot === null) {
      return new Response(
        JSON.stringify({ error: "FORGE is busy right now — please try again in a few seconds." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      slotId = acquiredSlot;
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
      await releaseSlot();
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

    if (!response.body) {
      await releaseSlot();
      throw new Error("No response body from AI gateway");
    }

    return new Response(releaseSlotOnStreamEnd(response.body, releaseSlot), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        ...(pythonErrorType ? { "X-Python-Status": "error", "X-Python-Error-Type": pythonErrorType } : {}),
      },
    });
  } catch (e) {
    await releaseSlot();
    console.error("python-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
