// AST node types for the FORGE Python-subset parser. Deliberately mirrors
// real Python grammar node shapes (not an invented DSL) — see the plan's
// "real Python, constrained subset" rationale: code written against this
// grammar should behave identically to real CPython for anything it accepts.

export type FStringPart =
  | { kind: 'str'; value: string }
  | { kind: 'expr'; expr: Expr };

export type Expr =
  | { kind: 'NumberLit'; value: number; line: number }
  | { kind: 'StringLit'; value: string; line: number }
  | { kind: 'FStringLit'; parts: FStringPart[]; line: number }
  | { kind: 'BoolLit'; value: boolean; line: number }
  | { kind: 'NoneLit'; line: number }
  | { kind: 'Name'; name: string; line: number }
  | { kind: 'ListLit'; elements: Expr[]; line: number }
  // `[expr for target in iter]`, optionally `if cond` — reuses the same
  // `target: string[]` shape as `For` below (so `for k, v in d.items()`
  // works here too), and deliberately writes its loop variable into the
  // *enclosing* scope rather than a fresh child scope — real CPython gives
  // comprehensions their own scope, but plain `for` loops in this
  // interpreter already don't, so matching that existing behavior keeps
  // this subset internally consistent rather than picking real-Python
  // fidelity in one spot and diverging from it everywhere else.
  | { kind: 'ListComp'; expr: Expr; target: string[]; iter: Expr; cond: Expr | null; line: number }
  | { kind: 'DictLit'; keys: Expr[]; values: Expr[]; line: number }
  | { kind: 'UnaryOp'; op: 'not' | '-' | '+'; operand: Expr; line: number }
  | { kind: 'BinOp'; op: string; left: Expr; right: Expr; line: number }
  | { kind: 'BoolOp'; op: 'and' | 'or'; values: Expr[]; line: number }
  | { kind: 'Compare'; left: Expr; ops: string[]; comparators: Expr[]; line: number }
  | { kind: 'Call'; func: Expr; args: Expr[]; line: number }
  | { kind: 'Attribute'; obj: Expr; attr: string; line: number }
  | { kind: 'Subscript'; obj: Expr; index: Expr; line: number };

export type Stmt =
  | { kind: 'ExprStmt'; expr: Expr; line: number }
  | { kind: 'Assign'; targets: Expr[]; value: Expr; line: number }
  | { kind: 'AugAssign'; target: Expr; op: string; value: Expr; line: number }
  | { kind: 'If'; test: Expr; body: Stmt[]; orelse: Stmt[]; line: number }
  // `target` is 1+ names — a plain `for x in ...:` has one, `for k, v in
  // d.items():` has two. Deliberately NOT general tuple unpacking (no
  // tuple literals, no unpacking in plain assignment) — scoped narrowly to
  // just making .items()/enumerate()-style iteration actually usable,
  // which was a real dead end without this.
  | { kind: 'For'; target: string[]; iter: Expr; body: Stmt[]; line: number }
  | { kind: 'While'; test: Expr; body: Stmt[]; line: number }
  | { kind: 'FunctionDef'; name: string; params: string[]; body: Stmt[]; line: number }
  | { kind: 'Return'; value: Expr | null; line: number }
  | { kind: 'Pass'; line: number }
  | { kind: 'Break'; line: number }
  | { kind: 'Continue'; line: number }
  // Single except clause only — no exception-type matching (`except
  // ValueError:`), since the interpreter doesn't model exception types,
  // only messages. `exceptVar` is the `as e` binding, if present.
  | { kind: 'Try'; body: Stmt[]; exceptVar: string | null; exceptBody: Stmt[]; line: number }
  // `import` stays rejected as UnsupportedSyntaxError for everything except
  // a small explicit allowlist (currently just `random`) — this is that
  // one carve-out, not general import support.
  | { kind: 'Import'; module: string; line: number };

export type Program = Stmt[];
