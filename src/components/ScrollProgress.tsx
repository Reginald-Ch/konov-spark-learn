import { useEffect, useState } from "react";

export const ScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const currentScroll = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (currentScroll / scrollHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", updateScrollProgress);
    return () => window.removeEventListener("scroll", updateScrollProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-primary/10 z-50">
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-150 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
