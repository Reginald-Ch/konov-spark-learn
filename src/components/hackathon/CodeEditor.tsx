import { useMemo } from 'react';
import { tokenizeLine, TOKEN_COLORS, lintPython } from './editorFeatures';

// A small, standalone Python editor — built fresh rather than extracted
// from ProjectEditor.tsx's ~450-line editing surface (tightly coupled to
// ~15 pieces of that component's own state; extracting it would be real
// refactor risk against a proven, live feature for no benefit here).
// Reuses only the already-decoupled pure functions (tokenizeLine/
// TOKEN_COLORS, lintPython), not any of ProjectEditor's JSX.
//
// Deliberately auto-growing height, no internal scrolling — Python
// Challenge solutions are small (one function), unlike ProjectEditor's
// multi-hundred-line real projects, so there's no need for the scroll-sync
// machinery a fixed-height editor would require. This also means the line
// gutter and the code both live in normal document flow and stay aligned
// for free, with no scroll-position bookkeeping at all.
//
// The highlighted overlay is built from real JSX spans, not
// dangerouslySetInnerHTML — same visual technique (transparent textarea
// stacked over a highlighted layer via CSS grid) as ProjectEditor, but
// text content never goes through raw HTML injection here.
//
// Known, deliberate limitation: tokenizeLine has no cross-line state, so a
// multi-line triple-quoted string won't highlight correctly across line
// breaks (each line re-tokenizes fresh, unaware it's "inside" one from the
// line before). This affects only cosmetic coloring, never correctness —
// the interpreter's own lexer (a separate implementation) handles
// multi-line strings correctly for actual execution. Not expected to come
// up often in small, single-function Challenge solutions.
//
// Real parse errors (from the interpreter's actual parser) are NOT shown
// here inline — the frontend's tsconfig scopes type-checking to `src/`
// only, so importing the parser from supabase/functions/_shared/ would be
// fragile, and duplicating it client-side risks the two copies drifting
// apart. Inline feedback uses the same lintPython heuristic checker
// CodePracticeCell already uses; the real, authoritative error (with the
// full unsupported_syntax/syntax_error/runtime_error/timeout taxonomy)
// comes back from the Run/Submit round-trip to the grading edge function,
// which is the only place code is ever actually executed anyway.
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minRows?: number;
}

export const CodeEditor = ({ value, onChange, disabled, minRows = 6 }: CodeEditorProps) => {
  const lines = useMemo(() => value.split('\n'), [value]);
  const lintErrors = useMemo(() => {
    try { return lintPython(value); } catch { return []; }
  }, [value]);
  const errorLines = useMemo(() => new Set(lintErrors.filter(e => e.severity === 'error').map(e => e.line)), [lintErrors]);
  const rowCount = Math.max(minRows, lines.length + 1);

  return (
    <div className="rounded-lg overflow-hidden border border-[hsl(var(--discord-light)/0.2)] bg-[#0d0d0d]">
      <div className="flex">
        {/* Line numbers — plain document flow, no scroll-sync needed since
            nothing here scrolls independently. */}
        <div className="select-none text-right pr-2 pl-3 py-3 text-xs font-mono leading-relaxed text-white/25 bg-[#0a0a0a] border-r border-white/5">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className={errorLines.has(i) ? 'text-red-400/70' : undefined}>{i + 1}</div>
          ))}
        </div>

        {/* Code area: transparent textarea stacked over a highlighted
            overlay via CSS grid — both share the same grid-area, so they
            occupy identical space and the real caret lines up with the
            highlighted text underneath it. */}
        <div className="relative flex-1 grid" style={{ gridTemplateAreas: '"stack"' }}>
          <div
            aria-hidden="true"
            className="py-3 px-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all pointer-events-none"
            style={{ gridArea: 'stack' }}
          >
            {lines.map((line, i) => (
              <div key={i}>
                {line === '' ? ' ' : tokenizeLine(line).map((tok, ti) => (
                  <span key={ti} className={TOKEN_COLORS[tok.type]}>{tok.value}</span>
                ))}
              </div>
            ))}
            {/* Extra blank rows so the overlay's height always matches the
                textarea's row count, even when there's less real content
                than minRows. */}
            {Array.from({ length: Math.max(0, rowCount - lines.length) }).map((_, i) => (
              <div key={`pad-${i}`}>{' '}</div>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            spellCheck={false}
            rows={rowCount}
            className="py-3 px-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-transparent text-transparent caret-white resize-none focus:outline-none disabled:opacity-50"
            style={{ gridArea: 'stack' }}
          />
        </div>
      </div>

      {lintErrors.length > 0 && (
        <div className="border-t border-white/5 bg-[#161616] px-3 py-2 space-y-0.5 max-h-24 overflow-y-auto">
          {lintErrors.map((e, i) => (
            <p key={i} className={`text-[11px] ${e.severity === 'error' ? 'text-red-400/90' : 'text-amber-400/80'}`}>
              ⚠ Line {e.line + 1}: {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
