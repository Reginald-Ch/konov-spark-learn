import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  verifyAdminPassphrase,
  hasStoredAdminPassphrase,
  getStoredAdminPassphrase,
  getStoredAdminRole,
  clearStoredAdminPassphrase,
  callAdminAction,
  type AdminRole,
} from '@/lib/adminClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, Loader2, LogOut, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { EventsTab } from '@/components/admin/EventsTab';
import { ChallengesTab } from '@/components/admin/ChallengesTab';
import { SubmissionsTab } from '@/components/admin/SubmissionsTab';
import { RewardsTab } from '@/components/admin/RewardsTab';
import { CoinsTab } from '@/components/admin/CoinsTab';
import { CommunityStaffTab } from '@/components/admin/CommunityStaffTab';

interface HackathonOption {
  id: string;
  title: string;
  status: string;
}

const AdminPanel = () => {
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [hackathons, setHackathons] = useState<HackathonOption[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');

  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<AdminRole>('organizer');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [savingPassphrase, setSavingPassphrase] = useState(false);

  const handleSavePassphrase = async () => {
    if (newPassphrase.length < 6) { toast.error('Passphrase must be at least 6 characters'); return; }
    if (newPassphrase !== confirmPassphrase) { toast.error("Passphrases don't match"); return; }
    setSavingPassphrase(true);
    try {
      await callAdminAction('set_passphrase', { target_role: targetRole, new_passphrase: newPassphrase });
      toast.success(`${targetRole === 'organizer' ? 'Organizer' : 'Judge'} passphrase updated`);
      setPassphraseDialogOpen(false);
      setNewPassphrase('');
      setConfirmPassphrase('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update passphrase');
    } finally {
      setSavingPassphrase(false);
    }
  };

  const fetchHackathons = useCallback(async () => {
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, status')
      .order('start_date', { ascending: false });
    if (error) {
      toast.error('Failed to load hackathons');
      return;
    }
    setHackathons(data || []);
    // Prefer the live event, not just whichever sorts first by start_date —
    // creating a new upcoming/draft event while another is already live
    // (e.g. setting up next week's hackathon) would otherwise silently land
    // the organizer on the wrong event's challenges/submissions/coins.
    setSelectedHackathonId(prev => {
      if (prev && data?.some(h => h.id === prev)) return prev;
      const live = data?.find(h => h.status === 'live');
      return live?.id || data?.[0]?.id || '';
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (hasStoredAdminPassphrase()) {
        const resolvedRole = getStoredAdminRole() || (await verifyAdminPassphrase(getStoredAdminPassphrase()));
        setRole(resolvedRole);
        if (resolvedRole) fetchHackathons();
      }
      setChecking(false);
    })();
  }, [fetchHackathons]);

  const handleLogin = async () => {
    if (!passphraseInput.trim()) {
      toast.error('Enter the admin passphrase');
      return;
    }
    setVerifying(true);
    const resolvedRole = await verifyAdminPassphrase(passphraseInput.trim());
    setVerifying(false);
    if (resolvedRole) {
      setRole(resolvedRole);
      toast.success(resolvedRole === 'judge' ? 'Welcome, judge!' : 'Welcome back');
      fetchHackathons();
    } else {
      toast.error('Invalid passphrase');
    }
  };

  const handleLogout = () => {
    clearStoredAdminPassphrase();
    setRole(null);
    setPassphraseInput('');
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-xl border max-w-sm w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-secondary">
              <Shield className="w-8 h-8 text-secondary-foreground" />
            </div>
            <h1 className="text-xl font-bold">FORGE Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Enter your organizer or judge passphrase to continue</p>
          </div>
          <div className="space-y-3">
            <Input
              value={passphraseInput}
              onChange={e => setPassphraseInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Admin passphrase"
              type="password"
              autoFocus
            />
            <Button onClick={handleLogin} disabled={verifying} className="w-full">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Enter Admin Panel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary">
            <Shield className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">FORGE Admin Panel</h1>
            <p className="text-xs text-muted-foreground">{role === 'judge' ? 'Judge access — grading only' : 'Organizer control panel'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedHackathonId} onValueChange={setSelectedHackathonId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a hackathon" />
            </SelectTrigger>
            <SelectContent>
              {hackathons.map(h => (
                <SelectItem key={h.id} value={h.id}>
                  {h.title} ({h.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === 'organizer' && (
            <Button variant="outline" size="sm" onClick={() => setPassphraseDialogOpen(true)}>
              <KeyRound className="w-4 h-4 mr-1" /> Passphrases
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Log out
          </Button>
        </div>
      </div>

      {role === 'judge' ? (
        <SubmissionsTab hackathonId={selectedHackathonId} role={role} />
      ) : (
        <Tabs defaultValue="events">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="challenges">Daily Challenges</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="rewards">Reward Boxes</TabsTrigger>
            <TabsTrigger value="coins">Forge Coins</TabsTrigger>
            <TabsTrigger value="community-staff">Community Staff</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <EventsTab onHackathonsChanged={fetchHackathons} />
          </TabsContent>
          <TabsContent value="challenges" className="mt-4">
            <ChallengesTab hackathonId={selectedHackathonId} />
          </TabsContent>
          <TabsContent value="submissions" className="mt-4">
            <SubmissionsTab hackathonId={selectedHackathonId} role={role} />
          </TabsContent>
          <TabsContent value="rewards" className="mt-4">
            <RewardsTab hackathonId={selectedHackathonId} />
          </TabsContent>
          <TabsContent value="coins" className="mt-4">
            <CoinsTab hackathonId={selectedHackathonId} />
          </TabsContent>
          <TabsContent value="community-staff" className="mt-4">
            <CommunityStaffTab />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={passphraseDialogOpen} onOpenChange={setPassphraseDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Passphrase</DialogTitle>
            <DialogDescription>Rotate the organizer or judge login. No Supabase access needed — this is the only place it lives.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Which login</label>
              <Select value={targetRole} onValueChange={v => setTargetRole(v as AdminRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="judge">Judge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">New passphrase</label>
              <Input type="password" value={newPassphrase} onChange={e => setNewPassphrase(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Confirm</label>
              <Input type="password" value={confirmPassphrase} onChange={e => setConfirmPassphrase(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPassphraseDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSavePassphrase} disabled={savingPassphrase} className="flex-1">
                {savingPassphrase ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
