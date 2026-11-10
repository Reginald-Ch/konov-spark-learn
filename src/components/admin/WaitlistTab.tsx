import { useCallback, useEffect, useMemo, useState } from 'react';
import { answerLabel, csvCell, loadPrivateWaitlist, signupSource, type WaitlistSignup } from '@/lib/privateWaitlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

export const WaitlistTab = () => {
  const [rows, setRows] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await loadPrivateWaitlist());
    } catch (e) {
      setRows([]);
      setError('Could not load signups. Please try again.');
      toast.error(e instanceof Error ? e.message : 'Could not load waitlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const referralCounts = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { if (r.referred_by) m[r.referred_by] = (m[r.referred_by] || 0) + 1; });
    return m;
  }, [rows]);

  const filtered = rows.filter((r) =>
    [r.name, r.email, r.whatsapp, r.referral_code, r.school_name, r.location, r.utm_source].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const exportCsv = () => {
    const header = ['position', 'name', 'email', 'whatsapp', 'role', 'child_ages', 'goal', 'device', 'location', 'class_interest', 'school_name', 'learners', 'wishlist', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer', 'referral_code', 'referred_by', 'referrals', 'joined'];
    const lines = filtered.map((r) =>
      [r.position, r.name ?? '', r.email ?? '', r.whatsapp ?? '', answerLabel(r.role), answerLabel(r.child_age_bands), answerLabel(r.goal), answerLabel(r.device), answerLabel(r.location), answerLabel(r.class_interest), r.school_name ?? '', answerLabel(r.learner_count), r.wishlist ?? '', r.utm_source ?? '', r.utm_medium ?? '', r.utm_campaign ?? '', r.referrer ?? '', r.referral_code, r.referred_by ?? '', referralCounts[r.referral_code] || 0, r.created_at]
        .map(csvCell).join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meai-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold mr-auto">{rows.length} people on the MeAI waitlist</p>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
          <Input aria-label="Search signups" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search signups" className="pl-8 h-9 w-48" />
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        <Button size="sm" onClick={exportCsv} disabled={loading || !filtered.length}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>
      {error ? <p role="alert" className="text-destructive">{error}</p> : loading ? (
        <div role="status" className="flex justify-center gap-2 py-8"><Loader2 className="h-6 w-6 animate-spin" />Loading signups…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>{['#', 'Name', 'Email', 'WhatsApp', 'Who', 'Ages', 'Goal', 'Device', 'Location', 'Classes', 'Source', 'Code', 'Referrals', 'Joined'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/20">
                  <td className="p-2">{r.position}</td>
                  <td className="p-2">{r.name || '—'}</td>
                  <td className="p-2">{r.email ? <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> : '—'}</td>
                  <td className="p-2">{r.whatsapp ? <a className="underline" href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{r.whatsapp}</a> : '—'}</td>
                  <td className="p-2">{r.role === 'school' ? (r.school_name || 'school') : answerLabel(r.role) || '—'}</td>
                  <td className="p-2 whitespace-nowrap">{answerLabel(r.child_age_bands) || answerLabel(r.learner_count) || '—'}</td>
                  <td className="p-2">{answerLabel(r.goal) || '—'}</td>
                  <td className="p-2">{answerLabel(r.device) || '—'}</td>
                  <td className="p-2">{answerLabel(r.location) || '—'}</td>
                  <td className="p-2">{answerLabel(r.class_interest) || '—'}</td>
                  <td className="p-2">{signupSource(r) || '—'}</td>
                  <td className="p-2 font-mono">{r.referral_code}</td>
                  <td className="p-2">{referralCounts[r.referral_code] || 0}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={14} className="p-4 text-center opacity-70">No signups found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
