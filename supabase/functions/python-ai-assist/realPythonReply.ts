// Deliberately isolated from index.ts — zero dependency on anything else in
// this edge function, so it's testable on its own with plain `tsx`, the
// same way python-challenge-grade/handler.ts was, before the large,
// already-live index.ts ever gets touched.
//
// This is the ONE integration point between Build Studio's main.py and the
// interpreter — see the plan's "Build Studio integration" section for the
// full reasoning (not gated by Lessons, main.py vs. config.json, the two
// independent chat call sites this feeds).
import { runFunction } from '../_shared/pyInterpreter/evaluator.ts';
import type { PyErrorType } from '../_shared/pyInterpreter/errors.ts';

const ENTRYPOINT = 'respond';

export interface HistoryMessage {
  role: string;
  content: string;
}

export type RealPythonResult =
  | { handled: false }
  | { handled: true; reply: string }
  | { handled: true; error: { type: PyErrorType | 'invalid_return'; message: string } };

// `studentCode` is main.py's raw text. `respond` returning None/"" is a
// deliberate defer-to-AI signal (handled: false), not an error — a student
// can handle some messages in real code and let the LLM cover the rest,
// rather than needing 100% coverage in Python. Anything that actually goes
// wrong (missing entrypoint, a real bug, a timeout, a non-string/non-None
// return) comes back as `handled: true` with an error attached — still
// "handled" in the sense that real Python was genuinely attempted, which
// the caller uses to decide whether to surface an author-facing debug
// signal, even though the reply itself still falls back to the LLM either
// way.
export function tryRealPythonReply(studentCode: string, message: string, history: HistoryMessage[]): RealPythonResult {
  if (!studentCode || !studentCode.trim()) return { handled: false };

  const result = runFunction(studentCode, ENTRYPOINT, [message, history], { timeoutMs: 5000, maxSteps: 200000 });

  if (!result.ok) {
    // A missing entrypoint reports as a plain runtime_error message from
    // runFunction ("doesn't define a function called 'respond'") — no
    // special-casing needed, it already reads clearly as-is.
    return { handled: true, error: { type: result.errorType ?? 'runtime_error', message: result.errorMessage ?? 'Something went wrong running this code.' } };
  }

  if (result.result === null || result.result === undefined) return { handled: false };
  if (typeof result.result === 'string') {
    return result.result.trim() === '' ? { handled: false } : { handled: true, reply: result.result };
  }

  return {
    handled: true,
    error: { type: 'invalid_return', message: `respond() must return a string (or None to let the AI handle it) — got ${typeof result.result === 'object' ? (Array.isArray(result.result) ? 'a list' : 'a dict') : typeof result.result}.` },
  };
}
