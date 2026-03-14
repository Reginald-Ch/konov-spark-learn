/**
 * Editor features: diff highlighting, Python linting, autocomplete, tutorial mode
 */

// ── Diff Highlighting ──
export const computeLineDiffs = (currentCode: string, templateCode: string): Set<number> => {
  const currentLines = currentCode.split('\n');
  const templateLines = templateCode.split('\n');
  const changed = new Set<number>();
  
  for (let i = 0; i < currentLines.length; i++) {
    if (i >= templateLines.length || currentLines[i] !== templateLines[i]) {
      // Only mark if line has actual content (skip pure whitespace additions)
      if (currentLines[i].trim()) {
        changed.add(i);
      }
    }
  }
  return changed;
};

// ── Python Linter ──
export interface LintError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export const lintPython = (code: string): LintError[] => {
  const errors: LintError[] = [];
  const lines = code.split('\n');
  const bracketStack: { char: string; line: number }[] = [];
  const OPENERS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let inMultiLineString = false;
  let multiLineDelim = '"""';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Track multi-line strings to avoid false positives inside them
    if (inMultiLineString) {
      if (trimmed.includes(multiLineDelim)) {
        inMultiLineString = false;
      }
      continue;
    }

    // Check for opening multi-line strings
    const tripleDoubleCount = (trimmed.match(/"""/g) || []).length;
    const tripleSingleCount = (trimmed.match(/'''/g) || []).length;
    
    const stripped = trimmed.replace(/#.*$/, '').trimEnd(); // Remove comments

    // Skip empty/comment-only lines
    if (!stripped) {
      // Still check for unclosed triple-quotes
      if (tripleDoubleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = '"""'; }
      else if (tripleSingleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = "'''"; }
      continue;
    }

    // Check: def/class/if/elif/else/for/while/try/except/finally/with missing colon
    const blockKeywords = /^(\s*)(def|class|if|elif|else|for|while|try|except|finally|with)\b/;
    const match = stripped.match(blockKeywords);
    if (match) {
      const keyword = match[2];
      // Check if it's inside a multi-line expression (has open bracket)
      const isInMultiLine = bracketStack.length > 0;
      // Don't flag continuation lines or lines inside brackets
      // Also don't flag if line contains a triple-quote (likely part of a docstring context)
      const hasTripleQuote = stripped.includes('"""') || stripped.includes("'''");
      if (!isInMultiLine && !hasTripleQuote && !stripped.endsWith(':') && !stripped.endsWith(':\\')) {
        errors.push({
          line: i,
          message: `Missing ':' after '${keyword}' statement`,
          severity: 'error',
        });
      }
    }

    // Track brackets (simplified — ignores strings)
    let inString = false;
    let stringChar = '';
    for (let j = 0; j < stripped.length; j++) {
      const ch = stripped[j];
      if (ch === '#' && !inString) break;
      
      if (!inString && (ch === '"' || ch === "'")) {
        // Check for triple quotes
        if (stripped.slice(j, j + 3) === ch.repeat(3)) {
          // Skip triple-quoted strings entirely on this line
          const closeIdx = stripped.indexOf(ch.repeat(3), j + 3);
          if (closeIdx !== -1) {
            j = closeIdx + 2;
            continue;
          } else {
            break; // Multi-line string, skip rest
          }
        }
        inString = true;
        stringChar = ch;
        continue;
      }
      if (inString && ch === stringChar && stripped[j - 1] !== '\\') {
        inString = false;
        continue;
      }
      if (inString) continue;

      if (OPENERS[ch]) {
        bracketStack.push({ char: ch, line: i });
      } else if (CLOSERS[ch]) {
        if (bracketStack.length === 0) {
          errors.push({ line: i, message: `Unmatched '${ch}'`, severity: 'error' });
        } else {
          const last = bracketStack[bracketStack.length - 1];
          if (last.char !== CLOSERS[ch]) {
            errors.push({ line: i, message: `Expected '${OPENERS[last.char]}' but found '${ch}'`, severity: 'error' });
          }
          bracketStack.pop();
        }
      }
    }

    // Check: indentation (must be multiple of 4 spaces, no tabs)
    if (line.includes('\t')) {
      errors.push({ line: i, message: 'Use spaces instead of tabs', severity: 'warning' });
    }

    // Check: '=' in if/elif/while condition (common mistake: using = instead of ==)
    const conditionMatch = stripped.match(/^(\s*)(if|elif|while)\s+(.+):\s*$/);
    if (conditionMatch) {
      const condition = conditionMatch[3];
      // Look for single = that isn't == or != or <= or >= or :=
      if (/(?<![=!<>:])=(?!=)/.test(condition)) {
        errors.push({ line: i, message: `Did you mean '==' instead of '='?`, severity: 'warning' });
      }
    }

    // Track multi-line string openings at end of processing
    if (tripleDoubleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = '"""'; }
    else if (tripleSingleCount % 2 !== 0) { inMultiLineString = true; multiLineDelim = "'''"; }
  }

  // Report unclosed brackets
  for (const open of bracketStack) {
    errors.push({ line: open.line, message: `Unclosed '${open.char}'`, severity: 'error' });
  }

  return errors;
};

// ── Autocomplete ──
export interface AutocompleteItem {
  label: string;
  type: 'variable' | 'keyword' | 'builtin';
  detail?: string;
}

const PYTHON_KEYWORDS = ['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'with', 'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'yield', 'lambda', 'True', 'False', 'None', 'async', 'await'];

const PYTHON_BUILTINS = ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'input', 'open', 'super', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'any', 'all', 'abs', 'max', 'min'];

export const getAutocompleteItems = (code: string, currentWord: string): AutocompleteItem[] => {
  if (currentWord.length < 2) return [];
  
  const lower = currentWord.toLowerCase();
  const items: AutocompleteItem[] = [];
  
  // Extract SCREAMING_CASE variables from code
  const varMatches = code.match(/^[A-Z][A-Z0-9_]{2,}(?=\s*=)/gm) || [];
  const uniqueVars = [...new Set(varMatches)];
  
  for (const v of uniqueVars) {
    if (v.toLowerCase().includes(lower)) {
      items.push({ label: v, type: 'variable', detail: 'Config variable' });
    }
  }
  
  // Python keywords
  for (const kw of PYTHON_KEYWORDS) {
    if (kw.toLowerCase().startsWith(lower) && kw.toLowerCase() !== lower) {
      items.push({ label: kw, type: 'keyword' });
    }
  }
  
  // Builtins
  for (const bi of PYTHON_BUILTINS) {
    if (bi.toLowerCase().startsWith(lower) && bi.toLowerCase() !== lower) {
      items.push({ label: bi, type: 'builtin' });
    }
  }
  
  // Sort: variables first, then exact prefix matches, then fuzzy
  return items
    .sort((a, b) => {
      if (a.type === 'variable' && b.type !== 'variable') return -1;
      if (b.type === 'variable' && a.type !== 'variable') return 1;
      const aStarts = a.label.toLowerCase().startsWith(lower);
      const bStarts = b.label.toLowerCase().startsWith(lower);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      return a.label.localeCompare(b.label);
    })
    .slice(0, 8);
};

// ── Tutorial / Interactive Guide ──
export interface TutorialStep {
  challengeIndex: number;
  variableName: string;
  linePattern: RegExp;
  instruction: string;
  example: string;
}

export const CHATBOT_TUTORIAL_STEPS: TutorialStep[] = [
  { challengeIndex: 0, variableName: 'BOT_NAME', linePattern: /^BOT_NAME\s*=/, instruction: 'Change your bot\'s name to something unique!', example: 'BOT_NAME = "GhanaBot"' },
  { challengeIndex: 1, variableName: 'BOT_EMOJI', linePattern: /^BOT_EMOJI\s*=/, instruction: 'Pick an emoji that represents your bot', example: 'BOT_EMOJI = "🇬🇭"' },
  { challengeIndex: 2, variableName: 'AI_MESSAGE', linePattern: /^AI_MESSAGE\s*=/, instruction: 'Write a welcoming first message', example: 'AI_MESSAGE = "Akwaaba! Welcome!"' },
  { challengeIndex: 3, variableName: 'CREATOR_NAME', linePattern: /^CREATOR_NAME\s*=/, instruction: 'Add your name as the creator', example: 'CREATOR_NAME = "Kofi"' },
  { challengeIndex: 4, variableName: 'SYSTEM_MESSAGE', linePattern: /^SYSTEM_MESSAGE\s*=/, instruction: 'Define your bot\'s personality (3+ sentences!)', example: 'SYSTEM_MESSAGE = """You are Chef Kofi..."""' },
  { challengeIndex: 5, variableName: 'KNOWLEDGE_BASE', linePattern: /^KNOWLEDGE_BASE\s*=/, instruction: 'Add facts your bot should know', example: 'KNOWLEDGE_BASE = """Python was created in 1991..."""' },
  { challengeIndex: 6, variableName: 'QA_PAIRS', linePattern: /^QA_PAIRS\s*=/, instruction: 'Add question-answer pairs for precise responses', example: 'QA_PAIRS = [{"q": "...", "a": "..."}]' },
  { challengeIndex: 7, variableName: 'TEMPERATURE', linePattern: /^TEMPERATURE\s*=/, instruction: 'Adjust creativity (0.0=precise, 1.0=creative)', example: 'TEMPERATURE = 0.9' },
];

export const findLineForVariable = (code: string, pattern: RegExp): number => {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i].trim())) return i;
  }
  return -1;
};

// ── Search helpers ──
export interface SearchMatch {
  line: number;
  startCol: number;
  endCol: number;
}

export const findAllMatches = (code: string, searchTerm: string, caseSensitive: boolean = false): SearchMatch[] => {
  if (!searchTerm) return [];
  const lines = code.split('\n');
  const matches: SearchMatch[] = [];
  const flags = caseSensitive ? 'g' : 'gi';
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, flags);
  
  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = regex.exec(lines[i])) !== null) {
      matches.push({ line: i, startCol: match.index, endCol: match.index + match[0].length });
    }
  }
  return matches;
};
