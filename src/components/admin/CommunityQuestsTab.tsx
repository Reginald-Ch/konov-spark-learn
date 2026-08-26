import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Loader2, Pencil, X, Check, EyeOff, Eye, AlertTriangle, ImageIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: 'chat_action' | 'self_report' | 'proof_upload';
  action_channel_name: string | null;
  action_url: string | null;
  badge_emoji: string;
  badge_label: string;
  order_index: number;
  is_active: boolean;
  updated_at: string;
}

interface PendingProof {
  id: string;
  quest_id: string;
  participant_email: string;
  participant_name: string;
  completed_at: string;
  // admin-actions defaults this to null when no matching
  // community_quest_proof_reviews row is found for a completion id — the
  // type previously claimed this could never happen.
  proof_image: string | null;
  community_quests: { title: string; badge_emoji: string; badge_label: string } | null;
}

const emptyForm = {
  title: '',
  description: '',
  quest_type: 'chat_action' as 'chat_action' | 'self_report' | 'proof_upload',
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
  // Captured when an edit is opened, sent back as expected_updated_at on
  // save — the server rejects the save if the row changed since (see
  // update_community_quest's optimistic-concurrency check), instead of
  // silently overwriting whatever another organizer changed in the
  // meantime with this tab's stale snapshot.
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null);
  const [confirmingApproveId, setConfirmingApproveId] = useState<string | null>(null);
  // Only text channels — chat_action quests are verified against real
  // participant posts, and only text channels can ever receive one
  // (announcement channels reject non-organizer posts entirely; voice
  // channels have no composer at all). Pointing a quest at either used to
  // be possible via free-typing the name, silently creating a quest
  // nobody could ever complete. A dropdown built from this list makes that
  // whole class of mistake structurally impossible instead of just easy to
  // avoid.
  const [textChannels, setTextChannels] = useState<{ id: string; name: string }[]>([]);

  // proof_upload submissions awaiting organizer review — separate loading
  // lifecycle from the quest list above since they're fetched from a
  // different action and can fail/refresh independently.
  const [pendingProofs, setPendingProofs] = useState<PendingProof[]>([]);
  const [isLoadingProofs, setIsLoadingProofs] = useState(true);
  const [proofsLoadError, setProofsLoadError] = useState(false);
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  const fetchPendingProofs = useCallback(async () => {
    setIsLoadingProofs(true);
    setProofsLoadError(false);
    try {
      const data = await callAdminAction<PendingProof[]>('list_pending_quest_proofs');
      setPendingProofs(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load pending proof submissions');
      setProofsLoadError(true);
    } finally {
      setIsLoadingProofs(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchPendingProofs();
    // community_channels has public SELECT (anon/authenticated) already —
    // no admin action needed just to read channel names for this dropdown.
    supabase.from('community_channels').select('id, name').eq('channel_type', 'text').order('name')
      .then(({ data }) => setTextChannels(data || []));
  }, [fetchQuests, fetchPendingProofs]);

  // Fetch-once-on-mount meant a new submission arriving (or another
  // organizer reviewing one) while this tab was open never showed up
  // without navigating away and back — every other admin-visible list
  // added this session (channels, staff, quests themselves) already gets
  // this same realtime-refetch treatment.
  useEffect(() => {
    const proofsChannel = supabase
      .channel('quest-proofs-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_quest_completions' }, () => {
        fetchPendingProofs();
      })
      .subscribe();
    return () => { supabase.removeChannel(proofsChannel); };
  }, [fetchPendingProofs]);

  // Same fetch-once-on-mount gap as the proofs list above had — this one
  // matters more, since it's the list a second organizer's edit would
  // otherwise stay invisible in until this tab is manually reopened. This
  // refetch only touches the `quests` list state, never the in-progress
  // `form`, so it can't clobber whatever an organizer is actively typing —
  // the actual lost-update risk on SAVE is closed separately, by the
  // expected_updated_at check below.
  useEffect(() => {
    const questsChannel = supabase
      .channel('quests-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_quests' }, () => {
        fetchQuests();
      })
      .subscribe();
    return () => { supabase.removeChannel(questsChannel); };
  }, [fetchQuests]);

  const handleApproveProof = async (proof: PendingProof) => {
    setConfirmingApproveId(null);
    setReviewingIds(prev => new Set(prev).add(proof.id));
    try {
      await callAdminAction('approve_quest_proof', { completion_id: proof.id });
      toast.success(`Approved ${proof.participant_name}'s submission`);
      setPendingProofs(prev => prev.filter(p => p.id !== proof.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
      // A failure here (most commonly: someone else already reviewed this
      // one) previously left the stale item sitting in the list with live
      // Approve/Reject buttons that would just fail identically again — a
      // full refetch clears it out (or leaves it, correctly, if it's some
      // other transient error).
      fetchPendingProofs();
    } finally {
      setReviewingIds(prev => { const next = new Set(prev); next.delete(proof.id); return next; });
    }
  };

  const handleRejectProof = async (proof: PendingProof) => {
    setReviewingIds(prev => new Set(prev).add(proof.id));
    try {
      await callAdminAction('reject_quest_proof', { completion_id: proof.id, rejection_reason: rejectReason.trim() || undefined });
      toast.success(`Rejected ${proof.participant_name}'s submission`);
      setPendingProofs(prev => prev.filter(p => p.id !== proof.id));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
      fetchPendingProofs();
    } finally {
      setReviewingIds(prev => { const next = new Set(prev); next.delete(proof.id); return next; });
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setEditingUpdatedAt(null); };

  const startEdit = (q: Quest) => {
    setEditingId(q.id);
    setEditingUpdatedAt(q.updated_at);
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
    // one of them stale from before the switch. proof_upload needs
    // neither — verification is the uploaded screenshot itself, not a
    // channel post or a link.
    const payload = {
      ...form,
      action_channel_name: form.quest_type === 'chat_action' ? form.action_channel_name.trim() : null,
      action_url: form.quest_type === 'self_report' ? (form.action_url.trim() || null) : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await callAdminAction('update_community_quest', { id: editingId, expected_updated_at: editingUpdatedAt, ...payload });
        toast.success('Quest updated');
      } else {
        await callAdminAction('create_community_quest', payload);
        toast.success('Quest created');
      }
      resetForm();
      fetchQuests();
    } catch (e: any) {
      // CONFLICT means another organizer changed this quest since it was
      // loaded into this form (see update_community_quest's optimistic-
      // concurrency check) — the save was correctly refused rather than
      // silently overwriting their change. Refetch so the list (and a
      // re-opened edit) reflects the current row, instead of leaving this
      // tab stuck showing the now-stale version it tried to save.
      if (typeof e.message === 'string' && e.message.startsWith('CONFLICT')) {
        toast.error("This quest was changed by someone else — your edit wasn't saved. Reopen it to see the latest version.");
        fetchQuests();
      } else {
        toast.error(e.message || 'Failed to save quest');
      }
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
          "proof_upload" quests (e.g. "Follow us on Instagram") need a screenshot, which you approve or reject below
          before the badge is granted.
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
              onChange={e => setForm(f => ({ ...f, quest_type: e.target.value as 'chat_action' | 'self_report' | 'proof_upload' }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="chat_action">chat_action — verified automatically</option>
              <option value="self_report">self_report — honor system</option>
              <option value="proof_upload">proof_upload — screenshot + your review</option>
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
          ) : form.quest_type === 'self_report' ? (
            <div className="sm:col-span-2">
              <label htmlFor="quest-url" className="text-sm font-medium mb-1 block">Link (optional)</label>
              <Input id="quest-url" value={form.action_url} onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))} placeholder="https://..." />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                No target needed — the participant attaches a screenshot when they claim this quest, and it lands here
                for you to approve or reject below. Use the description above to say exactly what the screenshot
                should show.
              </p>
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

      {/* proof_upload submissions land here as 'pending' the moment a
          participant claims — nothing about them is visible/approved
          anywhere else until an organizer acts on them here. */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-500" /> Pending Proof Reviews
          {pendingProofs.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">{pendingProofs.length}</span>
          )}
        </h3>
        {isLoadingProofs ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : proofsLoadError ? (
          <p className="text-sm text-destructive text-center py-6 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Couldn't load pending submissions — try refreshing this tab.
          </p>
        ) : pendingProofs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nothing waiting on review right now.</p>
        ) : (
          <div className="space-y-2">
            {pendingProofs.map((proof) => (
              <div key={proof.id} className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row gap-3">
                {proof.proof_image ? (
                  <img
                    src={proof.proof_image}
                    alt={`Proof submitted by ${proof.participant_name}`}
                    className="w-full sm:w-40 h-40 object-cover rounded-md border flex-shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-full sm:w-40 h-40 flex items-center justify-center rounded-md border flex-shrink-0 bg-muted text-xs text-muted-foreground text-center p-2">
                    No image found for this submission
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <span>{proof.community_quests?.badge_emoji}</span> {proof.community_quests?.title || 'Deleted quest'}
                    </p>
                    <p className="text-xs text-muted-foreground">{proof.participant_name} ({proof.participant_email})</p>
                    <p className="text-[11px] text-muted-foreground">Submitted {new Date(proof.completed_at).toLocaleString()}</p>
                  </div>
                  {rejectingId === proof.id ? (
                    <div className="space-y-2">
                      <Input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Why? (shown to the participant, optional)"
                        maxLength={300}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleRejectProof(proof)} disabled={reviewingIds.has(proof.id)}>
                          {reviewingIds.has(proof.id) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                          Confirm reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }} disabled={reviewingIds.has(proof.id)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : confirmingApproveId === proof.id ? (
                    // Approve was a single click with no recovery path —
                    // it permanently grants a badge that renders next to
                    // every message that participant ever sends, and there
                    // is no "unapprove" action anywhere in the app. Reject
                    // already required a separate confirm step; Approve now
                    // matches it instead of being one accidental misclick
                    // away from a permanent grant.
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleApproveProof(proof)} disabled={reviewingIds.has(proof.id)}>
                        {reviewingIds.has(proof.id) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                        Confirm approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmingApproveId(null)} disabled={reviewingIds.has(proof.id)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => setConfirmingApproveId(proof.id)} disabled={reviewingIds.has(proof.id)}>
                        <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(proof.id)} disabled={reviewingIds.has(proof.id)}>
                        <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
                  {q.quest_type === 'chat_action' ? `Verified: post in #${q.action_channel_name}`
                    : q.quest_type === 'proof_upload' ? 'Screenshot + your review'
                    : 'Self-report'}
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
