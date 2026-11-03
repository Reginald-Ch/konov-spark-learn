import { useCallback, useEffect, useMemo, useState } from 'react';
import { callAdminAction } from '@/lib/adminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Signup {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  position: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

export const WaitlistTab = () => {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await callAdminAction<Signup[]>('list_waitlist')) || []);
    } catch (e) {
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
    [r.name, r.email, r.whatsapp, r.referral_code].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const exportCsv = () => {
    const header = ['position', 'name', 'email', 'whatsapp', 'referral_code', 'referred_by', 'referrals', 'joined'];
    const lines = rows.map((r) =>
      [r.position, r.name ?? '', r.email ?? '', r.whatsapp ?? '', r.referral_code, r.referred_by ?? '', referralCounts[r.referral_code] || 0, r.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meai-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold mr-auto">{rows.length} people on the MeAI waitlist</p>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-8 h-9 w-48" />
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        <Button size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </div>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>{['#', 'Name', 'Email', 'WhatsApp', 'Code', 'Referred by', 'Referrals', 'Joined'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/20">
                  <td className="p-2">{r.position}</td>
                  <td className="p-2">{r.name || '—'}</td>
                  <td className="p-2">{r.email ? <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> : '—'}</td>
                  <td className="p-2">{r.whatsapp ? <a className="underline" href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{r.whatsapp}</a> : '—'}</td>
                  <td className="p-2 font-mono">{r.referral_code}</td>
                  <td className="p-2 font-mono">{r.referred_by || '—'}</td>
                  <td className="p-2">{referralCounts[r.referral_code] || 0}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="p-4 text-center opacity-70">No signups found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
