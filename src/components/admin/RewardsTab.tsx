import { useState, useEffect, useCallback } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Gift, Medal, Loader2, PackageCheck, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface RewardBox {
  id: string;
  participant_email: string;
  box_type: 'issue' | 'mission' | 'community_favorite';
  contents_label: string | null;
  status: 'unopened' | 'opened' | 'fulfilled';
  awarded_at: string;
}

const BOX_META: Record<RewardBox['box_type'], { label: string; icon: typeof Gift; badgeVariant: 'default' | 'secondary' | 'outline' }> = {
  issue: { label: 'Issue Box', icon: Gift, badgeVariant: 'secondary' },
  mission: { label: 'Mission Bonus', icon: Medal, badgeVariant: 'default' },
  community_favorite: { label: 'Community Favorite', icon: Heart, badgeVariant: 'outline' },
};

export const RewardsTab = ({ hackathonId }: { hackathonId: string }) => {
  const [boxes, setBoxes] = useState<RewardBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  // Community Favorite is hackathon-wide (ranked by project_likes, not tied
  // to any one daily challenge), so it gets its own trigger here rather
  // than living inside Submissions' per-challenge "Close & Award Boxes" —
  // see award_community_favorite's own comment in admin-actions/index.ts.
  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [favoriteTopN, setFavoriteTopN] = useState('1');
  const [favoriteBonusCoins, setFavoriteBonusCoins] = useState('');
  const [awardingFavorite, setAwardingFavorite] = useState(false);

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

  const handleAwardFavorite = async () => {
    setAwardingFavorite(true);
    try {
      const result = await callAdminAction<{ awarded: number; winners: { project_name: string; like_count: number }[] }>('award_community_favorite', {
        hackathon_id: hackathonId,
        top_n: Math.max(1, parseInt(favoriteTopN, 10) || 1),
        bonus_coin_value: Math.max(0, parseInt(favoriteBonusCoins, 10) || 0),
      });
      if (result.awarded === 0) {
        toast.warning('No published projects have any likes yet — nothing to award.');
      } else {
        toast.success(`Awarded Community Favorite to ${result.awarded}: ${result.winners.map(w => `${w.project_name} (${w.like_count} likes)`).join(', ')}`);
      }
      setFavoriteDialogOpen(false);
      setFavoriteBonusCoins('');
      fetchBoxes();
    } catch (e: any) {
      toast.error(e.message || 'Failed to award Community Favorite');
    } finally {
      setAwardingFavorite(false);
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold">Reward Boxes</h2>
          <p className="text-xs text-muted-foreground">Issue/Mission boxes are awarded from the Submissions tab via "Close & Award Boxes". Contents are a label only — fulfillment (shipping/delivery) is tracked here.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setFavoriteDialogOpen(true)}>
          <Heart className="w-4 h-4 mr-1 text-red-400" /> Award Community Favorite
        </Button>
      </div>

      <div className="space-y-2">
        {boxes.map(b => {
          const meta = BOX_META[b.box_type];
          const Icon = meta.icon;
          return (
            <div key={b.id} className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${b.box_type === 'mission' ? 'text-amber-500' : b.box_type === 'community_favorite' ? 'text-red-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-semibold">{b.participant_email}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant={meta.badgeVariant} className="mr-1">{meta.label}</Badge>
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
          );
        })}
        {boxes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No reward boxes awarded yet.</p>
        )}
      </div>

      <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> Award Community Favorite</DialogTitle>
            <DialogDescription>
              Ranks every published project in this hackathon by likes (Project Showcase) and awards the top finisher(s) a box, a badge, and optional bonus Forge Coins. This never affects SP or the competitive leaderboard — see the reasoning in this feature's migration if you're wondering why. Safe to run again later as more likes come in; already-awarded participants are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">How many winners (top N by likes)</label>
              <Input type="number" min={1} max={10} value={favoriteTopN} onChange={e => setFavoriteTopN(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bonus Forge Coins per winner (optional)</label>
              <Input type="number" min={0} value={favoriteBonusCoins} onChange={e => setFavoriteBonusCoins(e.target.value)} placeholder="e.g. 25 — leave blank for none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFavoriteDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAwardFavorite} disabled={awardingFavorite} className="flex-1">
              {awardingFavorite ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Award
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
