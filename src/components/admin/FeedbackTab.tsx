import { useState, useEffect, useCallback, useMemo } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackRow {
  id: string;
  participant_email: string;
  overall_rating: number;
  lessons_rating: number | null;
  challenges_rating: number | null;
  organization_rating: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null);

const StatBlock = ({ label, value, count }: { label: string; value: number | null; count: number }) => (
  <div className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)] text-center">
    <p className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-1">{label}</p>
    {value === null ? (
      <p className="text-sm text-white/30">No data</p>
    ) : (
      <div className="flex items-center justify-center gap-1">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span className="text-lg font-bold text-white">{value.toFixed(1)}</span>
        <span className="text-[10px] text-white/40">({count})</span>
      </div>
    )}
  </div>
);

export const FeedbackTab = ({ hackathonId }: { hackathonId: string | null }) => {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!hackathonId) { setRows([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await callAdminAction<FeedbackRow[]>('list_hackathon_feedback', { hackathon_id: hackathonId });
      setRows(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => ({
    overall: avg(rows.map(r => r.overall_rating)),
    lessons: avg(rows.filter(r => r.lessons_rating != null).map(r => r.lessons_rating!)),
    challenges: avg(rows.filter(r => r.challenges_rating != null).map(r => r.challenges_rating!)),
    organization: avg(rows.filter(r => r.organization_rating != null).map(r => r.organization_rating!)),
    lessonsCount: rows.filter(r => r.lessons_rating != null).length,
    challengesCount: rows.filter(r => r.challenges_rating != null).length,
    organizationCount: rows.filter(r => r.organization_rating != null).length,
  }), [rows]);

  if (!hackathonId) {
    return <p className="text-sm text-white/50 text-center py-8">Select a hackathon to view its feedback.</p>;
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatBlock label="Overall" value={stats.overall} count={rows.length} />
        <StatBlock label="Lessons" value={stats.lessons} count={stats.lessonsCount} />
        <StatBlock label="Challenges/Judging" value={stats.challenges} count={stats.challengesCount} />
        <StatBlock label="Organization" value={stats.organization} count={stats.organizationCount} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-10 text-white/40">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No feedback submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="rounded-lg p-3 border bg-[hsl(var(--discord-darker))] border-[hsl(var(--discord-light)/0.15)]">
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1.5">
                <span className="text-sm font-medium text-white">{r.participant_email}</span>
                <span className="text-[10px] text-white/40">{new Date(r.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-white/60 mb-1.5">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Overall: {r.overall_rating}</span>
                {r.lessons_rating != null && <span>Lessons: {r.lessons_rating}</span>}
                {r.challenges_rating != null && <span>Challenges: {r.challenges_rating}</span>}
                {r.organization_rating != null && <span>Organization: {r.organization_rating}</span>}
              </div>
              {r.comment && <p className="text-sm text-white/80 italic">"{r.comment}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
