import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Lightbulb, Clock } from 'lucide-react';
import type { ChallengeStage } from './projectScaffolds';

interface ChallengeMissionsProps {
  stages: ChallengeStage[];
  code: string;
}

// Simple heuristic: detect which stages have been started based on code patterns
function detectCompletedStages(code: string, stageCount: number): boolean[] {
  const completed: boolean[] = [];

  // Stage 1: Foundation — imports present
  completed.push(
    /from\s+langchain_openai\s+import\s+ChatOpenAI/.test(code) ||
    /from\s+langchain\.agents\s+import/.test(code)
  );

  // Stage 2: Personality — SYSTEM_PROMPT has been customized (not default)
  const promptMatch = code.match(/SYSTEM_PROMPT\s*=\s*["'](.+?)["']/);
  const isDefault = !promptMatch || 
    promptMatch[1] === 'You are a helpful AI assistant.' ||
    promptMatch[1] === 'You are an AI agent that can use tools to search the web, run calculations, and generate content.';
  completed.push(!isDefault);

  // Stage 3: Memory/Tools — memory imports or tool creation
  completed.push(
    /ConversationBufferWindowMemory/.test(code) ||
    /def\s+create_tools/.test(code)
  );

  // Stage 4: Special Powers/Agent Brain — chain or agent creation
  completed.push(
    /def\s+build_chain/.test(code) ||
    /def\s+create_agent/.test(code) ||
    /st\.sidebar/.test(code)
  );

  // Stage 5: Polish — bot name changed + chain called
  const nameMatch = code.match(/BOT_NAME\s*=\s*["'](.+?)["']/);
  const nameChanged = nameMatch && nameMatch[1] !== 'My AI Chatbot';
  const chainCalled = /chain\.predict/.test(code) || /agent\.run/.test(code);
  completed.push(!!(nameChanged && chainCalled));

  return completed.slice(0, stageCount);
}

export const ChallengeMissions = ({ stages, code }: ChallengeMissionsProps) => {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const completedStages = detectCompletedStages(code, stages.length);
  const completedCount = completedStages.filter(Boolean).length;

  // Find first incomplete stage
  const currentStage = completedStages.findIndex(c => !c);

  return (
    <div className="flex flex-col gap-1 py-2">
      {/* Progress header */}
      <div className="px-3 pb-2 border-b border-[hsl(var(--discord-light)/0.1)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">
            Challenge Progress
          </span>
          <span className="text-[11px] font-bold text-emerald-400">
            {completedCount}/{stages.length}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[hsl(var(--discord-light)/0.15)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${(completedCount / stages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      {stages.map((stage, idx) => {
        const isCompleted = completedStages[idx];
        const isCurrent = idx === currentStage;
        const isExpanded = expandedStage === idx;

        return (
          <div key={stage.id} className="px-2">
            <button
              onClick={() => setExpandedStage(isExpanded ? null : idx)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-[12px] ${
                isCurrent
                  ? 'bg-[hsl(var(--discord-blurple)/0.15)] text-white'
                  : isCompleted
                  ? 'text-emerald-400/80 hover:bg-[hsl(var(--discord-light)/0.05)]'
                  : 'text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light)/0.05)]'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <Circle className="w-3.5 h-3.5 text-[hsl(var(--discord-blurple))] flex-shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
              )}
              <span className="flex-1 font-medium truncate">
                {stage.emoji} {stage.title}
              </span>
              <span className="text-[9px] opacity-50 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {stage.timeEstimate}
              </span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {isExpanded && (
              <div className="ml-6 mt-1 mb-2 p-2 rounded-md bg-[hsl(var(--discord-light)/0.05)] border border-[hsl(var(--discord-light)/0.1)]">
                <p className="text-[11px] text-[hsl(var(--discord-text))] mb-2 leading-relaxed">
                  {stage.objective}
                </p>
                <div className="flex flex-col gap-1">
                  {stage.hints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-[hsl(var(--discord-text-muted))]">
                      <Lightbulb className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
