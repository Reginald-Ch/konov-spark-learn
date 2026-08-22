import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CalendarDays, Send, CheckCircle2, Clock, Loader2, Trophy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { isSafeExternalUrl } from '@/lib/utils';
import { ensureHackathonRegistration } from '@/lib/identity';

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
  auto_breakdown: { timeliness?: number } | null;
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
  hackathon_id: string | null;
}

const singleScore = (s: MySubmission['submission_scores']) => (Array.isArray(s) ? s[0] : s);

export const DailyChallengePanel = ({ hackathonId }: { hackathonId: string | null }) => {
  const [email, setEmail] = useState(localStorage.getItem('forge-student-email') || '');
  const [name, setName] = useState(localStorage.getItem('forge-student-name') || '');
  // Same per-email TOFU bearer credential Community Chat mints/checks —
  // shared localStorage key, so an identity already claimed on this
  // browser via chat (or vice versa) doesn't need proving twice.
  const [deviceToken, setDeviceTokenState] = useState(() => localStorage.getItem('forge-device-token') || '');
  const setDeviceToken = (value: string) => {
    setDeviceTokenState(value);
    if (value) localStorage.setItem('forge-device-token', value);
    else localStorage.removeItem('forge-device-token');
  };
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
      // ai_projects' public SELECT policy is published-only now — draft
      // projects (which is most of them, until "Go Live") need the owner-
      // checked RPC instead of a raw table read.
      // p_device_token added (security audit) — this RPC used to trust a
      // bare email with no proof of identity, letting anyone list another
      // participant's private project names just by knowing their email.
      email
        ? supabase.rpc('get_my_projects', { p_participant_email: email, p_device_token: deviceToken || null })
        : Promise.resolve({ data: [] as MyProject[] }),
    ]);
    const chs = (challengesRes.data as Challenge[]) || [];
    setChallenges(chs);
    // get_my_projects is shared with ProjectGallery (which legitimately
    // wants every project a user has ever made, across all events), so it
    // isn't itself scoped to a hackathon — filter here instead. Without
    // this, the "link a project" dropdown showed every project the
    // participant has ever built in ANY past hackathon, not just this one,
    // which is confusing at best (old, unrelated projects cluttering the
    // list for a challenge that has nothing to do with them).
    setMyProjects(((projectsRes.data as MyProject[]) || []).filter(p => p.hackathon_id === hackathonId));

    if (email && chs.length > 0) {
      // Routed through an RPC — challenge_submissions has a wide-open
      // SELECT policy, so this raw select worked but let the same anon key
      // read any participant's submissions, not just the caller's own.
      // The RPC returns flat columns instead of an embedded relationship,
      // so it's reassembled into the same submission_scores shape below —
      // singleScore() and everything downstream is unchanged either way.
      const { data: subs } = await supabase.rpc('get_my_challenge_submissions', {
        p_participant_email: email,
        p_challenge_ids: chs.map(c => c.id),
      });
      const map: Record<string, MySubmission> = {};
      (subs || []).forEach((s: any) => {
        map[s.challenge_id] = {
          id: s.id,
          content_url: s.content_url,
          notes: s.notes,
          project_id: s.project_id,
          submission_scores: s.total_sp === null && s.score_status === null && s.auto_breakdown === null
            ? null
            : { total_sp: s.total_sp, status: s.score_status, auto_breakdown: s.auto_breakdown },
        };
      });
      setSubmissions(map);
    } else {
      setSubmissions({});
    }
    setIsLoading(false);
  }, [hackathonId, email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Previously fetch-once-on-mount only — a challenge opening/closing, or a
  // submission getting graded, never appeared while this page was actually
  // open; you had to manually reload to see it. daily_challenges,
  // challenge_submissions, and submission_scores are all already in the
  // realtime publication (SPLeaderboard already relies on the same
  // publication for point_events), so this just wires up the subscription
  // that was missing. Debounced since a grading run or a challenge close
  // can touch many rows in quick succession.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hackathonId) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchAll(), 600);
    };
    const channel = supabase
      .channel(`daily-challenges-${hackathonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_challenges', filter: `hackathon_id=eq.${hackathonId}` }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions', filter: `hackathon_id=eq.${hackathonId}` }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_scores' }, debouncedRefetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hackathonId, fetchAll]);

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

    const existing = submissions[activeChallenge.id];
    setSubmitting(true);
    try {
      // Lowercase — matches every other identity-aware surface (registration,
      // Lessons, Community). Inconsistent casing here would fragment this
      // participant's challenge history from their coin/lesson identity.
      const normalizedEmail = email.trim().toLowerCase();
      // Routed through an RPC (not a raw insert/update) so submitting or
      // editing as someone else's email requires the same device token
      // Community Chat requires — the old USING(true) policy let anyone
      // submit-as or silently overwrite any registered participant's entry
      // just by knowing their email, sabotaging a real competitor's shot
      // at the day's SP/rewards with zero proof of identity required.
      const { data, error } = await supabase.rpc('submit_challenge_entry', {
        p_challenge_id: activeChallenge.id,
        p_hackathon_id: hackathonId,
        p_participant_email: normalizedEmail,
        p_device_token: deviceToken || null,
        p_project_id: projectId || null,
        p_content_url: contentUrl.trim() || null,
        p_notes: notes.trim() || null,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error) throw error;
      if (!result?.ok) throw new Error(result?.message || 'Failed to submit');
      if (result.new_device_token) setDeviceToken(result.new_device_token);

      localStorage.setItem('forge-student-email', normalizedEmail);
      localStorage.setItem('forge-student-name', name.trim());
      // Defensive — the enforce_submission_integrity trigger already
      // requires registration before a submission is even accepted, so
      // this is normally a no-op success, not a new registration.
      ensureHackathonRegistration(normalizedEmail, name.trim(), hackathonId);
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
                    {score?.auto_breakdown?.timeliness === 10 && (
                      <Badge variant="outline" className="gap-1 text-amber-400 border-amber-400/40">⚡ On Time</Badge>
                    )}
                    {c.status === 'live' ? (
                      <Button size="sm" onClick={() => openSubmit(c)}>
                        <Send className="w-3 h-3 mr-1" /> {sub ? 'Edit Submission' : 'Submit'}
                      </Button>
                    ) : sub?.content_url && isSafeExternalUrl(sub.content_url) ? (
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
