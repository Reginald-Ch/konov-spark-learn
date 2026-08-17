import { useState } from 'react';
import { GraduationCap, Code2 } from 'lucide-react';
import { LessonsPanel } from './LessonsPanel';
import { PythonChallengesPanel } from './PythonChallengesPanel';

// Lessons and Python Challenges used to render stacked on the same page —
// Python Challenges always mounted (and fetched) even while someone was
// just trying to finish a lesson, showing up as unrelated clutter during
// load. They're related (one gates the other) but not the same activity,
// so this is a real switch between two views instead of one long page —
// only the selected panel ever mounts.
type LearnView = 'lessons' | 'challenges';

export const LearnTab = () => {
  const [view, setView] = useState<LearnView>('lessons');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] mb-6">
        <button
          onClick={() => setView('lessons')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'lessons'
              ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
              : 'text-[hsl(var(--discord-text-muted))] hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Lessons
        </button>
        <button
          onClick={() => setView('challenges')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'challenges'
              ? 'bg-[hsl(var(--discord-light)/0.6)] text-white'
              : 'text-[hsl(var(--discord-text-muted))] hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" /> Python Challenges
        </button>
      </div>

      {view === 'lessons' ? <LessonsPanel /> : <PythonChallengesPanel />}
    </div>
  );
};
