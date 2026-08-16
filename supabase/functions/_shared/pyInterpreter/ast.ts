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
  | { kind: 'For'; target: string; iter: Expr; body: Stmt[]; line: number }
  | { kind: 'While'; test: Expr; body: Stmt[]; line: number }
  | { kind: 'FunctionDef'; name: string; params: string[]; body: Stmt[]; line: number }
  | { kind: 'Return'; value: Expr | null; line: number }
  | { kind: 'Pass'; line: number }
  | { kind: 'Break'; line: number }
  | { kind: 'Continue'; line: number };

export type Program = Stmt[];
