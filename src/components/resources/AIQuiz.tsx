import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Rocket, RotateCcw } from "lucide-react";
import { ComicPanel } from "@/components/ComicPanel";
import { RobotMascot } from "@/components/RobotMascot";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  funFact: string;
}

const quizzes: Record<number, QuizQuestion[]> = {
  1: [ // What is AI
    { question: "Which of these is an example of AI?", options: ["A calculator doing 2+2", "Netflix recommending shows", "A light switch turning on", "A printed book"], correct: 1, funFact: "Netflix uses AI to analyse what millions of users watch to predict what YOU'LL enjoy! 🎬" },
    { question: "What does 'Artificial Intelligence' mean?", options: ["Robots that look human", "Machines that can think and learn", "Very fast computers", "The internet"], correct: 1, funFact: "AI doesn't need a body — it lives in software! Your phone's autocorrect is AI too! 📱" },
  ],
  2: [ // Machine Learning
    { question: "How does Machine Learning work?", options: ["Someone types every answer manually", "It learns patterns from data", "It copies the internet", "Magic ✨"], correct: 1, funFact: "ML models can process millions of examples in seconds — something humans would need years to do! ⚡" },
    { question: "Which is a real ML use case?", options: ["Predicting weather", "Detecting spam emails", "Recommending songs", "All of the above!"], correct: 3, funFact: "ML is everywhere — from your email inbox to your music playlist to weather forecasts! 🌍" },
  ],
  3: [ // Data & Decisions
    { question: "What is 'training data' in AI?", options: ["Data about gym workouts", "Examples the AI learns from", "A type of database", "Computer memory"], correct: 1, funFact: "GPT-4 was trained on text from books, websites, and articles — trillions of words! 📚" },
    { question: "Why is 'biased data' a problem?", options: ["It makes AI slower", "It makes AI give unfair results", "It costs more money", "It doesn't matter"], correct: 1, funFact: "If you only train a face detector on one skin tone, it won't work well for others — data diversity matters! 🌈" },
  ],
  4: [ // Computer Vision
    { question: "What can Computer Vision do?", options: ["See through walls", "Recognise faces in photos", "Read your mind", "Predict the future"], correct: 1, funFact: "Your phone's Face ID uses Computer Vision with 30,000 invisible dots mapped onto your face! 🤳" },
    { question: "Instagram filters use which AI?", options: ["Natural Language Processing", "Computer Vision", "Blockchain", "Cloud Computing"], correct: 1, funFact: "AR filters track 468 facial landmarks in real-time — that's Computer Vision in your pocket! 🎭" },
  ],
  5: [ // NLP
    { question: "What does NLP stand for?", options: ["New Language Program", "Natural Language Processing", "Neural Logic Processing", "Network Learning Protocol"], correct: 1, funFact: "NLP lets AI understand sarcasm, jokes, and even poetry — though it still struggles with some! 😄" },
    { question: "Which uses NLP?", options: ["Google Translate", "ChatGPT", "Voice assistants", "All of them!"], correct: 3, funFact: "Every time you ask Siri or Google a question, NLP converts your speech to meaning! 🗣️" },
  ],
  6: [ // Creative AI
    { question: "Can AI create original art?", options: ["No, only humans can", "Yes, using generative models", "Only if it copies existing art", "Only music, not images"], correct: 1, funFact: "An AI artwork called 'Edmond de Belamy' sold for $432,500 at Christie's auction in 2018! 🎨" },
    { question: "What is a 'prompt' in AI art?", options: ["A reminder notification", "A text description telling AI what to create", "A type of paintbrush", "A computer virus"], correct: 1, funFact: "The better your prompt, the better the AI output — prompt engineering is a real job skill! ✍️" },
  ],
};

const reactions = {
  correct: ["🎉 BOOM! Nailed it!", "⚡ You're an AI genius!", "🔥 ON FIRE!", "💯 Perfect!", "🚀 Unstoppable!"],
  wrong: ["😅 Not quite!", "🤔 Close! Try again!", "💪 Keep going!", "🧠 Think again!"],
};

export const AIQuiz = ({ topicId }: { topicId: number }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [completed, setCompleted] = useState(false);

  const questions = quizzes[topicId] || [];
  if (questions.length === 0) return null;

  const q = questions[currentQ];
  const isCorrect = selected === q?.correct;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === q.correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        setCompleted(true);
      }
    }, 2500);
  };

  const reset = () => {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setShowResult(false);
    setCompleted(false);
  };

  if (completed) {
    const perfect = score === questions.length;
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/10 text-center"
      >
        <div className="flex justify-center mb-2">
          <RobotMascot type={perfect ? "excited" : "happy"} size="sm" />
        </div>
        <p className="font-fredoka font-bold text-foreground text-lg">
          {perfect ? "🏆 PERFECT SCORE!" : `⭐ ${score}/${questions.length} correct!`}
        </p>
        <p className="font-space text-muted-foreground text-sm mt-1">
          {perfect ? "You're an AI master!" : "Great effort — try again to get 100%!"}
        </p>
        <button
          onClick={reset}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-fredoka text-sm border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))] hover:shadow-[3px_3px_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Play Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl border-2 border-secondary/30 bg-secondary/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="w-4 h-4 text-secondary" />
        <span className="font-fredoka font-bold text-secondary text-sm">
          QUICK QUIZ — Q{currentQ + 1}/{questions.length}
        </span>
      </div>

      <p className="font-fredoka text-foreground font-bold mb-3">{q.question}</p>

      <div className="grid gap-2">
        {q.options.map((opt, idx) => {
          const isThis = selected === idx;
          const isAnswer = idx === q.correct;
          let bg = "bg-card hover:bg-accent/20";
          let border = "border-border";

          if (selected !== null) {
            if (isAnswer) { bg = "bg-green-500/20"; border = "border-green-500"; }
            else if (isThis && !isCorrect) { bg = "bg-red-500/20"; border = "border-red-500"; }
          }

          return (
            <motion.button
              key={idx}
              whileHover={selected === null ? { scale: 1.02 } : {}}
              whileTap={selected === null ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(idx)}
              className={`p-3 rounded-lg border-2 ${border} ${bg} text-left font-space text-sm text-foreground transition-colors flex items-center gap-2`}
              disabled={selected !== null}
            >
              <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
              {selected !== null && isAnswer && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
              {isThis && !isCorrect && selected !== null && <XCircle className="w-4 h-4 text-red-500 ml-auto shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 p-3 rounded-lg border-2 ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}
          >
            <p className="font-fredoka font-bold text-sm text-foreground">
              {isCorrect
                ? reactions.correct[Math.floor(Math.random() * reactions.correct.length)]
                : reactions.wrong[Math.floor(Math.random() * reactions.wrong.length)]}
            </p>
            <p className="font-space text-xs text-muted-foreground mt-1">{q.funFact}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
