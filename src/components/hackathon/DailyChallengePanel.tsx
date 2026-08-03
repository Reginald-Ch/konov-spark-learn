import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CalendarDays, Send, CheckCircle2, Clock, Loader2, Trophy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  opens_at: string | null;
  closes_at: string | null;
  status: 'draft' | 'live' | 'closed';
  auto_max_points: number;
  judge_max_points: number;
}

interface ScoreRow {
  total_sp: number;
  status: string;
}

interface MySubmission {
  id: string;
  content_url: string | null;
  notes: string | null;
  project_id: string | null;
  submission_scores: ScoreRow | ScoreRow[] | null;
}

interface MyProject {
  id: string;
  project_name: string;
}

const singleScore = (s: MySubmission['submission_scores']) => (Array.isArray(s) ? s[0] : s);

export const DailyChallengePanel = ({ hackathonId }: { hackathonId: string | null }) => {
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, MySubmission>>({});
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [contentUrl, setContentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!hackathonId) { setChallenges([]); setIsLoading(false); return; }
    setIsLoading(true);
    const [challengesRes, projectsRes] = await Promise.all([
      supabase
        .from('daily_challenges')
        .select('id, day_number, title, description, opens_at, closes_at, status, auto_max_points, judge_max_points')
        .eq('hackathon_id', hackathonId)
        .neq('status', 'draft')
        .order('day_number', { ascending: true }),
      email
        ? supabase.from('ai_projects').select('id, project_name').eq('author_email', email).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as MyProject[] }),
    ]);
    const chs = (challengesRes.data as Challenge[]) || [];
    setChallenges(chs);
    setMyProjects((projectsRes.data as MyProject[]) || []);

    if (email && chs.length > 0) {
      const { data: subs } = await supabase
        .from('challenge_submissions')
        .select('id, challenge_id, content_url, notes, project_id, submission_scores(total_sp, status)')
        .in('challenge_id', chs.map(c => c.id))
        .eq('participant_email', email);
      const map: Record<string, MySubmission> = {};
      (subs || []).forEach((s: any) => { map[s.challenge_id] = s; });
      setSubmissions(map);
    } else {
      setSubmissions({});
    }
    setIsLoading(false);
  }, [hackathonId, email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openSubmit = (challenge: Challenge) => {
    const existing = submissions[challenge.id];
    setActiveChallenge(challenge);
    setProjectId(existing?.project_id || '');
    setContentUrl(existing?.content_url || '');
    setNotes(existing?.notes || '');
  };

  const handleSubmit = async () => {
    if (!activeChallenge || !hackathonId) return;
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return; }
    if (!contentUrl.trim() && !notes.trim() && !projectId) { toast.error('Add a link, some notes, or link a project'); return; }

    setSubmitting(true);
    try {
      const existing = submissions[activeChallenge.id];
      const payload = {
        challenge_id: activeChallenge.id,
        hackathon_id: hackathonId,
        participant_email: email.trim(),
        project_id: projectId || null,
        content_url: contentUrl.trim() || null,
        notes: notes.trim() || null,
      };
      const { error } = existing
        ? await supabase.from('challenge_submissions').update(payload).eq('id', existing.id)
        : await supabase.from('challenge_submissions').insert(payload);
      if (error) throw error;

      localStorage.setItem('forge-student-email', email.trim());
      localStorage.setItem('forge-student-name', name.trim());
      toast.success(existing ? 'Submission updated!' : 'Submitted — good luck! 🚀');
      setActiveChallenge(null);
      fetchAll();
    } catch (e: any) {
      // Common server-side rejections here come straight from the DB trigger:
      // "You must register...", "This challenge is not currently open...",
      // "You can only link a project you authored...", or "...already been graded".
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hackathonId) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
        <p className="text-[hsl(var(--discord-text-muted))]">No hackathon is live right now — daily challenges will appear here once one starts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] p-4">
        <p className="text-sm font-semibold text-white mb-2">Who's submitting?</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email (must match registration)"
            className="bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light)/0.3)] text-white" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--discord-text-muted))]" /></div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50 text-[hsl(var(--discord-text-muted))]" />
          <p className="text-[hsl(var(--discord-text-muted))]">No daily challenges have been published for this event yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const sub = submissions[c.id];
            const score = singleScore(sub?.submission_scores);
            const isFinalized = score?.status === 'finalized';
            return (
              <div key={c.id} className="bg-[hsl(var(--discord-darker))] rounded-lg border border-[hsl(var(--discord-light)/0.2)] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Day {c.day_number}</Badge>
                      <h3 className="font-semibold text-white text-sm">{c.title}</h3>
                      <Badge variant={c.status === 'live' ? 'default' : 'secondary'}>{c.status === 'live' ? 'OPEN' : 'CLOSED'}</Badge>
                    </div>
                    {c.description && <p className="text-xs text-[hsl(var(--discord-text-muted))] mb-1">{c.description}</p>}
                    <p className="text-xs text-[hsl(var(--discord-text-muted))] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.closes_at ? `Closes ${new Date(c.closes_at).toLocaleString()}` : 'No deadline set'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isFinalized ? (
                      <Badge className="gap-1"><Trophy className="w-3 h-3" /> {score.total_sp} SP</Badge>
                    ) : sub ? (
                      <Badge variant="outline" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted — awaiting grading</Badge>
                    ) : null}
                    {c.status === 'live' ? (
                      <Button size="sm" onClick={() => openSubmit(c)}>
                        <Send className="w-3 h-3 mr-1" /> {sub ? 'Edit Submission' : 'Submit'}
                      </Button>
                    ) : sub?.content_url ? (
                      <a href={sub.content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Your submission
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeChallenge} onOpenChange={(open) => !open && setActiveChallenge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Day {activeChallenge?.day_number}: {activeChallenge?.title}</DialogTitle>
            <DialogDescription>
              Scored out of {(activeChallenge?.auto_max_points ?? 70) + (activeChallenge?.judge_max_points ?? 30)} SP — automated checks plus a judge rubric. You can edit this until it's graded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {myProjects.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Link one of your FORGE projects (optional)</label>
                <Select value={projectId || '__none__'} onValueChange={v => setProjectId(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {myProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Linking a project lets Auto-Grade actually test your bot's behavior, not just read your notes.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Link (demo, video, repo — optional)</label>
              <Input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes for the judges (optional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What did you build? Anything judges should know?" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setActiveChallenge(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                {submissions[activeChallenge?.id || '']?.id ? 'Update Submission' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
