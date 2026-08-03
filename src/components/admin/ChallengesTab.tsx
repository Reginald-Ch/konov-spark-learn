import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Pencil, Loader2, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';

interface BenchmarkTest {
  label: string;
  input: string;
  expected_contains: string;
}

interface Challenge {
  id: string;
  hackathon_id: string;
  day_number: number;
  title: string;
  description: string | null;
  opens_at: string | null;
  closes_at: string | null;
  auto_max_points: number;
  judge_max_points: number;
  status: 'draft' | 'live' | 'closed';
  benchmark_tests: BenchmarkTest[];
}

const emptyBenchmarkTest = (): BenchmarkTest => ({ label: '', input: '', expected_contains: '' });

// The organizer's status field (draft/live/closed) is the actual gate for
// grading/closing — nothing here flips it automatically. This is a read-only
// signal so the organizer can see, at a glance, whether "right now" falls
// inside the day's scheduled window, instead of guessing when to click Live.
const scheduleWindow = (c: Pick<Challenge, 'opens_at' | 'closes_at'>): { label: string; tone: 'upcoming' | 'open' | 'closed' | 'unset' } => {
  if (!c.opens_at || !c.closes_at) return { label: 'No schedule set', tone: 'unset' };
  const now = Date.now();
  const opens = new Date(c.opens_at).getTime();
  const closes = new Date(c.closes_at).getTime();
  if (now < opens) return { label: 'Scheduled window not open yet', tone: 'upcoming' };
  if (now > closes) return { label: 'Scheduled window has passed', tone: 'closed' };
  return { label: 'Within scheduled window right now', tone: 'open' };
};

const emptyForm = (nextDay: number): Partial<Challenge> => ({
  day_number: nextDay,
  title: '',
  description: '',
  opens_at: '',
  closes_at: '',
  auto_max_points: 70,
  judge_max_points: 30,
  status: 'draft',
  benchmark_tests: [],
});

export const ChallengesTab = ({ hackathonId }: { hackathonId: string }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Challenge>>(emptyForm(1));
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!hackathonId) { setChallenges([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('hackathon_id', hackathonId)
      .order('day_number', { ascending: true });
    if (error) toast.error('Failed to load challenges');
    setChallenges((data as unknown as Challenge[]) || []);
    setIsLoading(false);
  }, [hackathonId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm((challenges[challenges.length - 1]?.day_number || 0) + 1));
    setModalOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({
      ...c,
      opens_at: c.opens_at ? c.opens_at.slice(0, 16) : '',
      closes_at: c.closes_at ? c.closes_at.slice(0, 16) : '',
      benchmark_tests: c.benchmark_tests || [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    if (!form.day_number) { toast.error('Day number is required'); return; }
    setSaving(true);
    try {
      const payload = {
        hackathon_id: hackathonId,
        day_number: form.day_number,
        title: form.title,
        description: form.description || null,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
        auto_max_points: form.auto_max_points ?? 70,
        judge_max_points: form.judge_max_points ?? 30,
        status: form.status || 'draft',
        benchmark_tests: (form.benchmark_tests || []).filter(t => t.label.trim() || t.input.trim()),
      };
      if (editingId) {
        await callAdminAction('update_challenge', { id: editingId, ...payload });
        toast.success('Challenge updated');
      } else {
        await callAdminAction('create_challenge', payload);
        toast.success('Challenge created');
      }
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (c: Challenge, status: Challenge['status']) => {
    try {
      await callAdminAction('update_challenge', { id: c.id, status });
      toast.success(`Day ${c.day_number} is now ${status}`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  if (!hackathonId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Select a hackathon first.</p>;
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Daily Challenges</h2>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Challenge</Button>
      </div>

      <div className="space-y-2">
        {challenges.map(c => (
          <div key={c.id} className="bg-card rounded-lg border p-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">Day {c.day_number}</Badge>
                <h3 className="font-semibold text-sm">{c.title}</h3>
                <Badge variant={c.status === 'live' ? 'default' : c.status === 'closed' ? 'secondary' : 'outline'}>{c.status}</Badge>
              </div>
              {c.description && <p className="text-xs text-muted-foreground mb-1">{c.description}</p>}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {c.opens_at ? new Date(c.opens_at).toLocaleString() : 'no open time'} — {c.closes_at ? new Date(c.closes_at).toLocaleString() : 'no close time'}
              </p>
              {(() => {
                const win = scheduleWindow(c);
                return (
                  <p className={`text-xs mt-0.5 ${win.tone === 'open' ? 'text-emerald-500' : win.tone === 'upcoming' ? 'text-blue-400' : win.tone === 'closed' ? 'text-muted-foreground' : 'text-muted-foreground italic'}`}>
                    {win.tone === 'open' && '● '}{win.label}
                  </p>
                );
              })()}
              <p className="text-xs text-muted-foreground mt-1">Auto {c.auto_max_points} SP + Judge {c.judge_max_points} SP = {c.auto_max_points + c.judge_max_points} SP max</p>
              <p className="text-xs text-muted-foreground">{c.benchmark_tests?.length || 0} benchmark test(s) defined</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={c.status} onValueChange={(v) => handleStatusChange(c, v as Challenge['status'])}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
            </div>
          </div>
        ))}
        {challenges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-3">No daily challenges yet for this hackathon</p>
            <Button size="sm" onClick={openCreate}><Plus className="w-3 h-3 mr-1" /> Add Day 1</Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Challenge' : 'New Daily Challenge'}</DialogTitle>
            <DialogDescription>Each challenge is scored out of {(form.auto_max_points ?? 70) + (form.judge_max_points ?? 30)} SP: automated checks + judge rubric.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Day Number *</label>
                <Input type="number" min={1} value={form.day_number || 1} onChange={e => setForm(f => ({ ...f, day_number: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status || 'draft'} onValueChange={(v) => setForm(f => ({ ...f, status: v as Challenge['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Build a support chatbot" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What participants need to build/submit today..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Opens At</label>
                <Input type="datetime-local" value={form.opens_at || ''} onChange={e => setForm(f => ({ ...f, opens_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Closes At</label>
                <Input type="datetime-local" value={form.closes_at || ''} onChange={e => setForm(f => ({ ...f, closes_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Automated SP (max)</label>
                <Input type="number" min={0} value={form.auto_max_points ?? 70} onChange={e => setForm(f => ({ ...f, auto_max_points: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Judge SP (max)</label>
                <Input type="number" min={0} value={form.judge_max_points ?? 30} onChange={e => setForm(f => ({ ...f, judge_max_points: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium block">Benchmark Tests (used by Auto-Grade)</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setForm(f => ({ ...f, benchmark_tests: [...(f.benchmark_tests || []), emptyBenchmarkTest()] }))}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Test
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Each test is a message sent to the participant's bot; the auto-grader checks whether the response satisfies what you describe. No tests defined = full benchmark credit by default.
              </p>
              <div className="space-y-2">
                {(form.benchmark_tests || []).map((t, i) => (
                  <div key={i} className="border rounded-lg p-2 space-y-1.5 relative">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, benchmark_tests: (f.benchmark_tests || []).filter((_, idx) => idx !== i) }))}
                      className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <Input
                      value={t.label}
                      onChange={e => setForm(f => ({ ...f, benchmark_tests: (f.benchmark_tests || []).map((bt, idx) => idx === i ? { ...bt, label: e.target.value } : bt) }))}
                      placeholder="Test label (e.g. Handles rude input)"
                      className="h-8 text-sm pr-6"
                    />
                    <Textarea
                      value={t.input}
                      onChange={e => setForm(f => ({ ...f, benchmark_tests: (f.benchmark_tests || []).map((bt, idx) => idx === i ? { ...bt, input: e.target.value } : bt) }))}
                      placeholder="Message to send the bot"
                      rows={1}
                      className="text-sm resize-none"
                    />
                    <Input
                      value={t.expected_contains}
                      onChange={e => setForm(f => ({ ...f, benchmark_tests: (f.benchmark_tests || []).map((bt, idx) => idx === i ? { ...bt, expected_contains: e.target.value } : bt) }))}
                      placeholder="What a passing response should do"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
                {(form.benchmark_tests || []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No benchmark tests yet — Auto-Grade will award full benchmark credit.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? 'Update Challenge' : 'Create Challenge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
