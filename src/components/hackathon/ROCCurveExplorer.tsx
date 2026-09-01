import { useMemo, useState } from 'react';

// The exact same 6 scored predictions already taught in "How Do We Know a
// Model Is Good?"'s code example — this widget draws the REAL ROC curve
// those numbers trace out, rather than the three printed threshold rows the
// lesson's code shows. With only 6 examples the true curve is a staircase,
// not a smooth arc — that's mathematically correct, not a simplification;
// a real ROC curve only looks smooth once you have thousands of examples
// instead of 6.
const SCORED: { score: number; actual: 'spam' | 'not spam' }[] = [
  { score: 0.95, actual: 'spam' },
  { score: 0.80, actual: 'spam' },
  { score: 0.60, actual: 'not spam' },
  { score: 0.55, actual: 'spam' },
  { score: 0.30, actual: 'not spam' },
  { score: 0.10, actual: 'not spam' },
];

function ratesAtThreshold(threshold: number): { fpr: number; tpr: number } {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const p of SCORED) {
    const predictedPositive = p.score >= threshold;
    if (predictedPositive && p.actual === 'spam') tp++;
    else if (predictedPositive && p.actual === 'not spam') fp++;
    else if (!predictedPositive && p.actual === 'spam') fn++;
    else tn++;
  }
  return { tpr: tp + fn ? tp / (tp + fn) : 0, fpr: fp + tn ? fp / (fp + tn) : 0 };
}

const SIZE = 172; // square plot area
const ORIGIN_X = 30, ORIGIN_Y = 172;
const toSvgX = (fpr: number) => ORIGIN_X + fpr * SIZE;
const toSvgY = (tpr: number) => ORIGIN_Y - tpr * SIZE;

export const ROCCurveExplorer = () => {
  const [threshold, setThreshold] = useState(0.5);

  // Sweep finely across every possible threshold to trace the exact
  // staircase — the function only actually changes value at the 6 real
  // score points, so a fine sweep reproduces the true curve exactly, not an
  // approximation of it.
  const { curvePath, auc } = useMemo(() => {
    const points: { fpr: number; tpr: number }[] = [];
    for (let t = 1.001; t >= -0.001; t -= 0.002) points.push(ratesAtThreshold(t));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.fpr)} ${toSvgY(p.tpr)}`).join(' ');
    // Trapezoidal rule over the swept points, sorted by FPR
    const sorted = [...points].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
    let area = 0;
    for (let i = 1; i < sorted.length; i++) {
      area += (sorted[i].fpr - sorted[i - 1].fpr) * (sorted[i].tpr + sorted[i - 1].tpr) / 2;
    }
    return { curvePath: path, auc: area };
  }, []);

  const current = ratesAtThreshold(threshold);

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Drag the threshold — trace the ROC curve</p>
        <span className="text-[10px] font-mono text-white/50">AUC {auc.toFixed(2)}</span>
      </div>
      <svg viewBox="0 0 210 190" className="w-full rounded-md bg-[#0d0d0d] border border-white/10">
        <line x1={ORIGIN_X} y1={ORIGIN_Y} x2={ORIGIN_X + SIZE} y2={ORIGIN_Y} stroke="#333" strokeWidth={1} />
        <line x1={ORIGIN_X} y1={ORIGIN_Y - SIZE} x2={ORIGIN_X} y2={ORIGIN_Y} stroke="#333" strokeWidth={1} />
        {/* Diagonal "no better than random" reference line */}
        <line x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(1)} y2={toSvgY(1)} stroke="#555" strokeWidth={1} strokeDasharray="3 3" />
        <path d={curvePath} fill="none" stroke="#5865F2" strokeWidth={2} />
        {/* Live point at the currently-selected threshold */}
        <circle cx={toSvgX(current.fpr)} cy={toSvgY(current.tpr)} r={5} fill="#F7941D" stroke="#0d0d0d" strokeWidth={1.5} />
        <text x={ORIGIN_X + SIZE / 2} y={ORIGIN_Y + 14} textAnchor="middle" fontSize={8} fill="#888">False Positive Rate</text>
        <text x={10} y={ORIGIN_Y - SIZE / 2} textAnchor="middle" fontSize={8} fill="#888" transform={`rotate(-90 10 ${ORIGIN_Y - SIZE / 2})`}>True Positive Rate</text>
      </svg>
      <input
        type="range" min={0} max={1} step={0.01} value={threshold}
        onChange={(e) => setThreshold(parseFloat(e.target.value))}
        className="w-full accent-[hsl(var(--discord-blurple))] mt-2"
      />
      <p className="text-center text-xs text-white/70 mt-1">
        Threshold <span className="font-mono font-bold text-white">{threshold.toFixed(2)}</span> —
        {' '}FPR <span className="font-mono font-bold text-[#F7941D]">{current.fpr.toFixed(2)}</span>,
        {' '}TPR <span className="font-mono font-bold text-[#F7941D]">{current.tpr.toFixed(2)}</span>
      </p>
      <p className="text-[10px] text-white/40 mt-2 italic">
        The dashed diagonal is what a coin-flip classifier would trace (AUC 0.5). This one bows toward the top-left — real signal, not guessing — with an AUC of {auc.toFixed(2)}.
      </p>
    </div>
  );
};
