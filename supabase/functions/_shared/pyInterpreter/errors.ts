// Error taxonomy for the FORGE Python-subset interpreter. Kept as distinct
// classes (not one generic Error) because the grading harness needs to tell
// "student wrote something outside the supported subset" apart from "student
// has a genuine bug" apart from "ran too long" — collapsing these into one
// message is exactly the kind of dishonest feedback this interpreter exists
// to avoid (see the "Run Tests" LLM-simulation it replaces).

export type PyErrorType = 'unsupported_syntax' | 'syntax_error' | 'runtime_error' | 'timeout';

export class PyError extends Error {
  readonly type: PyErrorType;
  readonly line: number | undefined;

  constructor(type: PyErrorType, message: string, line?: number) {
    super(message);
    this.type = type;
    this.line = line;
  }
}

export class UnsupportedSyntaxError extends PyError {
  constructor(feature: string, line?: number) {
    super('unsupported_syntax', `'${feature}' isn't supported here — this editor runs a subset of Python.`, line);
  }
}

export class PySyntaxError extends PyError {
  constructor(message: string, line?: number) {
    super('syntax_error', message, line);
  }
}

export class PyRuntimeError extends PyError {
  constructor(message: string, line?: number) {
    super('runtime_error', message, line);
  }
}

export class PyTimeoutError extends PyError {
  constructor(message = 'Your code took too long to run — check for infinite loops.') {
    super('timeout', message);
  }
}
