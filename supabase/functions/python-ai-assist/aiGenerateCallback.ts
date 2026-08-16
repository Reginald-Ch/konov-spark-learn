// The real fetch/slot logic behind the interpreter's ai_generate() builtin.
// Deliberately isolated the same way realPythonReply.ts is — no Supabase
// client or `Deno` API used directly, real slot-acquire/release are
// injected as plain async functions so this is testable with `tsx` using
// fakes, before wiring in the real Supabase RPC calls from index.ts.
import type { AiGenerateFn, AiGenerateOutcome } from '../_shared/pyInterpreter/evaluator.ts';

// Cheaper/faster model, matching the existing tool-routing call — a single
// chat turn can trigger up to maxAiCalls of these, so cost multiplies with
// the cap (see the plan's "Confirmed parameters").
const AI_GENERATE_MODEL = 'google/gemini-2.5-flash-lite';
// Leaves time for the slot release + returning control to the interpreter
// before its own wall-clock deadline fires, rather than racing it exactly.
const SAFETY_MARGIN_MS = 400;

export function makeAiGenerateCallback(
  apiKey: string,
  acquireSlot: (ttlSeconds: number) => Promise<number | null>,
  releaseSlot: (slotId: number) => Promise<void>,
): AiGenerateFn {
  return async (prompt: string, remainingMs: number): Promise<AiGenerateOutcome> => {
    const budgetMs = remainingMs - SAFETY_MARGIN_MS;
    if (budgetMs <= 0) return { ok: false, reason: 'timeout', message: "no time left in this turn's budget" };

    const slotId = await acquireSlot(30);
    if (slotId === null) return { ok: false, reason: 'error', message: 'AI is busy right now' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgetMs);
    try {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_GENERATE_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) return { ok: false, reason: 'error', message: `AI gateway returned ${resp.status}` };
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string') return { ok: false, reason: 'error', message: 'AI gateway returned no content' };
      return { ok: true, text };
    } catch (e) {
      return controller.signal.aborted
        ? { ok: false, reason: 'timeout', message: 'ai_generate timed out' }
        : { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'network error' };
    } finally {
      clearTimeout(timer);
      await releaseSlot(slotId);
    }
  };
}
