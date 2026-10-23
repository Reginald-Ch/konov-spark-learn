import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  verifyAdminPassphrase,
  attemptAdminStepUp,
  hasStoredAdminPassphrase,
  getStoredAdminPassphrase,
  getStoredAdminRole,
  clearStoredAdminPassphrase,
  callAdminAction,
  AdminSessionExpiredError,
  type AdminRole,
} from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Shield, Trophy, ExternalLink, Lock,
  CheckCircle2, Loader2, Send, Award, LogOut, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { computeAutomatedMarks } from '@/lib/galleryAutomatedMarks';
import { EventsTab } from '@/components/admin/EventsTab';
import { ChallengesTab } from '@/components/admin/ChallengesTab';
import { SubmissionsTab } from '@/components/admin/SubmissionsTab';
import { RewardsTab } from '@/components/admin/RewardsTab';
import { CoinsTab } from '@/components/admin/CoinsTab';
import { CommunityStaffTab } from '@/components/admin/CommunityStaffTab';
import { CommunityQuestsTab } from '@/components/admin/CommunityQuestsTab';
import { FeedbackTab } from '@/components/admin/FeedbackTab';

interface HackathonOption {
  id: string;
  title: string;
  status: string;
}

interface Project {
  id: string;
  project_name: string;
  description: string | null;
  author_name: string;
  template_id: string | null;
  is_published: boolean;
  created_at: string;
  // Only needed client-side to compute this card's automated marks (see
  // computeAutomatedMarks) — sourced from get_hackathon_leaderboard_projects,
  // the same RPC the public Leaderboard already uses, so this isn't new
  // exposure (see migration 20260915000000).
  code: string | null;
}

// The shadcn Tabs defaults (bg-muted/bg-background) are light-theme tokens
// — fine on AdminPanel.tsx's old light page, but this component lives
// inside the dark hackathon shell, where an unstyled TabsList rendered as a
// jarring white pill. Matches the discord-dark palette used everywhere
// else in this file instead.
const TAB_CLASS = 'text-[hsl(var(--discord-text-muted))] data-[state=active]:bg-[hsl(var(--discord-light)/0.6)] data-[state=active]:text-white data-[state=active]:shadow-none';

// Matches submit_gallery_score's lower(trim(...)) comparison (migration
// 20260914000000) — every client-side judge-name comparison uses this too,
// so "already scored by me" detection and the roster warning agree with
// what the server will actually accept instead of a stricter exact match
// silently disagreeing with it.
const sameJudge = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot' },
  agent: { icon: '🧠', label: 'Agent' },
};

const ProjectCard = memo(({ project, meta, isScored, otherScores, score, feedbackText, onScoreChange, onFeedbackChange, onSubmitScore, onTogglePublish, isOrganizer, isSubmitting }: {
  project: Project;
  meta: { icon: string; label: string };
  isScored: boolean;
  otherScores: { judgeName: string; points: number }[];
  score: number | undefined;
  feedbackText: string;
  onScoreChange: (id: string, val: number) => void;
  onFeedbackChange: (id: string, val: string) => void;
  onSubmitScore: (project: Project) => void;
  onTogglePublish: (project: Project) => void;
  isOrganizer: boolean;
  isSubmitting: boolean;
}) => {
  const automatedMarks = computeAutomatedMarks(project);
  return (
  <div className={`bg-[hsl(var(--discord-dark))] rounded-lg border transition-all ${isScored ? 'border-[hsl(var(--discord-green)/0.3)] bg-[hsl(var(--discord-green)/0.05)]' : 'border-[hsl(var(--discord-light)/0.2)]'}`}>
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{project.project_name}</h3>
          <p className="text-xs text-[hsl(var(--discord-text-muted))]">by {project.author_name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className="text-[10px] bg-[hsl(var(--discord-blurple)/0.13)] text-[hsl(var(--discord-blurple))]">
            {meta.icon} {meta.label}
          </Badge>
          <Badge className={`text-[10px] ${project.is_published ? 'bg-[hsl(var(--discord-green)/0.2)] text-[hsl(var(--discord-green))] border-[hsl(var(--discord-green)/0.3)]' : 'bg-[hsl(var(--discord-red)/0.2)] text-[hsl(var(--discord-red))] border-[hsl(var(--discord-red)/0.3)]'}`}>
            {project.is_published ? '🟢 Live' : '🔴 Offline'}
          </Badge>
        </div>
      </div>
      {project.description && (
        <p className="text-xs text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Automated marks this project already earned — same criteria and
          numbers the public Leaderboard shows, so a judge has context
          before adding their own score below instead of scoring blind. */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${automatedMarks.systemMessageAchieved ? 'bg-[hsl(var(--discord-blurple)/0.15)] text-[hsl(var(--discord-blurple))]' : 'bg-[hsl(var(--discord-light)/0.15)] text-[hsl(var(--discord-text-muted))]'}`}>
          🧠 System Message {automatedMarks.systemMessagePts}/10
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${automatedMarks.conversationQualityAchieved ? 'bg-[hsl(var(--discord-green)/0.15)] text-[hsl(var(--discord-green))]' : 'bg-[hsl(var(--discord-light)/0.15)] text-[hsl(var(--discord-text-muted))]'}`}>
          💬 Conversation {automatedMarks.conversationQualityPts}/5
        </span>
      </div>

      <div className="flex gap-1.5 mb-3">
        <a href={`${window.location.origin}/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
            <ExternalLink className="w-3 h-3 mr-1" /> Try Live
          </Button>
        </a>
        {/* toggle_project_publish is organizer-only server-side (a judge-
            passphrase holder taking any project offline is a griefing
            vector unrelated to actually judging) — hidden here too instead
            of showing judges a button that will always come back with
            "Judges cannot perform this action". */}
        {isOrganizer && (
          <Button size="sm" variant="outline" onClick={() => onTogglePublish(project)}
            className={`h-7 text-xs ${project.is_published ? 'text-[hsl(var(--discord-red))] border-[hsl(var(--discord-red)/0.3)] hover:bg-[hsl(var(--discord-red)/0.1)]' : 'text-[hsl(var(--discord-green))] border-[hsl(var(--discord-green)/0.3)] hover:bg-[hsl(var(--discord-green)/0.1)]'}`}>
            {project.is_published ? '⏸ Take Offline' : '▶ Make Live'}
          </Button>
        )}
      </div>

      <div className="space-y-2 pt-3 border-t border-[hsl(var(--discord-light)/0.1)]">
        {otherScores.length > 0 && (
          <p className="text-[10px] text-[hsl(var(--discord-text-muted))]">
            Already scored by {otherScores.map(s => `${s.judgeName} (${s.points})`).join(', ')} — your score is independent and won't overwrite theirs.
          </p>
        )}
        <div className="flex items-center gap-2">
          <label id={`score-label-${project.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">Score (0-70)</label>
          {isScored && <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--discord-green))]" aria-label="Scored" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-labelledby={`score-label-${project.id}`}>
          {[10, 20, 30, 40, 50, 60, 70].map(val => (
            <button key={val} onClick={() => onScoreChange(project.id, val)}
              aria-pressed={score === val} aria-label={`Score ${val}`}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${score === val ? 'bg-[hsl(var(--discord-yellow))] text-black' : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light))]'}`}>
              {val}
            </button>
          ))}
        </div>
        <Textarea value={feedbackText} onChange={e => onFeedbackChange(project.id, e.target.value)}
          placeholder="Optional feedback..." rows={2} aria-label="Feedback"
          className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white resize-none" />
        <Button size="sm" onClick={() => onSubmitScore(project)} disabled={score === undefined || isSubmitting}
          className="w-full h-8 text-xs font-bold"
          style={{ background: score !== undefined ? 'hsl(var(--secondary))' : undefined }}>
          {isSubmitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
          {isSubmitting ? 'Submitting...' : isScored ? 'Update Score' : 'Submit Score'}
        </Button>
      </div>
    </div>
  </div>
  );
});
ProjectCard.displayName = 'ProjectCard';

export const JudgeDashboardPanel = () => {
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  // Submit was only ever disabled by `score === undefined` — a slow
  // network plus a double-click could fire submit_gallery_score twice
  // concurrently for the same project. The RPC is a race-safe replace, not
  // insert-only, so this wasn't a data-corruption risk, but it's still
  // worth a proper pending guard rather than relying on that.
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  // Every judge's score per project — multiple judges can independently
  // score the same project now, so this is no longer "last submission wins".
  const [judgeScoresByProject, setJudgeScoresByProject] = useState<Record<string, { judgeName: string; points: number }[]>>({});
  const [judgeName, setJudgeName] = useState('');
  const [hackathonOptions, setHackathonOptions] = useState<HackathonOption[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');

  // Roster of judge names the organizer has approved — submit_gallery_score
  // now rejects any judge_name not on this list server-side (closes the
  // "log in as Judge A, B, C..." score-inflation exploit); fetched here so
  // the UI can warn *before* a submission fails instead of only after.
  const [judgeRoster, setJudgeRoster] = useState<string[]>([]);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [savingJudge, setSavingJudge] = useState(false);

  // callAdminAction clears the stored passphrase itself on a 401 (e.g. an
  // organizer rotated the passphrase mid-event), but every call site here
  // used to just show a generic error toast with the component's `role`
  // state left untouched — the UI kept rendering as fully logged in while
  // every subsequent action failed the same way, with no path back to the
  // login screen short of a manual refresh. Centralized so every catch
  // block below can react the same way: drop back to the login screen with
  // a clear explanation instead of a cryptic "(401)" toast.
  const handleAdminError = (e: unknown, fallbackMessage: string) => {
    if (e instanceof AdminSessionExpiredError) {
      setRole(null);
      toast.error(e.message);
      return;
    }
    toast.error((e as any)?.message || fallbackMessage);
  };

  const fetchJudgeRoster = useCallback(async () => {
    const { data, error } = await supabase.from('gallery_judges').select('judge_name').order('judge_name');
    if (error) { console.error('Failed to load judge roster:', error); toast.error('Failed to load judge roster'); return; }
    setJudgeRoster((data || []).map((r: any) => r.judge_name));
  }, []);

  useEffect(() => { fetchJudgeRoster(); }, [fetchJudgeRoster]);

  const handleAddJudge = async () => {
    const trimmed = newJudgeName.trim();
    if (!trimmed) return;
    // gallery_judges' primary key is case-sensitive, so "John" and "john"
    // would otherwise insert as two separate roster rows — silently
    // breaking the "exactly N judges" expectation (e.g. someone re-adding
    // themselves after mistyping casing ends up with two roster slots
    // instead of one corrected one, and neither name may match what that
    // judge actually types at login).
    if (judgeRoster.some(n => sameJudge(n, trimmed))) {
      toast.error(`"${trimmed}" (or a differently-cased version of it) is already on the roster`);
      return;
    }
    setSavingJudge(true);
    try {
      await callAdminAction('add_gallery_judge', { judge_name: trimmed });
      toast.success(`"${trimmed}" added to the judge roster`);
      setNewJudgeName('');
      fetchJudgeRoster();
    } catch (e) {
      handleAdminError(e, 'Failed to add judge');
    } finally {
      setSavingJudge(false);
    }
  };

  const handleRemoveJudge = async (name: string) => {
    try {
      await callAdminAction('remove_gallery_judge', { judge_name: name });
      toast.success(`"${name}" removed from the judge roster`);
      fetchJudgeRoster();
    } catch (e) {
      handleAdminError(e, 'Failed to remove judge');
    }
  };

  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<AdminRole>('organizer');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showNewPassphrase, setShowNewPassphrase] = useState(false);
  const [savingPassphrase, setSavingPassphrase] = useState(false);

  const handleSavePassphrase = async () => {
    if (newPassphrase.length < 6) { toast.error('Passphrase must be at least 6 characters'); return; }
    if (newPassphrase !== confirmPassphrase) { toast.error("Passphrases don't match"); return; }
    setSavingPassphrase(true);
    try {
      await callAdminAction('set_passphrase', { target_role: targetRole, new_passphrase: newPassphrase });
      toast.success(`${targetRole === 'organizer' ? 'Organizer' : 'Judge'} passphrase updated`);
      setPassphraseDialogOpen(false);
      setNewPassphrase('');
      setConfirmPassphrase('');
    } catch (e) {
      handleAdminError(e, 'Failed to update passphrase');
    } finally {
      setSavingPassphrase(false);
    }
  };

  // Lets someone already logged in as a judge unlock the full organizer
  // view without logging out and back in — enter the separate organizer
  // passphrase here, and this session steps up in place.
  const [adminStepUpOpen, setAdminStepUpOpen] = useState(false);
  const [adminStepUpPassphrase, setAdminStepUpPassphrase] = useState('');
  const [showStepUpPassphrase, setShowStepUpPassphrase] = useState(false);
  const [steppingUp, setSteppingUp] = useState(false);

  const handleAdminStepUp = async () => {
    if (!adminStepUpPassphrase.trim()) { toast.error('Enter the organizer passphrase'); return; }
    setSteppingUp(true);
    // attemptAdminStepUp (not verifyAdminPassphrase) — this session is
    // already validly logged in as a judge; a mistyped organizer
    // passphrase here must not wipe that still-good session out from
    // under the user. See adminClient.ts for the full explanation.
    const resolvedRole = await attemptAdminStepUp(adminStepUpPassphrase.trim());
    setSteppingUp(false);
    if (resolvedRole !== 'organizer') {
      toast.error(resolvedRole === 'judge' ? "That's the judge passphrase — enter the organizer one instead." : 'Invalid passphrase');
      return;
    }
    setRole('organizer');
    setAdminStepUpOpen(false);
    setAdminStepUpPassphrase('');
    fetchHackathonOptions();
    toast.success('Admin access unlocked');
  };

  const fetchHackathonOptions = useCallback(async () => {
    const { data, error } = await supabase.from('hackathons').select('id, title, status').order('start_date', { ascending: false });
    if (error) { console.error('Failed to load hackathons:', error); toast.error('Failed to load hackathon list'); }
    const options = (data as HackathonOption[]) || [];
    setHackathonOptions(options);
    setSelectedHackathonId(prev => {
      if (prev && options.some(h => h.id === prev)) return prev;
      const live = options.find(h => h.status === 'live');
      return live?.id || options[0]?.id || '';
    });
  }, []);

  useEffect(() => {
    (async () => {
      // Trimmed on the way back in too — an older session may have stored
      // an untrimmed name from before submit_gallery_score's matching was
      // hardened (see migration 20260914000000); re-trimming here keeps a
      // returning judge's session consistent with a fresh login instead of
      // carrying the same whitespace mismatch forward.
      const storedName = sessionStorage.getItem('judge-display-name');
      if (storedName) setJudgeName(storedName.trim());
      if (hasStoredAdminPassphrase()) {
        const resolvedRole = getStoredAdminRole() || (await verifyAdminPassphrase(getStoredAdminPassphrase()));
        setRole(resolvedRole);
        if (resolvedRole) fetchHackathonOptions();
      }
    })();
  }, [fetchHackathonOptions]);

  const handleLogin = async () => {
    // Trimmed once here so every later use of `judgeName` (roster checks,
    // score submission, "already scored by me" matching) works off the
    // exact string the DB will compare against — see migration
    // 20260914000000 for the server-side half of this fix.
    const trimmedName = judgeName.trim();
    if (!trimmedName) { toast.error('Please enter your name'); return; }
    if (!passphraseInput.trim()) { toast.error('Please enter the passphrase'); return; }
    setVerifying(true);
    const resolvedRole = await verifyAdminPassphrase(passphraseInput.trim());
    if (!resolvedRole) { setVerifying(false); toast.error('Invalid passphrase'); return; }
    // Judge logins are gated against the approved roster right here, not
    // just at score-submission time — previously anyone holding the shared
    // judge passphrase could get into the whole dashboard under any name
    // and only discover at submit time (via a red banner + a rejected
    // score) that they weren't recognized. Scoped to role === 'judge' only:
    // organizers manage the roster and use this same login for unrelated
    // admin tabs, so they shouldn't be locked out just for not being a
    // judge themselves. Skipped if the roster hasn't loaded/is empty so a
    // slow network or an organizer who hasn't added anyone yet doesn't
    // lock every judge out.
    if (resolvedRole === 'judge' && judgeRoster.length > 0 && !judgeRoster.some(n => sameJudge(n, trimmedName))) {
      // verifyAdminPassphrase already wrote a valid passphrase+role to
      // sessionStorage as a side effect (needed for its own internal
      // 'verify' call) — undo that here, otherwise a page refresh would
      // silently restore a "logged in" session that never actually passed
      // this name check.
      clearStoredAdminPassphrase();
      setVerifying(false);
      toast.error(`"${trimmedName}" isn't on the approved judge roster — ask an organizer to add you first.`);
      return;
    }
    setVerifying(false);
    setJudgeName(trimmedName);
    setRole(resolvedRole);
    sessionStorage.setItem('judge-display-name', trimmedName);
    fetchHackathonOptions();
    toast.success(`Welcome, ${trimmedName}!`);
  };

  const handleLogout = () => {
    clearStoredAdminPassphrase();
    setRole(null);
    setPassphraseInput('');
  };

  const fetchData = useCallback(async (hackathonId: string) => {
    if (!hackathonId) { setProjects([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      // Judge scores routed through admin-actions instead of a direct
      // point_events select — that select had no hackathon filter (relied
      // on project IDs from other events simply not matching) and fetched
      // participant_email even though it was never used here; the RPC this
      // now calls fixes both by joining to ai_projects server-side and
      // dropping the unused column.
      const [projectsRes, existingScores] = await Promise.all([
        // Sourced from get_hackathon_leaderboard_projects — the same RPC
        // the public Leaderboard page already calls — instead of a raw
        // ai_projects select. Two reasons: (1) it's already scoped to
        // is_published = true server-side, so judges score exactly the
        // project set that counts toward the Leaderboard, by construction
        // rather than a separately-maintained filter; (2) it returns
        // `code`, which this card now needs to show each project's
        // already-earned automated marks (System Message Quality,
        // Conversation Quality) next to the judge's own score — the same
        // `code` this RPC already hands to every anonymous Leaderboard
        // visitor with no login at all, so this isn't new exposure (see
        // migration 20260915000000). author_email is still never fetched;
        // submit_gallery_score resolves it server-side from project_id.
        supabase.rpc('get_hackathon_leaderboard_projects', { p_hackathon_id: hackathonId }),
        callAdminAction<{ points: number; metadata: any }[]>('list_gallery_judge_scores', { hackathon_id: hackathonId }),
      ]);
      if (projectsRes.data) {
        // The RPC orders oldest-first (it's built for the Leaderboard,
        // which doesn't care about order) — re-sorted here so judges still
        // see newest submissions first, matching this panel's prior
        // behavior.
        const sorted = [...(projectsRes.data as unknown as Project[])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setProjects(sorted);
      }
      if (existingScores) {
        const byProject: Record<string, { judgeName: string; points: number }[]> = {};
        (existingScores as any[]).forEach((evt: any) => {
          const pid = evt.metadata?.project_id;
          if (!pid) return;
          (byProject[pid] ||= []).push({ judgeName: evt.metadata?.judge_name || 'Unknown judge', points: evt.points });
        });
        setJudgeScoresByProject(byProject);
        // Pre-fill the score picker with THIS judge's own prior score (if
        // any) — not whichever judge happened to submit most recently.
        if (judgeName) {
          const mine: Record<string, number> = {};
          Object.entries(byProject).forEach(([pid, entries]) => {
            const own = entries.find(e => sameJudge(e.judgeName, judgeName));
            if (own) mine[pid] = own.points;
          });
          setScores(prev => ({ ...prev, ...mine }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
      if (e instanceof AdminSessionExpiredError) { setRole(null); toast.error(e.message); }
      else toast.error('Failed to load data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [judgeName]);

  useEffect(() => {
    if (role && selectedHackathonId) fetchData(selectedHackathonId);
  }, [role, selectedHackathonId, fetchData]);

  const handleSubmitScore = useCallback(async (project: Project) => {
    const score = scores[project.id];
    if (score === undefined || score < 0 || score > 70) {
      toast.error('Score must be between 0 and 70');
      return;
    }
    if (submittingIds.has(project.id)) return;
    setSubmittingIds(prev => new Set(prev).add(project.id));
    try {
      await callAdminAction('submit_gallery_score', {
        project_id: project.id,
        points: score,
        project_name: project.project_name,
        judge_name: judgeName,
        feedback: feedback[project.id] || '',
      });
      setJudgeScoresByProject(prev => {
        const existing = (prev[project.id] || []).filter(e => !sameJudge(e.judgeName, judgeName));
        return { ...prev, [project.id]: [...existing, { judgeName, points: score }] };
      });
      toast.success(`Score submitted for ${project.project_name}`);
    } catch (e) {
      console.error('Score submit exception:', e);
      if (e instanceof AdminSessionExpiredError) { setRole(null); toast.error(e.message); }
      else toast.error(`Failed to submit score: ${(e as any)?.message || 'Unknown error'}`);
    } finally {
      setSubmittingIds(prev => { const next = new Set(prev); next.delete(project.id); return next; });
    }
  }, [scores, feedback, judgeName, submittingIds]);

  const handleTogglePublish = useCallback(async (project: Project) => {
    const newStatus = !project.is_published;
    try {
      await callAdminAction('toggle_project_publish', { project_id: project.id, is_published: newStatus });
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: newStatus } : p));
      toast.success(newStatus ? 'Project is now LIVE' : 'Project taken offline');
    } catch (e) { handleAdminError(e, 'Failed to update project status'); }
  }, []);

  const handleScoreChange = useCallback((id: string, val: number) => {
    setScores(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleFeedbackChange = useCallback((id: string, val: string) => {
    setFeedback(prev => ({ ...prev, [id]: val }));
  }, []);

  if (!role) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-[hsl(var(--discord-darker))] rounded-xl border border-[hsl(var(--discord-light)/0.3)] max-w-sm w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Judge Dashboard</h2>
            <p className="text-sm text-[hsl(var(--discord-text-muted))]">Enter your name and the judge passphrase to continue</p>
          </div>
          <div className="space-y-3">
            <label htmlFor="judge-login-name" className="sr-only">Your name</label>
            <Input id="judge-login-name" value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            <label htmlFor="judge-login-passphrase" className="sr-only">Judge passphrase</label>
            <div className="relative">
              <Input id="judge-login-passphrase" value={passphraseInput} onChange={e => setPassphraseInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Judge passphrase" type={showPassphrase ? 'text' : 'password'}
                className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white pr-10" />
              <button type="button" onClick={() => setShowPassphrase(v => !v)}
                aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--discord-text-muted))] hover:text-white">
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleLogin} disabled={verifying} className="w-full bg-secondary hover:bg-secondary/90">
              {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />} Enter Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark text-foreground space-y-6">
      {/* Six admin sub-tabs below (Events/Challenges/Submissions/Rewards/
          Coins/Community Staff) were built for the old light AdminPanel page
          and default to plain shadcn tokens (bg-card, text-foreground) —
          the `dark` class here activates the dark-palette overrides in
          index.css's `.dark` block so their cards/headers/borders render
          correctly against this dashboard's dark background instead of
          near-invisible dark-on-dark text.
          The explicit `text-foreground` alongside `dark` matters too: color
          is an inherited property, and elements like "Reward Boxes" /
          "Submission Review" headings never declare their own color, only
          `text-lg font-bold` — without this, they'd inherit body's
          already-resolved (light-theme, near-black) color, since that
          inheritance is fixed at body and never re-evaluates --foreground
          inside this `.dark`-scoped subtree. Declaring color HERE, on the
          element that actually carries the `dark` class, is what makes the
          re-evaluated (light) --foreground the thing descendants inherit. */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700, #F7941D)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Judge Dashboard</h1>
            <p className="text-xs text-[hsl(var(--discord-text-muted))]">Welcome, {judgeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedHackathonId} onValueChange={setSelectedHackathonId}>
            <SelectTrigger className="w-56 bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white">
              <SelectValue placeholder="Select a hackathon" />
            </SelectTrigger>
            <SelectContent>
              {hackathonOptions.map(h => (
                <SelectItem key={h.id} value={h.id}>{h.title} ({h.status})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className="bg-[hsl(var(--discord-yellow)/0.2)] text-[hsl(var(--discord-yellow))] border-[hsl(var(--discord-yellow)/0.3)]">{projects.length} Projects</Badge>
          {role === 'judge' && (
            <Button size="sm" variant="outline" onClick={() => setAdminStepUpOpen(true)}
              className="h-8 text-xs border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)]">
              <Shield className="w-3.5 h-3.5 mr-1" /> Admin
            </Button>
          )}
          {role === 'organizer' && (
            <Button size="sm" variant="outline" onClick={() => setPassphraseDialogOpen(true)}
              className="h-8 text-xs border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)]">
              <KeyRound className="w-3.5 h-3.5 mr-1" /> Passphrases
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleLogout}
            className="h-8 text-xs border-[hsl(var(--discord-light)/0.3)] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.2)]">
            <LogOut className="w-3.5 h-3.5 mr-1" /> Log out
          </Button>
        </div>
      </div>

      {/* Everything the Admin Panel had lives here now too — one place for
          organizers (and, for grading, judges) instead of a separate page. */}
      <Tabs defaultValue="gallery">
        <TabsList className="flex-wrap h-auto bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light)/0.2)] p-1 gap-1">
          <TabsTrigger value="gallery" className={TAB_CLASS}>Gallery Judging</TabsTrigger>
          <TabsTrigger value="submissions" className={TAB_CLASS}>Daily Submissions</TabsTrigger>
          {role === 'organizer' && (
            <>
              <TabsTrigger value="events" className={TAB_CLASS}>Events</TabsTrigger>
              <TabsTrigger value="challenges" className={TAB_CLASS}>Daily Challenges</TabsTrigger>
              <TabsTrigger value="rewards" className={TAB_CLASS}>Reward Boxes</TabsTrigger>
              <TabsTrigger value="coins" className={TAB_CLASS}>Forge Coins</TabsTrigger>
              <TabsTrigger value="community-staff" className={TAB_CLASS}>Community Staff</TabsTrigger>
              <TabsTrigger value="community-quests" className={TAB_CLASS}>Community Quests</TabsTrigger>
              <TabsTrigger value="judges" className={TAB_CLASS}>Judges</TabsTrigger>
              <TabsTrigger value="feedback" className={TAB_CLASS}>Feedback</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="gallery" className="mt-4">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-[hsl(var(--discord-yellow))]" /> Projects to Score
            <span className="text-xs text-[hsl(var(--discord-text-muted))] font-normal ml-2">Max 70 points per project</span>
          </h2>
          {judgeName.trim() && judgeRoster.length > 0 && !judgeRoster.some(n => sameJudge(n, judgeName)) && (
            <p className="text-xs text-[hsl(var(--discord-red))] bg-[hsl(var(--discord-red)/0.1)] border border-[hsl(var(--discord-red)/0.3)] rounded-md px-3 py-2 mb-3">
              "{judgeName}" isn't on the approved judge roster — scores will be rejected until an organizer adds you
              {role === 'organizer' ? ' (Judges tab, above).' : '.'}
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--discord-blurple))]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--discord-text-muted))]">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No projects submitted to this hackathon yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  meta={TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project' }}
                  isScored={(judgeScoresByProject[project.id] || []).some(e => sameJudge(e.judgeName, judgeName))}
                  otherScores={(judgeScoresByProject[project.id] || []).filter(e => !sameJudge(e.judgeName, judgeName))}
                  score={scores[project.id]}
                  feedbackText={feedback[project.id] || ''}
                  onScoreChange={handleScoreChange}
                  onFeedbackChange={handleFeedbackChange}
                  onSubmitScore={handleSubmitScore}
                  onTogglePublish={handleTogglePublish}
                  isOrganizer={role === 'organizer'}
                  isSubmitting={submittingIds.has(project.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab hackathonId={selectedHackathonId} role={role} />
        </TabsContent>

        {role === 'organizer' && (
          <>
            <TabsContent value="events" className="mt-4">
              <EventsTab onHackathonsChanged={fetchHackathonOptions} />
            </TabsContent>
            <TabsContent value="challenges" className="mt-4">
              <ChallengesTab hackathonId={selectedHackathonId} />
            </TabsContent>
            <TabsContent value="rewards" className="mt-4">
              <RewardsTab hackathonId={selectedHackathonId} />
            </TabsContent>
            <TabsContent value="coins" className="mt-4">
              <CoinsTab hackathonId={selectedHackathonId} />
            </TabsContent>
            <TabsContent value="community-staff" className="mt-4">
              <CommunityStaffTab />
            </TabsContent>
            <TabsContent value="community-quests" className="mt-4">
              <CommunityQuestsTab />
            </TabsContent>
            <TabsContent value="judges" className="mt-4">
              <div className="max-w-md space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Judge Roster</h2>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                    Only names on this list can submit gallery scores — add anyone (including yourself) who'll be judging.
                  </p>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="new-judge-name" className="sr-only">Judge's name</label>
                  <Input id="new-judge-name" value={newJudgeName} onChange={e => setNewJudgeName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddJudge()}
                    placeholder="Judge's name" className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
                  <Button onClick={handleAddJudge} disabled={savingJudge || !newJudgeName.trim()}>
                    {savingJudge ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {judgeRoster.length === 0 && (
                    <p className="text-xs text-[hsl(var(--discord-text-muted))]">No judges added yet.</p>
                  )}
                  {judgeRoster.map(name => (
                    <div key={name} className="flex items-center justify-between bg-[hsl(var(--discord-dark))] border border-[hsl(var(--discord-light)/0.2)] rounded-md px-3 py-2">
                      <span className="text-sm text-white">{name}</span>
                      <Button size="sm" variant="outline" onClick={() => handleRemoveJudge(name)} aria-label={`Remove ${name}`}
                        className="h-7 text-xs text-[hsl(var(--discord-red))] border-[hsl(var(--discord-red)/0.3)] hover:bg-[hsl(var(--discord-red)/0.1)]">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="feedback" className="mt-4">
              <FeedbackTab hackathonId={selectedHackathonId} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={passphraseDialogOpen} onOpenChange={setPassphraseDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Passphrase</DialogTitle>
            <DialogDescription>Rotate the organizer or judge login. No Supabase access needed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Which login</label>
              <Select value={targetRole} onValueChange={v => setTargetRole(v as AdminRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="judge">Judge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">New passphrase</label>
              <div className="relative">
                <Input type={showNewPassphrase ? 'text' : 'password'} value={newPassphrase} onChange={e => setNewPassphrase(e.target.value)} placeholder="At least 6 characters" className="pr-10" />
                <button type="button" onClick={() => setShowNewPassphrase(v => !v)}
                  aria-label={showNewPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Confirm</label>
              <Input type={showNewPassphrase ? 'text' : 'password'} value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPassphraseDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSavePassphrase} disabled={savingPassphrase} className="flex-1">
                {savingPassphrase ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adminStepUpOpen} onOpenChange={(open) => { setAdminStepUpOpen(open); if (!open) setAdminStepUpPassphrase(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
            <DialogDescription>Enter the organizer passphrase to unlock the full control panel for this session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Input
                type={showStepUpPassphrase ? 'text' : 'password'}
                value={adminStepUpPassphrase}
                onChange={e => setAdminStepUpPassphrase(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminStepUp()}
                placeholder="Organizer passphrase"
                className="pr-10"
                autoFocus
              />
              <button type="button" onClick={() => setShowStepUpPassphrase(v => !v)}
                aria-label={showStepUpPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showStepUpPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdminStepUpOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAdminStepUp} disabled={steppingUp} className="flex-1">
                {steppingUp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
