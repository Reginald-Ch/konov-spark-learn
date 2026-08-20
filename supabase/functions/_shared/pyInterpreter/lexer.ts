import { PySyntaxError } from './errors.ts';

export type TokenType = 'NUMBER' | 'STRING' | 'FSTRING' | 'NAME' | 'OP' | 'NEWLINE' | 'INDENT' | 'DEDENT' | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const THREE_CHAR_OPS = ['//=', '**='];
const MULTI_CHAR_OPS = ['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%='];
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '(', ')', '[', ']', '{', '}', ':', ',', '.', '@']);

function isIdentStart(ch: string) { return /[A-Za-z_]/.test(ch); }
function isIdentPart(ch: string) { return /[A-Za-z0-9_]/.test(ch); }
function isDigit(ch: string) { return ch >= '0' && ch <= '9'; }

// Tokenizes the WHOLE source in one pass, tracking bracket depth (to know
// when physical newlines are real line breaks vs. implicit continuations
// inside (), [], {}) and an indent stack (to synthesize INDENT/DEDENT
// tokens) — the two things that make Python's grammar whitespace-sensitive
// and that a naive line-by-line tokenizer gets wrong on nested/multi-line
// expressions.
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const indentStack = [0];
  let bracketDepth = 0;
  let i = 0;
  let line = 1;
  let atLineStart = true; // true right after a logical NEWLINE (or at source start)
  const n = source.length;

  const push = (type: TokenType, value: string, tokLine = line) => tokens.push({ type, value, line: tokLine });

  while (i < n) {
    if (atLineStart && bracketDepth === 0) {
      // Measure indentation of this physical line, first skipping over any
      // number of blank or comment-only lines — those never affect the
      // indent stack and never emit NEWLINE (matching real Python: a blank
      // line inside an indented block doesn't dedent anything).
      let indentStart = i;
      while (i < n) {
        let col = 0;
        const lineIndentStart = i;
        while (i < n && (source[i] === ' ' || source[i] === '\t')) {
          if (source[i] === '\t') throw new PySyntaxError('Use spaces instead of tabs for indentation.', line);
          col++;
          i++;
        }
        if (i >= n) { i = lineIndentStart; break; } // trailing whitespace at EOF, nothing more to tokenize
        if (source[i] === '\n') { line++; i++; indentStart = i; continue; } // blank line
        if (source[i] === '#') { // comment-only line
          while (i < n && source[i] !== '\n') i++;
          if (i < n) { line++; i++; }
          indentStart = i;
          continue;
        }
        // Real code found — this is the line whose indentation counts.
        const currentIndent = col;
        const top = indentStack[indentStack.length - 1];
        if (currentIndent > top) {
          indentStack.push(currentIndent);
          push('INDENT', '');
        } else if (currentIndent < top) {
          while (indentStack.length > 1 && indentStack[indentStack.length - 1] > currentIndent) {
            indentStack.pop();
            push('DEDENT', '');
          }
          if (indentStack[indentStack.length - 1] !== currentIndent) {
            throw new PySyntaxError('Inconsistent indentation — this line doesn\'t match any enclosing block.', line);
          }
        }
        break;
      }
      atLineStart = false;
      if (i >= n) break;
    }

    const ch = source[i];

    if (ch === '\n') {
      i++;
      const savedLine = line;
      line++;
      if (bracketDepth === 0) {
        // Don't emit consecutive NEWLINEs for blank lines / right after another NEWLINE.
        if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE' && tokens[tokens.length - 1].type !== 'INDENT' && tokens[tokens.length - 1].type !== 'DEDENT') {
          push('NEWLINE', '\n', savedLine);
        }
        atLineStart = true;
      }
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }

    if (ch === '#') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }

    if (ch === '\\' && source[i + 1] === '\n') {
      // Explicit line-continuation backslash — swallow it, no NEWLINE.
      i += 2;
      line++;
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(source[i + 1] ?? ''))) {
      let start = i;
      while (i < n && isDigit(source[i])) i++;
      if (source[i] === '.') { i++; while (i < n && isDigit(source[i])) i++; }
      push('NUMBER', source.slice(start, i));
      continue;
    }

    if (ch === '"' || ch === "'" || ((ch === 'f' || ch === 'F') && (source[i + 1] === '"' || source[i + 1] === "'"))) {
      const isF = ch === 'f' || ch === 'F';
      const qStart = isF ? i + 1 : i;
      const quoteChar = source[qStart];
      const isTriple = source.slice(qStart, qStart + 3) === quoteChar.repeat(3);
      const delim = isTriple ? quoteChar.repeat(3) : quoteChar;
      let contentStart = qStart + delim.length;
      let j = contentStart;
      let raw = '';
      while (j < n) {
        if (source[j] === '\\') { raw += source[j] + (source[j + 1] ?? ''); j += 2; continue; }
        if (source.slice(j, j + delim.length) === delim) break;
        if (source[j] === '\n') { line++; }
        raw += source[j];
        j++;
      }
      if (source.slice(j, j + delim.length) !== delim) {
        throw new PySyntaxError(`Unterminated string — missing a closing ${quoteChar}`, line);
      }
      const value = unescapeString(raw);
      push(isF ? 'FSTRING' : 'STRING', value);
      i = j + delim.length;
      continue;
    }

    if (isIdentStart(ch)) {
      let start = i;
      while (i < n && isIdentPart(source[i])) i++;
      push('NAME', source.slice(start, i));
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') { bracketDepth++; push('OP', ch); i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { bracketDepth = Math.max(0, bracketDepth - 1); push('OP', ch); i++; continue; }

    // Checked before the 2-char slice below — `//=`/`**=` are genuinely
    // 3-char tokens (floor-div/power augmented assignment). Without this,
    // `x //= 3` lexed as `//` (floor division, greedily matched first)
    // followed by a bare `=`, and the parser choked on that stray `=` with
    // a generic "Unexpected token" error — confusing for a student who
    // correctly knows `//=` is valid Python syntax.
    const three = source.slice(i, i + 3);
    if (THREE_CHAR_OPS.includes(three)) { push('OP', three); i += 3; continue; }

    const two = source.slice(i, i + 2);
    if (MULTI_CHAR_OPS.includes(two)) { push('OP', two); i += 2; continue; }

    if (SINGLE_CHAR_OPS.has(ch)) { push('OP', ch); i++; continue; }

    throw new PySyntaxError(`Unexpected character '${ch}'`, line);
  }

  if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE') push('NEWLINE', '\n');
  while (indentStack.length > 1) { indentStack.pop(); push('DEDENT', ''); }
  push('EOF', '');
  return tokens;
}

function unescapeString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\') {
      const next = raw[i + 1];
      if (next === 'n') { out += '\n'; i++; }
      else if (next === 't') { out += '\t'; i++; }
      else if (next === '\\') { out += '\\'; i++; }
      else if (next === "'") { out += "'"; i++; }
      else if (next === '"') { out += '"'; i++; }
      else if (next === '\n') { i++; } // line-continuation inside string
      else { out += raw[i]; }
    } else {
      out += raw[i];
    }
  }
  return out;
}
