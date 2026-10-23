import { stripLineComment } from '@/components/hackathon/editorFeatures';

// Shared by Leaderboard.tsx and JudgeDashboardPanel.tsx so the two screens
// can never disagree on a project's automated marks — extracted from
// Leaderboard.tsx's scoreProject rather than reimplemented, since a second,
// independently-written copy of "what counts as a substantial system
// message" is exactly the kind of thing that quietly drifts out of sync.
export interface AutomatedMarks {
  systemMessagePts: number; // 10 or 0
  conversationQualityPts: number; // 5 or 0
  systemMessageAchieved: boolean;
  conversationQualityAchieved: boolean;
}

export function computeAutomatedMarks(project: { code?: string | null; description?: string | null }): AutomatedMarks {
  // Code is stripped of comments before measuring — see Leaderboard.tsx's
  // original comment for why (padding with whitespace/comments shouldn't
  // clear the bar for free).
  const meaningfulCodeLength = project.code
    ? project.code.split('\n').map(stripLineComment).join('\n').replace(/\s+/g, ' ').trim().length
    : 0;
  const systemMessageAchieved = meaningfulCodeLength > 200;
  const conversationQualityAchieved = !!(project.description && project.description.trim().length > 0);
  return {
    systemMessagePts: systemMessageAchieved ? 10 : 0,
    conversationQualityPts: conversationQualityAchieved ? 5 : 0,
    systemMessageAchieved,
    conversationQualityAchieved,
  };
}
