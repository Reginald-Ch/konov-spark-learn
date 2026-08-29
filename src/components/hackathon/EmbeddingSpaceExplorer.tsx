import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface EmbedPoint { word: string; x: number; y: number; cluster: string }

const CLUSTER_COLORS: Record<string, string> = {
  animals: '#F7941D',
  vehicles: '#5865F2',
  emotions: '#00B894',
};

// Hand-placed 2D coordinates, not extracted from a real trained model —
// deliberately arranged into three visually distinct clusters so clicking
// around actually demonstrates "similar meaning = close together" instead of
// asking a student to take that on faith. The DISTANCES between these points
// are real math (see similarity() below), even though the placement itself
// is curated for teaching, same honesty pattern as this codebase's other
// "simplified for teaching" comments.
const POINTS: EmbedPoint[] = [
  { word: 'dog', x: 0.18, y: 0.22, cluster: 'animals' },
  { word: 'puppy', x: 0.24, y: 0.18, cluster: 'animals' },
  { word: 'wolf', x: 0.13, y: 0.30, cluster: 'animals' },
  { word: 'cat', x: 0.29, y: 0.28, cluster: 'animals' },
  { word: 'kitten', x: 0.34, y: 0.23, cluster: 'animals' },
  { word: 'car', x: 0.74, y: 0.20, cluster: 'vehicles' },
  { word: 'truck', x: 0.82, y: 0.15, cluster: 'vehicles' },
  { word: 'bicycle', x: 0.68, y: 0.31, cluster: 'vehicles' },
  { word: 'motorcycle', x: 0.79, y: 0.33, cluster: 'vehicles' },
  { word: 'happy', x: 0.45, y: 0.76, cluster: 'emotions' },
  { word: 'joyful', x: 0.53, y: 0.70, cluster: 'emotions' },
  { word: 'sad', x: 0.37, y: 0.86, cluster: 'emotions' },
  { word: 'angry', x: 0.59, y: 0.88, cluster: 'emotions' },
];

// Same spirit as the cosine similarity code in the Embeddings lesson above
// this widget — closer points score higher — just applied to plain 2D
// distance instead of a real high-dimensional vector, since that's what a
// hand-placed 2D map actually has to work with.
function similarity(a: EmbedPoint, b: EmbedPoint): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - dist / 0.5);
}

export const EmbeddingSpaceExplorer = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPoint = POINTS.find((p) => p.word === selected) || null;
  const ranked = selectedPoint
    ? POINTS.filter((p) => p.word !== selectedPoint.word)
        .map((p) => ({ ...p, sim: similarity(selectedPoint, p) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 4)
    : [];

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2">
        Click a word to explore its "meaning neighborhood"
      </p>
      <div className="relative w-full aspect-[4/3] rounded-md bg-[#0d0d0d] border border-white/10 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {selectedPoint && ranked.map((p) => (
            <line
              key={p.word}
              x1={`${selectedPoint.x * 100}%`} y1={`${selectedPoint.y * 100}%`}
              x2={`${p.x * 100}%`} y2={`${p.y * 100}%`}
              stroke={CLUSTER_COLORS[selectedPoint.cluster]} strokeOpacity={0.35} strokeWidth={1.5}
            />
          ))}
        </svg>
        {POINTS.map((p) => (
          <button
            key={p.word}
            type="button"
            onClick={() => setSelected(p.word === selected ? null : p.word)}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, borderColor: CLUSTER_COLORS[p.cluster] }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
              selected === p.word
                ? 'bg-white text-black font-bold scale-110 z-10'
                : 'bg-[#1a1a1a] text-white/80 hover:scale-105'
            }`}
          >
            {p.word}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1 overflow-hidden"
          >
            <p className="text-xs text-white/60">
              Closest to <span className="font-bold text-white">"{selectedPoint.word}"</span>:
            </p>
            {ranked.map((p) => (
              <div key={p.word} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-white/80 font-mono flex-shrink-0">{p.word}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.sim * 100}%`, backgroundColor: CLUSTER_COLORS[p.cluster] }} />
                </div>
                <span className="text-white/40 w-8 text-right flex-shrink-0">{p.sim.toFixed(2)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-[10px] text-white/40 mt-2 italic">
        These positions are hand-placed for teaching, not from a real trained model — but the distances between them are real math, the same idea as the cosine similarity code above.
      </p>
    </div>
  );
};
