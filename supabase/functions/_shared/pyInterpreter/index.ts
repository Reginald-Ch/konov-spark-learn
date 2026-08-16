export { runFunction } from './evaluator.ts';
export type { RunOptions, RunFunctionResult } from './evaluator.ts';
export type { PyErrorType } from './errors.ts';

import { runFunction, RunOptions } from './evaluator.ts';
import type { PyErrorType } from './errors.ts';

export interface TestCase {
  input_args: unknown[];
  expected_output: unknown;
}

export interface TestResult {
  index: number;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
}

export interface GradeResult {
  passedCount: number;
  total: number;
  results: TestResult[];
  hadError: boolean;
  errorType?: PyErrorType;
  errorMessage?: string;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as Record<string, unknown>);
    const bk = Object.keys(b as Record<string, unknown>);
    if (ak.length !== bk.length) return false;
    return ak.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

// Re-runs the code fresh per test case (full re-parse, fresh interpreter
// state) rather than sharing one interpreter instance across the whole
// test set — a small perf cost for a single small function, in exchange for
// making cross-test state leakage structurally impossible rather than
// something to reason about.
export async function gradeAgainstTests(code: string, functionName: string, tests: TestCase[], options?: RunOptions): Promise<GradeResult> {
  const results: TestResult[] = [];
  let passedCount = 0;
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const r = await runFunction(code, functionName, t.input_args, options);
    if (!r.ok) {
      // A code-level failure (syntax/unsupported/timeout) applies
      // identically to every test since it's the same code each time —
      // report it once rather than repeating it per test case.
      return { passedCount: 0, total: tests.length, results: [], hadError: true, errorType: r.errorType, errorMessage: r.errorMessage };
    }
    const passed = deepEqual(r.result, t.expected_output);
    if (passed) passedCount++;
    results.push({ index: i, passed, input: t.input_args, expected: t.expected_output, actual: r.result });
  }
  return { passedCount, total: tests.length, results, hadError: false };
}
