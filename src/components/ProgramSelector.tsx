import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookOpen, Palette, Laptop, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: { value: string; label: string }[];
}

const quizQuestions: QuizQuestion[] = [
  {
    question: "What's your child's age group?",
    options: [
      { value: "5-8", label: "5-8 years old" },
      { value: "9-12", label: "9-12 years old" },
      { value: "13-16", label: "13-16 years old" },
      { value: "17+", label: "17+ years old" },
    ],
  },
  {
    question: "What interests your child most?",
    options: [
      { value: "hands-on", label: "Hands-on building & creating" },
      { value: "stories", label: "Stories & adventures" },
      { value: "digital", label: "Digital learning & games" },
      { value: "classroom", label: "Classroom learning" },
    ],
  },
  {
    question: "What's your primary goal?",
    options: [
      { value: "skills", label: "Build practical tech skills" },
      { value: "fun", label: "Make learning fun & engaging" },
      { value: "career", label: "Prepare for future careers" },
      { value: "curriculum", label: "Supplement school curriculum" },
    ],
  },
];

const programRecommendations: Record<string, { icon: any; title: string; description: string; color: string }> = {
  workshops: {
    icon: BookOpen,
    title: "Workshops",
    description: "Perfect for hands-on learners who love to build and create!",
    color: "from-primary to-accent",
  },
  comics: {
    icon: Palette,
    title: "Comics",
    description: "Ideal for visual learners who love stories and adventures!",
    color: "from-accent to-secondary",
  },
  edtech: {
    icon: Laptop,
    title: "EdTech Platform",
    description: "Great for self-paced digital learners who enjoy interactive content!",
    color: "from-secondary to-primary",
  },
  schools: {
    icon: GraduationCap,
    title: "School Programs",
    description: "Best for comprehensive classroom integration!",
    color: "from-primary via-accent to-secondary",
  },
};

interface ProgramSelectorProps {
  onComplete: (program: string) => void;
}

export const ProgramSelector = ({ onComplete }: ProgramSelectorProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate recommendation based on answers
      const program = calculateRecommendation(answers);
      setRecommendation(program);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateRecommendation = (answers: string[]): string => {
    const [age, interest, goal] = answers;
    
    if (interest === "hands-on" || goal === "skills") return "workshops";
    if (interest === "stories" || goal === "fun") return "comics";
    if (interest === "digital" || goal === "career") return "edtech";
    if (interest === "classroom" || goal === "curriculum") return "schools";
    
    return "workshops"; // default
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setRecommendation(null);
  };

  if (recommendation) {
    const program = programRecommendations[recommendation];
    const Icon = program.icon;

    return (
      <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20 text-center">
        <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${program.color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-10 h-10 text-foreground" />
        </div>
        <h3 className="text-3xl font-orbitron font-bold mb-4 gradient-text">{program.title}</h3>
        <p className="text-lg text-muted-foreground font-space mb-8">{program.description}</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => onComplete(recommendation)} size="lg" className="font-space">
            Enroll Now
          </Button>
          <Button onClick={handleRestart} size="lg" variant="outline" className="font-space">
            Retake Quiz
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 glow-card bg-card/50 backdrop-blur-sm border border-primary/20">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-orbitron font-bold text-foreground">
            Question {currentQuestion + 1} of {quizQuestions.length}
          </h3>
          <span className="text-sm font-space text-muted-foreground">
            {Math.round(((currentQuestion + 1) / quizQuestions.length) * 100)}% Complete
          </span>
        </div>
        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-xl font-space font-semibold mb-6 text-foreground">
          {quizQuestions[currentQuestion].question}
        </h4>
        <RadioGroup value={answers[currentQuestion]} onValueChange={handleAnswer}>
          <div className="space-y-3">
            {quizQuestions[currentQuestion].options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-4 rounded-xl border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="font-space cursor-pointer flex-1">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={currentQuestion === 0}
          className="font-space"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion]}
          className="font-space"
        >
          {currentQuestion === quizQuestions.length - 1 ? "Get Recommendation" : "Next"}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
