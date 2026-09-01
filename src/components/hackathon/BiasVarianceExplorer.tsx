import { useState } from 'react';

// The exact same 5 (complexity, train_error, test_error) points already
// taught in "When AI Gets It Wrong"'s code example — this widget deliberately
// reuses that data rather than a different one, so it reads as "watch the
// table above become a graph" instead of a new thing to learn. Only 5 real
// points exist (there's no real underlying model being fit here, same as the
// lesson's own code — these are illustrative numbers a real training run
// would produce), so the slider is discrete/step=1 rather than continuous;
// interpolating between them would fabricate data the lesson never claimed.
const RESULTS = [
  { complexity: 1, train_error: 8.2, test_error: 8.5 },
  { complexity: 2, train_error: 5.1, test_error: 5.6 },
  { complexity: 3, train_error: 2.4, test_error: 2.9 },
  { complexity: 4, train_error: 0.9, test_error: 3.8 },
  { complexity: 5, train_error: 0.2, test_error: 7.1 },
];
const BEST_COMPLEXITY = RESULTS.reduce((a, b) => (b.test_error < a.test_error ? b : a)).complexity;

const X_MIN = 1, X_MAX = 5;
const Y_MAX = 9;
const xToSvg = (c: number) => 28 + ((c - X_MIN) / (X_MAX - X_MIN)) * 244;
const yToSvg = (err: number) => 172 - (Math.min(Y_MAX, err) / Y_MAX) * 152;

const linePath = (key: 'train_error' | 'test_error') =>
  RESULTS.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xToSvg(r.complexity)} ${yToSvg(r[key])}`).join(' ');

export const BiasVarianceExplorer = () => {
  const [complexity, setComplexity] = useState(3);
  const current = RESULTS.find((r) => r.complexity === complexity)!;
  const zone = complexity <= 2 ? 'underfitting' : complexity >= 4 ? 'overfitting' : 'sweet spot';

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Drag the complexity slider — watch the U-shape</p>
        <span className="text-[10px] font-mono text-white/50">Complexity {complexity}</span>
      </div>
      <svg viewBox="0 0 300 190" className="w-full rounded-md bg-[#0d0d0d] border border-white/10">
        <line x1={28} y1={172} x2={272} y2={172} stroke="#333" strokeWidth={1} />
        <line x1={28} y1={20} x2={28} y2={172} stroke="#333" strokeWidth={1} />
        {/* Best-generalization marker, drawn first so the data lines sit on top */}
        <line x1={xToSvg(BEST_COMPLEXITY)} y1={20} x2={xToSvg(BEST_COMPLEXITY)} y2={172} stroke="#00B894" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        <path d={linePath('train_error')} fill="none" stroke="#5865F2" strokeWidth={2} />
        <path d={linePath('test_error')} fill="none" stroke="#C70110" strokeWidth={2} />
        {RESULTS.map((r) => (
          <g key={r.complexity}>
            <circle cx={xToSvg(r.complexity)} cy={yToSvg(r.train_error)} r={3} fill="#5865F2" />
            <circle cx={xToSvg(r.complexity)} cy={yToSvg(r.test_error)} r={3} fill="#C70110" />
          </g>
        ))}
        {/* Selected-point highlight */}
        <circle cx={xToSvg(complexity)} cy={yToSvg(current.train_error)} r={5} fill="none" stroke="#5865F2" strokeWidth={2} />
        <circle cx={xToSvg(complexity)} cy={yToSvg(current.test_error)} r={5} fill="none" stroke="#C70110" strokeWidth={2} />
      </svg>
      <div className="flex items-center gap-3 mt-2 text-[10px]">
        <span className="flex items-center gap-1 text-[hsl(var(--discord-blurple))]"><span className="w-2 h-2 rounded-full bg-[hsl(var(--discord-blurple))]" /> Train error</span>
        <span className="flex items-center gap-1 text-[#ff6b7a]"><span className="w-2 h-2 rounded-full bg-[#C70110]" /> Test error</span>
      </div>
      <input
        type="range" min={X_MIN} max={X_MAX} step={1} value={complexity}
        onChange={(e) => setComplexity(parseInt(e.target.value, 10))}
        className="w-full accent-[hsl(var(--discord-blurple))] mt-2"
      />
      <p className="text-center text-xs text-white/70 mt-1">
        Train error: <span className="font-mono font-bold text-[hsl(var(--discord-blurple))]">{current.train_error.toFixed(1)}</span>
        {'  '}Test error: <span className="font-mono font-bold text-[#ff6b7a]">{current.test_error.toFixed(1)}</span>
        {'  — '}
        <span className={zone === 'sweet spot' ? 'text-[#00B894] font-bold' : 'text-amber-400 font-bold'}>
          {zone === 'underfitting' ? 'underfitting (high bias)' : zone === 'overfitting' ? 'overfitting (high variance)' : 'best generalization'}
        </span>
      </p>
      <p className="text-[10px] text-white/40 mt-2 italic">
        Train error keeps dropping the more complex the model gets — but test error bottoms out at complexity {BEST_COMPLEXITY} and climbs back up. That gap between the two lines, once it opens up on the right, is overfitting made visible.
      </p>
    </div>
  );
};
