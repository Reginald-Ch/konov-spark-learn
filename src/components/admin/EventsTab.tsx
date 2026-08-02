import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Calendar, Users, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
}

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
});

export const EventsTab = ({ onHackathonsChanged }: { onHackathonsChanged: () => void }) => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Hackathon>>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hackathon | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, description, theme, status, start_date, end_date, registration_deadline, max_participants, current_participants, prizes, rules')
      .order('start_date', { ascending: false });
    if (error) toast.error('Failed to load events');
    setHackathons((data as Hackathon[]) || []);
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
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        theme: form.theme || null,
        start_date: new Date(form.start_date!).toISOString(),
        end_date: new Date(form.end_date!).toISOString(),
        registration_deadline: new Date(form.registration_deadline!).toISOString(),
        max_participants: form.max_participants || 100,
        prizes: form.prizes || null,
        rules: form.rules || null,
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
    try {
      await callAdminAction('delete_hackathon', { id: deleteTarget.id });
      toast.success('Event deleted');
      setDeleteTarget(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete event');
    }
  };

  const handleSetStatus = async (id: string, status: 'upcoming' | 'live' | 'ended') => {
    try {
      await callAdminAction('set_hackathon_status', { id, status });
      toast.success(status === 'live' ? 'Hackathon is now LIVE!' : 'Hackathon ended');
      refreshAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleResetLeaderboard = async () => {
    setResetting(true);
    try {
      await callAdminAction('reset_leaderboard');
      toast.success('Leaderboard reset! All SP, Forge Coins, and scores cleared.');
      setResetConfirmOpen(false);
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
                <Button size="sm" onClick={() => handleSetStatus(h.id, 'live')} className="flex-1"><Play className="w-3 h-3 mr-1" /> Go Live</Button>
              )}
              {h.status === 'live' && (
                <Button size="sm" variant="destructive" onClick={() => handleSetStatus(h.id, 'ended')} className="flex-1">End Hackathon</Button>
              )}
              {h.status === 'ended' && (
                <Button size="sm" onClick={() => handleSetStatus(h.id, 'live')} className="flex-1"><Play className="w-3 h-3 mr-1" /> Restart</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => openEdit(h)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteTarget(h)}><Trash2 className="w-3 h-3" /></Button>
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

      <div className="bg-destructive/5 rounded-lg border border-destructive/20 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Reset for New Event</h3>
            <p className="text-xs text-muted-foreground mt-1">Clear all SP, Forge Coin, and judge scores to start fresh.</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setResetConfirmOpen(true)}><Trash2 className="w-3 h-3 mr-1" /> Reset Leaderboard</Button>
        </div>
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
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI Innovation Hackathon" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Build innovative AI solutions..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Theme</label>
                <Input value={form.theme || ''} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="Education, Health..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Participants</label>
                <Input type="number" value={form.max_participants || 100} onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 100 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="datetime-local" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input type="datetime-local" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Registration Deadline</label>
              <Input type="datetime-local" value={form.registration_deadline || ''} onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Prizes</label>
              <Textarea value={form.prizes || ''} onChange={e => setForm(f => ({ ...f, prizes: e.target.value }))} placeholder="1st: Certificate + Feature, 2nd: Certificate..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rules</label>
              <Textarea value={form.rules || ''} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} placeholder="1. Teams of 1-5 members..." rows={2} />
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
            <DialogDescription>Are you sure you want to delete "{deleteTarget?.title}"? This will remove all associated data.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Reset Leaderboard</DialogTitle>
            <DialogDescription>This will permanently delete ALL SP, Forge Coin, and score events across every hackathon. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => setResetConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleResetLeaderboard} disabled={resetting} className="flex-1">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Reset All Scores
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
