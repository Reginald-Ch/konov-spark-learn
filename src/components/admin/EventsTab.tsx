import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Calendar, Users, Play, AlertTriangle, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface HackathonSettings {
  mission_bonus_top_n: number;
  voting_enabled: boolean;
  blank_start_mode: boolean;
}

interface Hackathon {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  status: 'upcoming' | 'live' | 'ended';
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  prizes: string | null;
  rules: string | null;
  settings: HackathonSettings;
}

const defaultSettings = (): HackathonSettings => ({
  mission_bonus_top_n: 5,
  voting_enabled: false,
  blank_start_mode: false,
});

const emptyForm = (): Partial<Hackathon> => ({
  title: '',
  description: '',
  theme: '',
  start_date: new Date().toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  registration_deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16),
  max_participants: 100,
  prizes: '',
  rules: '',
  settings: defaultSettings(),
});

export const EventsTab = ({ onHackathonsChanged }: { onHackathonsChanged: () => void }) => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Hackathon>>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hackathon | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<Hackathon | null>(null);
  const [resetting, setResetting] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ hackathon: Hackathon; status: 'upcoming' | 'live' | 'ended' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, description, theme, status, start_date, end_date, registration_deadline, max_participants, current_participants, prizes, rules, settings')
      .order('start_date', { ascending: false });
    if (error) toast.error('Failed to load events');
    setHackathons((data as unknown as Hackathon[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshAll = () => { fetchData(); onHackathonsChanged(); };

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (h: Hackathon) => {
    setEditingId(h.id);
    setForm({
      title: h.title,
      description: h.description || '',
      theme: h.theme || '',
      start_date: h.start_date.slice(0, 16),
      end_date: h.end_date.slice(0, 16),
      registration_deadline: h.registration_deadline.slice(0, 16),
      max_participants: h.max_participants,
      prizes: h.prizes || '',
      rules: h.rules || '',
      settings: { ...defaultSettings(), ...(h.settings || {}) },
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    const startDate = new Date(form.start_date!);
    const endDate = new Date(form.end_date!);
    const regDeadline = new Date(form.registration_deadline!);
    // A cleared datetime-local field (backspaced to '') parses to an
    // Invalid Date — every comparison against it is false, so the ordering
    // checks below would silently pass and the raw RangeError from
    // .toISOString() further down would surface as an ugly "Invalid time
    // value" toast instead of a real validation message.
    if ([startDate, endDate, regDeadline].some(d => Number.isNaN(d.getTime()))) {
      toast.error('Start Date, End Date, and Registration Deadline are all required');
      return;
    }
    if (endDate <= startDate) { toast.error('End date must be after the start date'); return; }
    if (regDeadline > startDate) { toast.error('Registration deadline must be on or before the start date'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        theme: form.theme || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        registration_deadline: new Date(form.registration_deadline!).toISOString(),
        // `|| 100` silently replaced an organizer's explicit "0" with the
        // default, since parseInt('0') is falsy — no warning, the typed
        // value just vanished. `?? 100` only falls back on a genuinely
        // missing value (form.max_participants set to undefined below on a
        // bad parseInt), not on a real, intentional 0.
        max_participants: form.max_participants ?? 100,
        prizes: form.prizes || null,
        rules: form.rules || null,
        settings: form.settings || defaultSettings(),
      };
      if (editingId) {
        await callAdminAction('update_hackathon', { id: editingId, ...payload });
        toast.success('Event updated');
      } else {
        await callAdminAction('create_hackathon', payload);
        toast.success('Event created');
      }
      setModalOpen(false);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await callAdminAction('delete_hackathon', { id: deleteTarget.id });
      toast.success('Event deleted');
      setDeleteTarget(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetStatus = async (id: string, status: 'upcoming' | 'live' | 'ended') => {
    setChangingStatus(true);
    try {
      await callAdminAction('set_hackathon_status', { id, status });
      toast.success(status === 'live' ? 'Hackathon is now LIVE!' : 'Hackathon ended');
      setStatusChangeTarget(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  // "Go Live"/"Restart" are reversible and low-stakes to misclick — this
  // only gates "End Hackathon", the one status change that actually stops
  // a potentially-live event for every active participant. Matches the
  // confirmation this file already requires for Delete and Reset
  // Leaderboard, both less consequential than cutting off a live event.
  const requestSetStatus = (h: Hackathon, status: 'upcoming' | 'live' | 'ended') => {
    if (status === 'ended') { setStatusChangeTarget({ hackathon: h, status }); return; }
    handleSetStatus(h.id, status);
  };

  const handleResetLeaderboard = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await callAdminAction('reset_leaderboard', { hackathon_id: resetTarget.id });
      toast.success(`Leaderboard reset for "${resetTarget.title}". Other events are untouched.`);
      setResetTarget(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset leaderboard');
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Hackathon Events</h2>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Create Event</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {hackathons.map(h => (
          <div key={h.id} className="bg-card rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm truncate flex-1 mr-2">{h.title}</h3>
              <Badge variant={h.status === 'live' ? 'default' : 'secondary'}>{h.status.toUpperCase()}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1"><Users className="w-3 h-3 inline mr-1" /> {h.current_participants} participants</p>
            <p className="text-xs text-muted-foreground mb-3"><Calendar className="w-3 h-3 inline mr-1" /> {new Date(h.start_date).toLocaleDateString()} — {new Date(h.end_date).toLocaleDateString()}</p>
            <div className="flex gap-2 flex-wrap">
              {h.status === 'upcoming' && (
                <Button size="sm" disabled={changingStatus} onClick={() => requestSetStatus(h, 'live')} className="flex-1"><Play className="w-3 h-3 mr-1" /> Go Live</Button>
              )}
              {h.status === 'live' && (
                <Button size="sm" variant="destructive" disabled={changingStatus} onClick={() => requestSetStatus(h, 'ended')} className="flex-1">End Hackathon</Button>
              )}
              {h.status === 'ended' && (
                <Button size="sm" disabled={changingStatus} onClick={() => requestSetStatus(h, 'live')} className="flex-1"><Play className="w-3 h-3 mr-1" /> Restart</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => openEdit(h)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setResetTarget(h)} title="Reset this event's SP, coins, keys, badges & tokens">
                <AlertTriangle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteTarget(h)} aria-label={`Delete ${h.title}`} title="Delete event">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {hackathons.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-3">No hackathon events yet</p>
            <Button size="sm" onClick={openCreate}><Plus className="w-3 h-3 mr-1" /> Create Your First Event</Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>{editingId ? 'Update hackathon event details.' : 'Set up a new hackathon event for participants.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label htmlFor="event-title" className="text-sm font-medium mb-1 block">Title *</label>
              <Input id="event-title" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI Innovation Hackathon" />
            </div>
            <div>
              <label htmlFor="event-description" className="text-sm font-medium mb-1 block">Description</label>
              <Textarea id="event-description" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Build innovative AI solutions..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-theme" className="text-sm font-medium mb-1 block">Theme</label>
                <Input id="event-theme" value={form.theme || ''} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="Education, Health..." />
              </div>
              <div>
                <label htmlFor="event-max-participants" className="text-sm font-medium mb-1 block">Max Participants</label>
                <Input id="event-max-participants" type="number" value={form.max_participants ?? 100} onChange={e => { const n = parseInt(e.target.value, 10); setForm(f => ({ ...f, max_participants: Number.isNaN(n) ? undefined : n })); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-start-date" className="text-sm font-medium mb-1 block">Start Date</label>
                <Input id="event-start-date" type="datetime-local" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="event-end-date" className="text-sm font-medium mb-1 block">End Date</label>
                <Input id="event-end-date" type="datetime-local" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label htmlFor="event-registration-deadline" className="text-sm font-medium mb-1 block">Registration Deadline</label>
              <Input id="event-registration-deadline" type="datetime-local" value={form.registration_deadline || ''} onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="event-prizes" className="text-sm font-medium mb-1 block">Prizes</label>
              <Textarea id="event-prizes" value={form.prizes || ''} onChange={e => setForm(f => ({ ...f, prizes: e.target.value }))} placeholder="1st: Certificate + Feature, 2nd: Certificate..." rows={2} />
            </div>
            <div>
              <label htmlFor="event-rules" className="text-sm font-medium mb-1 block">Rules</label>
              <Textarea id="event-rules" value={form.rules || ''} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} placeholder="1. Teams of 1-5 members..." rows={2} />
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Gamification Settings</h4>
              <div>
                <label htmlFor="event-mission-bonus" className="text-sm font-medium mb-1 block">Mission Bonus — top N per day</label>
                <Input
                  id="event-mission-bonus"
                  type="number"
                  min={1}
                  value={form.settings?.mission_bonus_top_n ?? 5}
                  onChange={e => { const n = parseInt(e.target.value, 10); setForm(f => ({ ...f, settings: { ...(f.settings || defaultSettings()), mission_bonus_top_n: Math.max(1, Number.isNaN(n) ? 5 : n) } })); }}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground mt-1">How many top finishers each daily challenge get a Mission Bonus box. Everyone who completes still gets an Issue Box.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Voting</p>
                  <p className="text-xs text-muted-foreground">Reserved — participant voting isn't built yet, but this toggle is ready for when it is.</p>
                </div>
                <Switch checked={!!form.settings?.voting_enabled} onCheckedChange={v => setForm(f => ({ ...f, settings: { ...(f.settings || defaultSettings()), voting_enabled: v } }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Blank Start (Build Studio)</p>
                  <p className="text-xs text-muted-foreground">On: new script projects start with an empty main.py — participants write the whole 34-challenge script themselves. Off (default): starts pre-filled with working values to edit.</p>
                </div>
                <Switch checked={!!form.settings?.blank_start_mode} onCheckedChange={v => setForm(f => ({ ...f, settings: { ...(f.settings || defaultSettings()), blank_start_mode: v } }))} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Delete Event</DialogTitle>
            <DialogDescription>
              {deleteTarget?.status === 'live' && (
                <span className="block font-semibold text-destructive mb-1">⚠️ This event is currently LIVE — participants may be actively using it right now.</span>
              )}
              Are you sure you want to delete "{deleteTarget?.title}"? This permanently removes every registration, challenge, submission, and community channel tied to it — this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusChangeTarget} onOpenChange={() => setStatusChangeTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> End Hackathon</DialogTitle>
            <DialogDescription>
              End "{statusChangeTarget?.hackathon.title}" now? This stops the event for every currently active participant — they'll no longer be able to submit or register. You can restart it later, but anyone mid-session will be interrupted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setStatusChangeTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" disabled={changingStatus} onClick={() => statusChangeTarget && handleSetStatus(statusChangeTarget.hackathon.id, statusChangeTarget.status)} className="flex-1">
              {changingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              End Hackathon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Reset Leaderboard</DialogTitle>
            <DialogDescription>
              This permanently deletes ALL SP, Forge Coins, badges, and judge scores for <strong>"{resetTarget?.title}"</strong> only — every other hackathon on the platform is untouched. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setResetTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleResetLeaderboard} disabled={resetting} className="flex-1">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Reset This Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
