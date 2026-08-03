import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  participant_email: string;
  display_name: string;
  role_label: string;
  badge_emoji: string;
  added_at: string;
}

export const CommunityStaffTab = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Team');
  const [badgeEmoji, setBadgeEmoji] = useState('👑');
  const [pin, setPin] = useState('');

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

  const handleAdd = async () => {
    if (!email.trim() || !displayName.trim()) {
      toast.error('Email and display name are required');
      return;
    }
    if (!pin.trim() || pin.trim().length < 4) {
      toast.error('Set a PIN of at least 4 characters — the staff member enters this in chat to prove it is really them');
      return;
    }
    setSaving(true);
    try {
      await callAdminAction('add_community_staff', {
        participant_email: email.trim(),
        display_name: displayName.trim(),
        role_label: roleLabel.trim() || 'Team',
        badge_emoji: badgeEmoji.trim() || '👑',
        pin: pin.trim(),
      });
      toast.success(`${displayName} can now verify with their PIN in chat to show the staff badge`);
      setEmail(''); setDisplayName(''); setRoleLabel('Team'); setBadgeEmoji('👑'); setPin('');
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add staff member');
    } finally {
      setSaving(false);
    }
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
          not just in #announcements. The PIN is what actually protects the badge: they type it once in chat to
          prove they really are that person, so a participant can't just type someone's email and steal their badge.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Email (used to join community chat)</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@forge.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Display Name</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Sarah" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Role Label</label>
            <Input value={roleLabel} onChange={e => setRoleLabel(e.target.value)} placeholder="Community Manager" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Badge Emoji</label>
            <Input value={badgeEmoji} onChange={e => setBadgeEmoji(e.target.value)} placeholder="👑" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Staff PIN (min 4 characters)</label>
            <Input value={pin} onChange={e => setPin(e.target.value)} placeholder="Share this privately with them" type="text" />
            <p className="text-xs text-muted-foreground mt-1">Re-adding an existing email rotates their PIN.</p>
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
              </div>
              <Button size="sm" variant="outline" onClick={() => handleRemove(m)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
              </Button>
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
