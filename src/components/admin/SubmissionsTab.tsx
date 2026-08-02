import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ExternalLink, Loader2, Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  day_number: number;
  title: string;
  auto_max_points: number;
  judge_max_points: number;
  status: string;
}

interface Submission {
  id: string;
  participant_email: string;
  content_url: string | null;
  notes: string | null;
  submitted_at: string;
  submission_scores: { total_sp: number; status: string; auto_score: number | null; judge_score: number | null } | { total_sp: number; status: string; auto_score: number | null; judge_score: number | null }[] | null;
}

const emptyAutoBreakdown = () => ({ timeliness: 0, benchmark: 0, followsPrompt: 0, correctness: 0, characterConsistency: 0, safety: 0, knowledgeBase: 0 });
const emptyJudgeBreakdown = () => ({ creativity: 0, problemSolving: 0, impact: 0 });

const singleScore = (s: Submission['submission_scores']) => (Array.isArray(s) ? s[0] : s);

export const SubmissionsTab = ({ hackathonId }: { hackathonId: string }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [autoBreakdown, setAutoBreakdown] = useState(emptyAutoBreakdown());
  const [judgeBreakdown, setJudgeBreakdown] = useState(emptyJudgeBreakdown());
  const [saving, setSaving] = useState(false);

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  const fetchChallenges = useCallback(async () => {
    if (!hackathonId) { setChallenges([]); return; }
    const { data } = await supabase.from('daily_challenges').select('id, day_number, title, auto_max_points, judge_max_points, status').eq('hackathon_id', hackathonId).order('day_number');
    setChallenges((data as Challenge[]) || []);
    setSelectedChallengeId(prev => (prev && data?.some(c => c.id === prev) ? prev : data?.[0]?.id || ''));
  }, [hackathonId]);

  const fetchSubmissions = useCallback(async () => {
    if (!selectedChallengeId) { setSubmissions([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select('id, participant_email, content_url, notes, submitted_at, submission_scores(total_sp, status, auto_score, judge_score)')
      .eq('challenge_id', selectedChallengeId)
      .order('submitted_at', { ascending: true });
    if (error) toast.error('Failed to load submissions');
    setSubmissions((data as any) || []);
    setIsLoading(false);
  }, [selectedChallengeId]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);
  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const autoTotal = useMemo(() => Object.values(autoBreakdown).reduce((a, b) => a + (b || 0), 0), [autoBreakdown]);
  const judgeTotal = useMemo(() => Object.values(judgeBreakdown).reduce((a, b) => a + (b || 0), 0), [judgeBreakdown]);

  const openGrade = (s: Submission) => {
    setGradingSubmission(s);
    const existing = singleScore(s.submission_scores);
    setAutoBreakdown(emptyAutoBreakdown());
    setJudgeBreakdown(emptyJudgeBreakdown());
    void existing; // breakdown detail isn't re-hydrated field-by-field; totals show in the list instead
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;
    setSaving(true);
    try {
      await callAdminAction('grade_submission', {
        submission_id: gradingSubmission.id,
        auto_score: autoTotal,
        auto_breakdown: autoBreakdown,
        judge_score: judgeTotal,
        judge_breakdown: judgeBreakdown,
      });
      toast.success('Score submitted');
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit score');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseChallenge = async () => {
    if (!selectedChallengeId) return;
    setClosing(true);
    try {
      const result = await callAdminAction<{ awarded: number; top3: string[] }>('close_challenge_and_award_boxes', {
        challenge_id: selectedChallengeId,
        issue_box_label: 'Issue Box',
        magic_box_label: 'Magic Box',
      });
      toast.success(`Challenge closed. ${result.awarded} reward box(es) awarded — top 3: ${result.top3.join(', ') || 'none'}`);
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
        <div className="flex items-center gap-2">
          <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a challenge" /></SelectTrigger>
            <SelectContent>
              {challenges.map(c => (
                <SelectItem key={c.id} value={c.id}>Day {c.day_number}: {c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!selectedChallengeId || selectedChallenge?.status === 'closed' || closing} onClick={handleCloseChallenge}>
            {closing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
            {selectedChallenge?.status === 'closed' ? 'Already Closed' : 'Close & Award Boxes'}
          </Button>
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
                  </div>
                  {s.content_url && (
                    <a href={s.content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> {s.content_url}
                    </a>
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
            <div>
              <h4 className="text-sm font-bold mb-2">Automated SP — {autoTotal} / {selectedChallenge?.auto_max_points ?? 70}</h4>
              <div className="grid grid-cols-2 gap-2">
                <ScoreField label="Timeliness/Completion (0-10)" max={10} value={autoBreakdown.timeliness} onChange={v => setAutoBreakdown(b => ({ ...b, timeliness: v }))} />
                <ScoreField label="Benchmark Tests (0-20)" max={20} value={autoBreakdown.benchmark} onChange={v => setAutoBreakdown(b => ({ ...b, benchmark: v }))} />
                <ScoreField label="Follows System Prompt (0-8)" max={8} value={autoBreakdown.followsPrompt} onChange={v => setAutoBreakdown(b => ({ ...b, followsPrompt: v }))} />
                <ScoreField label="Answers Correctly (0-8)" max={8} value={autoBreakdown.correctness} onChange={v => setAutoBreakdown(b => ({ ...b, correctness: v }))} />
                <ScoreField label="Stays In Character (0-8)" max={8} value={autoBreakdown.characterConsistency} onChange={v => setAutoBreakdown(b => ({ ...b, characterConsistency: v }))} />
                <ScoreField label="Avoids Unsafe Response (0-8)" max={8} value={autoBreakdown.safety} onChange={v => setAutoBreakdown(b => ({ ...b, safety: v }))} />
                <ScoreField label="Uses Knowledge Base (0-8)" max={8} value={autoBreakdown.knowledgeBase} onChange={v => setAutoBreakdown(b => ({ ...b, knowledgeBase: v }))} />
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
              <Button onClick={handleGrade} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Score ({autoTotal + judgeTotal} SP)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ScoreField = ({ label, max, value, onChange }: { label: string; max: number; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <Input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={e => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
      className="h-8 text-sm"
    />
  </div>
);
