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
  await check('sorted() on a list', `print(sorted([3,1,2]))`, '[1, 2, 3]\n');
  await check('sorted() on strings', `print(sorted(["banana","apple","cherry"]))`, "['apple', 'banana', 'cherry']\n");
  await check('sorted() does not mutate original', `l = [3,1,2]\nsorted(l)\nprint(l)`, '[3, 1, 2]\n');
  await check('enumerate() basic', `for i, x in enumerate(["a","b"]):\n    print(i, x)`, '0 a\n1 b\n');
  await check('enumerate() with start', `for i, x in enumerate(["a","b"], 1):\n    print(i, x)`, '1 a\n2 b\n');
  await check('sum() basic', `print(sum([1,2,3]))`, '6\n');
  await check('sum() with start', `print(sum([1,2,3], 10))`, '16\n');
  await check('any() true', `print(any([False, False, True]))`, 'True\n');
  await check('any() false', `print(any([False, False]))`, 'False\n');
  await check('all() true', `print(all([True, True]))`, 'True\n');
  await check('all() false', `print(all([True, False]))`, 'False\n');
  await check('chr()', `print(chr(65))`, 'A\n');
  await check('ord()', `print(ord("A"))`, '65\n');
  await check('chr()/ord() emoji roundtrip', `print(ord(chr(128512)))`, '128512\n');

  await check('list.sort() in place', `l = [3,1,2]\nl.sort()\nprint(l)`, '[1, 2, 3]\n');
  await check('list.remove()', `l = [1,2,3]\nl.remove(2)\nprint(l)`, '[1, 3]\n');
  await checkError('list.remove() missing value raises ValueError', `[1,2,3].remove(9)`, 'ValueError');
  await check('list.extend()', `l = [1,2]\nl.extend([3,4])\nprint(l)`, '[1, 2, 3, 4]\n');
  await check('list.reverse()', `l = [1,2,3]\nl.reverse()\nprint(l)`, '[3, 2, 1]\n');
  await check('list.insert()', `l = [1,3]\nl.insert(1, 2)\nprint(l)`, '[1, 2, 3]\n');
  await check('list.insert() negative index', `l = [1,2,3]\nl.insert(-1, 9)\nprint(l)`, '[1, 2, 9, 3]\n');

  await check('dict.pop()', `d = {"a": 1, "b": 2}\nprint(d.pop("a"))\nprint(d)`, "1\n{'b': 2}\n");
  await check('dict.pop() with default', `d = {}\nprint(d.pop("x", "none"))`, 'none\n');
  await checkError('dict.pop() missing key no default raises KeyError', `{}.pop("x")`, 'KeyError');

  await check('list() copies a list (not aliased)', `a = [1,2,3]\nb = list(a)\nb.append(4)\nprint(a)\nprint(b)`, '[1, 2, 3]\n[1, 2, 3, 4]\n');
  await check('list() from a string splits by codepoint', `print(list("ab"))`, "['a', 'b']\n");
  await check('dict() empty', `d = dict()\nd["x"] = 1\nprint(d)`, "{'x': 1}\n");
  await check('dict() copies (not aliased)', `a = {"x": 1}\nb = dict(a)\nb["y"] = 2\nprint(a)\nprint(b)`, "{'x': 1}\n{'x': 1, 'y': 2}\n");

  await check('isinstance() str', `print(isinstance("hi", str))`, 'True\n');
  await check('isinstance() list negative', `print(isinstance("hi", list))`, 'False\n');
  await check('isinstance() int accepts bool (Python semantics)', `print(isinstance(True, int))`, 'True\n');
  await check('isinstance() dict', `print(isinstance({}, dict))`, 'True\n');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
