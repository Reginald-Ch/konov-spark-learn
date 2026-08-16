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
export interface PyBuiltin { __pytype: 'builtin'; name: string; fn: (args: PyValue[], line: number) => PyValue }
// Backs the `import random` carve-out — attribute access (`random.choice`)
// dispatches into `methods`, the same shape as callMethod's str/list/dict
// tables below, just reached via a module value instead of a builtin type.
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

function pyEquals(a: PyValue, b: PyValue): boolean {
  if (a === b) return true;
  if (isList(a) && isList(b)) return a.items.length === b.items.length && a.items.every((v, i) => pyEquals(v, b.items[i]));
  if (isDict(a) && isDict(b)) {
    if (a.map.size !== b.map.size) return false;
    for (const [k, v] of a.map.entries()) { if (!b.map.has(k) || !pyEquals(v, b.map.get(k)!)) return false; }
    return true;
  }
  return false;
}

function numberToPyString(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(v);
}

function pyStr(v: PyValue): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return numberToPyString(v);
  if (typeof v === 'string') return v;
  if (isList(v)) return '[' + v.items.map(pyRepr).join(', ') + ']';
  if (isDict(v)) return '{' + [...v.map.entries()].map(([k, val]) => `${pyRepr(k as PyValue)}: ${pyRepr(val)}`).join(', ') + '}';
  if (isFunction(v) || isBuiltin(v)) return `<function ${v.name}>`;
  if (isModule(v)) return `<module '${v.name}'>`;
  return String(v);
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
export class Budget {
  private steps = 0;
  private readonly deadline: number;
  constructor(private readonly maxSteps: number, timeoutMs: number) { this.deadline = Date.now() + timeoutMs; }
  tick(): void {
    this.steps++;
    if (this.steps > this.maxSteps || Date.now() > this.deadline) throw new PyTimeoutError();
  }
}

const MAX_STDOUT_CHARS = 20000;

class Interpreter {
  execStmts(stmts: Stmt[], env: Environment, budget: Budget, stdout: string[]): void {
    for (const s of stmts) this.execStmt(s, env, budget, stdout);
  }

  execStmt(stmt: Stmt, env: Environment, budget: Budget, stdout: string[]): void {
    budget.tick();
    switch (stmt.kind) {
      case 'ExprStmt': this.evalExpr(stmt.expr, env, budget, stdout); return;
      case 'Assign': {
        const value = this.evalExpr(stmt.value, env, budget, stdout);
        this.assignTo(stmt.targets[0], value, env, budget, stdout);
        return;
      }
      case 'AugAssign': {
        const current = this.evalExpr(stmt.target, env, budget, stdout);
        const rhs = this.evalExpr(stmt.value, env, budget, stdout);
        const result = this.binOp(stmt.op, current, rhs, stmt.line);
        this.assignTo(stmt.target, result, env, budget, stdout);
        return;
      }
      case 'If': {
        if (isTruthy(this.evalExpr(stmt.test, env, budget, stdout))) this.execStmts(stmt.body, env, budget, stdout);
        else this.execStmts(stmt.orelse, env, budget, stdout);
        return;
      }
      case 'For': {
        const iterVal = this.evalExpr(stmt.iter, env, budget, stdout);
        for (const item of this.toIterable(iterVal, stmt.line)) {
          budget.tick();
          this.bindForTarget(stmt.target, item, env, stmt.line);
          try { this.execStmts(stmt.body, env, budget, stdout); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'Try': {
        try {
          this.execStmts(stmt.body, env, budget, stdout);
        } catch (e) {
          // Never catch our own control-flow signals or a timeout — a
          // try/except that could swallow a timeout would defeat the whole
          // execution budget (wrap a runaway loop in try/except, ignore the
          // interrupt, loop forever). Only genuine runtime errors are
          // catchable, matching what "except:" should mean here.
          if (e instanceof BreakSignal || e instanceof ContinueSignal || e instanceof ReturnSignal) throw e;
          if (e instanceof PyError && e.type !== 'runtime_error') throw e;
          if (!(e instanceof PyError)) throw e;
          if (stmt.exceptVar) env.set(stmt.exceptVar, e.message);
          this.execStmts(stmt.exceptBody, env, budget, stdout);
        }
        return;
      }
      case 'Import': {
        env.set(stmt.module, createModule(stmt.module, stmt.line));
        return;
      }
      case 'While': {
        while (isTruthy(this.evalExpr(stmt.test, env, budget, stdout))) {
          budget.tick();
          try { this.execStmts(stmt.body, env, budget, stdout); }
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
        const value = stmt.value ? this.evalExpr(stmt.value, env, budget, stdout) : null;
        throw new ReturnSignal(value);
      }
      case 'Pass': return;
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
    }
  }

  evalExpr(expr: Expr, env: Environment, budget: Budget, stdout: string[]): PyValue {
    budget.tick();
    switch (expr.kind) {
      case 'NumberLit': return expr.value;
      case 'StringLit': return expr.value;
      case 'BoolLit': return expr.value;
      case 'NoneLit': return null;
      case 'FStringLit': {
        let out = '';
        for (const part of expr.parts) {
          out += part.kind === 'str' ? part.value : pyStr(this.evalExpr(part.expr, env, budget, stdout));
        }
        return out;
      }
      case 'Name': return env.get(expr.name, expr.line);
      case 'ListLit': return makeList(expr.elements.map(e => this.evalExpr(e, env, budget, stdout)));
      case 'DictLit': {
        const map = new Map<string | number | boolean, PyValue>();
        for (let i = 0; i < expr.keys.length; i++) {
          const k = this.evalExpr(expr.keys[i], env, budget, stdout);
          map.set(toDictKey(k, expr.line), this.evalExpr(expr.values[i], env, budget, stdout));
        }
        return { __pytype: 'dict', map };
      }
      case 'UnaryOp': {
        const v = this.evalExpr(expr.operand, env, budget, stdout);
        if (expr.op === 'not') return !isTruthy(v);
        if (typeof v !== 'number') throw new PyRuntimeError(`TypeError: bad operand type for unary ${expr.op}: '${describeType(v)}'`, expr.line);
        return expr.op === '-' ? -v : v;
      }
      case 'BoolOp': {
        if (expr.op === 'and') {
          let last: PyValue = true;
          for (const v of expr.values) { last = this.evalExpr(v, env, budget, stdout); if (!isTruthy(last)) return last; }
          return last;
        }
        let last: PyValue = false;
        for (const v of expr.values) { last = this.evalExpr(v, env, budget, stdout); if (isTruthy(last)) return last; }
        return last;
      }
      case 'Compare': {
        let left = this.evalExpr(expr.left, env, budget, stdout);
        for (let i = 0; i < expr.ops.length; i++) {
          const right = this.evalExpr(expr.comparators[i], env, budget, stdout);
          if (!this.compareValues(expr.ops[i], left, right, expr.line)) return false;
          left = right;
        }
        return true;
      }
      case 'BinOp': {
        const l = this.evalExpr(expr.left, env, budget, stdout);
        const r = this.evalExpr(expr.right, env, budget, stdout);
        return this.binOp(expr.op, l, r, expr.line);
      }
      case 'Call': return this.evalCall(expr, env, budget, stdout);
      case 'Attribute':
        throw new PyRuntimeError(`AttributeError: '.${expr.attr}' is only supported as a direct method call, e.g. x.${expr.attr}(...)`, expr.line);
      case 'Subscript': {
        const obj = this.evalExpr(expr.obj, env, budget, stdout);
        const idx = this.evalExpr(expr.index, env, budget, stdout);
        return this.subscriptGet(obj, idx, expr.line);
      }
    }
  }

  private evalCall(expr: Extract<Expr, { kind: 'Call' }>, env: Environment, budget: Budget, stdout: string[]): PyValue {
    if (expr.func.kind === 'Attribute') {
      const obj = this.evalExpr(expr.func.obj, env, budget, stdout);
      const args = expr.args.map(a => this.evalExpr(a, env, budget, stdout));
      return this.callMethod(obj, expr.func.attr, args, expr.line);
    }
    const fnVal = this.evalExpr(expr.func, env, budget, stdout);
    const args = expr.args.map(a => this.evalExpr(a, env, budget, stdout));
    return this.callValue(fnVal, args, budget, stdout, expr.line);
  }

  callValue(fnVal: PyValue, args: PyValue[], budget: Budget, stdout: string[], line: number): PyValue {
    if (isBuiltin(fnVal)) return fnVal.fn(args, line);
    if (isFunction(fnVal)) {
      if (args.length !== fnVal.params.length) {
        throw new PyRuntimeError(`TypeError: ${fnVal.name}() takes ${fnVal.params.length} argument(s) but ${args.length} were given`, line);
      }
      const callEnv = new Environment(fnVal.closure);
      fnVal.params.forEach((p, i) => callEnv.set(p, args[i]));
      try {
        this.execStmts(fnVal.body, callEnv, budget, stdout);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        if (e instanceof BreakSignal || e instanceof ContinueSignal) throw new PySyntaxError("'break'/'continue' outside a loop", line);
        throw e;
      }
      return null;
    }
    throw new PyRuntimeError(`TypeError: '${describeType(fnVal)}' object is not callable`, line);
  }

  private assignTo(target: Expr, value: PyValue, env: Environment, budget: Budget, stdout: string[]): void {
    if (target.kind === 'Name') { env.set(target.name, value); return; }
    if (target.kind === 'Subscript') {
      const obj = this.evalExpr(target.obj, env, budget, stdout);
      const idx = this.evalExpr(target.index, env, budget, stdout);
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
      if (typeof l === 'string' && typeof r === 'number') return l.repeat(Math.max(0, Math.trunc(r)));
      if (typeof r === 'string' && typeof l === 'number') return r.repeat(Math.max(0, Math.trunc(l)));
      if (isList(l) && typeof r === 'number') { const out: PyValue[] = []; for (let i = 0; i < r; i++) out.push(...l.items); return makeList(out); }
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

  private callMethod(obj: PyValue, attr: string, args: PyValue[], line: number): PyValue {
    if (typeof obj === 'string') {
      const m = STRING_METHODS[attr];
      if (!m) throw new PyRuntimeError(`AttributeError: 'str' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isList(obj)) {
      const m = LIST_METHODS[attr];
      if (!m) throw new PyRuntimeError(`AttributeError: 'list' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isDict(obj)) {
      const m = DICT_METHODS[attr];
      if (!m) throw new PyRuntimeError(`AttributeError: 'dict' object has no attribute '${attr}'`, line);
      return m(obj, args, line);
    }
    if (isModule(obj)) {
      const m = obj.methods[attr];
      if (!m) throw new PyRuntimeError(`AttributeError: module '${obj.name}' has no attribute '${attr}'`, line);
      return m(args, line);
    }
    throw new PyRuntimeError(`AttributeError: '${describeType(obj)}' object has no attribute '${attr}'`, line);
  }
}

const STRING_METHODS: Record<string, (s: string, args: PyValue[], line: number) => PyValue> = {
  lower: (s) => s.toLowerCase(),
  upper: (s) => s.toUpperCase(),
  strip: (s) => s.trim(),
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
  append: (l, args) => { l.items.push(args[0]); return null; },
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

function builtin(name: string, fn: (args: PyValue[], line: number) => PyValue): PyBuiltin {
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

function installBuiltins(env: Environment, stdout: string[]): void {
  let stdoutChars = 0;
  env.set('print', builtin('print', (args) => {
    const line = args.map(pyStr).join(' ') + '\n';
    stdoutChars += line.length;
    if (stdoutChars <= MAX_STDOUT_CHARS) stdout.push(line);
    else if (stdoutChars - line.length <= MAX_STDOUT_CHARS) stdout.push('...output truncated (too much printed)...\n');
    return null;
  }));
  env.set('len', builtin('len', (args, line) => {
    const v = args[0];
    if (typeof v === 'string') return v.length;
    if (isList(v)) return v.items.length;
    if (isDict(v)) return v.map.size;
    throw new PyRuntimeError(`TypeError: object of type '${describeType(v)}' has no len()`, line);
  }));
  env.set('range', builtin('range', (args, line) => {
    const nums = args.map(a => { if (typeof a !== 'number') throw new PyRuntimeError('TypeError: range() arguments must be integers', line); return Math.trunc(a); });
    let start = 0, stop = 0, step = 1;
    if (nums.length === 1) { stop = nums[0]; }
    else if (nums.length === 2) { [start, stop] = nums; }
    else if (nums.length === 3) { [start, stop, step] = nums; if (step === 0) throw new PyRuntimeError('ValueError: range() step must not be zero', line); }
    else throw new PyRuntimeError('TypeError: range() takes 1 to 3 arguments', line);
    const out: PyValue[] = [];
    if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
    else for (let i = start; i > stop; i += step) out.push(i);
    if (out.length > 100000) throw new PyRuntimeError('ValueError: range() is too large', line);
    return makeList(out);
  }));
  env.set('str', builtin('str', (args) => pyStr(args[0] ?? null)));
  env.set('int', builtin('int', (args, line) => {
    const v = args[0];
    if (typeof v === 'number') return Math.trunc(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { const n = parseInt(v.trim(), 10); if (Number.isNaN(n)) throw new PyRuntimeError(`ValueError: invalid literal for int(): '${v}'`, line); return n; }
    throw new PyRuntimeError(`TypeError: int() argument must be a string or a number`, line);
  }));
  env.set('float', builtin('float', (args, line) => {
    const v = args[0];
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { const n = parseFloat(v.trim()); if (Number.isNaN(n)) throw new PyRuntimeError(`ValueError: could not convert string to float: '${v}'`, line); return n; }
    throw new PyRuntimeError(`TypeError: float() argument must be a string or a number`, line);
  }));
  env.set('bool', builtin('bool', (args) => isTruthy(args[0] ?? null)));
  env.set('abs', builtin('abs', (args, line) => { if (typeof args[0] !== 'number') throw new PyRuntimeError('TypeError: abs() requires a number', line); return Math.abs(args[0]); }));
  env.set('round', builtin('round', (args, line) => {
    if (typeof args[0] !== 'number') throw new PyRuntimeError('TypeError: round() requires a number', line);
    const digits = typeof args[1] === 'number' ? args[1] : 0;
    const factor = Math.pow(10, digits);
    return Math.round(args[0] * factor) / factor;
  }));
  env.set('min', builtin('min', (args, line) => reduceMinMax(args, line, 'min')));
  env.set('max', builtin('max', (args, line) => reduceMinMax(args, line, 'max')));
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
export interface RunOptions { timeoutMs?: number; maxSteps?: number }
export interface RunFunctionResult {
  ok: boolean;
  result?: unknown;
  stdout: string;
  errorType?: PyErrorType;
  errorMessage?: string;
  errorLine?: number;
}

export function runFunction(code: string, functionName: string, jsonArgs: unknown[], options: RunOptions = {}): RunFunctionResult {
  const stdout: string[] = [];
  try {
    const program: Program = parseProgram(code);
    const globalEnv = new Environment(null);
    installBuiltins(globalEnv, stdout);
    const budget = new Budget(options.maxSteps ?? 200000, options.timeoutMs ?? 5000);
    const interp = new Interpreter();
    try {
      interp.execStmts(program, globalEnv, budget, stdout);
    } catch (e) {
      if (e instanceof BreakSignal || e instanceof ContinueSignal) throw new PySyntaxError("'break'/'continue' outside a loop");
      if (e instanceof ReturnSignal) throw new PySyntaxError("'return' outside a function");
      throw e;
    }
    if (!globalEnv.has(functionName)) {
      return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: `Your code doesn't define a function called '${functionName}'.` };
    }
    const fnVal = globalEnv.get(functionName, 0);
    if (!isCallable(fnVal)) {
      return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: `'${functionName}' isn't a function.` };
    }
    const args = jsonArgs.map(jsonToPyValue);
    const resultVal = interp.callValue(fnVal, args, budget, stdout, 0);
    return { ok: true, result: pyValueToJson(resultVal), stdout: stdout.join('') };
  } catch (e) {
    if (e instanceof PyError) {
      return { ok: false, stdout: stdout.join(''), errorType: e.type, errorMessage: e.message, errorLine: e.line };
    }
    return { ok: false, stdout: stdout.join(''), errorType: 'runtime_error', errorMessage: 'Something went wrong running this code.' };
  }
}
