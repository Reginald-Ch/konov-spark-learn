import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

// The exact same toy dataset and update rule as "Training vs. Predicting" /
// "The ML Workflow, Step by Step" (size -> price, learning_rate 0.01) —
// this widget deliberately reuses the already-taught math rather than
// introducing a different example, so it reads as "watch the code above
// happen" rather than a new, separate thing to learn.
const DATA = [{ x: 1, y: 12 }, { x: 2, y: 20 }, { x: 3, y: 28 }, { x: 4, y: 35 }];
const LEARNING_RATE = 0.01;
const MAX_EPOCHS = 150;

const X_DOMAIN = 5;
const Y_DOMAIN = 45;
const xToSvg = (x: number) => 24 + (x / X_DOMAIN) * 256;
const yToSvg = (y: number) => 176 - (Math.max(0, Math.min(Y_DOMAIN, y)) / Y_DOMAIN) * 156;

export const GradientDescentAnimator = () => {
  const [weight, setWeight] = useState(0);
  const [bias, setBias] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);

  const cost = useMemo(() => {
    const total = DATA.reduce((sum, p) => sum + (weight * p.x + bias - p.y) ** 2, 0);
    return total / DATA.length;
  }, [weight, bias]);

  useEffect(() => {
    if (!playing || epoch >= MAX_EPOCHS) {
      if (epoch >= MAX_EPOCHS) setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      let w = weight, b = bias;
      for (const p of DATA) {
        const guess = w * p.x + b;
        const error = guess - p.y;
        w -= LEARNING_RATE * 2 * error * p.x;
        b -= LEARNING_RATE * 2 * error;
      }
      setWeight(w);
      setBias(b);
      setEpoch((e) => e + 1);
    }, 40);
    return () => clearTimeout(t);
  }, [playing, epoch, weight, bias]);

  const reset = () => { setWeight(0); setBias(0); setEpoch(0); setPlaying(false); };

  const lineY1 = weight * 0 + bias;
  const lineY2 = weight * X_DOMAIN + bias;

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Watch gradient descent fit the line</p>
        <span className="text-[10px] font-mono text-white/50">Epoch {epoch} · Cost {cost.toFixed(2)}</span>
      </div>
      <svg viewBox="0 0 300 200" className="w-full rounded-md bg-[#0d0d0d] border border-white/10">
        <line x1={24} y1={176} x2={280} y2={176} stroke="#333" strokeWidth={1} />
        <line x1={24} y1={20} x2={24} y2={176} stroke="#333" strokeWidth={1} />
        <motion.line
          stroke="#5865F2" strokeWidth={2}
          animate={{ x1: xToSvg(0), y1: yToSvg(lineY1), x2: xToSvg(X_DOMAIN), y2: yToSvg(lineY2) }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
        {DATA.map((p, i) => (
          <circle key={i} cx={xToSvg(p.x)} cy={yToSvg(p.y)} r={4} fill="#F7941D" stroke="#0d0d0d" strokeWidth={1} />
        ))}
      </svg>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={() => setPlaying((p) => !p)}
          className="flex-1 py-1.5 rounded-md text-xs font-bold bg-[hsl(var(--discord-blurple)/0.2)] border border-[hsl(var(--discord-blurple)/0.5)] text-[hsl(var(--discord-blurple))] hover:bg-[hsl(var(--discord-blurple)/0.3)] transition-colors">
          {playing ? 'Pause' : epoch >= MAX_EPOCHS ? 'Done' : epoch > 0 ? 'Resume' : 'Train'}
        </button>
        <button type="button" onClick={reset}
          className="px-3 py-1.5 rounded-md text-xs font-bold bg-white/5 border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors">
          Reset
        </button>
      </div>
      <p className="text-[10px] text-white/40 mt-2 italic">
        The exact same gradient descent update from the code above — 4 data points, no shortcuts — animated instead of just printed.
      </p>
    </div>
  );
};
