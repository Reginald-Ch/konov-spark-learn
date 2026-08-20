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
  // ── String slicing ──
  await check('s[1:3] basic slice', `print("hello"[1:3])`, 'el\n');
  await check('s[:3] omitted start', `print("hello"[:3])`, 'hel\n');
  await check('s[2:] omitted stop', `print("hello"[2:])`, 'llo\n');
  await check('s[:] full copy', `print("hello"[:])`, 'hello\n');
  await check('s[::-1] reverse', `print("hello"[::-1])`, 'olleh\n');
  await check('s[::2] step', `print("hello"[::2])`, 'hlo\n');
  await check('s[-3:-1] negative indices', `print("hello"[-3:-1])`, 'll\n');
  await check('s[10:20] out of range clamps to empty', `print("hello"[10:20])`, '\n');
  await check('s[100:] out of range clamps', `print("hello"[100:])`, '\n');
  await checkError('s[::0] step zero raises ValueError', `"hello"[::0]`, 'ValueError');

  // ── List slicing ──
  await check('list[1:3]', `print([1,2,3,4,5][1:3])`, '[2, 3]\n');
  await check('list[::-1] reverse', `print([1,2,3,4,5][::-1])`, '[5, 4, 3, 2, 1]\n');
  await check('list[1:4:2] step', `print([1,2,3,4,5][1:4:2])`, '[2, 4]\n');
  await check('list slice does not mutate original', `l = [1,2,3]\nx = l[1:]\nx.append(9)\nprint(l)`, '[1, 2, 3]\n');

  // ── Slicing assignment explicitly unsupported (not silently wrong) ──
  await checkError('slice assignment gives a clean unsupported error', `l = [1,2,3]\nl[0:2] = [9,9]`, 'slice assignment');

  // ── Normal single indexing still works (regression check) ──
  await check('single index unaffected', `print("hello"[1])`, 'e\n');
  await check('negative single index unaffected', `print([1,2,3][-1])`, '3\n');
  await checkError('empty subscript is a clean syntax error', `x = [1,2,3]\nx[]`, 'empty');

  // ── New string methods ──
  await check('find() basic', `print("hello world".find("world"))`, '6\n');
  await check('find() not found returns -1', `print("hello".find("xyz"))`, '-1\n');
  await checkError('index() raises when not found', `"hello".index("xyz")`, 'ValueError');
  await check('index() basic', `print("hello".index("l"))`, '2\n');
  await check('count() basic', `print("banana".count("a"))`, '3\n');
  await check('count() no overlap', `print("aaaa".count("aa"))`, '2\n');
  await check('isdigit() true', `print("12345".isdigit())`, 'True\n');
  await check('isdigit() false on letters', `print("123a".isdigit())`, 'False\n');
  await check('isalpha() true', `print("hello".isalpha())`, 'True\n');
  await check('isalpha() unicode letter true', `print("café".isalpha())`, 'True\n');
  await check('isalnum() mixed true', `print("abc123".isalnum())`, 'True\n');
  await check('lstrip() only strips left', `print("  hi  ".lstrip() + "|")`, 'hi  |\n');
  await check('rstrip() only strips right', `print("|" + "  hi  ".rstrip())`, '|  hi\n');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
