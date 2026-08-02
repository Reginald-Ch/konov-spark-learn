import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  verifyAdminPassphrase,
  hasStoredAdminPassphrase,
  getStoredAdminPassphrase,
  clearStoredAdminPassphrase,
} from '@/lib/adminClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Shield, Loader2, LogOut, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { EventsTab } from '@/components/admin/EventsTab';
import { ChallengesTab } from '@/components/admin/ChallengesTab';
import { SubmissionsTab } from '@/components/admin/SubmissionsTab';
import { RewardsTab } from '@/components/admin/RewardsTab';
import { CoinsTab } from '@/components/admin/CoinsTab';

interface HackathonOption {
  id: string;
  title: string;
  status: string;
}

const AdminPanel = () => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [hackathons, setHackathons] = useState<HackathonOption[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');

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
    setSelectedHackathonId(prev => (prev && data?.some(h => h.id === prev) ? prev : data?.[0]?.id || ''));
  }, []);

  useEffect(() => {
    (async () => {
      if (hasStoredAdminPassphrase()) {
        const ok = await verifyAdminPassphrase(getStoredAdminPassphrase());
        setAuthenticated(ok);
        if (ok) fetchHackathons();
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
    const ok = await verifyAdminPassphrase(passphraseInput.trim());
    setVerifying(false);
    if (ok) {
      setAuthenticated(true);
      toast.success('Welcome back');
      fetchHackathons();
    } else {
      toast.error('Invalid passphrase');
    }
  };

  const handleLogout = () => {
    clearStoredAdminPassphrase();
    setAuthenticated(false);
    setPassphraseInput('');
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-xl border max-w-sm w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-secondary">
              <Shield className="w-8 h-8 text-secondary-foreground" />
            </div>
            <h1 className="text-xl font-bold">FORGE Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Enter the organizer passphrase to continue</p>
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
            <p className="text-xs text-muted-foreground">Organizer control panel</p>
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Log out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="challenges">Daily Challenges</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="rewards">Reward Boxes</TabsTrigger>
          <TabsTrigger value="coins">Forge Coins</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          <EventsTab onHackathonsChanged={fetchHackathons} />
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <ChallengesTab hackathonId={selectedHackathonId} />
        </TabsContent>
        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab hackathonId={selectedHackathonId} />
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <RewardsTab hackathonId={selectedHackathonId} />
        </TabsContent>
        <TabsContent value="coins" className="mt-4">
          <CoinsTab hackathonId={selectedHackathonId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
