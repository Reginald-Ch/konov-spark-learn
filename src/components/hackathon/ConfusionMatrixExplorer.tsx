import { useMemo, useState } from 'react';

// 10 example "patients" with a TRUE label and a hypothetical model's
// predicted risk score — deliberately NOT perfectly separable (a couple of
// healthy scores overlap into the sick range, and one sick score is low),
// so moving the threshold actually trades precision against recall instead
// of both moving together, the same real dynamic the lesson's own precision/
// recall explanation describes.
const SAMPLES: { label: 'sick' | 'healthy'; score: number }[] = [
  { label: 'sick', score: 0.92 }, { label: 'sick', score: 0.81 }, { label: 'sick', score: 0.74 },
  { label: 'sick', score: 0.63 }, { label: 'sick', score: 0.45 },
  { label: 'healthy', score: 0.58 }, { label: 'healthy', score: 0.40 }, { label: 'healthy', score: 0.30 },
  { label: 'healthy', score: 0.22 }, { label: 'healthy', score: 0.10 },
];

export const ConfusionMatrixExplorer = () => {
  const [threshold, setThreshold] = useState(0.5);

  const { tp, fp, fn, tn, precision, recall } = useMemo(() => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const s of SAMPLES) {
      const predictedPositive = s.score >= threshold;
      if (s.label === 'sick' && predictedPositive) tp++;
      else if (s.label === 'healthy' && predictedPositive) fp++;
      else if (s.label === 'sick' && !predictedPositive) fn++;
      else tn++;
    }
    return {
      tp, fp, fn, tn,
      precision: tp + fp > 0 ? tp / (tp + fp) : 0,
      recall: tp + fn > 0 ? tp / (tp + fn) : 0,
    };
  }, [threshold]);

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2">
        Drag the threshold — watch precision and recall trade off
      </p>

      <div className="relative h-8 mb-2 rounded bg-[#0d0d0d] border border-white/10">
        {SAMPLES.map((s, i) => (
          <div
            key={i}
            title={`${s.label}, risk score ${s.score}`}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${s.score >= threshold ? 'ring-2 ring-white' : ''}`}
            style={{
              left: `${s.score * 100}%`,
              backgroundColor: s.label === 'sick' ? '#C70110' : '#00B894',
            }}
          />
        ))}
        <div className="absolute top-0 bottom-0 w-px bg-white/70" style={{ left: `${threshold * 100}%` }} />
      </div>

      <input
        type="range" min={0} max={1} step={0.01} value={threshold}
        onChange={(e) => setThreshold(parseFloat(e.target.value))}
        className="w-full accent-[hsl(var(--discord-blurple))] mb-1"
      />
      <p className="text-center text-xs text-white/70 mb-3">
        Threshold: <span className="font-mono font-bold text-white">{threshold.toFixed(2)}</span> — flag as "sick" if predicted risk is at or above this
      </p>

      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <div className="rounded p-1.5 bg-green-500/10 border border-green-500/30 text-center">
          <p className="text-base font-bold text-green-400">{tp}</p>
          <p className="text-[8px] text-white/50 uppercase leading-tight">True Pos</p>
        </div>
        <div className="rounded p-1.5 bg-red-500/10 border border-red-500/30 text-center">
          <p className="text-base font-bold text-red-400">{fp}</p>
          <p className="text-[8px] text-white/50 uppercase leading-tight">False Pos</p>
        </div>
        <div className="rounded p-1.5 bg-amber-500/10 border border-amber-500/30 text-center">
          <p className="text-base font-bold text-amber-400">{fn}</p>
          <p className="text-[8px] text-white/50 uppercase leading-tight">False Neg</p>
        </div>
        <div className="rounded p-1.5 bg-white/5 border border-white/15 text-center">
          <p className="text-base font-bold text-white/70">{tn}</p>
          <p className="text-[8px] text-white/50 uppercase leading-tight">True Neg</p>
        </div>
      </div>
      <div className="flex gap-4 justify-center text-xs">
        <span>Precision: <span className="font-mono font-bold text-[hsl(var(--discord-blurple))]">{(precision * 100).toFixed(0)}%</span></span>
        <span>Recall: <span className="font-mono font-bold text-[hsl(var(--discord-blurple))]">{(recall * 100).toFixed(0)}%</span></span>
      </div>
      <p className="text-[10px] text-white/40 mt-2 italic">
        10 example patients (red = actually sick, green = actually healthy), placed by a model's predicted risk score. Move the threshold and watch precision and recall pull in opposite directions.
      </p>
    </div>
  );
};
