import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, Loader2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

interface RewardBox {
  id: string;
  participant_email: string;
  box_type: 'issue' | 'mission';
  contents_label: string | null;
  status: 'unopened' | 'opened' | 'fulfilled';
  awarded_at: string;
}

export const RewardsTab = ({ hackathonId }: { hackathonId: string }) => {
  const [boxes, setBoxes] = useState<RewardBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  const fetchBoxes = useCallback(async () => {
    if (!hackathonId) { setBoxes([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await callAdminAction<RewardBox[]>('list_reward_boxes', { hackathon_id: hackathonId });
      setBoxes(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load reward boxes');
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => { fetchBoxes(); }, [fetchBoxes]);

  const handleFulfill = async (id: string) => {
    setFulfilling(id);
    try {
      await callAdminAction('mark_box_fulfilled', { id });
      toast.success('Marked fulfilled');
      fetchBoxes();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update box');
    } finally {
      setFulfilling(null);
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
        <h2 className="text-lg font-bold">Reward Boxes</h2>
        <p className="text-xs text-muted-foreground">Boxes are awarded from the Submissions tab via "Close & Award Boxes". Contents are a label only — fulfillment (shipping/delivery) is tracked here.</p>
      </div>

      <div className="space-y-2">
        {boxes.map(b => (
          <div key={b.id} className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {b.box_type === 'mission' ? <Sparkles className="w-5 h-5 text-amber-500" /> : <Gift className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-semibold">{b.participant_email}</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant={b.box_type === 'mission' ? 'default' : 'secondary'} className="mr-1">{b.box_type === 'mission' ? 'Mission Bonus' : 'Issue Box'}</Badge>
                  {b.contents_label} — {new Date(b.awarded_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={b.status === 'fulfilled' ? 'default' : 'outline'}>{b.status}</Badge>
              {b.status !== 'fulfilled' && (
                <Button size="sm" variant="outline" disabled={fulfilling === b.id} onClick={() => handleFulfill(b.id)}>
                  {fulfilling === b.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <PackageCheck className="w-3 h-3 mr-1" />}
                  Mark Fulfilled
                </Button>
              )}
            </div>
          </div>
        ))}
        {boxes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No reward boxes awarded yet.</p>
        )}
      </div>
    </div>
  );
};
