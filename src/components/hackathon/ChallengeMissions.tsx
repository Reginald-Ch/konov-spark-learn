import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Lightbulb, Clock, Trophy } from 'lucide-react';
import type { ChallengeStage } from './projectScaffolds';

interface ChallengeMissionsProps {
  stages: ChallengeStage[];
  code: string;
  compact?: boolean;
}

// Detect which challenges are completed based on code patterns
function detectCompletedStages(code: string, stageCount: number): boolean[] {
  const completed: boolean[] = [];

  // For agent template (5 stages), use different detection
  if (stageCount === 5) {
    const promptDefaults = [
      'You are an AI agent that can use tools to search the web, run calculations, and generate content.',
    ];
    const promptMatch = code.match(/SYSTEM_PROMPT\s*=\s*(?:"""([\s\S]*?)"""|"([^"]*?)"|'([^']*?)')/);
    const promptValue = (promptMatch?.[1] || promptMatch?.[2] || promptMatch?.[3] || '').trim();
    const promptChanged = promptValue.length > 0 && !promptDefaults.includes(promptValue);
    
    completed.push(
      /from\s+langchain_openai\s+import\s+ChatOpenAI/.test(code) ||
      /from\s+langchain\.agents\s+import/.test(code)
    );
    completed.push(promptChanged);
    completed.push(/def\s+create_tools/.test(code));
    completed.push(/def\s+create_agent/.test(code));
    completed.push(/st\.sidebar/.test(code));
    return completed.slice(0, stageCount);
  }

  // Chatbot template (7 stages)
  // Challenge 1: Personality — SYSTEM_PROMPT has been customized
  const promptDefaults = [
    'You are a helpful assistant. Answer any question the user asks.',
    'You are a helpful AI assistant.',
  ];
  const promptMatch = code.match(/SYSTEM_PROMPT\s*=\s*(?:"""([\s\S]*?)"""|"([^"]*?)"|'([^']*?)')/);
  const promptValue = (promptMatch?.[1] || promptMatch?.[2] || promptMatch?.[3] || '').trim();
  const promptChanged = promptValue.length > 0 && !promptDefaults.includes(promptValue);
  completed.push(promptChanged);

  // Challenge 2: Knowledge — KNOWLEDGE_BASE entries filled (no "TODO", no example_topic_)
  const kbHasTodo = /KNOWLEDGE_BASE\s*=\s*\{[\s\S]*?TODO[\s\S]*?\}/.test(code);
  const kbHasContent = /KNOWLEDGE_BASE\s*=\s*\{/.test(code);
  const kbExampleRemoved = kbHasContent && !/"example_topic_/.test(code);
  completed.push(kbExampleRemoved && !kbHasTodo);

  // Challenge 3: Follow-ups — FOLLOW_UP_QUESTIONS has real content
  const fqHasContent = /FOLLOW_UP_QUESTIONS\s*=\s*\{/.test(code);
  const fqExampleRemoved = fqHasContent && !/"example_topic_a"/.test(code);
  const tkHasKeywords = /TOPIC_KEYWORDS\s*=\s*\{/.test(code) && !/"example_topic_a"/.test(code);
  completed.push(fqExampleRemoved && tkHasKeywords);

  // Challenge 4: Personalise — BOT_NAME changed + WELCOME_MESSAGE customized
  const nameMatch = code.match(/BOT_NAME\s*=\s*["'](.+?)["']/);
  const nameChanged = nameMatch && nameMatch[1] !== 'My AI Chatbot';
  const welcomeDefault = '👋 Hello! I am your AI assistant. How can I help you today?';
  const welcomeMatch = code.match(/WELCOME_MESSAGE\s*=\s*"""([\s\S]*?)"""/);
  const welcomeChanged = welcomeMatch && welcomeMatch[1].trim() !== welcomeDefault;
  completed.push(!!(nameChanged && welcomeChanged));

  // Challenge 5: Response Styles — st.sidebar.selectbox for response style
  completed.push(
    /st\.sidebar\.selectbox/.test(code) ||
    /response_style/i.test(code) && /selectbox/.test(code)
  );

  // Challenge 6: Chat Export — st.download_button present
  completed.push(
    /st\.download_button/.test(code) ||
    /export.*chat/i.test(code) && /button/.test(code)
  );

  // Challenge 7: Submit — BOT_NAME changed + chain working (already validated by other checks)
  const pageIconMatch = code.match(/PAGE_ICON\s*=\s*["'](.+?)["']/);
  const iconChanged = pageIconMatch && pageIconMatch[1] !== '🤖';
  completed.push(!!(nameChanged && iconChanged && promptChanged));

  return completed.slice(0, stageCount);
}

export const ChallengeMissions = ({ stages, code, compact = false }: ChallengeMissionsProps) => {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const completedStages = detectCompletedStages(code, stages.length);
  const completedCount = completedStages.filter(Boolean).length;
  const currentStage = completedStages.findIndex(c => !c);
  const allComplete = completedCount === stages.length;

  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      {/* Progress header */}
      <div className="px-3 pb-2 border-b border-[hsl(var(--ide-border)/0.3)]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--ide-text-muted))]">
            {allComplete ? '🎉 All Challenges Complete!' : 'Challenge Progress'}
          </span>
          <span className={`text-[11px] font-bold ${allComplete ? 'text-amber-400' : 'text-emerald-400'}`}>
            {completedCount}/{stages.length}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[hsl(var(--ide-border))]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allComplete 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300' 
                : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
            }`}
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
          <div key={stage.id} className="px-1.5">
            <button
              onClick={() => setExpandedStage(isExpanded ? null : idx)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors text-[11px] ${
                isCurrent
                  ? 'bg-[hsl(var(--ide-accent)/0.12)] text-white'
                  : isCompleted
                  ? 'text-emerald-400/80 hover:bg-[hsl(var(--ide-border)/0.2)]'
                  : 'text-white/60 hover:bg-[hsl(var(--ide-border)/0.2)]'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <Circle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 flex-shrink-0 opacity-40 text-white" />
              )}
              <span className="flex-1 font-medium truncate text-white">
                {stage.emoji} {stage.title}
              </span>
              {!compact && (
                <span className="text-[9px] opacity-50 flex items-center gap-0.5 text-white">
                  <Clock className="w-2.5 h-2.5" />
                  {stage.timeEstimate}
                </span>
              )}
              {isExpanded ? <ChevronDown className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
            </button>

            {isExpanded && (
              <div className="ml-5 mt-1 mb-1.5 p-2.5 rounded-md bg-[hsl(var(--ide-border)/0.15)] border border-[hsl(var(--ide-border)/0.3)]">
                <p className="text-[10px] text-white/90 mb-2 leading-relaxed">
                  {stage.objective}
                </p>
                <div className="flex flex-col gap-1">
                  {stage.hints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[9px] text-white/60">
                      <Lightbulb className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* All complete celebration */}
      {allComplete && (
        <div className="mx-2 mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-400/20 text-center">
          <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-[10px] text-amber-300 font-bold">All challenges complete!</p>
          <p className="text-[9px] text-white/50">Submit your project to go live 🚀</p>
        </div>
      )}
    </div>
  );
};
