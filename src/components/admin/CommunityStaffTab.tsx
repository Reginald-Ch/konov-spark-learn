import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Loader2, Trash2, Copy, Check, Link as LinkIcon, CircleCheck, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  participant_email: string;
  display_name: string;
  role_label: string;
  badge_emoji: string;
  added_at: string;
  token_redeemed_at: string | null;
}

export const CommunityStaffTab = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingEmail, setRegeneratingEmail] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Team');
  const [badgeEmoji, setBadgeEmoji] = useState('👑');

  // Shown once right after minting — the token is only ever stored hashed,
  // so this is the only chance to copy the link before it's gone for good.
  const [pendingInvite, setPendingInvite] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await callAdminAction<StaffMember[]>('list_community_staff');
      setStaff(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load community staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const buildInviteUrl = (token: string) => `${window.location.origin}/hackathons?staff_invite=${token}`;

  const handleAdd = async () => {
    if (!email.trim() || !displayName.trim()) {
      toast.error('Email and display name are required');
      return;
    }
    setSaving(true);
    try {
      const result = await callAdminAction<{ invite_token: string }>('add_community_staff', {
        participant_email: email.trim(),
        display_name: displayName.trim(),
        role_label: roleLabel.trim() || 'Team',
        badge_emoji: badgeEmoji.trim() || '👑',
      });
      if (result?.invite_token) {
        setPendingInvite({ name: displayName.trim(), url: buildInviteUrl(result.invite_token) });
        setCopied(false);
      }
      toast.success(`${displayName} is authorized — copy their invite link below`);
      setEmail(''); setDisplayName(''); setRoleLabel('Team'); setBadgeEmoji('👑');
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (member: StaffMember) => {
    setRegeneratingEmail(member.participant_email);
    try {
      const result = await callAdminAction<{ invite_token: string }>('add_community_staff', {
        participant_email: member.participant_email,
        display_name: member.display_name,
        role_label: member.role_label,
        badge_emoji: member.badge_emoji,
      });
      if (result?.invite_token) {
        setPendingInvite({ name: member.display_name, url: buildInviteUrl(result.invite_token) });
        setCopied(false);
      }
      toast.success(`New link generated for ${member.display_name} — any old link they had stops working now`);
      fetchStaff(); // rotation also resets verified status to "not opened yet" server-side
    } catch (e: any) {
      toast.error(e.message || 'Failed to regenerate invite link');
    } finally {
      setRegeneratingEmail(null);
    }
  };

  const handleCopy = async () => {
    if (!pendingInvite) return;
    await navigator.clipboard.writeText(pendingInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (member: StaffMember) => {
    try {
      await callAdminAction('remove_community_staff', { participant_email: member.participant_email });
      toast.success(`Removed ${member.display_name} from community staff`);
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove staff member');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Community Staff</h2>
        <p className="text-sm text-muted-foreground">
          Anyone on this list gets a gold role badge next to their name whenever they chat in the community —
          not just in #announcements. Adding someone here mints a one-time invite link; whoever opens it on their
          browser is verified as that person from then on, so a participant can't just type someone's email and
          steal their badge.
        </p>
      </div>

      {pendingInvite && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><LinkIcon className="w-4 h-4 text-amber-500" /> Invite link for {pendingInvite.name}</p>
          <p className="text-xs text-muted-foreground">Send this to them directly (Slack DM, text, etc). It only shows once — copy it now.</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={pendingInvite.url} className="text-xs font-mono" onFocus={(e) => e.target.select()} />
            <Button size="sm" variant="outline" onClick={handleCopy} className="flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <button onClick={() => setPendingInvite(null)} className="text-xs text-muted-foreground hover:text-foreground underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-card rounded-lg border p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="staff-email" className="text-sm font-medium mb-1 block">Email (used to join community chat)</label>
            <Input id="staff-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@forge.com" />
          </div>
          <div>
            <label htmlFor="staff-display-name" className="text-sm font-medium mb-1 block">Display Name</label>
            <Input id="staff-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Sarah" />
          </div>
          <div>
            <label htmlFor="staff-role-label" className="text-sm font-medium mb-1 block">Role Label</label>
            <Input id="staff-role-label" value={roleLabel} onChange={e => setRoleLabel(e.target.value)} placeholder="Community Manager" />
          </div>
          <div>
            <label htmlFor="staff-badge-emoji" className="text-sm font-medium mb-1 block">Badge Emoji</label>
            <Input id="staff-badge-emoji" value={badgeEmoji} onChange={e => setBadgeEmoji(e.target.value)} placeholder="👑" />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Add Staff Badge
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {staff.map((m) => (
            <div key={m.participant_email} className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <span>{m.badge_emoji}</span> {m.display_name}
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">{m.role_label}</span>
                </p>
                <p className="text-xs text-muted-foreground">{m.participant_email}</p>
                {m.token_redeemed_at ? (
                  <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                    <CircleCheck className="w-3 h-3" /> Verified {new Date(m.token_redeemed_at).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CircleDashed className="w-3 h-3" /> Invite link not opened yet
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleRegenerate(m)} disabled={regeneratingEmail === m.participant_email}>
                  {regeneratingEmail === m.participant_email ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5 mr-1" />}
                  New link
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRemove(m)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No community staff added yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
