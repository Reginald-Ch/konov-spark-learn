import { runModule } from './evaluator.ts';

let pass = 0, fail = 0;
async function check(name: string, code: string, expectedStdout: string) {
  const r = await runModule(code, {});
  const ok = r.ok && r.stdout === expectedStdout;
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify({ ok: r.ok, stdout: r.stdout, err: r.errorMessage, expected: expectedStdout })); }
}

async function checkError(name: string, code: string, mustInclude: string) {
  const r = await runModule(code, {});
  const ok = !r.ok && (r.errorMessage || '').includes(mustInclude);
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify({ ok: r.ok, stdout: r.stdout, err: r.errorMessage })); }
}

async function run() {
  // Unicode/emoji
  await check('len() counts codepoints, not UTF-16 units', `s = "héllo wörld 😀"\nprint(len(s))`, '13\n');
  await check('iterating an emoji string yields whole characters', `out = ""\nfor ch in "a😀b":\n    out = out + ch + "|"\nprint(out)`, 'a|😀|b|\n');
  await check('indexing past an emoji lands on the next real character', `s = "a😀b"\nprint(s[2])`, 'b\n');

  // round() banker's rounding
  await check('round(2.5) rounds to even (2)', `print(round(2.5))`, '2\n');
  await check('round(1.5) rounds to even (2)', `print(round(1.5))`, '2\n');
  await check('round(0.5) rounds to even (0)', `print(round(0.5))`, '0\n');
  await check('round(-2.5) rounds to even (-2)', `print(round(-2.5))`, '-2\n');
  await check('round(3.2) unaffected', `print(round(3.2))`, '3\n');

  // int()/float() strict parsing
  await checkError('int("3.5") raises ValueError', `int("3.5")`, 'ValueError');
  await checkError('int("12abc") raises ValueError', `int("12abc")`, 'ValueError');
  await check('int("  42  ") still works with whitespace', `print(int("  42  "))`, '42\n');
  await check('int("-7") still works with sign', `print(int("-7"))`, '-7\n');
  await checkError('float("3.5abc") raises ValueError', `float("3.5abc")`, 'ValueError');
  await check('float("3.5") still works', `print(float("3.5"))`, '3.5\n');
  await check('float("1e3") still works (scientific notation)', `print(float("1e3"))`, '1000\n');

  // dict key normalization
  await check('1 in {True: "yes"} is True (hash(True) == hash(1))', `d = {True: "yes"}\nprint(1 in d)`, 'True\n');
  await check('dict with True and 1 as keys collapses to one entry', `d = {1: "a", True: "b"}\nprint(len(d))`, '1\n');
  await check('False/0 also collapse', `d = {False: "a", 0: "b"}\nprint(len(d))`, '1\n');

  // //=, %=, **= augmented assignment
  await check('x //= 3 floor-divides in place', `x = 10\nx //= 3\nprint(x)`, '3\n');
  await check('x %= 3 mods in place', `x = 10\nx %= 3\nprint(x)`, '1\n');
  await check('x **= 5 powers in place', `x = 2\nx **= 5\nprint(x)`, '32\n');

  // set literal -> clean "unsupported" error, not a cryptic parse error
  await checkError('a set literal gives a clear unsupported-syntax message', `s = {1, 2, 3}`, 'set literal');
  await check('a dict literal still parses correctly (no false positive)', `d = {"a": 1, "b": 2}\nprint(d["a"])`, '1\n');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
