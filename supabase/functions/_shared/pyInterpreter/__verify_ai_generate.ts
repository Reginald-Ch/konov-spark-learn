// Verifies the ai_generate() builtin: the async-conversion plumbing itself
// (missed `await`s, the two sequential-args fixes, the ListLit fix), the
// cost/abuse cap, the catchable-vs-uncatchable error split, and — the one
// invariant this feature must never weaken — that Python Challenges grading
// stays completely unable to reach ai_generate.
import { runFunction } from './evaluator.ts';
import type { AiGenerateFn } from './evaluator.ts';
import { gradeAgainstTests } from './index.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

function fakeAiGenerate(responseFor: (prompt: string) => string): { fn: AiGenerateFn; calls: string[] } {
  const calls: string[] = [];
  const fn: AiGenerateFn = async (prompt) => {
    calls.push(prompt);
    return { ok: true, text: responseFor(prompt) };
  };
  return { fn, calls };
}

// ── Basic call + a few expression positions (catches a missed `await`) ──

{
  const { fn } = fakeAiGenerate((p) => `AI said: ${p}`);
  const code = `
def solve(topic):
    return ai_generate("info about " + topic)
`;
  const r = await runFunction(code, 'solve', ['water'], { aiGenerate: fn });
  check('basic call-arg position', r.ok && r.result === 'AI said: info about water', r);
}

{
  const { fn } = fakeAiGenerate((p) => `reply-${p}`);
  const code = `
def solve(topic):
    return f"Answer: {ai_generate(topic)}"
`;
  const r = await runFunction(code, 'solve', ['x'], { aiGenerate: fn });
  check('f-string interpolation position', r.ok && r.result === 'Answer: reply-x', r);
}

{
  const { fn } = fakeAiGenerate((p) => `v-${p}`);
  const code = `
def solve(topic):
    d = {"key": ai_generate(topic)}
    return d["key"]
`;
  const r = await runFunction(code, 'solve', ['x'], { aiGenerate: fn });
  check('dict-value position', r.ok && r.result === 'v-x', r);
}

{
  const { fn, calls } = fakeAiGenerate((p) => `out-${p}`);
  const code = `
def solve(items):
    out = []
    for item in items:
        out.append(ai_generate(item))
    return out
`;
  const r = await runFunction(code, 'solve', [['a', 'b']], { aiGenerate: fn });
  check('loop-body position', r.ok && JSON.stringify(r.result) === JSON.stringify(['out-a', 'out-b']) && calls.length === 2, r);
}

// ── Sequential-evaluation fixes: ListLit and both evalCall arg branches ──

{
  const { fn, calls } = fakeAiGenerate((p) => p.toUpperCase());
  const code = `
def solve():
    return "-".join([ai_generate("a"), ai_generate("b")])
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: fn });
  check(
    'ListLit evaluates elements left-to-right, not concurrently (regression test for .map->for fix)',
    r.ok && r.result === 'A-B' && calls.length === 2 && calls[0] === 'a' && calls[1] === 'b',
    { r, calls },
  );
}

{
  const { fn, calls } = fakeAiGenerate((p) => p);
  const code = `
def combine(a, b):
    return a + "|" + b
def solve():
    return combine(ai_generate("a"), ai_generate("b"))
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: fn });
  check(
    'plain-call args evaluate left-to-right, not concurrently (regression test for .map->for fix)',
    r.ok && r.result === 'a|b' && calls.length === 2 && calls[0] === 'a' && calls[1] === 'b',
    { r, calls },
  );
}

// ── Cost/abuse cap ──

{
  const { fn } = fakeAiGenerate((p) => p);
  const code = `
def solve():
    a = ai_generate("1")
    b = ai_generate("2")
    c = ai_generate("3")
    d = ai_generate("4")
    return d
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: fn, maxAiCalls: 3 });
  check(
    'exceeding maxAiCalls raises a catchable runtime_error naming the limit',
    !r.ok && r.errorType === 'runtime_error' && /too many times/.test(r.errorMessage || '') && /3/.test(r.errorMessage || ''),
    r,
  );
}

// ── Catchable error: a callback that throws ──

{
  const throwingAi: AiGenerateFn = async () => { throw new Error('network exploded'); };
  const code = `
def solve():
    try:
        return ai_generate("hello")
    except:
        return "fallback"
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: throwingAi });
  check('a callback that throws surfaces as a catchable RuntimeError, and try/except actually catches it', r.ok && r.result === 'fallback', r);
}

// ── Uncatchable error: budget-exhaustion must never be swallowed ──

{
  const timeoutAi: AiGenerateFn = async () => ({ ok: false, reason: 'timeout', message: 'ai_generate timed out' });
  const code = `
def solve():
    try:
        return ai_generate("hello")
    except:
        return "fallback"
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: timeoutAi });
  check(
    'a timed-out ai_generate() raises an uncatchable PyTimeoutError — try/except must NOT swallow it (critical safety property)',
    !r.ok && r.errorType === 'timeout',
    r,
  );
}

{
  // Pre-flight floor: if the run's own wall-clock budget is already nearly
  // exhausted, ai_generate() must refuse before even calling the host
  // callback — proven here by asserting the fake callback is never invoked.
  const { fn, calls } = fakeAiGenerate((p) => p);
  const code = `
def solve():
    return ai_generate("hello")
`;
  const r = await runFunction(code, 'solve', [], { aiGenerate: fn, timeoutMs: 50, maxSteps: 5000000 });
  check(
    'a near-exhausted budget raises PyTimeoutError before ever calling the host callback',
    !r.ok && r.errorType === 'timeout' && calls.length === 0,
    { r, calls },
  );
}

// ── Structural isolation: Python Challenges grading never gains AI access ──

{
  const code = `
def solve(x):
    return ai_generate("hi")
`;
  const tests = [{ input_args: [1], expected_output: 'anything' }];
  // No aiGenerate option passed — this is exactly how python-challenge-grade/
  // handler.ts calls gradeAgainstTests today.
  const g = await gradeAgainstTests(code, 'solve', tests);
  check(
    'gradeAgainstTests without an aiGenerate option: ai_generate is not defined (plain NameError, not a special-cased block)',
    g.hadError && g.errorType === 'runtime_error' && /ai_generate/.test(g.errorMessage || '') && /not defined/.test(g.errorMessage || ''),
    g,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
