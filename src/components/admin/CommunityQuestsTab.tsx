import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Loader2, Pencil, X, Check, EyeOff, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: 'chat_action' | 'self_report';
  action_channel_name: string | null;
  action_url: string | null;
  badge_emoji: string;
  badge_label: string;
  order_index: number;
  is_active: boolean;
}

const emptyForm = {
  title: '',
  description: '',
  quest_type: 'chat_action' as 'chat_action' | 'self_report',
  action_channel_name: '',
  action_url: '',
  badge_emoji: '🏅',
  badge_label: '',
  order_index: 0,
};

export const CommunityQuestsTab = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Set, not a single id — a single scalar meant clicking Deactivate on
  // quest B while quest A's own toggle was still in flight overwrote the
  // "busy" state and re-enabled A's button before its request resolved,
  // letting a fast cross-row double-click re-trigger it.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);
  // Only text channels — chat_action quests are verified against real
  // participant posts, and only text channels can ever receive one
  // (announcement channels reject non-organizer posts entirely; voice
  // channels have no composer at all). Pointing a quest at either used to
  // be possible via free-typing the name, silently creating a quest
  // nobody could ever complete. A dropdown built from this list makes that
  // whole class of mistake structurally impossible instead of just easy to
  // avoid.
  const [textChannels, setTextChannels] = useState<{ id: string; name: string }[]>([]);

  const fetchQuests = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await callAdminAction<Quest[]>('list_community_quests');
      setQuests(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load quests');
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    // community_channels has public SELECT (anon/authenticated) already —
    // no admin action needed just to read channel names for this dropdown.
    supabase.from('community_channels').select('id, name').eq('channel_type', 'text').order('name')
      .then(({ data }) => setTextChannels(data || []));
  }, [fetchQuests]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const startEdit = (q: Quest) => {
    setEditingId(q.id);
    setForm({
      title: q.title,
      description: q.description,
      quest_type: q.quest_type,
      action_channel_name: q.action_channel_name || '',
      action_url: q.action_url || '',
      badge_emoji: q.badge_emoji,
      badge_label: q.badge_label,
      order_index: q.order_index,
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!form.badge_emoji.trim() || !form.badge_label.trim()) {
      toast.error('Badge emoji and label are required');
      return;
    }
    if (form.quest_type === 'chat_action' && !form.action_channel_name.trim()) {
      toast.error('chat_action quests need a target channel — pick one from the list');
      return;
    }
    // Always send the irrelevant field explicitly nulled, not just
    // whichever the form happened to leave behind — switching Quest Type
    // in this form only changes which input is SHOWN, it never clears the
    // hidden one's own state, so without this a chat_action quest edited
    // into self_report (or vice versa) could save with both fields set,
    // one of them stale from before the switch.
    const payload = {
      ...form,
      action_channel_name: form.quest_type === 'chat_action' ? form.action_channel_name.trim() : null,
      action_url: form.quest_type === 'self_report' ? (form.action_url.trim() || null) : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await callAdminAction('update_community_quest', { id: editingId, ...payload });
        toast.success('Quest updated');
      } else {
        await callAdminAction('create_community_quest', payload);
        toast.success('Quest created');
      }
      resetForm();
      fetchQuests();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save quest');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (q: Quest) => {
    setBusyIds(prev => new Set(prev).add(q.id));
    try {
      await callAdminAction('update_community_quest', { id: q.id, is_active: !q.is_active });
      toast.success(q.is_active ? `${q.title} deactivated` : `${q.title} reactivated`);
      fetchQuests();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update quest');
    } finally {
      setBusyIds(prev => { const next = new Set(prev); next.delete(q.id); return next; });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Community Quests</h2>
        <p className="text-sm text-muted-foreground">
          Quests earn participants a badge that shows next to their name in Community Chat. "chat_action" quests are
          verified live against real posts in the named channel — no one can fake a claim. "self_report" quests are
          honor-system (an optional link plus "I did this!") for anything that can't be checked automatically.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4 space-y-3">
        <p className="text-sm font-semibold">{editingId ? 'Edit quest' : 'New quest'}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="quest-title" className="text-sm font-medium mb-1 block">Title</label>
            <Input id="quest-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Say Hello" maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="quest-description" className="text-sm font-medium mb-1 block">Description</label>
            <Textarea id="quest-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Post an introduction in #introductions" className="min-h-[60px]" maxLength={500} />
          </div>
          <div>
            <label htmlFor="quest-type" className="text-sm font-medium mb-1 block">Quest Type</label>
            <select
              id="quest-type"
              value={form.quest_type}
              onChange={e => setForm(f => ({ ...f, quest_type: e.target.value as 'chat_action' | 'self_report' }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="chat_action">chat_action — verified automatically</option>
              <option value="self_report">self_report — honor system</option>
            </select>
          </div>
          <div>
            <label htmlFor="quest-order" className="text-sm font-medium mb-1 block">Order</label>
            <Input id="quest-order" type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value, 10) || 0 }))} />
          </div>
          {form.quest_type === 'chat_action' ? (
            <div className="sm:col-span-2">
              <label htmlFor="quest-channel" className="text-sm font-medium mb-1 block">Target channel</label>
              {/* A free-text field here used to let a typo or case mismatch
                  ("Introductions" vs the real "introductions") create a
                  quest that verified against a channel name that could
                  never actually match — permanently unclaimable, with no
                  signal to the organizer that anything was wrong. Picking
                  from the real channel list makes that whole mistake class
                  impossible. Only text channels are offered — announcement
                  channels reject non-organizer posts and voice channels
                  have no composer, so either would be just as
                  unclaimable-by-construction even spelled correctly. */}
              <select
                id="quest-channel"
                value={form.action_channel_name}
                onChange={e => setForm(f => ({ ...f, action_channel_name: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                disabled={textChannels.length === 0}
              >
                <option value="">Select a channel…</option>
                {textChannels.map(c => (
                  <option key={c.id} value={c.name}>#{c.name}</option>
                ))}
              </select>
              {textChannels.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  No text channels exist yet — create one in the Text Channels tab first.
                </p>
              )}
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label htmlFor="quest-url" className="text-sm font-medium mb-1 block">Link (optional)</label>
              <Input id="quest-url" value={form.action_url} onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))} placeholder="https://..." />
            </div>
          )}
          <div>
            <label htmlFor="quest-badge-emoji" className="text-sm font-medium mb-1 block">Badge Emoji</label>
            <Input id="quest-badge-emoji" value={form.badge_emoji} onChange={e => setForm(f => ({ ...f, badge_emoji: e.target.value }))} placeholder="🏅" maxLength={8} />
          </div>
          <div>
            <label htmlFor="quest-badge-label" className="text-sm font-medium mb-1 block">Badge Label</label>
            <Input id="quest-badge-label" value={form.badge_label} onChange={e => setForm(f => ({ ...f, badge_label: e.target.value }))} placeholder="Greeter" maxLength={24} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : editingId ? <Check className="w-4 h-4 mr-1" /> : null}
            {editingId ? 'Save Changes' : 'Create Quest'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {quests.map((q) => (
            <div key={q.id} className={`bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap ${!q.is_active ? 'opacity-50' : ''}`}>
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <span>{q.badge_emoji}</span> {q.title}
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">{q.badge_label}</span>
                  {!q.is_active && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>}
                </p>
                <p className="text-xs text-muted-foreground">{q.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {q.quest_type === 'chat_action' ? `Verified: post in #${q.action_channel_name}` : 'Self-report'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(q)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(q)} disabled={busyIds.has(q.id)}>
                  {busyIds.has(q.id) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : q.is_active ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                  {q.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </div>
          ))}
          {/* A load failure and a genuinely empty list used to render
              identically once the error toast faded — no way to tell "zero
              quests exist" from "the list failed to load." */}
          {quests.length === 0 && loadError && (
            <p className="text-sm text-destructive text-center py-8 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Couldn't load quests — try refreshing this tab.
            </p>
          )}
          {quests.length === 0 && !loadError && (
            <p className="text-sm text-muted-foreground text-center py-8">No quests created yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
