import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
  targetDate: Date;
  label: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = ({ targetDate, label }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { value: timeLeft.days, label: 'D', fullLabel: 'Days' },
    { value: timeLeft.hours, label: 'H', fullLabel: 'Hours' },
    { value: timeLeft.minutes, label: 'M', fullLabel: 'Min' },
    { value: timeLeft.seconds, label: 'S', fullLabel: 'Sec' },
  ];

  return (
    <div className="bg-[hsl(var(--discord-darker))] rounded-lg p-3">
      <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-2 text-center font-medium uppercase tracking-wider">
        {label}
      </p>
      <div className="flex justify-center gap-2">
        {timeUnits.map((unit, index) => (
          <motion.div
            key={unit.label}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="bg-[hsl(var(--discord-light))] rounded px-2 py-1.5 min-w-[40px] border border-[hsl(var(--discord-lighter))]">
                <motion.span 
                  key={unit.value}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg font-mono font-bold text-white block text-center"
                >
                  {unit.value.toString().padStart(2, '0')}
                </motion.span>
              </div>
              {/* Decorative line */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-[hsl(var(--discord-darker)/0.5)]" />
            </div>
            <span className="text-[10px] text-[hsl(var(--discord-text-muted))] mt-1 font-medium">
              {unit.fullLabel}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};