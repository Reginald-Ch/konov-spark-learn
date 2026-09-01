import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

// The exact same toy dataset and update rule as "Training vs. Predicting" /
// "The ML Workflow, Step by Step" (size -> price) — this widget deliberately
// reuses the already-taught math rather than introducing a different
// example, so it reads as "watch the code above happen" rather than a new,
// separate thing to learn.
const DATA = [{ x: 1, y: 12 }, { x: 2, y: 20 }, { x: 3, y: 28 }, { x: 4, y: 35 }];
const MAX_EPOCHS = 150;

// Verified against a real Node.js simulation of this exact dataset before
// shipping — these are not guessed labels. At 150 epochs: 0.001 still has
// cost ~0.40 (visibly still improving, nowhere near converged); 0.01
// reaches ~0.08 (a good, tight fit); 0.15 explodes to an astronomical,
// non-useful cost (~1e73) within the same 150 steps. This is the one
// control the original version of this widget was missing — everything
// else here only ever let a student WATCH training happen or manipulate an
// already-computed result; picking a learning rate and discovering its
// consequence is the first place in this module a student actually trains
// something with their own choice.
const LEARNING_RATE_PRESETS = [
  { value: 0.001, label: 'Too Slow' },
  { value: 0.01, label: 'Good' },
  { value: 0.15, label: 'Too Fast' },
] as const;

const X_DOMAIN = 5;
const Y_DOMAIN = 45;
const xToSvg = (x: number) => 24 + (x / X_DOMAIN) * 256;
const yToSvg = (y: number) => 176 - (Math.max(0, Math.min(Y_DOMAIN, y)) / Y_DOMAIN) * 156;

// A cost that has exploded (diverged) or overflowed to Infinity/NaN prints
// as either a nonsensical wall of digits or the literal string "NaN" via
// toFixed — neither is meaningful to a student. Exponential notation stays
// readable at any magnitude, and non-finite gets its own explicit label.
const formatCost = (c: number): string => {
  if (!Number.isFinite(c)) return 'exploded';
  if (c > 9999) return c.toExponential(1);
  return c.toFixed(2);
};

export const GradientDescentAnimator = () => {
  const [learningRate, setLearningRate] = useState<number>(0.01);
  const [weight, setWeight] = useState(0);
  const [bias, setBias] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);

  const cost = useMemo(() => {
    const total = DATA.reduce((sum, p) => sum + (weight * p.x + bias - p.y) ** 2, 0);
    return total / DATA.length;
  }, [weight, bias]);

  // A learning rate that's too high doesn't just converge slowly, it
  // overshoots further every single step — the cost doesn't plateau, it
  // grows without bound. 1000 is comfortably past "converged" or even
  // "struggling" for this dataset (a well-fit line here costs under 1), so
  // crossing it is an unambiguous signal training has genuinely blown up,
  // not just noisy.
  const diverged = !Number.isFinite(cost) || cost > 1000;

  useEffect(() => {
    if (!playing || epoch >= MAX_EPOCHS || diverged) {
      if (epoch >= MAX_EPOCHS || diverged) setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      let w = weight, b = bias;
      for (const p of DATA) {
        const guess = w * p.x + b;
        const error = guess - p.y;
        w -= learningRate * 2 * error * p.x;
        b -= learningRate * 2 * error;
      }
      setWeight(w);
      setBias(b);
      setEpoch((e) => e + 1);
    }, 40);
    return () => clearTimeout(t);
  }, [playing, epoch, weight, bias, learningRate, diverged]);

  const reset = () => { setWeight(0); setBias(0); setEpoch(0); setPlaying(false); };

  // Switching presets mid-run would otherwise keep whatever weight/bias the
  // PREVIOUS rate had already reached, making the new rate's behavior look
  // wrong (e.g. picking "Too Fast" after "Good" already converged would
  // show it "diverging" from a perfect fit instead of from scratch, which
  // is not what the preset is meant to demonstrate). Always restart clean.
  const selectPreset = (lr: number) => {
    setLearningRate(lr);
    setWeight(0); setBias(0); setEpoch(0); setPlaying(false);
  };

  const lineY1 = weight * 0 + bias;
  const lineY2 = weight * X_DOMAIN + bias;

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Pick a learning rate — watch the consequence</p>
        <span className="text-[10px] font-mono text-white/50">Epoch {epoch} · Cost {formatCost(cost)}</span>
      </div>

      <div className="flex gap-1.5 mb-2">
        {LEARNING_RATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => selectPreset(p.value)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
              learningRate === p.value
                ? 'bg-[hsl(var(--discord-blurple)/0.25)] border-[hsl(var(--discord-blurple))] text-white'
                : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
            }`}
          >
            {p.label}
            <span className="block text-[9px] font-mono opacity-70">{p.value}</span>
          </button>
        ))}
      </div>

      <svg viewBox="0 0 300 200" className="w-full rounded-md bg-[#0d0d0d] border border-white/10">
        <line x1={24} y1={176} x2={280} y2={176} stroke="#333" strokeWidth={1} />
        <line x1={24} y1={20} x2={24} y2={176} stroke="#333" strokeWidth={1} />
        <motion.line
          stroke={diverged ? '#C70110' : '#5865F2'} strokeWidth={2}
          animate={{ x1: xToSvg(0), y1: yToSvg(lineY1), x2: xToSvg(X_DOMAIN), y2: yToSvg(lineY2) }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
        {DATA.map((p, i) => (
          <circle key={i} cx={xToSvg(p.x)} cy={yToSvg(p.y)} r={4} fill="#F7941D" stroke="#0d0d0d" strokeWidth={1} />
        ))}
      </svg>

      {diverged && (
        <p className="text-[11px] font-bold text-[#C70110] mt-1.5">
          💥 Diverged — the cost is exploding instead of shrinking. This learning rate overshoots further every step.
        </p>
      )}

      <div className="flex gap-2 mt-2">
        <button type="button" onClick={() => setPlaying((p) => !p)} disabled={diverged}
          className="flex-1 py-1.5 rounded-md text-xs font-bold bg-[hsl(var(--discord-blurple)/0.2)] border border-[hsl(var(--discord-blurple)/0.5)] text-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.3)] transition-colors disabled:opacity-40">
          {diverged ? 'Diverged' : playing ? 'Pause' : epoch >= MAX_EPOCHS ? 'Done' : epoch > 0 ? 'Resume' : 'Train'}
        </button>
        <button type="button" onClick={reset}
          className="px-3 py-1.5 rounded-md text-xs font-bold bg-white/5 border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors">
          Reset
        </button>
      </div>
      <p className="text-[10px] text-white/40 mt-2 italic">
        The exact same gradient descent update from the code above — 4 data points, no shortcuts — animated instead of just printed. All three learning rates run the identical loop; only the one number changes.
      </p>
    </div>
  );
};
