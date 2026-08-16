import { runFunction } from './evaluator.ts';
import { gradeAgainstTests } from './index.ts';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, JSON.stringify(detail)); }
}

{
  const code = `
def solve(a, b):
    total = a + b
    label = f"sum is {total}"
    return label
`;
  const r = runFunction(code, 'solve', [3, 4]);
  check('basic function + f-string', r.ok && r.result === 'sum is 7', r);
}

{
  const code = `
def solve(x):
    print("got", x)
    print(f"double is {x * 2}")
    return x * 2
`;
  const r = runFunction(code, 'solve', [5]);
  check('print output captured', r.ok && r.result === 10 && r.stdout === 'got 5\ndouble is 10\n', r);
}

{
  const code = `
def solve(a, b):
    return a / b
`;
  const r = runFunction(code, 'solve', [1, 0]);
  check('runtime_error on div by zero', !r.ok && r.errorType === 'runtime_error', r);
}

{
  const code = `
def solve(n):
    if n > 0:
        return "positive"
    elif n < 0:
        return "negative"
    else:
        return "zero"
`;
  check('if/elif/else positive', runFunction(code, 'solve', [5]).result === 'positive');
  check('if/elif/else negative', runFunction(code, 'solve', [-5]).result === 'negative');
  check('if/elif/else zero', runFunction(code, 'solve', [0]).result === 'zero');
}

{
  const code = `
def solve(n):
    out = []
    for i in range(n):
        out.append(i * i)
    return out
`;
  const r = runFunction(code, 'solve', [5]);
  check('for/range/append', r.ok && JSON.stringify(r.result) === JSON.stringify([0, 1, 4, 9, 16]), r);
}

{
  const code = `
def solve(n):
    total = 0
    i = 0
    while True:
        i += 1
        if i > n:
            break
        if i % 2 == 0:
            continue
        total += i
    return total
`;
  const r = runFunction(code, 'solve', [10]);
  check('while/break/continue (sum of odds 1..10 = 25)', r.ok && r.result === 25, r);
}

{
  const code = `
def solve(message):
    m = message.lower().strip()
    responses = {"hi": "hello!", "bye": "goodbye!"}
    if m in responses:
        return responses[m]
    return "not sure what you mean"
`;
  check('dict + string methods hi', runFunction(code, 'solve', ['  HI  ']).result === 'hello!');
  check('dict + string methods unknown', runFunction(code, 'solve', ['xyz']).result === 'not sure what you mean');
}

{
  const code = `
def solve(items):
    items.append("new")
    return len(items)
`;
  const r = runFunction(code, 'solve', [['a', 'b']]);
  check('list.append + len', r.ok && r.result === 3, r);
}

{
  const code = `
import os
def solve(x):
    return x
`;
  const r = runFunction(code, 'solve', [1]);
  check('unsupported_syntax on import', !r.ok && r.errorType === 'unsupported_syntax', r);
}

{
  const code = `
class Foo:
    pass
def solve(x):
    return x
`;
  const r = runFunction(code, 'solve', [1]);
  check('unsupported_syntax on class', !r.ok && r.errorType === 'unsupported_syntax', r);
}

{
  const code = `
def solve(x)
    return x
`;
  const r = runFunction(code, 'solve', [1]);
  check('syntax_error on missing colon', !r.ok && r.errorType === 'syntax_error', r);
}

{
  const code = `
def solve(x):
    while True:
        x = x + 1
    return x
`;
  const start = Date.now();
  const r = runFunction(code, 'solve', [1], { timeoutMs: 500, maxSteps: 5000000 });
  const elapsed = Date.now() - start;
  check('timeout on while True', !r.ok && r.errorType === 'timeout' && elapsed < 3000, { ...r, elapsed });
}

{
  const code = `
def solve(x):
    return y
`;
  const r = runFunction(code, 'solve', [1]);
  check('runtime_error NameError', !r.ok && r.errorType === 'runtime_error' && /y/.test(r.errorMessage || ''), r);
}

{
  const code = `
def other(x):
    return x
`;
  const r = runFunction(code, 'solve', [1]);
  check('missing entrypoint reported cleanly', !r.ok && r.errorType === 'runtime_error', r);
}

{
  const code = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def solve(n):
    return factorial(n)
`;
  const r = runFunction(code, 'solve', [6]);
  check('recursion (6! = 720)', r.ok && r.result === 720, r);
}

{
  const code = `
def solve(a, b):
    return a + b
`;
  const tests = [
    { input_args: [1, 2], expected_output: 3 },
    { input_args: [10, -5], expected_output: 5 },
    { input_args: [0, 0], expected_output: 1 },
  ];
  const g = gradeAgainstTests(code, 'solve', tests);
  check('gradeAgainstTests 2/3 pass', !g.hadError && g.passedCount === 2 && g.total === 3, g);
}

{
  const code = `
def solve(a, b):
    return a / 0
`;
  const tests = [
    { input_args: [1, 2], expected_output: 3 },
    { input_args: [10, -5], expected_output: 5 },
  ];
  const g = gradeAgainstTests(code, 'solve', tests);
  check('gradeAgainstTests reports single error, not per-test', g.hadError && g.errorType === 'runtime_error', g);
}

{
  const code = `
def solve(x):
    f = lambda y: y + 1
    return f(x)
`;
  const r = runFunction(code, 'solve', [1]);
  check('unsupported_syntax on lambda', !r.ok && r.errorType === 'unsupported_syntax', r);
}

{
  const code = `
# This should run identically in real CPython too.
def solve(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result
`;
  const r = runFunction(code, 'solve', [15]);
  const expected = ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'];
  check('FizzBuzz (real Python semantics)', r.ok && JSON.stringify(r.result) === JSON.stringify(expected), r);
}

{
  // break in the inner loop must not affect the outer loop
  const code = `
def solve(n):
    out = []
    for i in range(n):
        for j in range(n):
            if j == 2:
                break
            out.append([i, j])
    return len(out)
`;
  const r = runFunction(code, 'solve', [4]);
  check('nested loop: break only affects inner loop', r.ok && r.result === 8, r);
}

{
  const code = `
def solve(s):
    return s[-1]
`;
  const r = runFunction(code, 'solve', ['hello']);
  check('negative string indexing', r.ok && r.result === 'o', r);
}

{
  const code = `
def solve(n):
    if n > 0:
      return "bad indent, 2 spaces then 4"
        return "never"
`;
  const r = runFunction(code, 'solve', [1]);
  check('inconsistent indentation -> syntax_error', !r.ok && r.errorType === 'syntax_error', r);
}

{
  // 4+ elif chain
  const code = `
def solve(n):
    if n == 1:
        return "one"
    elif n == 2:
        return "two"
    elif n == 3:
        return "three"
    elif n == 4:
        return "four"
    else:
        return "other"
`;
  check('4-way elif chain', runFunction(code, 'solve', [3]).result === 'three');
  check('4-way elif chain else', runFunction(code, 'solve', [99]).result === 'other');
}

{
  // f-string with a (unsupported) format spec should degrade gracefully, not hard-crash the parser
  const code = `
def solve(x):
    return f"value: {x:.2f}"
`;
  const r = runFunction(code, 'solve', [3.14159]);
  check('f-string format spec dropped gracefully', r.ok, r);
}

{
  // chained comparison a < b < c
  const code = `
def solve(a, b, c):
    return a < b < c
`;
  check('chained comparison true', runFunction(code, 'solve', [1, 2, 3]).result === true);
  check('chained comparison false', runFunction(code, 'solve', [1, 5, 3]).result === false);
}

// ── New syntax: random module ──
{
  const code = `
import random
def solve(seed):
    options = ["a", "b", "c"]
    pick = random.choice(options)
    return pick in options
`;
  const r = runFunction(code, 'solve', [1]);
  check('import random + random.choice() works', r.ok && r.result === true, r);
}

{
  const code = `
import random
def solve():
    n = random.randint(5, 5)
    return n
`;
  const r = runFunction(code, 'solve', []);
  check('random.randint(5, 5) is always 5', r.ok && r.result === 5, r);
}

{
  const code = `
def solve():
    return random.random()
`;
  const r = runFunction(code, 'solve', []);
  check('random module not imported -> NameError, not silently available', !r.ok && r.errorType === 'runtime_error', r);
}

{
  const code = `
import os
def solve():
    return 1
`;
  const r = runFunction(code, 'solve', []);
  check('import of a non-allowlisted module still rejected', !r.ok && r.errorType === 'unsupported_syntax', r);
}

// ── New syntax: for-loop unpacking ──
{
  const code = `
def solve(d):
    out = []
    for k, v in d.items():
        out.append(f"{k}={v}")
    return out
`;
  const r = runFunction(code, 'solve', [{ a: 1, b: 2 }]);
  check('for k, v in dict.items() unpacking', r.ok && JSON.stringify(r.result) === JSON.stringify(['a=1', 'b=2']), r);
}

{
  const code = `
def solve(pairs):
    total = 0
    for a, b in pairs:
        total += a * b
    return total
`;
  const r = runFunction(code, 'solve', [[[2, 3], [4, 5]]]);
  check('for a, b in list-of-lists unpacking', r.ok && r.result === 26, r);
}

{
  const code = `
def solve(pairs):
    for a, b, c in pairs:
        return a
`;
  const r = runFunction(code, 'solve', [[[1, 2]]]);
  check('unpacking wrong count raises a clean ValueError, not a crash', !r.ok && r.errorType === 'runtime_error' && /unpack/.test(r.errorMessage || ''), r);
}

// ── New syntax: try/except ──
{
  const code = `
def solve(a, b):
    try:
        return a / b
    except:
        return -1
`;
  check('try/except catches a real runtime error', runFunction(code, 'solve', [10, 0]).result === -1);
  check('try/except: no error means except is skipped', runFunction(code, 'solve', [10, 2]).result === 5);
}

{
  const code = `
def solve(a, b):
    try:
        return a / b
    except Exception as e:
        return e
`;
  const r = runFunction(code, 'solve', [1, 0]);
  check('except ... as e binds the error message as a string', r.ok && typeof r.result === 'string' && /ZeroDivision/.test(r.result as string), r);
}

{
  // The critical safety property: try/except must NEVER be able to catch a
  // timeout, or it becomes a way to defeat the whole execution budget.
  const code = `
def solve(x):
    while True:
        try:
            x = x + 1
        except:
            pass
    return x
`;
  const r = runFunction(code, 'solve', [1], { timeoutMs: 500, maxSteps: 5000000 });
  check('try/except cannot swallow a timeout (critical safety property)', !r.ok && r.errorType === 'timeout', r);
}

{
  const code = `
def solve(x):
    try:
        return x.nonexistent_method()
    except ValueError:
        return "caught"
`;
  const r = runFunction(code, 'solve', [5]);
  check('except <AnyName> (untyped matching) still catches', r.ok && r.result === 'caught', r);
}

{
  const code = `
def solve(x):
    try:
        return 1 / 0
    finally:
        pass
`;
  const r = runFunction(code, 'solve', [1]);
  check('try without except (finally only) is a clean syntax_error, not a crash', !r.ok && r.errorType === 'syntax_error', r);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
