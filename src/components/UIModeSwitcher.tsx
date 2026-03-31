import { useUIMode } from "@/contexts/UIModeContext";
import { Sparkles, Code2 } from "lucide-react";
import { motion } from "framer-motion";

export const UIModeSwitcher = () => {
  const { mode, setMode } = useUIMode();

  return (
    <div className="flex items-center gap-2 bg-muted rounded-full p-1">
      <button
        onClick={() => setMode("explorer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-fredoka transition-all ${
          mode === "explorer"
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Explorer</span>
      </button>
      <button
        onClick={() => setMode("builder")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-fredoka transition-all ${
          mode === "builder"
            ? "bg-foreground text-background shadow-md"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Code2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Builder</span>
      </button>
    </div>
  );
};
