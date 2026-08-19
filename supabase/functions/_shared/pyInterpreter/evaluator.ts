import type { Expr, Stmt, Program } from './ast.ts';
import { parseProgram } from './parser.ts';
import { PyError, PyRuntimeError, PySyntaxError, PyTimeoutError, PyErrorType } from './errors.ts';

// ── Value representation ──
// Primitives (number/string/boolean/null) are plain JS values — the
// language doesn't distinguish int from float internally, matching how
// JSON (the wire format for test cases and results) already treats numbers.
// list/dict/function/builtin are tagged objects so runtime type checks are
// a single field read.

export interface PyList { __pytype: 'list'; items: PyValue[] }
export interface PyDict { __pytype: 'dict'; map: Map<string | number | boolean, PyValue> }
export interface PyFunction { __pytype: 'function'; name: string; params: string[]; body: Stmt[]; closure: Environment }
// Builtins are always async — the only builtin that actually needs to await
// anything is `ai_generate` (a real network call), but every builtin shares
// one uniform Promise-returning shape so callValue never has to branch on
// sync-vs-async. Awaiting a synchronous builtin's already-resolved value is
// a no-op, so this costs nothing for print/len/range/etc.
export interface PyBuiltin { __pytype: 'builtin'; name: string; fn: (args: PyValue[], line: number) => Promise<PyValue> }
// Backs the `import random` carve-out — attribute access (`random.choice`)
// dispatches into `methods`, the same shape as callMethod's str/list/dict
// tables below, just reached via a module value instead of a builtin type.
// Module methods stay synchronous — nothing under `import` needs network
// access, so there's no reason to pay the async-propagation cost here.
export interface PyModule { __pytype: 'module'; name: string; methods: Record<string, (args: PyValue[], line: number) => PyValue> }
export type PyValue = number | string | boolean | null | PyList | PyDict | PyFunction | PyBuiltin | PyModule;

const isList = (v: PyValue): v is PyList => typeof v === 'object' && v !== null && (v as any).__pytype === 'list';
const isDict = (v: PyValue): v is PyDict => typeof v === 'object' && v !== null && (v as any).__pytype === 'dict';
const isFunction = (v: PyValue): v is PyFunction => typeof v === 'object' && v !== null && (v as any).__pytype === 'function';
const isBuiltin = (v: PyValue): v is PyBuiltin => typeof v === 'object' && v !== null && (v as any).__pytype === 'builtin';
const isModule = (v: PyValue): v is PyModule => typeof v === 'object' && v !== null && (v as any).__pytype === 'module';
const isCallable = (v: PyValue): v is PyFunction | PyBuiltin => isFunction(v) || isBuiltin(v);
const makeList = (items: PyValue[]): PyList => ({ __pytype: 'list', items });

function describeType(v: PyValue): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (isList(v)) return 'list';
  if (isDict(v)) return 'dict';
  if (isFunction(v) || isBuiltin(v)) return 'function';
  if (isModule(v)) return 'module';
  return 'object';
}

function toDictKey(v: PyValue, line: number): string | number | boolean {
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  throw new PyRuntimeError(`TypeError: unhashable type: '${describeType(v)}'`, line);
}

function isTruthy(v: PyValue): boolean {
  if (v === null || v === false || v === 0 || v === '') return false;
  if (isList(v)) return v.items.length > 0;
  if (isDict(v)) return v.map.size > 0;
  return true;
}

// Caps recursion cost inside pyEquals/pyStr/pyRepr — every OTHER place the
// interpreter does work ticks Budget on each step, but these three are
// plain recursive JS functions called from many sites (== / in / .count() /
// .index() / str() / print()) with no budget parameter at all. Two lists
// built by doubling a shared reference N times (`a = [a, a]`) are each one
// budget tick per doubling, but comparing or stringifying them afterward
// visits up to 2^N nodes with zero ticks — measured at N=30, `a == b` on two
// independently-built such lists took ~59 seconds of real CPU with the
// timeout never firing, because nothing inside the comparison itself was
// ever checked against the budget or the wall clock. This is a local,
// hardcoded visit cap (not threaded through Budget) specifically so it
// doesn't require changing every call site's signature — same effect
// (bounded work) without touching the thirty-odd unrelated builtins that
// call these functions.
const MAX_STRUCTURAL_VISITS = 200000;
// Separate from MAX_STRUCTURAL_VISITS: two mutually self-referential
// structures (a.items[0] = a; b.items[0] = b; a == b, with a !== b so the
// x===y shortcut below never fires) recurse to equal DEPTH on every visit,
// not just many total visits — real V8 stack limits are typically ~10-15k
// frames, well below the 200000 visit cap, so that cap alone still let a
// genuine cycle overflow the actual JS call stack before ever being
// caught. A single self-referential structure compared/stringified
// against ITSELF is fine either way (x===y / the object identity check
// short-circuits immediately), so this only bites the "two different
// cyclic structures" case in practice, but it's cheap insurance regardless.
const MAX_STRUCTURAL_DEPTH = 1000;

function pyEquals(a: PyValue, b: PyValue): boolean {
  let visits = 0;
  const eq = (x: PyValue, y: PyValue, depth: number): boolean => {
    if (++visits > MAX_STRUCTURAL_VISITS || depth > MAX_STRUCTURAL_DEPTH) {
      throw new PyTimeoutError('Comparing these values took too long — they may be too large, deeply nested, or self-referential.');
    }
    if (x === y) return true;
    if (isList(x) && isList(y)) return x.items.length === y.items.length && x.items.every((v, i) => eq(v, y.items[i], depth + 1));
    if (isDict(x) && isDict(y)) {
      if (x.map.size !== y.map.size) return false;
      for (const [k, v] of x.map.entries()) { if (!y.map.has(k) || !eq(v, y.map.get(k)!, depth + 1)) return false; }
      return true;
    }
    return false;
  };
  return eq(a, b, 0);
}

function numberToPyString(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(v);
}

function pyStr(v: PyValue): string {
  let visits = 0;
  // Unlike pyEquals, stringifying has no "same object" shortcut to save it
  // — a.append(a); print(a) recurses on ITSELF with nothing to short-
  // circuit, so the depth cap is what actually catches this one, not the
  // visit cap (which a single-object cycle wouldn't reach at any
  // reasonable list size before the real JS stack overflows first).
  const str = (x: PyValue, depth: number): string => {
    if (++visits > MAX_STRUCTURAL_VISITS || depth > MAX_STRUCTURAL_DEPTH) {
      throw new PyTimeoutError('Converting this value to text took too long — it may be too large, deeply nested, or self-referential.');
    }
    if (x === null) return 'None';
    if (typeof x === 'boolean') return x ? 'True' : 'False';
    if (typeof x === 'number') return numberToPyString(x);
    if (typeof x === 'string') return x;
    if (isList(x)) return '[' + x.items.map(item => repr(item, depth + 1)).join(', ') + ']';
    if (isDict(x)) return '{' + [...x.map.entries()].map(([k, val]) => `${repr(k as PyValue, depth + 1)}: ${repr(val, depth + 1)}`).join(', ') + '}';
    if (isFunction(x) || isBuiltin(x)) return `<function ${x.name}>`;
    if (isModule(x)) return `<module '${x.name}'>`;
    return String(x);
  };
  const repr = (x: PyValue, depth: number): string => {
    if (++visits > MAX_STRUCTURAL_VISITS || depth > MAX_STRUCTURAL_DEPTH) {
      throw new PyTimeoutError('Converting this value to text took too long — it may be too large, deeply nested, or self-referential.');
    }
    if (typeof x === 'string') return `'${x.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    return str(x, depth);
  };
  return str(v, 0);
}

function pyRepr(v: PyValue): string {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return pyStr(v);
}

// ── Environment (scope chain) ──
// No `global`/`nonlocal` support (both are in the parser's unsupported-
// keyword list), so assignment always writes the current scope — matches
// the subset's own rules rather than trying to half-implement Python's
// fuller scoping semantics.
export class Environment {
  private vars = new Map<string, PyValue>();
  constructor(private parent: Environment | null = null) {}

  get(name: string, line: number): PyValue {
    let env: Environment | null = this;
    while (env) { if (env.vars.has(name)) return env.vars.get(name)!; env = env.parent; }
    throw new PyRuntimeError(`NameError: name '${name}' is not defined`, line);
  }
  has(name: string): boolean {
    let env: Environment | null = this;
    while (env) { if (env.vars.has(name)) return true; env = env.parent; }
    return false;
  }
  set(name: string, value: PyValue): void { this.vars.set(name, value); }
}

// ── Control-flow signals ── (internal only, never surfaced as PyError)
class ReturnSignal { constructor(public value: PyValue) {} }
class BreakSignal {}
class ContinueSignal {}

// ── Execution budget ── native to our own evaluator loop, so a runaway
// `while True` is interrupted mid-loop rather than needing an external
// library's cooperative yield hook or an outer Promise.race abandonment.
// `Date.now()` polling keeps working correctly across `await` points too —
// wall-clock time still advances during a real network call, so a slow
// `ai_generate()` correctly eats into the same deadline as everything else.
export class Budget {
  private steps = 0;
  private readonly deadline: number;
  constructor(private readonly maxSteps: number, timeoutMs: number) { this.deadline = Date.now() + timeoutMs; }
  tick(): void {
    this.steps++;
    if (this.steps > this.maxSteps || Date.now() > this.deadline) throw new PyTimeoutError();
  }
  remainingMs(): number { return this.deadline - Date.now(); }
}

const MAX_STDOUT_CHARS = 20000;
// Below this much remaining budget, don't even attempt an ai_generate()
// fetch — it mathematically can't complete in time, and skipping it avoids
// burning a shared AI-gateway slot on a call doomed to time out anyway.
const MIN_AI_CALL_BUDGET_MS = 500;

class Interpreter {
  async execStmts(stmts: Stmt[], env: Environment, budget: Budget, stdout: string[]): Promise<void> {
    for (const s of stmts) await this.execStmt(s, env, budget, stdout);
  }

  async execStmt(stmt: Stmt, env: Environment, budget: Budget, stdout: string[]): Promise<void> {
    budget.tick();
    switch (stmt.kind) {
      case 'ExprStmt': await this.evalExpr(stmt.expr, env, budget, stdout); return;
      case 'Assign': {
        const value = await this.evalExpr(stmt.value, env, budget, stdout);
        await this.assignTo(stmt.targets[0], value, env, budget, stdout);
        return;
      }
      case 'AugAssign': {
        const current = await this.evalExpr(stmt.target, env, budget, stdout);
        const rhs = await this.evalExpr(stmt.value, env, budget, stdout);
        const result = this.binOp(stmt.op, current, rhs, stmt.line);
        await this.assignTo(stmt.target, result, env, budget, stdout);
        return;
      }
      case 'If': {
        if (isTruthy(await this.evalExpr(stmt.test, env, budget, stdout))) await this.execStmts(stmt.body, env, budget, stdout);
        else await this.execStmts(stmt.orelse, env, budget, stdout);
        return;
      }
      case 'For': {
        const iterVal = await this.evalExpr(stmt.iter, env, budget, stdout);
        for (const item of this.toIterable(iterVal, stmt.line)) {
          budget.tick();
          this.bindForTarget(stmt.target, item, env, stmt.line);
          try { await this.execStmts(stmt.body, env, budget, stdout); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'Try': {
        try {
          await this.execStmts(stmt.body, env, budget, stdout);
        } catch (e) {
          // Never catch our own control-flow signals or a timeout — a
          // try/except that could swallow a timeout would defeat the whole
          // execution budget (wrap a runaway loop — or a slow ai_generate()
          // call — in try/except, ignore the interrupt, keep going forever).
          // Only genuine runtime errors are catchable, matching what
          // "except:" should mean here. `await` inside the try above turns
          // a rejected promise into a thrown error here exactly like a
          // synchronous throw would, so this needs no async-specific logic.
          if (e instanceof BreakSignal || e instanceof ContinueSignal || e instanceof ReturnSignal) throw e;
          if (e instanceof PyError && e.type !== 'runtime_error') throw e;
          if (!(e instanceof PyError)) throw e;
          if (stmt.exceptVar) env.set(stmt.exceptVar, e.message);
          await this.execStmts(stmt.exceptBody, env, budget, stdout);
        }
        return;
      }
      case 'Import': {
        env.set(stmt.module, createModule(stmt.module, stmt.line));
        return;
      }
      case 'While': {
        while (isTruthy(await this.evalExpr(stmt.test, env, budget, stdout))) {
          budget.tick();
          try { await this.execStmts(stmt.body, env, budget, stdout); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'FunctionDef': {
        const fn: PyFunction = { __pytype: 'function', name: stmt.name, params: stmt.params, body: stmt.body, closure: env };
        env.set(stmt.name, fn);
        return;
      }
      case 'Return': {
        const value = stmt.value ? await this.evalExpr(stmt.value, env, budget, stdout) : null;
        throw new ReturnSignal(value);
      }
      case 'Pass': return;
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
    }
  }

  async evalExpr(expr: Expr, env: Environment, budget: Budget, stdout: string[]): Promise<PyValue> {
    budget.tick();
    switch (expr.kind) {
      case 'NumberLit': return expr.value;
      case 'StringLit': return expr.value;
      case 'BoolLit': return expr.value;
      case 'NoneLit': return null;
      case 'FStringLit': {
        let out = '';
        for (const part of expr.parts) {
          out += part.kind === 'str' ? part.value : pyStr(await this.evalExpr(part.expr, env, budget, stdout));
        }
        return out;
      }
      case 'Name': return env.get(expr.name, expr.line);
      case 'ListLit': {
        // Sequential, not `.map(async ...)` — a `.map` with an async
        // callback evaluates every element concurrently and out of order,
        // which would break Python's guaranteed left-to-right evaluation
        // once an element can be an `ai_generate(...)` call, and would let
        // a single list literal fire several AI-gateway requests at once.
        const items: PyValue[] = [];
        for (const e of expr.elements) items.push(await this.evalExpr(e, env, budget, stdout));
        return makeList(items);
      }
      case 'ListComp': {
        const iterVal = await this.evalExpr(expr.iter, env, budget, stdout);
        const items: PyValue[] = [];
        for (const item of this.toIterable(iterVal, expr.line)) {
          budget.tick();
          this.bindForTarget(expr.target, item, env, expr.line);
          if (expr.cond && !isTruthy(await this.evalExpr(expr.cond, env, budget, stdout))) continue;
          items.push(await this.evalExpr(expr.expr, env, budget, stdout));
        }
        return makeList(items);
      }
      case 'DictLit': {
        const map = new Map<string | number | boolean, PyValue>();
        for (let i = 0; i < expr.keys.length; i++) {
          const k = await this.evalExpr(expr.keys[i], env, budget, stdout);
          map.set(toDictKey(k, expr.line), await this.evalExpr(expr.values[i], env, budget, stdout));
        }
        return { __pytype: 'dict', map };
      }
      case 'UnaryOp': {
        const v = await this.evalExpr(expr.operand, env, budget, stdout);
        if (expr.op === 'not') return !isTruthy(v);
        if (typeof v !== 'number') throw new PyRuntimeError(`TypeError: bad operand type for unary ${expr.op}: '${describeType(v)}'`, expr.line);
        return expr.op === '-' ? -v : v;
      }
      case 'BoolOp': {
        if (expr.op === 'and') {
          let last: PyValue = true;
          for (const v of expr.values) { last = await this.evalExpr(v, env, budget, stdout); if (!isTruthy(last)) return last; }
          return last;
        }
        let last: PyValue = false;
        for (const v of expr.values) { last = await this.evalExpr(v, env, budget, stdout); if (isTruthy(last)) return last; }
        return last;
      }
      case 'Compare': {
        let left = await this.evalExpr(expr.left, env, budget, stdout);
        for (let i = 0; i < expr.ops.length; i++) {
          const right = await this.evalExpr(expr.comparators[i], env, budget, stdout);
          if (!this.compareValues(expr.ops[i], left, right, expr.line)) return false;
          left = right;
        }
        return true;
      }
      case 'BinOp': {
        const l = await this.evalExpr(expr.left, env, budget, stdout);
        const r = await this.evalExpr(expr.right, env, budget, stdout);
        return this.binOp(expr.op, l, r, expr.line);
      }
      case 'Call': return await this.evalCall(expr, env, budget, stdout);
      case 'Attribute':
        throw new PyRuntimeError(`AttributeError: '.${expr.attr}' is only supported as a direct method call, e.g. x.${expr.attr}(...)`, expr.line);
      case 'Subscript': {
        const obj = await this.evalExpr(expr.obj, env, budget, stdout);
        const idx = await this.evalExpr(expr.index, env, budget, stdout);
        return this.subscriptGet(obj, idx, expr.line);
      }
    }
  }

  private async evalCall(expr: Extract<Expr, { kind: 'Call' }>, env: Environment, budget: Budget, stdout: string[]): Promise<PyValue> {
    if (expr.func.kind === 'Attribute') {
      const obj = await this.evalExpr(expr.func.obj, env, budget, stdout);
      // Sequential for the same reason as ListLit above — argument order
      // and single-flight AI calls must be preserved.
      const args: PyValue[] = [];
      for (const a of expr.args) args.push(await this.evalExpr(a, env, budget, stdout));
      return this.callMethod(obj, expr.func.attr, args, expr.line);
    }
    const fnVal = await this.evalExpr(expr.func, env, budget, stdout);
    const args: PyValue[] = [];
    for (const a of expr.args) args.push(await this.evalExpr(a, env, budget, stdout));
    return await this.callValue(fnVal, args, budget, stdout, expr.line);
  }

  async callValue(fnVal: PyValue, args: PyValue[], budget: Budget, stdout: string[], line: number): Promise<PyValue> {
    if (isBuiltin(fnVal)) return await fnVal.fn(args, line);
    if (isFunction(fnVal)) {
      if (args.length !== fnVal.params.length) {
        throw new PyRuntimeError(`TypeError: ${fnVal.name}() takes ${fnVal.params.length} argument(s) but ${args.length} were given`, line);
      }
      const callEnv = new Environment(fnVal.closure);
      fnVal.params.forEach((p, i) => callEnv.set(p, args[i]));
      try {
        await this.execStmts(fnVal.body, callEnv, budget, stdout);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        if (e instanceof BreakSignal || e instanceof ContinueSignal) throw new PySyntaxError("'break'/'continue' outside a loop", line);
        throw e;
      }
      return null;
    }
    throw new PyRuntimeError(`TypeError: '${describeType(fnVal)}' object is not callable`, line);
  }

  private async assignTo(target: Expr, value: PyValue, env: Environment, budget: Budget, stdout: string[]): Promise<void> {
    if (target.kind === 'Name') { env.set(target.name, value); return; }
    if (target.kind === 'Subscript') {
      const obj = await this.evalExpr(target.obj, env, budget, stdout);
      const idx = await this.evalExpr(target.index, env, budget, stdout);
      this.subscriptSet(obj, idx, value, target.line);
      return;
    }
    throw new PyRuntimeError('This isn\'t something you can assign to.', target.line);
  }

  private toIterable(v: PyValue, line: number): PyValue[] {
    if (isList(v)) return v.items;
    if (typeof v === 'string') return v.split('');
    throw new PyRuntimeError(`TypeError: '${describeType(v)}' object is not iterable`, line);
  }

  private bindForTarget(target: string[], item: PyValue, env: Environment, line: number): void {
    if (target.length === 1) { env.set(target[0], item); return; }
    if (!isList(item) || item.items.length !== target.length) {
      const got = isList(item) ? String(item.items.length) : `a ${describeType(item)}`;
      throw new PyRuntimeError(`ValueError: expected ${target.length} values to unpack, got ${got}`, line);
    }
    target.forEach((name, i) => env.set(name, item.items[i]));
  }

  private subscriptGet(obj: PyValue, idx: PyValue, line: number): PyValue {
    if (isList(obj)) {
      if (typeof idx !== 'number') throw new PyRuntimeError('TypeError: list indices must be integers', line);
      let i = idx; if (i < 0) i += obj.items.length;
      if (i < 0 || i >= obj.items.length) throw new PyRuntimeError('IndexError: list index out of range', line);
      return obj.items[i];
    }
    if (isDict(obj)) {
      const key = toDictKey(idx, line);
      if (!obj.map.has(key)) throw new PyRuntimeError(`KeyError: ${pyRepr(idx)}`, line);
      return obj.map.get(key)!;
    }
    if (typeof obj === 'string') {
      if (typeof idx !== 'number') throw new PyRuntimeError('TypeError: string indices must be integers', line);
      let i = idx; if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw new PyRuntimeError('IndexError: string index out of range', line);
      return obj[i];
    }
    throw new PyRuntimeError(`TypeError: '${describeType(obj)}' object is not subscriptable`, line);
  }

  private subscriptSet(obj: PyValue, idx: PyValue, value: PyValue, line: number): void {
    if (isList(obj)) {
      if (typeof idx !== 'number') throw new PyRuntimeError('TypeError: list indices must be integers', line);
      let i = idx; if (i < 0) i += obj.items.length;
      if (i < 0 || i >= obj.items.length) throw new PyRuntimeError('IndexError: list assignment index out of range', line);
      obj.items[i] = value;
      return;
    }
    if (isDict(obj)) { obj.map.set(toDictKey(idx, line), value); return; }
    throw new PyRuntimeError(`TypeError: '${describeType(obj)}' object does not support item assignment`, line);
  }

  private compareValues(op: string, l: PyValue, r: PyValue, line: number): boolean {
    if (op === '==') return pyEquals(l, r);
    if (op === '!=') return !pyEquals(l, r);
    if (op === 'in') return this.containsCheck(l, r, line);
    if (op === 'not in') return !this.containsCheck(l, r, line);
    if (typeof l === 'number' && typeof r === 'number') {
      switch (op) { case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r; }
    }
    if (typeof l === 'string' && typeof r === 'string') {
      switch (op) { case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r; }
    }
    throw new PyRuntimeError(`TypeError: '${op}' not supported between instances of '${describeType(l)}' and '${describeType(r)}'`, line);
  }

  private containsCheck(needle: PyValue, hay: PyValue, line: number): boolean {
    if (typeof hay === 'string') {
      if (typeof needle !== 'string') throw new PyRuntimeError("TypeError: 'in <string>' requires string as left operand", line);
      return hay.includes(needle);
    }
    if (isList(hay)) return hay.items.some(v => pyEquals(v, needle));
    if (isDict(hay)) return hay.map.has(toDictKey(needle, line));
    throw new PyRuntimeError(`TypeError: argument of type '${describeType(hay)}' is not iterable`, line);
  }

  private binOp(op: string, l: PyValue, r: PyValue, line: number): PyValue {
    if (op === '+') {
      if (typeof l === 'number' && typeof r === 'number') return l + r;
      if (typeof l === 'string' && typeof r === 'string') return l + r;
      if (isList(l) && isList(r)) return makeList([...l.items, ...r.items]);
      throw new PyRuntimeError(`TypeError: unsupported operand type(s) for +: '${describeType(l)}' and '${describeType(r)}'`, line);
    }
    if (op === '*') {
      if (typeof l === 'number' && typeof r === 'number') return l * r;
      // Unlike range() (capped at 100000 items, checked before building —
      // see that fix above), string/list repeat had NO cap at all:
      // "a" * 20000000 built a 20MB string in ~1ms, one budget tick.
      // Same order-of-magnitude cap as range()'s, so this and range()
      // agree on what "too large" means.
      if (typeof l === 'string' && typeof r === 'number') {
        const count = Math.max(0, Math.trunc(r));
        if (l.length * count > 1000000) throw new PyRuntimeError('ValueError: repeated string is too large', line);
        return l.repeat(count);
      }
      if (typeof r === 'string' && typeof l === 'number') {
        const count = Math.max(0, Math.trunc(l));
        if (r.length * count > 1000000) throw new PyRuntimeError('ValueError: repeated string is too large', line);
        return r.repeat(count);
      }
      if (isList(l) && typeof r === 'number') {
        const count = Math.max(0, Math.trunc(r));
        if (l.items.length * count > 100000) throw new PyRuntimeError('ValueError: repeated list is too large', line);
        const out: PyValue[] = []; for (let i = 0; i < count; i++) out.push(...l.items); return makeList(out);
      }
      throw new PyRuntimeError(`TypeError: unsupported operand type(s) for *: '${describeType(l)}' and '${describeType(r)}'`, line);
    }
    if (typeof l !== 'number' || typeof r !== 'number') {
      throw new PyRuntimeError(`TypeError: unsupported operand type(s) for ${op}: '${describeType(l)}' and '${describeType(r)}'`, line);
    }
    switch (op) {
      case '-': return l - r;
      case '/': if (r === 0) throw new PyRuntimeError('ZeroDivisionError: division by zero', line); return l / r;
      case '//': if (r === 0) throw new PyRuntimeError('ZeroDivisionError: division by zero', line); return Math.floor(l / r);
      case '%': if (r === 0) throw new PyRuntimeError('ZeroDivisionError: modulo by zero', line); return ((l % r) + r) % r;
      case '**': return Math.pow(l, r);
    }
    throw new PyRuntimeError(`Unknown operator '${op}'`, line);
  }

  // Stays fully synchronous — methods (string/list/dict/module) never need
  // to await anything; `ai_generate` is a plain function reached via
  // `callValue`, not a method reached here.
  private callMethod(obj: PyValue, attr: string, args: PyValue[], line: number): PyValue {
    // hasOwnProperty, not just `if (!m)` — these tables are plain object
    // literals, so an attr like "constructor"/"toString"/"valueOf"
    // resolved through inherited Object.prototype members instead of
    // failing the lookup. Not a sandbox escape (every inherited member
    // either throws when called unbound under strict mode, or returns a
    // raw JS value with no __pytype that dead-ends on the next attribute
    // access) but it let a raw JS value/wrapper leak into PyValue space,
    // where every other part of the interpreter assumes the tagged union
    // — and the failure mode when it didn't dead-end cleanly was the
    // generic, uninformative "Something went wrong running this code."
    if (typeof obj === 'string') {
      const m = hasOwn(STRING_METHODS, attr) ? STRING_METHODS[attr] : undefined;
      if (!m) throw new PyRuntimeError(`AttributeError: 'str' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isList(obj)) {
      const m = hasOwn(LIST_METHODS, attr) ? LIST_METHODS[attr] : undefined;
      if (!m) throw new PyRuntimeError(`AttributeError: 'list' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isDict(obj)) {
      const m = hasOwn(DICT_METHODS, attr) ? DICT_METHODS[attr] : undefined;
      if (!m) throw new PyRuntimeError(`AttributeError: 'dict' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isModule(obj)) {
      const m = hasOwn(obj.methods, attr) ? obj.methods[attr] : undefined;
      if (!m) throw new PyRuntimeError(`AttributeError: module '${obj.name}' has no attribute '${attr}'`, line);
      return m(args, line);
    }
    throw new PyRuntimeError(`AttributeError: '${describeType(obj)}' object has no attribute '${attr}'`, line);
  }
}

const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

const STRING_METHODS: Record<string, (s: string, args: PyValue[], line: number) => PyValue> = {
  lower: (s) => s.toLowerCase(),
  upper: (s) => s.toUpperCase(),
  strip: (s) => s.trim(),
  // Matches real CPython's actual `str.title()` exactly, including its
  // well-known apostrophe quirk ("let's go".title() == "Let'S Go", not
  // "Let's Go") — a word boundary is any non-letter, not just whitespace,
  // so an apostrophe inside a contraction still starts a new "word." Real
  // Python behaves this way too; matching it (not the more intuitive
  // result) is what "identical to CPython" means for this subset.
  title: (s) => {
    let out = '';
    let prevIsAlpha = false;
    for (const ch of s) {
      const isAlpha = /[a-zA-Z]/.test(ch);
      out += isAlpha ? (prevIsAlpha ? ch.toLowerCase() : ch.toUpperCase()) : ch;
      prevIsAlpha = isAlpha;
    }
    return out;
  },
  split: (s, args) => {
    const sep = args[0];
    if (sep === undefined) return makeList(s.split(/\s+/).filter(Boolean));
    if (typeof sep !== 'string') throw new PyRuntimeError('TypeError: split() separator must be a string', 0);
    return makeList(s.split(sep));
  },
  replace: (s, args, line) => {
    if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new PyRuntimeError('TypeError: replace() takes two strings', line);
    return s.split(args[0]).join(args[1]);
  },
  startswith: (s, args, line) => { if (typeof args[0] !== 'string') throw new PyRuntimeError('TypeError: startswith() takes a string', line); return s.startsWith(args[0]); },
  endswith: (s, args, line) => { if (typeof args[0] !== 'string') throw new PyRuntimeError('TypeError: endswith() takes a string', line); return s.endsWith(args[0]); },
  join: (s, args, line) => {
    if (!isList(args[0])) throw new PyRuntimeError('TypeError: join() takes a list', line);
    return args[0].items.map(v => pyStr(v)).join(s);
  },
};

const LIST_METHODS: Record<string, (l: PyList, args: PyValue[], line: number) => PyValue> = {
  append: (l, args, line) => {
    // args[0] silently pushed `undefined` when called with no arguments
    // (a.append() then print(a) printed "[undefined]") — a raw JS value
    // with no __pytype, the same class of leak the hasOwnProperty fix
    // above closes for method dispatch. append() genuinely takes exactly
    // one argument in real Python too.
    if (args.length !== 1) throw new PyRuntimeError(`TypeError: append() takes exactly one argument (${args.length} given)`, line);
    l.items.push(args[0]); return null;
  },
  pop: (l, args, line) => {
    const idx = args.length ? (args[0] as number) : l.items.length - 1;
    if (l.items.length === 0) throw new PyRuntimeError('IndexError: pop from empty list', line);
    const i = idx < 0 ? idx + l.items.length : idx;
    if (i < 0 || i >= l.items.length) throw new PyRuntimeError('IndexError: pop index out of range', line);
    return l.items.splice(i, 1)[0];
  },
  count: (l, args) => l.items.filter(v => pyEquals(v, args[0])).length,
  index: (l, args, line) => {
    const idx = l.items.findIndex(v => pyEquals(v, args[0]));
    if (idx === -1) throw new PyRuntimeError('ValueError: value not found in list', line);
    return idx;
  },
};

const DICT_METHODS: Record<string, (d: PyDict, args: PyValue[]) => PyValue> = {
  get: (d, args) => { const key = toDictKey(args[0], 0); return d.map.has(key) ? d.map.get(key)! : (args[1] ?? null); },
  keys: (d) => makeList([...d.map.keys()] as PyValue[]),
  values: (d) => makeList([...d.map.values()]),
  items: (d) => makeList([...d.map.entries()].map(([k, v]) => makeList([k as PyValue, v]))),
};

function builtin(name: string, fn: (args: PyValue[], line: number) => Promise<PyValue>): PyBuiltin {
  return { __pytype: 'builtin', name, fn };
}

// Only ever called with a name the parser already validated against its own
// allowlist (see parser.ts's SUPPORTED_MODULES) — the `line 0`/generic
// ModuleNotFoundError branch here is unreachable in practice, kept only as
// a defensive fallback if that ever drifts out of sync.
function createModule(name: string, line: number): PyModule {
  if (name === 'random') {
    return {
      __pytype: 'module',
      name: 'random',
      methods: {
        choice: (args, l) => {
          if (!isList(args[0]) || args[0].items.length === 0) throw new PyRuntimeError('IndexError: Cannot choose from an empty sequence', l);
          return args[0].items[Math.floor(Math.random() * args[0].items.length)];
        },
        randint: (args, l) => {
          if (typeof args[0] !== 'number' || typeof args[1] !== 'number') throw new PyRuntimeError('TypeError: randint() requires two numbers', l);
          const lo = Math.ceil(args[0]);
          const hi = Math.floor(args[1]);
          return lo + Math.floor(Math.random() * (hi - lo + 1));
        },
        random: () => Math.random(),
      },
    };
  }
  throw new PyRuntimeError(`ModuleNotFoundError: no module named '${name}'`, line);
}

function installBuiltins(env: Environment, stdout: string[], options: RunOptions, budget: Budget): void {
  let stdoutChars = 0;
  env.set('print', builtin('print', async (args) => {
    const line = args.map(pyStr).join(' ') + '\n';
    stdoutChars += line.length;
    if (stdoutChars <= MAX_STDOUT_CHARS) stdout.push(line);
    else if (stdoutChars - line.length <= MAX_STDOUT_CHARS) stdout.push('...output truncated (too much printed)...\n');
    return null;
  }));
  env.set('len', builtin('len', async (args, line) => {
    const v = args[0];
    if (typeof v === 'string') return v.length;
    if (isList(v)) return v.items.length;
    if (isDict(v)) return v.map.size;
    throw new PyRuntimeError(`TypeError: object of type '${describeType(v)}' has no len()`, line);
  }));
  env.set('range', builtin('range', async (args, line) => {
    const nums = args.map(a => { if (typeof a !== 'number') throw new PyRuntimeError('TypeError: range() arguments must be integers', line); return Math.trunc(a); });
    let start = 0, stop = 0, step = 1;
    if (nums.length === 1) { stop = nums[0]; }
    else if (nums.length === 2) { [start, stop] = nums; }
    else if (nums.length === 3) { [start, stop, step] = nums; if (step === 0) throw new PyRuntimeError('ValueError: range() step must not be zero', line); }
    else throw new PyRuntimeError('TypeError: range() takes 1 to 3 arguments', line);
    // Cap checked BEFORE materializing, not after — range(10**9) used to
    // push a billion elements into `out` and only THEN discover it should
    // have refused, which is exactly backwards for a guard meant to bound
    // memory/time.
    // Works uniformly for either sign of step: (stop-start)/step is
    // positive whenever the range is non-empty, negative (clamped to 0)
    // whenever it's empty (e.g. start > stop with a positive step).
    const length = Math.max(0, Math.ceil((stop - start) / step));
    if (length > 100000) throw new PyRuntimeError('ValueError: range() is too large', line);
    const out: PyValue[] = [];
    if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
    else for (let i = start; i > stop; i += step) out.push(i);
    return makeList(out);
  }));
  env.set('str', builtin('str', async (args) => pyStr(args[0] ?? null)));
  env.set('int', builtin('int', async (args, line) => {
    const v = args[0];
    if (typeof v === 'number') return Math.trunc(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { const n = parseInt(v.trim(), 10); if (Number.isNaN(n)) throw new PyRuntimeError(`ValueError: invalid literal for int(): '${v}'`, line); return n; }
    throw new PyRuntimeError(`TypeError: int() argument must be a string or a number`, line);
  }));
  env.set('float', builtin('float', async (args, line) => {
    const v = args[0];
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { const n = parseFloat(v.trim()); if (Number.isNaN(n)) throw new PyRuntimeError(`ValueError: could not convert string to float: '${v}'`, line); return n; }
    throw new PyRuntimeError(`TypeError: float() argument must be a string or a number`, line);
  }));
  env.set('bool', builtin('bool', async (args) => isTruthy(args[0] ?? null)));
  env.set('abs', builtin('abs', async (args, line) => { if (typeof args[0] !== 'number') throw new PyRuntimeError('TypeError: abs() requires a number', line); return Math.abs(args[0]); }));
  env.set('round', builtin('round', async (args, line) => {
    if (typeof args[0] !== 'number') throw new PyRuntimeError('TypeError: round() requires a number', line);
    const digits = typeof args[1] === 'number' ? args[1] : 0;
    const factor = Math.pow(10, digits);
    return Math.round(args[0] * factor) / factor;
  }));
  env.set('min', builtin('min', async (args, line) => reduceMinMax(args, line, 'min')));
  env.set('max', builtin('max', async (args, line) => reduceMinMax(args, line, 'max')));

  // Only installed when the host explicitly opts in (Build Studio's chat
  // path) — absent here, `ai_generate` simply isn't a name that exists, so
  // e.g. Python Challenges grading (which never passes `aiGenerate`) gets a
  // plain NameError if a submission tries to call it. Structural exclusion,
  // not a flag to keep in sync.
  if (options.aiGenerate) {
    const aiGenerate = options.aiGenerate;
    const maxAiCalls = options.maxAiCalls ?? 3;
    let aiCallCount = 0;
    env.set('ai_generate', builtin('ai_generate', async (args, line) => {
      if (typeof args[0] !== 'string') throw new PyRuntimeError('TypeError: ai_generate() requires a string prompt', line);
      aiCallCount++;
      if (aiCallCount > maxAiCalls) {
        throw new PyRuntimeError(`RuntimeError: ai_generate() was called too many times (limit ${maxAiCalls} per run)`, line);
      }
      const remaining = budget.remainingMs();
      if (remaining < MIN_AI_CALL_BUDGET_MS) throw new PyTimeoutError();
      let outcome: AiGenerateOutcome;
      try {
        outcome = await aiGenerate(args[0], remaining);
      } catch (e) {
        outcome = { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'unknown error' };
      }
      budget.tick();
      if (outcome.ok) return outcome.text;
      // A budget-exhaustion timeout must stay uncatchable — same invariant
      // as everywhere else in this file — or `try: ai_generate(...) except:
      // pass` inside a loop could defeat the execution budget entirely.
      if (outcome.reason === 'timeout') throw new PyTimeoutError();
      throw new PyRuntimeError(`RuntimeError: ai_generate() failed — ${outcome.message}`, line);
    }));
  }
}

function reduceMinMax(args: PyValue[], line: number, mode: 'min' | 'max'): PyValue {
  const items = args.length === 1 && isList(args[0]) ? args[0].items : args;
  if (items.length === 0) throw new PyRuntimeError(`ValueError: ${mode}() arg is an empty sequence`, line);
  let best = items[0];
  for (const v of items.slice(1)) {
    if (typeof v !== 'number' || typeof best !== 'number') throw new PyRuntimeError(`TypeError: ${mode}() requires numbers`, line);
    if ((mode === 'min' && v < best) || (mode === 'max' && v > best)) best = v;
  }
  return best;
}

// ── JSON <-> PyValue interop, for the grading harness ──
export function jsonToPyValue(v: unknown): PyValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return makeList(v.map(jsonToPyValue));
  if (typeof v === 'object') {
    const map = new Map<string | number | boolean, PyValue>();
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) map.set(k, jsonToPyValue(val));
    return { __pytype: 'dict', map };
  }
  throw new Error('Unsupported JSON value for Python interop');
}

export function pyValueToJson(v: PyValue): unknown {
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (isList(v)) return v.items.map(pyValueToJson);
  if (isDict(v)) {
    const obj: Record<string, unknown> = {};
    for (const [k, val] of v.map.entries()) obj[String(k)] = pyValueToJson(val);
    return obj;
  }
  throw new PyRuntimeError('Return a number, string, boolean, list, dict, or None from your function — not a function itself.', 0);
}

// ── Public API ──

// The host-agnostic hook that lets a caller opt a run into `ai_generate()`.
// The interpreter package has no Supabase client or fetch of its own — the
// real network call/slot-acquire logic lives entirely in the host (see
// `python-ai-assist/aiGenerateCallback.ts`), keeping this package's "no
// network capability unless a caller explicitly wires it in" property.
export type AiGenerateOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: 'timeout' | 'error'; message: string };
export type AiGenerateFn = (prompt: string, remainingMs: number) => Promise<AiGenerateOutcome>;

export interface RunOptions {
  timeoutMs?: number;
  maxSteps?: number;
  aiGenerate?: AiGenerateFn;
  maxAiCalls?: number;
}
export interface RunFunctionResult {
  ok: boolean;
  result?: unknown;
  stdout: string;
  errorType?: PyErrorType;
  errorMessage?: string;
  errorLine?: number;
}

// Shared by `runFunction` (which continues on to look up and call an
// entrypoint) and `runModule` (which stops here — top-level statements
// only, no entrypoint required). `stdout` is created and owned by the
// caller, not here, so partial output printed before a mid-run failure is
// still visible to the caller's own catch block after this throws.
// Lexing and parsing both run entirely BEFORE the Budget below is even
// constructed, so neither one is bounded by maxSteps/timeoutMs at all —
// measured: a 5MB string literal costs ~800ms of lexing on its own with
// maxSteps set to 5, and 40,000 nested parens overflows the parser's
// recursive-descent call stack. main.py's raw text arrives straight from
// the request body with no length cap anywhere upstream of this. 300,000
// characters is generous for any real project (ProjectEditor.tsx's own
// uploaded-.py-file limit is 256,000 bytes) while still bounding how much
// unmetered lex/parse work a single request can trigger.
const MAX_CODE_LENGTH = 300000;

async function runTopLevel(code: string, options: RunOptions, stdout: string[]): Promise<{ globalEnv: Environment; budget: Budget; interp: Interpreter }> {
  if (code.length > MAX_CODE_LENGTH) {
    throw new PySyntaxError(`This code is too long to run (${code.length} characters, limit ${MAX_CODE_LENGTH}).`);
  }
  const program: Program = parseProgram(code);
  const globalEnv = new Environment(null);
  const budget = new Budget(options.maxSteps ?? 200000, options.timeoutMs ?? 5000);
  installBuiltins(globalEnv, stdout, options, budget);
  const interp = new Interpreter();
  try {
    await interp.execStmts(program, globalEnv, budget, stdout);
  } catch (e) {
    if (e instanceof BreakSignal || e instanceof ContinueSignal) throw new PySyntaxError("'break'/'continue' outside a loop");
    if (e instanceof ReturnSignal) throw new PySyntaxError("'return' outside a function");
    throw e;
  }
  return { globalEnv, budget, interp };
}

export async function runFunction(code: string, functionName: string, jsonArgs: unknown[], options: RunOptions = {}): Promise<RunFunctionResult> {
  const stdout: string[] = [];
  try {
    const { globalEnv, budget, interp } = await runTopLevel(code, options, stdout);
    if (!globalEnv.has(functionName)) {
      return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: `Your code doesn't define a function called '${functionName}'.` };
    }
    const fnVal = globalEnv.get(functionName, 0);
    if (!isCallable(fnVal)) {
      return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: `'${functionName}' isn't a function.` };
    }
    const args = jsonArgs.map(jsonToPyValue);
    const resultVal = await interp.callValue(fnVal, args, budget, stdout, 0);
    return { ok: true, result: pyValueToJson(resultVal), stdout: stdout.join('') };
  } catch (e) {
    if (e instanceof PyError) {
      return { ok: false, stdout: stdout.join(''), errorType: e.type, errorMessage: e.message, errorLine: e.line };
    }
    return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: 'Something went wrong running this code.' };
  }
}

// Runs `code`'s top-level statements only — no entrypoint function required
// or called. For contexts where the whole point is the module's own side
// effects (its print() output), not a return value — the Build Studio
// script-mode live console being the first caller.
export async function runModule(code: string, options: RunOptions = {}): Promise<RunFunctionResult> {
  const stdout: string[] = [];
  try {
    await runTopLevel(code, options, stdout);
    return { ok: true, stdout: stdout.join('') };
  } catch (e) {
    if (e instanceof PyError) {
      return { ok: false, stdout: stdout.join(''), errorType: e.type, errorMessage: e.message, errorLine: e.line };
    }
    return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: 'Something went wrong running this code.' };
  }
}
