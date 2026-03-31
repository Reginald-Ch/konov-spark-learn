import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UIMode = "explorer" | "builder";

interface UIModeContextType {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  isExplorer: boolean;
}

const UIModeContext = createContext<UIModeContextType>({
  mode: "explorer",
  setMode: () => {},
  isExplorer: true,
});

export const useUIMode = () => useContext(UIModeContext);

export const UIModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<UIMode>(() => {
    try {
      return (localStorage.getItem("ui_mode") as UIMode) || "explorer";
    } catch {
      return "explorer";
    }
  });

  useEffect(() => {
    localStorage.setItem("ui_mode", mode);
    document.documentElement.setAttribute("data-ui-mode", mode);
  }, [mode]);

  return (
    <UIModeContext.Provider value={{ mode, setMode, isExplorer: mode === "explorer" }}>
      {children}
    </UIModeContext.Provider>
  );
};
