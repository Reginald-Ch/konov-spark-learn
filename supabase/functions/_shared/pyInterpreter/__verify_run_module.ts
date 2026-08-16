// Verifies runModule() — the top-level-only execution mode that backs Build
// Studio's live client-side console (no entrypoint function required).
import { runModule } from './evaluator.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

{
  const code = `
BOT_NAME = "Spark"
print(f"Booting up {BOT_NAME.upper()}...")
print("Ready!")
`;
  const r = await runModule(code);
  check('top-level print() output is captured, no entrypoint needed', r.ok && r.stdout === 'Booting up SPARK...\nReady!\n', r);
}

{
  const code = `
BOT_NAME = "Spark"
TEMPERATURE = 0.7
RULES = ["Be kind", "Be honest"]
`;
  const r = await runModule(code);
  check('a script with no functions and no print() still runs cleanly (empty stdout, ok: true)', r.ok && r.stdout === '', r);
}

{
  const code = `
print("before the crash")
BROKEN = 1 / 0
print("never reached")
`;
  const r = await runModule(code);
  check('a runtime error mid-script still returns the partial stdout printed before it', !r.ok && r.errorType === 'runtime_error' && r.stdout === 'before the crash\n', r);
}

{
  const code = `
print("hello"
`;
  const r = await runModule(code);
  check('a syntax error returns a clean syntax_error, not a crash', !r.ok && r.errorType === 'syntax_error', r);
}

{
  const code = `
x = 0
while True:
    x = x + 1
`;
  const start = Date.now();
  const r = await runModule(code, { timeoutMs: 500, maxSteps: 5000000 });
  const elapsed = Date.now() - start;
  check('an infinite while loop at module level still times out cleanly and quickly', !r.ok && r.errorType === 'timeout' && elapsed < 3000, { ...r, elapsed });
}

{
  // Real functions defined and called at module level (e.g. Challenge 25/28's
  // pattern) should run and their print()s captured too, same as any other
  // top-level statement — runModule doesn't special-case function calls.
  const code = `
def greet(name):
    return f"Hi, {name}!"

MESSAGE = greet("Spark")
print(MESSAGE)
`;
  const r = await runModule(code);
  check('functions defined and called at module level work and their effects are captured', r.ok && r.stdout === 'Hi, Spark!\n', r);
}

{
  // runFunction itself must be completely unaffected by the runTopLevel
  // refactor — same call, same expected result as before this change.
  const { runFunction } = await import('./evaluator.ts');
  const code = `
def solve(a, b):
    return a + b
`;
  const r = await runFunction(code, 'solve', [2, 3]);
  check('runFunction is unaffected by the runModule refactor', r.ok && r.result === 5, r);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
