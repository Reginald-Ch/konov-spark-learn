import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  verifyAdminPassphrase,
  hasStoredAdminPassphrase,
  getStoredAdminPassphrase,
  getStoredAdminRole,
  clearStoredAdminPassphrase,
  callAdminAction,
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
  CheckCircle2, Loader2, Send, Award, LogOut, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { EventsTab } from '@/components/admin/EventsTab';
import { ChallengesTab } from '@/components/admin/ChallengesTab';
import { SubmissionsTab } from '@/components/admin/SubmissionsTab';
import { RewardsTab } from '@/components/admin/RewardsTab';
import { CoinsTab } from '@/components/admin/CoinsTab';
import { CommunityStaffTab } from '@/components/admin/CommunityStaffTab';
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
  author_email: string;
  template_id: string | null;
  code: string;
  is_published: boolean;
  points_earned: number;
  created_at: string;
}

// The shadcn Tabs defaults (bg-muted/bg-background) are light-theme tokens
// — fine on AdminPanel.tsx's old light page, but this component lives
// inside the dark hackathon shell, where an unstyled TabsList rendered as a
// jarring white pill. Matches the discord-dark palette used everywhere
// else in this file instead.
const TAB_CLASS = 'text-[hsl(var(--discord-text-muted))] data-[state=active]:bg-[hsl(var(--discord-light)/0.6)] data-[state=active]:text-white data-[state=active]:shadow-none';

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  chatbot: { icon: '🤖', label: 'Chatbot' },
  agent: { icon: '🧠', label: 'Agent' },
};

const ProjectCard = memo(({ project, meta, isScored, otherScores, score, feedbackText, onScoreChange, onFeedbackChange, onSubmitScore, onTogglePublish }: {
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
}) => (
  <div className={`bg-[hsl(var(--discord-dark))] rounded-lg border transition-all ${isScored ? 'border-green-500/30 bg-green-500/5' : 'border-[hsl(var(--discord-light)/0.2)]'}`}>
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{project.project_name}</h3>
          <p className="text-xs text-[hsl(var(--discord-text-muted))]">by {project.author_name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className="text-[10px]" style={{ backgroundColor: '#5865F220', color: '#5865F2' }}>
            {meta.icon} {meta.label}
          </Badge>
          <Badge className={`text-[10px] ${project.is_published ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {project.is_published ? '🟢 Live' : '🔴 Offline'}
          </Badge>
        </div>
      </div>
      {project.description && (
        <p className="text-xs text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-3">{project.description}</p>
      )}
      
      <div className="flex gap-1.5 mb-3">
        <a href={`${window.location.origin}/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="h-7 text-xs bg-[hsl(var(--discord-green))] hover:bg-[hsl(var(--discord-green)/0.8)] text-white">
            <ExternalLink className="w-3 h-3 mr-1" /> Try Live
          </Button>
        </a>
        <Button size="sm" variant="outline" onClick={() => onTogglePublish(project)}
          className={`h-7 text-xs ${project.is_published ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-400 border-green-500/30 hover:bg-green-500/10'}`}>
          {project.is_published ? '⏸ Take Offline' : '▶ Make Live'}
        </Button>
      </div>

      <div className="space-y-2 pt-3 border-t border-[hsl(var(--discord-light)/0.1)]">
        {otherScores.length > 0 && (
          <p className="text-[10px] text-[hsl(var(--discord-text-muted))]">
            Already scored by {otherScores.map(s => `${s.judgeName} (${s.points})`).join(', ')} — your score is independent and won't overwrite theirs.
          </p>
        )}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--discord-text-muted))]">Score (0-70)</label>
          {isScored && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[10, 20, 30, 40, 50, 60, 70].map(val => (
            <button key={val} onClick={() => onScoreChange(project.id, val)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${score === val ? 'bg-[#FFD700] text-black' : 'bg-[hsl(var(--discord-darker))] text-[hsl(var(--discord-text-muted))] hover:bg-[hsl(var(--discord-light))]'}`}>
              {val}
            </button>
          ))}
        </div>
        <Textarea value={feedbackText} onChange={e => onFeedbackChange(project.id, e.target.value)}
          placeholder="Optional feedback..." rows={2}
          className="text-xs bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.2)] text-white resize-none" />
        <Button size="sm" onClick={() => onSubmitScore(project)} disabled={score === undefined}
          className="w-full h-8 text-xs font-bold"
          style={{ background: score !== undefined ? 'hsl(var(--secondary))' : undefined }}>
          <Send className="w-3 h-3 mr-1" /> {isScored ? 'Update Score' : 'Submit Score'}
        </Button>
      </div>
    </div>
  </div>
));
ProjectCard.displayName = 'ProjectCard';

export const JudgeDashboardPanel = () => {
  const [passphraseInput, setPassphraseInput] = useState('');
  const [role, setRole] = useState<AdminRole | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
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

  const fetchJudgeRoster = useCallback(async () => {
    const { data } = await supabase.from('gallery_judges').select('judge_name').order('judge_name');
    setJudgeRoster((data || []).map((r: any) => r.judge_name));
  }, []);

  useEffect(() => { fetchJudgeRoster(); }, [fetchJudgeRoster]);

  const handleAddJudge = async () => {
    if (!newJudgeName.trim()) return;
    setSavingJudge(true);
    try {
      await callAdminAction('add_gallery_judge', { judge_name: newJudgeName.trim() });
      toast.success(`"${newJudgeName.trim()}" added to the judge roster`);
      setNewJudgeName('');
      fetchJudgeRoster();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add judge');
    } finally {
      setSavingJudge(false);
    }
  };

  const handleRemoveJudge = async (name: string) => {
    try {
      await callAdminAction('remove_gallery_judge', { judge_name: name });
      toast.success(`"${name}" removed from the judge roster`);
      fetchJudgeRoster();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove judge');
    }
  };

  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<AdminRole>('organizer');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to update passphrase');
    } finally {
      setSavingPassphrase(false);
    }
  };

  const fetchHackathonOptions = useCallback(async () => {
    const { data } = await supabase.from('hackathons').select('id, title, status').order('start_date', { ascending: false });
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
      const storedName = sessionStorage.getItem('judge-display-name');
      if (storedName) setJudgeName(storedName);
      if (hasStoredAdminPassphrase()) {
        const resolvedRole = getStoredAdminRole() || (await verifyAdminPassphrase(getStoredAdminPassphrase()));
        setRole(resolvedRole);
        if (resolvedRole) fetchHackathonOptions();
      }
    })();
  }, [fetchHackathonOptions]);

  const handleLogin = async () => {
    if (!judgeName.trim()) { toast.error('Please enter your name'); return; }
    if (!passphraseInput.trim()) { toast.error('Please enter the passphrase'); return; }
    setVerifying(true);
    const resolvedRole = await verifyAdminPassphrase(passphraseInput.trim());
    setVerifying(false);
    if (!resolvedRole) { toast.error('Invalid passphrase'); return; }
    setRole(resolvedRole);
    sessionStorage.setItem('judge-display-name', judgeName);
    fetchHackathonOptions();
    toast.success(`Welcome, ${judgeName}!`);
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
      const [projectsRes, existingScores] = await Promise.all([
        supabase.from('ai_projects').select('id, project_name, description, author_name, author_email, template_id, is_published, points_earned, created_at, code').eq('hackathon_id', hackathonId).order('created_at', { ascending: false }).limit(100),
        supabase.from('point_events').select('participant_email, points, metadata').eq('event_type', 'judge_score').limit(500),
      ]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (existingScores.data) {
        const byProject: Record<string, { judgeName: string; points: number }[]> = {};
        (existingScores.data as any[]).forEach((evt: any) => {
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
            const own = entries.find(e => e.judgeName === judgeName);
            if (own) mine[pid] = own.points;
          });
          setScores(prev => ({ ...prev, ...mine }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
      toast.error('Failed to load data. Please refresh.');
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
    try {
      await callAdminAction('submit_gallery_score', {
        project_id: project.id,
        participant_email: project.author_email,
        points: score,
        project_name: project.project_name,
        judge_name: judgeName,
        feedback: feedback[project.id] || '',
      });
      setJudgeScoresByProject(prev => {
        const existing = (prev[project.id] || []).filter(e => e.judgeName !== judgeName);
        return { ...prev, [project.id]: [...existing, { judgeName, points: score }] };
      });
      toast.success(`Score submitted for ${project.project_name}`);
    } catch (e: any) {
      console.error('Score submit exception:', e);
      toast.error(`Failed to submit score: ${e?.message || 'Unknown error'}`);
    }
  }, [scores, feedback, judgeName]);

  const handleTogglePublish = useCallback(async (project: Project) => {
    const newStatus = !project.is_published;
    try {
      await callAdminAction('toggle_project_publish', { project_id: project.id, is_published: newStatus });
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: newStatus } : p));
      toast.success(newStatus ? 'Project is now LIVE' : 'Project taken offline');
    } catch (e: any) { toast.error(e.message || 'Failed to update project status'); }
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
            <Input value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Your name"
              className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            <Input value={passphraseInput} onChange={e => setPassphraseInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Judge passphrase" type="password" className="bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.3)] text-white" />
            <Button onClick={handleLogin} disabled={verifying} className="w-full bg-secondary hover:bg-secondary/90">
              {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />} Enter Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">{projects.length} Projects</Badge>
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
              <TabsTrigger value="judges" className={TAB_CLASS}>Judges</TabsTrigger>
              <TabsTrigger value="feedback" className={TAB_CLASS}>Feedback</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="gallery" className="mt-4">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFD700]" /> Projects to Score
            <span className="text-xs text-[hsl(var(--discord-text-muted))] font-normal ml-2">Max 70 points per project</span>
          </h2>
          {judgeName.trim() && judgeRoster.length > 0 && !judgeRoster.includes(judgeName.trim()) && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 mb-3">
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
              <p>No published projects yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  meta={TEMPLATE_META[project.template_id || ''] || { icon: '📦', label: 'Project' }}
                  isScored={(judgeScoresByProject[project.id] || []).some(e => e.judgeName === judgeName)}
                  otherScores={(judgeScoresByProject[project.id] || []).filter(e => e.judgeName !== judgeName)}
                  score={scores[project.id]}
                  feedbackText={feedback[project.id] || ''}
                  onScoreChange={handleScoreChange}
                  onFeedbackChange={handleFeedbackChange}
                  onSubmitScore={handleSubmitScore}
                  onTogglePublish={handleTogglePublish}
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
            <TabsContent value="judges" className="mt-4">
              <div className="max-w-md space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Judge Roster</h2>
                  <p className="text-xs text-[hsl(var(--discord-text-muted))]">
                    Only names on this list can submit gallery scores — add anyone (including yourself) who'll be judging.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input value={newJudgeName} onChange={e => setNewJudgeName(e.target.value)}
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
                      <Button size="sm" variant="outline" onClick={() => handleRemoveJudge(name)}
                        className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">
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
              <Input type="password" value={newPassphrase} onChange={e => setNewPassphrase(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Confirm</label>
              <Input type="password" value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} />
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
    </div>
  );
};
