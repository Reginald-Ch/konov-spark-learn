import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";
import { ActionBurst } from "@/components/ActionBurst";
import { Shuffle, Trophy, RotateCcw } from "lucide-react";

interface MatchPair {
  concept: string;
  example: string;
  emoji: string;
}

const pairs: MatchPair[] = [
  { concept: "Computer Vision", example: "Face filters on Instagram", emoji: "📸" },
  { concept: "NLP", example: "Google Translate", emoji: "🗣️" },
  { concept: "Machine Learning", example: "Spotify recommendations", emoji: "🎵" },
  { concept: "Generative AI", example: "Creating art from text prompts", emoji: "🎨" },
  { concept: "Data Science", example: "Analysing Netflix viewing trends", emoji: "📊" },
  { concept: "Reinforcement Learning", example: "AI learning to play chess", emoji: "♟️" },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const ConceptMatch = () => {
  const [round, setRound] = useState(() => {
    const picked = shuffle(pairs).slice(0, 4);
    return { pairs: picked, examples: shuffle(picked.map(p => p.example)) };
  });
  const [selectedConcept, setSelectedConcept] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const allMatched = matched.size === round.pairs.length;

  const handleConceptClick = (idx: number) => {
    if (matched.has(round.pairs[idx].concept)) return;
    setSelectedConcept(idx);
    setWrong(null);
  };

  const handleExampleClick = useCallback((example: string) => {
    if (selectedConcept === null) return;
    if (matched.has(example)) return;

    const concept = round.pairs[selectedConcept];
    setAttempts(a => a + 1);

    if (concept.example === example) {
      setMatched(prev => new Set([...prev, concept.concept, example]));
      setScore(s => s + 1);
      setSelectedConcept(null);
    } else {
      setWrong(example);
      setTimeout(() => setWrong(null), 800);
    }
  }, [selectedConcept, round.pairs, matched]);

  const reset = () => {
    const picked = shuffle(pairs).slice(0, 4);
    setRound({ pairs: picked, examples: shuffle(picked.map(p => p.example)) });
    setSelectedConcept(null);
    setMatched(new Set());
    setWrong(null);
    setScore(0);
    setAttempts(0);
  };

  return (
    <ComicPanel color="accent" className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Shuffle className="w-6 h-6 text-accent" />
        <h3 className="text-2xl font-fredoka font-bold text-foreground">
          Match the AI Concept! 🧩
        </h3>
      </div>
      <p className="font-space text-muted-foreground mb-6 text-sm">
        Click a concept on the left, then click its matching example on the right.
      </p>

      {allMatched ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-8"
        >
          <div className="flex justify-center mb-4">
            <RobotMascot type="excited" size="md" />
          </div>
          <ActionBurst>
            <span className="text-foreground">MATCHED!</span>
          </ActionBurst>
          <p className="font-fredoka text-2xl font-bold text-foreground mt-4">
            <Trophy className="w-6 h-6 inline text-primary mr-2" />
            {score}/{round.pairs.length} in {attempts} tries!
          </p>
          <p className="font-space text-muted-foreground text-sm mt-2">
            {attempts <= round.pairs.length ? "Perfect memory! 🧠" : attempts <= round.pairs.length + 2 ? "Great job! 🌟" : "Keep practising! 💪"}
          </p>
          <button
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-fredoka border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <RotateCcw className="w-4 h-4" /> New Round
          </button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Concepts */}
          <div className="space-y-3">
            <span className="text-xs font-fredoka uppercase tracking-wider text-muted-foreground">AI Concepts</span>
            {round.pairs.map((pair, idx) => {
              const isMatched = matched.has(pair.concept);
              const isSelected = selectedConcept === idx;
              return (
                <motion.button
                  key={pair.concept}
                  whileHover={!isMatched ? { scale: 1.03 } : {}}
                  whileTap={!isMatched ? { scale: 0.97 } : {}}
                  onClick={() => handleConceptClick(idx)}
                  disabled={isMatched}
                  className={`w-full p-3 rounded-xl border-3 font-fredoka font-bold text-left transition-all flex items-center gap-2 ${
                    isMatched
                      ? "border-green-500/50 bg-green-500/10 text-green-600 line-through opacity-60"
                      : isSelected
                      ? "border-primary bg-primary/20 text-foreground shadow-[3px_3px_0_hsl(var(--primary))]"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{pair.emoji}</span>
                  {pair.concept}
                </motion.button>
              );
            })}
          </div>

          {/* Examples */}
          <div className="space-y-3">
            <span className="text-xs font-fredoka uppercase tracking-wider text-muted-foreground">Real-World Examples</span>
            {round.examples.map((example) => {
              const isMatched = matched.has(example);
              const isWrong = wrong === example;
              return (
                <motion.button
                  key={example}
                  whileHover={!isMatched ? { scale: 1.03 } : {}}
                  whileTap={!isMatched ? { scale: 0.97 } : {}}
                  animate={isWrong ? { x: [0, -8, 8, -8, 0] } : {}}
                  transition={isWrong ? { duration: 0.4 } : {}}
                  onClick={() => handleExampleClick(example)}
                  disabled={isMatched || selectedConcept === null}
                  className={`w-full p-3 rounded-xl border-3 font-space text-sm text-left transition-all ${
                    isMatched
                      ? "border-green-500/50 bg-green-500/10 text-green-600 line-through opacity-60"
                      : isWrong
                      ? "border-red-500 bg-red-500/20 text-foreground"
                      : selectedConcept !== null
                      ? "border-border bg-card text-foreground hover:border-secondary/50 cursor-pointer"
                      : "border-border bg-card/50 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {example}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {!allMatched && (
        <p className="text-center font-fredoka text-xs text-muted-foreground mt-4">
          {selectedConcept !== null ? "👉 Now click the matching example!" : "👈 Start by clicking an AI concept"}
        </p>
      )}
    </ComicPanel>
  );
};
