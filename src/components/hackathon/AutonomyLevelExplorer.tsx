import { useState } from 'react';

// The exact same low/high-risk examples already taught in "Degrees of
// Autonomy"'s code example (propose_action("Fetch today's weather",
// risk_level="low") / propose_action("Delete all draft emails",
// risk_level="high")), plus one medium-risk action to make the level-3
// "escalates risky, auto-runs routine" behavior visible across a real
// gradient, not just a low/high binary.
const ACTIONS = [
  { risk: 'low' as const, label: 'Fetch today\'s weather', emoji: '🌤️' },
  { risk: 'medium' as const, label: 'Send a follow-up email', emoji: '✉️' },
  { risk: 'high' as const, label: 'Delete all draft emails', emoji: '🗑️' },
];

const LEVELS = [
  { level: 1, name: 'Suggests Only', emoji: '1️⃣' },
  { level: 2, name: 'Executes With Approval', emoji: '2️⃣' },
  { level: 3, name: 'Auto-Executes, Escalates Risky', emoji: '3️⃣' },
  { level: 4, name: 'Fully Autonomous', emoji: '4️⃣' },
] as const;

type Outcome = 'suggest' | 'approval' | 'auto';

// The same run_with_autonomy_level logic already taught in the lesson's own
// code, just extended from its 3 named modes ("manual"/"supervised"/"full")
// to the full 4-level scale the lesson's explanation and visual describe.
function outcomeFor(risk: 'low' | 'medium' | 'high', level: number): Outcome {
  if (level === 1) return 'suggest';
  if (level === 2) return 'approval';
  if (level === 3) return risk === 'low' ? 'auto' : 'approval';
  return 'auto'; // level 4: fully autonomous, always runs
}

const OUTCOME_META: Record<Outcome, { label: string; className: string }> = {
  auto: { label: 'Runs automatically', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  approval: { label: 'Needs approval first', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  suggest: { label: 'Suggested only', className: 'bg-white/5 text-white/50 border-white/15' },
};

export const AutonomyLevelExplorer = () => {
  const [actionIdx, setActionIdx] = useState(0);
  const action = ACTIONS[actionIdx];

  return (
    <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2">
        Pick an action — watch how each autonomy level handles it differently
      </p>

      <div className="flex gap-1.5 mb-3">
        {ACTIONS.map((a, i) => (
          <button
            key={a.label}
            type="button"
            onClick={() => setActionIdx(i)}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-medium border transition-colors ${
              i === actionIdx
                ? 'bg-[hsl(var(--discord-blurple)/0.25)] border-[hsl(var(--discord-blurple))] text-white'
                : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
            }`}
          >
            <div className="text-base leading-none mb-1">{a.emoji}</div>
            {a.label}
            <div className="text-[9px] uppercase tracking-wide mt-0.5 opacity-70">{a.risk} risk</div>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {LEVELS.map(({ level, name, emoji }) => {
          const outcome = outcomeFor(action.risk, level);
          const meta = OUTCOME_META[outcome];
          return (
            <div key={level} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 bg-white/5 border border-white/10">
              <span className="text-sm">{emoji}</span>
              <span className="text-xs text-white/80 flex-1">{name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.className}`}>{meta.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-white/40 mt-2 italic">
        Notice Level 3 is the only one where the action's risk actually changes the outcome — that's the whole point of "auto-execute routine, escalate risky." Levels 1, 2, and 4 treat every action the same regardless of risk.
      </p>
    </div>
  );
};
