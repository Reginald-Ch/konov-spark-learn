import { Brain, Cpu, Zap, Code, Sparkles, Rocket } from "lucide-react";

export const InteractiveIcons = () => {
  const icons = [
    { Icon: Brain, position: "top-20 left-[10%]", delay: "0s", color: "text-primary" },
    { Icon: Cpu, position: "top-40 right-[15%]", delay: "0.5s", color: "text-accent" },
    { Icon: Zap, position: "top-[60%] left-[5%]", delay: "1s", color: "text-secondary" },
    { Icon: Code, position: "top-[70%] right-[8%]", delay: "1.5s", color: "text-primary" },
    { Icon: Sparkles, position: "top-[30%] right-[25%]", delay: "2s", color: "text-accent" },
    { Icon: Rocket, position: "top-[50%] left-[20%]", delay: "2.5s", color: "text-secondary" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {icons.map(({ Icon, position, delay, color }, idx) => (
        <div
          key={idx}
          className={`absolute ${position} opacity-10 hover:opacity-30 transition-opacity duration-500`}
          style={{ animation: `float 8s ease-in-out ${delay} infinite` }}
        >
          <Icon className={`w-16 h-16 md:w-24 md:h-24 ${color}`} />
        </div>
      ))}
    </div>
  );
};
