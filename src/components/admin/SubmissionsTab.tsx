import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction, type AdminRole } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Loader2, Gift, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { isSafeExternalUrl } from '@/lib/utils';

interface Challenge {
  id: string;
  day_number: number;
  title: string;
  auto_max_points: number;
  judge_max_points: number;
  status: string;
  boxes_awarded_at: string | null;
}

interface ScoreRow {
  total_sp: number;
  status: string;
  auto_score: number | null;
  judge_score: number | null;
  auto_breakdown: any;
  judge_breakdown: any;
  last_judge_name: string | null;
}

interface Submission {
  id: string;
  participant_email: string;
  content_url: string | null;
  notes: string | null;
  submitted_at: string;
  submission_scores: ScoreRow | ScoreRow[] | null;
}

const emptyAutoBreakdown = () => ({ timeliness: 0, benchmark: 0, followsPrompt: 0, correctness: 0, characterConsistency: 0, safety: 0, knowledgeBase: 0 });
const emptyJudgeBreakdown = () => ({ creativity: 0, problemSolving: 0, impact: 0 });

const singleScore = (s: Submission['submission_scores']) => (Array.isArray(s) ? s[0] : s);

const normalizeAutoBreakdown = (b: any) => {
  if (!b) return emptyAutoBreakdown();
  const rq = b.response_quality || b; // supports both the auto-grader's nested shape and older flat entries
  return {
    timeliness: b.timeliness ?? 0,
    benchmark: b.benchmark ?? 0,
    followsPrompt: rq.followsPrompt ?? 0,
    correctness: rq.correctness ?? 0,
    characterConsistency: rq.characterConsistency ?? 0,
    safety: rq.safety ?? 0,
    knowledgeBase: rq.knowledgeBase ?? 0,
  };
};

const normalizeJudgeBreakdown = (b: any) => ({
  creativity: b?.creativity ?? 0,
  problemSolving: b?.problemSolving ?? 0,
  impact: b?.impact ?? 0,
});

export const SubmissionsTab = ({ hackathonId, role = 'organizer' }: { hackathonId: string; role?: AdminRole | null }) => {
  const isOrganizer = role === 'organizer';
  const isJudge = role === 'judge';

  // Reuses the same sessionStorage key JudgeDashboardPanel (gallery
  // judging) writes to, so a judge who works both surfaces only ever
  // types their name once per browser session.
  const [judgeName, setJudgeName] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('judge-display-name') || '' : ''));
  const [conflictInfo, setConflictInfo] = useState<{ name: string } | null>(null);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [bonusCoinValue, setBonusCoinValue] = useState('');
  const [autoGrading, setAutoGrading] = useState(false);
  // auto_grade_challenge has always supported a force flag to re-grade
  // submissions that already have an auto score — the warning it returns
  // when no benchmark tests are configured even tells the organizer to
  // "re-grade with force:true if that's not intentional" — but nothing in
  // this UI ever sent it. Fixing a benchmark test after an initial Auto-
  // Grade run had no way to actually apply to already-graded submissions
  // short of manually re-typing every score by hand or calling the API
  // directly outside the app.
  const [forceRegrade, setForceRegrade] = useState(false);

  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [autoBreakdown, setAutoBreakdown] = useState(emptyAutoBreakdown());
  const [judgeBreakdown, setJudgeBreakdown] = useState(emptyJudgeBreakdown());
  const [autoRationale, setAutoRationale] = useState<string>('');
  const [autoSuspicious, setAutoSuspicious] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  const fetchChallenges = useCallback(async () => {
    if (!hackathonId) { setChallenges([]); return; }
    const { data } = await supabase.from('daily_challenges').select('id, day_number, title, auto_max_points, judge_max_points, status, boxes_awarded_at').eq('hackathon_id', hackathonId).order('day_number');
    setChallenges((data as Challenge[]) || []);
    setSelectedChallengeId(prev => (prev && data?.some(c => c.id === prev) ? prev : data?.[0]?.id || ''));
  }, [hackathonId]);

  const fetchSubmissions = useCallback(async () => {
    if (!selectedChallengeId) { setSubmissions([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select('id, participant_email, content_url, notes, submitted_at, submission_scores(total_sp, status, auto_score, judge_score, auto_breakdown, judge_breakdown, last_judge_name)')
      .eq('challenge_id', selectedChallengeId)
      .order('submitted_at', { ascending: true });
    if (error) toast.error('Failed to load submissions');
    setSubmissions((data as any) || []);
    setIsLoading(false);
  }, [selectedChallengeId]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);
  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Previously fetch-once-per-challenge-select only — a new submission
  // coming in, or another judge's grade landing, never appeared until the
  // organizer/judge manually reselected the day dropdown. submission_scores
  // has no challenge_id column, so that half subscribes globally and
  // relies on the debounce to stay cheap.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedChallengeId) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSubmissions(), 600);
    };
    const channel = supabase
      .channel(`submissions-tab-${selectedChallengeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions', filter: `challenge_id=eq.${selectedChallengeId}` }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_scores' }, debouncedRefetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedChallengeId, fetchSubmissions]);

  const autoTotal = useMemo(() => Object.values(autoBreakdown).reduce((a, b) => a + (b || 0), 0), [autoBreakdown]);
  const judgeTotal = useMemo(() => Object.values(judgeBreakdown).reduce((a, b) => a + (b || 0), 0), [judgeBreakdown]);

  const openGrade = (s: Submission) => {
    setGradingSubmission(s);
    setConflictInfo(null);
    const existing = singleScore(s.submission_scores);
    setAutoBreakdown(normalizeAutoBreakdown(existing?.auto_breakdown));
    setJudgeBreakdown(normalizeJudgeBreakdown(existing?.judge_breakdown));
    setAutoRationale(existing?.auto_breakdown?.rationale || '');
    setAutoSuspicious(existing?.auto_breakdown?.suspicious_content || '');
  };

  const handleGrade = async (confirmOverride = false) => {
    if (!gradingSubmission) return;
    if (isJudge && !judgeName.trim()) {
      toast.error('Enter your name so other judges can see who graded this');
      return;
    }
    if (isJudge) sessionStorage.setItem('judge-display-name', judgeName.trim());
    setSaving(true);
    try {
      const result = await callAdminAction<{ conflictingJudgeName?: string | null }>('grade_submission', {
        submission_id: gradingSubmission.id,
        ...(isOrganizer ? { auto_score: autoTotal, auto_breakdown: { timeliness: autoBreakdown.timeliness, benchmark: autoBreakdown.benchmark, response_quality: { followsPrompt: autoBreakdown.followsPrompt, correctness: autoBreakdown.correctness, characterConsistency: autoBreakdown.characterConsistency, safety: autoBreakdown.safety, knowledgeBase: autoBreakdown.knowledgeBase } } } : {}),
        judge_score: judgeTotal,
        judge_breakdown: judgeBreakdown,
        judge_name: isJudge ? judgeName.trim() : null,
        confirm_override: confirmOverride,
      });
      // A different named judge already holds this submission's
      // judge_score — the RPC refused to write anything. Ask before
      // clobbering instead of silently overwriting their grade.
      if (result.conflictingJudgeName) {
        setConflictInfo({ name: result.conflictingJudgeName });
        return;
      }
      toast.success('Score submitted');
      setGradingSubmission(null);
      setConflictInfo(null);
      fetchSubmissions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit score');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGrade = async () => {
    if (!selectedChallengeId) return;
    setAutoGrading(true);
    try {
      const result = await callAdminAction<{ graded: number; skipped: number; errors: { submission_id: string; error: string }[]; warnings: { submission_id: string; warning: string }[] }>('auto_grade_challenge', {
        challenge_id: selectedChallengeId,
        force: forceRegrade,
      });
      if (result.errors.length > 0) {
        toast.warning(`Auto-graded ${result.graded}, ${result.errors.length} failed (see console)`);
        console.error('Auto-grade errors:', result.errors);
      } else {
        toast.success(`Auto-graded ${result.graded} submission(s). ${result.skipped} already had an auto score.`);
      }
      // Successful grades that still carry a caveat worth a human look —
      // e.g. no benchmark tests configured for this challenge, or a
      // submission that looked like an attempt to manipulate the grader.
      if (result.warnings?.length > 0) {
        toast.warning(`${result.warnings.length} grade(s) flagged for review (see console)`);
        console.warn('Auto-grade warnings:', result.warnings);
      }
      fetchSubmissions();
    } catch (e: any) {
      toast.error(e.message || 'Auto-grading failed');
    } finally {
      setAutoGrading(false);
    }
  };

  const handleCloseChallenge = async () => {
    if (!selectedChallengeId) return;
    setClosing(true);
    try {
      const result = await callAdminAction<{ awarded: number; topWinners: string[]; excludedCount: number }>('close_challenge_and_award_boxes', {
        challenge_id: selectedChallengeId,
        issue_box_label: 'Issue Box',
        mission_box_label: 'Mission Bonus',
        mission_bonus_coin_value: parseInt(bonusCoinValue, 10) || 0,
      });
      toast.success(`Challenge closed. ${result.awarded} reward box(es) awarded — top winners: ${result.topWinners.join(', ') || 'none'}`);
      // Not finalized (missing an auto score, judge score, or both) means
      // no box/badge/bonus for that submission — worth a loud, separate
      // warning since it silently zeroes out real participants otherwise.
      if (result.excludedCount > 0) {
        toast.warning(`${result.excludedCount} submission(s) were never fully graded and got no reward — check for missing auto or judge scores.`);
      }
      setCloseDialogOpen(false);
      setBonusCoinValue('');
      fetchChallenges();
    } catch (e: any) {
      toast.error(e.message || 'Failed to close challenge');
    } finally {
      setClosing(false);
    }
  };

  if (!hackathonId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Select a hackathon first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Submission Review</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a challenge" /></SelectTrigger>
            <SelectContent>
              {challenges.map(c => (
                <SelectItem key={c.id} value={c.id}>Day {c.day_number}: {c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Auto-Grade only writes auto_score/auto_breakdown using the
              challenge's own already-configured benchmark tests — never
              judge_score, publish state, or coins directly — so it's safe
              for judges too. It used to be organizer-only, which meant a
              judge who was handed all daily-challenge grading had no way
              to populate this half at all: merge_submission_score requires
              BOTH halves to finalize, so every submission silently never
              earned SP with no error shown anywhere. Close & Award Boxes
              stays organizer-only — that's a real finalization/reward step. */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none" title="Without this, submissions that already have an auto score are skipped — the only way to apply a benchmark-test fix retroactively is to check this and re-run.">
            <Checkbox checked={forceRegrade} onCheckedChange={(v) => setForceRegrade(!!v)} className="h-3.5 w-3.5" />
            Re-grade already-graded
          </label>
          <Button size="sm" variant="outline" disabled={!selectedChallengeId || autoGrading} onClick={handleAutoGrade}>
            {autoGrading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Auto-Grade All
          </Button>
          {isOrganizer && (
            // Never permanently disabled by prior runs — re-running is safe
            // and sometimes necessary (a reopened challenge picking up late
            // finalizers), protected by per-participant idempotency checks
            // server-side rather than a one-time lock here. `closing` still
            // disables it for the duration of one in-flight request, which
            // covers the common accidental-double-click case.
            <Button size="sm" variant="outline" disabled={!selectedChallengeId || closing} onClick={() => setCloseDialogOpen(true)}>
              {closing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
              {selectedChallenge?.boxes_awarded_at ? 'Re-run Close & Award Boxes' : 'Close & Award Boxes'}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {submissions.map(s => {
            const score = singleScore(s.submission_scores);
            const isFinalized = score?.status === 'finalized';
            return (
              <div key={s.id} className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{s.participant_email}</span>
                    {isFinalized && <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> {score.total_sp} SP</Badge>}
                    {!isFinalized && score?.auto_score != null && <Badge variant="outline">Auto-graded: {score.auto_score} — awaiting judge</Badge>}
                    {/* Replaces the old Boost Token currency — same
                        achievement (submitted before the challenge closed),
                        shown as a badge instead of a second thing to track. */}
                    {score?.auto_breakdown?.timeliness === 10 && (
                      <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/40">⚡ On Time</Badge>
                    )}
                    {score?.last_judge_name && (
                      <Badge variant="outline" className="gap-1">Judged by {score.last_judge_name}</Badge>
                    )}
                    {/* Computed and saved by auto_grade_challenge on every
                        run, but previously only ever shown in a one-time
                        toast + console log right after grading — anyone
                        judging this submission later (possibly a different
                        person, possibly days afterward) had no way to know
                        it had ever been flagged as a possible attempt to
                        manipulate the auto-grader. It was sitting in the
                        data the whole time; this just displays it. */}
                    {score?.auto_breakdown?.suspicious_content && (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive/40" title={score.auto_breakdown.suspicious_content}>
                        ⚠ Flagged — possible grading manipulation
                      </Badge>
                    )}
                  </div>
                  {s.content_url && (
                    isSafeExternalUrl(s.content_url) ? (
                      <a href={s.content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> {s.content_url}
                      </a>
                    ) : (
                      // Not http(s) — e.g. a javascript: URI a submission tried to
                      // sneak past a grader clicking through submissions. Shown as
                      // inert text, never rendered as a clickable/navigable href.
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {s.content_url} (unsafe link — not opened)
                      </p>
                    )
                  )}
                  {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                </div>
                <Button size="sm" onClick={() => openGrade(s)}>{isFinalized ? 'Re-grade' : 'Grade'}</Button>
              </div>
            );
          })}
          {submissions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions for this challenge yet.</p>
          )}
        </div>
      )}

      <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>{gradingSubmission?.participant_email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {isJudge && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your name (shown to other judges)</label>
                <Input value={judgeName} onChange={e => { setJudgeName(e.target.value); setConflictInfo(null); }} placeholder="e.g. Alex" className="h-8 text-sm" />
              </div>
            )}
            {conflictInfo && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium">{conflictInfo.name} already scored this submission.</p>
                <p className="text-xs text-muted-foreground mt-1">Submitting again will overwrite their judge score with yours.</p>
              </div>
            )}
            {autoSuspicious && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">⚠ This submission was flagged by the auto-grader</p>
                <p className="text-xs text-muted-foreground mt-1">Possible attempt to manipulate grading: {autoSuspicious}. The automated score above still reflects what was computed — review this one by hand before trusting it.</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold mb-2">
                Automated SP — {autoTotal} / {selectedChallenge?.auto_max_points ?? 70}
                {!isOrganizer && <span className="text-xs font-normal text-muted-foreground ml-2">(read-only — judges can't edit this)</span>}
              </h4>
              {autoRationale && <p className="text-xs text-muted-foreground italic mb-2">"{autoRationale}"</p>}
              <div className="grid grid-cols-2 gap-2">
                <ScoreField label="Timeliness/Completion (0-10)" max={10} value={autoBreakdown.timeliness} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, timeliness: v }))} />
                <ScoreField label="Benchmark Tests (0-20)" max={20} value={autoBreakdown.benchmark} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, benchmark: v }))} />
                <ScoreField label="Follows System Prompt (0-8)" max={8} value={autoBreakdown.followsPrompt} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, followsPrompt: v }))} />
                <ScoreField label="Answers Correctly (0-8)" max={8} value={autoBreakdown.correctness} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, correctness: v }))} />
                <ScoreField label="Stays In Character (0-8)" max={8} value={autoBreakdown.characterConsistency} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, characterConsistency: v }))} />
                <ScoreField label="Avoids Unsafe Response (0-8)" max={8} value={autoBreakdown.safety} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, safety: v }))} />
                <ScoreField label="Uses Knowledge Base (0-8)" max={8} value={autoBreakdown.knowledgeBase} disabled={!isOrganizer} onChange={v => setAutoBreakdown(b => ({ ...b, knowledgeBase: v }))} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-2">Judge SP — {judgeTotal} / {selectedChallenge?.judge_max_points ?? 30}</h4>
              <div className="grid grid-cols-3 gap-2">
                <ScoreField label="Creativity & Innovation (0-10)" max={10} value={judgeBreakdown.creativity} onChange={v => setJudgeBreakdown(b => ({ ...b, creativity: v }))} />
                <ScoreField label="Problem Solving (0-10)" max={10} value={judgeBreakdown.problemSolving} onChange={v => setJudgeBreakdown(b => ({ ...b, problemSolving: v }))} />
                <ScoreField label="Impact (0-10)" max={10} value={judgeBreakdown.impact} onChange={v => setJudgeBreakdown(b => ({ ...b, impact: v }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setGradingSubmission(null)} className="flex-1">Cancel</Button>
              {conflictInfo ? (
                <Button variant="destructive" onClick={() => handleGrade(true)} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Overwrite {conflictInfo.name}'s Score
                </Button>
              ) : (
                <Button onClick={() => handleGrade(false)} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Submit Score ({autoTotal + judgeTotal} SP)
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Challenge &amp; Award Boxes</DialogTitle>
            <DialogDescription>
              Everyone finalized gets an Issue Box. The top finishers (per this hackathon's Mission Bonus setting) also get a Mission Bonus box, plus Gold/Silver/Bronze badges for the top 3.
              {selectedChallenge?.boxes_awarded_at && (
                <span className="block mt-1.5 text-amber-500">
                  Already run once, at {new Date(selectedChallenge.boxes_awarded_at).toLocaleString()} — safe to run again, only newly-eligible participants (e.g. after a reopen) will get anything new.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Digital bonus coins per Mission Bonus (optional)</label>
              <Input type="number" min={0} value={bonusCoinValue} onChange={e => setBonusCoinValue(e.target.value)} placeholder="e.g. 50 — leave blank for none" />
              <p className="text-xs text-muted-foreground mt-1">Grants Forge Coins to each Mission Bonus winner in addition to the box itself. Physical merchandise/vouchers still go in the box's contents label — this is only for a digital coin bonus.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCloseDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCloseChallenge} disabled={closing} className="flex-1">
                {closing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Close &amp; Award
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ScoreField = ({ label, max, value, onChange, disabled }: { label: string; max: number; value: number; onChange: (v: number) => void; disabled?: boolean }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <Input
      type="number"
      min={0}
      max={max}
      value={value}
      disabled={disabled}
      onChange={e => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
      className="h-8 text-sm"
    />
  </div>
);
