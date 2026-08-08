import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CoinIcon } from '@/components/hackathon/CoinIcon';

interface Registrant {
  participant_email: string;
  participant_name: string;
}

export const CoinsTab = ({ hackathonId }: { hackathonId: string }) => {
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [adjustTarget, setAdjustTarget] = useState<Registrant | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Forge Keys removed from the reward system entirely — merged into bonus
  // Forge Coins (they had zero spend/redeem mechanic, same problem Boost
  // Tokens had), so this only ever tracked coins now.
  const fetchData = useCallback(async () => {
    if (!hackathonId) { setRegistrants([]); setBalances({}); setIsLoading(false); return; }
    setIsLoading(true);
    const [regRes, coinRes] = await Promise.all([
      supabase.from('hackathon_registrations').select('participant_email, participant_name').eq('hackathon_id', hackathonId),
      supabase.from('point_events').select('participant_email, points').eq('hackathon_id', hackathonId).in('event_type', ['forge_coin_grant', 'forge_coin_adjust']),
    ]);
    if (regRes.error || coinRes.error) toast.error('Failed to load Forge Coin data');
    setRegistrants((regRes.data as Registrant[]) || []);
    const map: Record<string, number> = {};
    (coinRes.data || []).forEach((row: any) => {
      map[row.participant_email] = (map[row.participant_email] || 0) + row.points;
    });
    setBalances(map);
    setIsLoading(false);
  }, [hackathonId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrants;
    return registrants.filter(r => r.participant_email.toLowerCase().includes(q) || r.participant_name?.toLowerCase().includes(q));
  }, [registrants, search]);

  const openAdjust = (r: Registrant) => {
    setAdjustTarget(r);
    setAmount('');
    setReason('');
  };

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt === 0) { toast.error('Enter a non-zero amount (negative to deduct)'); return; }
    setSaving(true);
    try {
      await callAdminAction('adjust_coins', {
        participant_email: adjustTarget.participant_email,
        hackathon_id: hackathonId,
        amount: amt,
        reason: reason || undefined,
      });
      toast.success(`${amt > 0 ? 'Granted' : 'Deducted'} ${Math.abs(amt)} Forge Coins`);
      setAdjustTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to adjust coins');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2"><CoinIcon size={20} /> Forge Coins</h2>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participants..." className="pl-8" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.participant_email} className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold">{r.participant_name}</p>
              <p className="text-xs text-muted-foreground">{r.participant_email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold flex items-center gap-1"><CoinIcon size={16} /> {balances[r.participant_email] || 0}</span>
              <Button size="sm" variant="outline" onClick={() => openAdjust(r)}>Adjust Coins</Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No registrants match.</p>
        )}
      </div>

      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Forge Coins</DialogTitle>
            <DialogDescription>{adjustTarget?.participant_email} — current balance: {adjustTarget ? balances[adjustTarget.participant_email] || 0 : 0}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (negative to deduct)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 25 or -10" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Optional note for the audit log" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdjustTarget(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleAdjust} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
