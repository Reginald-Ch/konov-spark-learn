import { LessonsPanel } from './LessonsPanel';
import { PythonChallengesPanel } from './PythonChallengesPanel';

export const LearnTab = () => {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <LessonsPanel />
      <div className="pt-6 border-t border-[hsl(var(--discord-light)/0.15)]">
        <PythonChallengesPanel />
      </div>
    </div>
  );
};
