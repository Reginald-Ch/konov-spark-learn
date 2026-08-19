import { tokenize, Token } from './lexer.ts';
import { PySyntaxError, UnsupportedSyntaxError } from './errors.ts';
import type { Expr, Stmt, Program, FStringPart } from './ast.ts';

// Keywords recognized structurally, real Python syntax outside our
// supported subset — caught here (not left to fall through as "unexpected
// token") so the error names the specific unsupported feature instead of a
// generic parse failure. See errors.ts for why this is a distinct error
// type from a genuine syntax mistake.
const UNSUPPORTED_KEYWORDS = new Set([
  'import', 'from', 'class', 'lambda', 'yield', 'try', 'except', 'finally',
  'with', 'global', 'nonlocal', 'async', 'await', 'raise', 'del', 'assert',
]);

const COMPARE_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);

// Deeply nested parenthesized expressions (e.g. 40,000 nested `(`) recurse
// through parseExpr -> ... -> parseAtom -> parseExpr on every level, with
// no bound — measured to overflow the JS call stack in ~200ms, surfacing
// as the generic "Something went wrong running this code." with no
// indication why. Real Python code essentially never nests expressions
// this deep, so a generous-but-finite cap turns a stack overflow into a
// clean, honest error.
const MAX_EXPR_DEPTH = 300;

class Parser {
  private pos = 0;
  private exprDepth = 0;
  constructor(private tokens: Token[]) {}

  private current(): Token { return this.tokens[this.pos]; }
  private peek(offset: number): Token { return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private checkOp(v: string): boolean { const t = this.current(); return t.type === 'OP' && t.value === v; }
  private checkName(v: string): boolean { const t = this.current(); return t.type === 'NAME' && t.value === v; }
  private checkType(t: Token['type']): boolean { return this.current().type === t; }

  private expectOp(v: string): void {
    if (!this.checkOp(v)) throw new PySyntaxError(`Expected '${v}' but found '${this.current().value || this.current().type}'`, this.current().line);
    this.advance();
  }
  private expectName(v: string): void {
    if (!this.checkName(v)) throw new PySyntaxError(`Expected '${v}'`, this.current().line);
    this.advance();
  }
  private expectIdentifier(): string {
    const t = this.current();
    if (t.type !== 'NAME' || UNSUPPORTED_KEYWORDS.has(t.value)) throw new PySyntaxError('Expected a name here', t.line);
    this.advance();
    return t.value;
  }
  private expectNewline(): void {
    if (this.checkType('NEWLINE')) { this.advance(); return; }
    if (this.checkType('EOF')) return;
    throw new PySyntaxError(`Expected end of line, found '${this.current().value || this.current().type}'`, this.current().line);
  }

  parseProgram(): Program {
    const stmts: Stmt[] = [];
    while (!this.checkType('EOF')) {
      if (this.checkType('NEWLINE')) { this.advance(); continue; }
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  private parseBlock(): Stmt[] {
    this.expectNewline();
    if (!this.checkType('INDENT')) throw new PySyntaxError('Expected an indented block here', this.current().line);
    this.advance();
    const stmts: Stmt[] = [];
    while (!this.checkType('DEDENT') && !this.checkType('EOF')) {
      if (this.checkType('NEWLINE')) { this.advance(); continue; }
      stmts.push(this.parseStatement());
    }
    if (this.checkType('DEDENT')) this.advance();
    if (stmts.length === 0) throw new PySyntaxError('This block is empty — add at least one statement (or `pass`).', this.current().line);
    return stmts;
  }

  private parseStatement(): Stmt {
    if (this.checkOp('@')) throw new UnsupportedSyntaxError('@decorator', this.current().line);
    if (this.checkName('if')) return this.parseIfOrElif('if');
    if (this.checkName('for')) return this.parseFor();
    if (this.checkName('while')) return this.parseWhile();
    if (this.checkName('def')) return this.parseFunctionDef();
    if (this.checkName('try')) return this.parseTry();
    if (this.checkName('import')) return this.parseImport();
    return this.parseSimpleStatement();
  }

  // Explicit allowlist carve-out from the general "import is unsupported"
  // rule — random.choice()-style randomness is common enough in real
  // chatbot logic to be worth the one exception. Anything else still hits
  // UnsupportedSyntaxError exactly like before.
  private static readonly SUPPORTED_MODULES = new Set(['random']);

  private parseImport(): Stmt {
    const line = this.current().line;
    this.expectName('import');
    const moduleName = this.expectIdentifier();
    if (!Parser.SUPPORTED_MODULES.has(moduleName)) {
      throw new UnsupportedSyntaxError(`import ${moduleName}`, line);
    }
    this.expectNewline();
    return { kind: 'Import', module: moduleName, line };
  }

  private parseTry(): Stmt {
    const line = this.current().line;
    this.expectName('try');
    this.expectOp(':');
    const body = this.parseBlock();
    if (!this.checkName('except')) {
      throw new PySyntaxError("'try' needs an 'except' block — 'finally' and multiple 'except' clauses aren't supported.", this.current().line);
    }
    this.advance();
    let exceptVar: string | null = null;
    if (this.checkName('as')) {
      this.advance();
      exceptVar = this.expectIdentifier();
    } else if (!this.checkOp(':')) {
      // `except SomeError:` — exception-type matching isn't modeled (every
      // runtime error is just a message, not a typed exception), so this is
      // parsed and silently ignored rather than rejected: `except Exception:`
      // and `except ValueError:` behave identically here, both catch
      // anything. Rejecting it outright would be needlessly strict for code
      // that's otherwise completely reasonable Python.
      this.expectIdentifier();
      if (this.checkName('as')) { this.advance(); exceptVar = this.expectIdentifier(); }
    }
    this.expectOp(':');
    const exceptBody = this.parseBlock();
    return { kind: 'Try', body, exceptVar, exceptBody, line };
  }

  private parseIfOrElif(keyword: 'if' | 'elif'): Stmt {
    const line = this.current().line;
    this.expectName(keyword);
    const test = this.parseExpr();
    this.expectOp(':');
    const body = this.parseBlock();
    let orelse: Stmt[] = [];
    if (this.checkName('elif')) {
      orelse = [this.parseIfOrElif('elif')];
    } else if (this.checkName('else')) {
      this.advance();
      this.expectOp(':');
      orelse = this.parseBlock();
    }
    return { kind: 'If', test, body, orelse, line };
  }

  private parseFor(): Stmt {
    const line = this.current().line;
    this.expectName('for');
    // One name for `for x in ...:`, or a comma-separated list for
    // `for k, v in d.items():` — not general tuple unpacking, just enough
    // to make .items()-style iteration usable.
    const target = [this.expectIdentifier()];
    while (this.checkOp(',')) { this.advance(); target.push(this.expectIdentifier()); }
    this.expectName('in');
    const iter = this.parseExpr();
    this.expectOp(':');
    const body = this.parseBlock();
    return { kind: 'For', target, iter, body, line };
  }

  private parseWhile(): Stmt {
    const line = this.current().line;
    this.expectName('while');
    const test = this.parseExpr();
    this.expectOp(':');
    const body = this.parseBlock();
    return { kind: 'While', test, body, line };
  }

  private parseFunctionDef(): Stmt {
    const line = this.current().line;
    this.expectName('def');
    const name = this.expectIdentifier();
    this.expectOp('(');
    const params: string[] = [];
    if (!this.checkOp(')')) {
      params.push(this.expectIdentifier());
      while (this.checkOp(',')) { this.advance(); params.push(this.expectIdentifier()); }
    }
    this.expectOp(')');
    this.expectOp(':');
    const body = this.parseBlock();
    return { kind: 'FunctionDef', name, params, body, line };
  }

  private parseSimpleStatement(): Stmt {
    const line = this.current().line;
    if (this.checkName('return')) {
      this.advance();
      const value = (this.checkType('NEWLINE') || this.checkType('EOF')) ? null : this.parseExpr();
      this.expectNewline();
      return { kind: 'Return', value, line };
    }
    if (this.checkName('pass')) { this.advance(); this.expectNewline(); return { kind: 'Pass', line }; }
    if (this.checkName('break')) { this.advance(); this.expectNewline(); return { kind: 'Break', line }; }
    if (this.checkName('continue')) { this.advance(); this.expectNewline(); return { kind: 'Continue', line }; }

    const first = this.parseExpr();
    const AUG_OPS = ['+=', '-=', '*=', '/='];
    if (this.checkOp('=')) {
      this.advance();
      const value = this.parseExpr();
      this.expectNewline();
      return { kind: 'Assign', targets: [first], value, line };
    }
    for (const aug of AUG_OPS) {
      if (this.checkOp(aug)) {
        this.advance();
        const value = this.parseExpr();
        this.expectNewline();
        return { kind: 'AugAssign', target: first, op: aug[0], value, line };
      }
    }
    this.expectNewline();
    return { kind: 'ExprStmt', expr: first, line };
  }

  parseExpr(): Expr {
    if (++this.exprDepth > MAX_EXPR_DEPTH) {
      this.exprDepth--;
      throw new PySyntaxError('This expression is too deeply nested.', this.current().line);
    }
    try {
      return this.parseOr();
    } finally {
      this.exprDepth--;
    }
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    if (this.checkName('or')) {
      const values = [left];
      while (this.checkName('or')) { this.advance(); values.push(this.parseAnd()); }
      return { kind: 'BoolOp', op: 'or', values, line: left.line };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    if (this.checkName('and')) {
      const values = [left];
      while (this.checkName('and')) { this.advance(); values.push(this.parseNot()); }
      return { kind: 'BoolOp', op: 'and', values, line: left.line };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.checkName('not')) {
      const line = this.current().line;
      this.advance();
      const operand = this.parseNot();
      return { kind: 'UnaryOp', op: 'not', operand, line };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    const left = this.parseArith();
    const ops: string[] = [];
    const comparators: Expr[] = [];
    while (true) {
      const t = this.current();
      if (t.type === 'OP' && COMPARE_OPS.has(t.value)) {
        ops.push(t.value);
        this.advance();
        comparators.push(this.parseArith());
      } else if (this.checkName('in')) {
        this.advance();
        ops.push('in');
        comparators.push(this.parseArith());
      } else if (this.checkName('not') && this.peek(1).type === 'NAME' && this.peek(1).value === 'in') {
        this.advance(); this.advance();
        ops.push('not in');
        comparators.push(this.parseArith());
      } else break;
    }
    if (ops.length === 0) return left;
    return { kind: 'Compare', left, ops, comparators, line: left.line };
  }

  private parseArith(): Expr {
    let left = this.parseTerm();
    while (this.checkOp('+') || this.checkOp('-')) {
      const op = this.current().value; const line = this.current().line;
      this.advance();
      const right = this.parseTerm();
      left = { kind: 'BinOp', op, left, right, line };
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseUnary();
    while (this.checkOp('*') || this.checkOp('/') || this.checkOp('//') || this.checkOp('%')) {
      const op = this.current().value; const line = this.current().line;
      this.advance();
      const right = this.parseUnary();
      left = { kind: 'BinOp', op, left, right, line };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.checkOp('-') || this.checkOp('+')) {
      const op = this.current().value as '-' | '+'; const line = this.current().line;
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'UnaryOp', op, operand, line };
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    const base = this.parsePostfix();
    if (this.checkOp('**')) {
      const line = this.current().line;
      this.advance();
      const exponent = this.parseUnary();
      return { kind: 'BinOp', op: '**', left: base, right: exponent, line };
    }
    return base;
  }

  private parsePostfix(): Expr {
    let expr = this.parseAtom();
    while (true) {
      if (this.checkOp('(')) {
        const line = this.current().line;
        this.advance();
        const args: Expr[] = [];
        if (!this.checkOp(')')) {
          args.push(this.parseExpr());
          while (this.checkOp(',')) { this.advance(); args.push(this.parseExpr()); }
        }
        this.expectOp(')');
        expr = { kind: 'Call', func: expr, args, line };
      } else if (this.checkOp('[')) {
        const line = this.current().line;
        this.advance();
        const index = this.parseExpr();
        this.expectOp(']');
        expr = { kind: 'Subscript', obj: expr, index, line };
      } else if (this.checkOp('.')) {
        const line = this.current().line;
        this.advance();
        const attr = this.expectIdentifier();
        expr = { kind: 'Attribute', obj: expr, attr, line };
      } else break;
    }
    return expr;
  }

  private parseAtom(): Expr {
    const tok = this.current();
    if (tok.type === 'NUMBER') { this.advance(); return { kind: 'NumberLit', value: parseFloat(tok.value), line: tok.line }; }
    if (tok.type === 'STRING') { this.advance(); return { kind: 'StringLit', value: tok.value, line: tok.line }; }
    if (tok.type === 'FSTRING') { this.advance(); return { kind: 'FStringLit', parts: parseFStringParts(tok.value, tok.line), line: tok.line }; }
    if (tok.type === 'NAME') {
      if (tok.value === 'True') { this.advance(); return { kind: 'BoolLit', value: true, line: tok.line }; }
      if (tok.value === 'False') { this.advance(); return { kind: 'BoolLit', value: false, line: tok.line }; }
      if (tok.value === 'None') { this.advance(); return { kind: 'NoneLit', line: tok.line }; }
      if (UNSUPPORTED_KEYWORDS.has(tok.value)) throw new UnsupportedSyntaxError(tok.value, tok.line);
      this.advance();
      return { kind: 'Name', name: tok.value, line: tok.line };
    }
    if (this.checkOp('(')) {
      this.advance();
      const expr = this.parseExpr();
      this.expectOp(')');
      return expr;
    }
    if (this.checkOp('[')) {
      const line = tok.line;
      this.advance();
      if (this.checkOp(']')) { this.advance(); return { kind: 'ListLit', elements: [], line }; }
      const first = this.parseExpr();
      if (this.checkName('for')) {
        this.advance();
        const target = [this.expectIdentifier()];
        while (this.checkOp(',')) { this.advance(); target.push(this.expectIdentifier()); }
        this.expectName('in');
        const iter = this.parseExpr();
        let cond: Expr | null = null;
        if (this.checkName('if')) { this.advance(); cond = this.parseExpr(); }
        this.expectOp(']');
        return { kind: 'ListComp', expr: first, target, iter, cond, line };
      }
      const elements: Expr[] = [first];
      while (this.checkOp(',')) { this.advance(); if (this.checkOp(']')) break; elements.push(this.parseExpr()); }
      this.expectOp(']');
      return { kind: 'ListLit', elements, line };
    }
    if (this.checkOp('{')) {
      const line = tok.line;
      this.advance();
      const keys: Expr[] = []; const values: Expr[] = [];
      if (!this.checkOp('}')) {
        keys.push(this.parseExpr()); this.expectOp(':'); values.push(this.parseExpr());
        while (this.checkOp(',')) { this.advance(); if (this.checkOp('}')) break; keys.push(this.parseExpr()); this.expectOp(':'); values.push(this.parseExpr()); }
      }
      this.expectOp('}');
      return { kind: 'DictLit', keys, values, line };
    }
    throw new PySyntaxError(`Unexpected token '${tok.value || tok.type}'`, tok.line);
  }
}

// f-strings are tokenized as a raw string by the lexer; splitting "{expr}"
// segments out of that raw text happens here, at parse time, by recursively
// re-tokenizing+parsing each segment as its own expression — reusing the
// exact same grammar rather than a separate mini-parser for interpolations.
function parseFStringParts(raw: string, line: number): FStringPart[] {
  const parts: FStringPart[] = [];
  let buf = '';
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '{' && raw[i + 1] === '{') { buf += '{'; i += 2; continue; }
    if (ch === '}' && raw[i + 1] === '}') { buf += '}'; i += 2; continue; }
    if (ch === '{') {
      if (buf) { parts.push({ kind: 'str', value: buf }); buf = ''; }
      let depth = 1;
      let j = i + 1;
      let inStr: string | null = null;
      while (j < raw.length && depth > 0) {
        const c = raw[j];
        if (inStr) {
          if (c === '\\') { j += 2; continue; }
          if (c === inStr) inStr = null;
        } else if (c === '"' || c === "'") {
          inStr = c;
        } else if (c === '{' || c === '(' || c === '[') {
          depth++;
        } else if (c === '}' || c === ')' || c === ']') {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth !== 0) throw new PySyntaxError("Unterminated '{' in f-string", line);
      let exprSrc = raw.slice(i + 1, j);
      // Format spec ("{value:.2f}") used to be silently dropped entirely —
      // for the single most common formatting idiom in a chatbot project
      // (rounding a price/score/percentage), that meant printing the full
      // unrounded float with no error and no indication anything was
      // ignored. Captured here and applied at evaluation time instead
      // (see applyFormatSpec in evaluator.ts) for the common cases; still
      // degrades gracefully (spec ignored, not a hard failure) for
      // anything outside that subset.
      const colonAt = findTopLevelColon(exprSrc);
      let formatSpec: string | undefined;
      if (colonAt !== -1) {
        formatSpec = exprSrc.slice(colonAt + 1);
        exprSrc = exprSrc.slice(0, colonAt);
      }
      const subTokens = tokenize(exprSrc + '\n');
      const subParser = new Parser(subTokens);
      const expr = subParser.parseExpr();
      parts.push({ kind: 'expr', expr, formatSpec });
      i = j + 1;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf) parts.push({ kind: 'str', value: buf });
  return parts;
}

function findTopLevelColon(src: string): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ':' && depth === 0) return i;
  }
  return -1;
}

export function parseProgram(source: string): Program {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parseProgram();
}
