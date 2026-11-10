import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasWaitlistOwnerRole } from '@/lib/privateWaitlist';
import { WaitlistTab } from '@/components/admin/WaitlistTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SEO from '@/components/SEO';
import logo from '@/assets/konov-logo-clear.png';
import { ArrowLeft, Loader2, LockKeyhole, LogOut, Mail } from 'lucide-react';

const AdminPanel = () => {
  const [access, setAccess] = useState<'loading' | 'signed-out' | 'denied' | 'owner'>('loading');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let generation = 0;
    const check = async () => {
      const current = ++generation;
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active || current !== generation) return;
      if (userError || !data.user) { setAccess('signed-out'); return; }
      const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
      if (active && current === generation) setAccess(!roleError && hasWaitlistOwnerRole(roles ?? []) ? 'owner' : 'denied');
    };
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setAccess('loading');
      window.setTimeout(() => { if (active) void check(); }, 0);
    });
    void check();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true); setError(''); setMessage('');
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` } });
      if (authError) { setError('Unable to send a sign-in link. Use your approved owner email or try again later.'); return; }
      setMessage('Check your email for your secure sign-in link.');
    } catch { setError('Unable to send a sign-in link. Please try again.'); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Private dashboard | KONOV" description="Private KONOV administration." canonical="/admin" noindex />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" aria-label="KONOV home"><img src={logo} alt="KONOV" className="h-12 w-20 object-contain" /></Link>
          <span className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4" />Private dashboard</span>
          {access === 'owner' && <Button variant="outline" onClick={() => void supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>}
        </div>
      </header>
      <main className={access === 'owner' ? 'mx-auto max-w-7xl px-5 py-10' : 'mx-auto max-w-md px-5 py-12'}>
        {access === 'loading' ? <div role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Checking access…</div> : access === 'owner' ? <>
          <p className="mb-2 text-sm font-semibold text-primary">KONOV</p>
          <h1 className="mb-8 text-3xl font-bold">MeAI Waitlist</h1>
          <WaitlistTab />
        </> : access === 'denied' ? <>
          <LockKeyhole className="mb-5 h-8 w-8 text-primary" />
          <h1 className="mb-3 text-2xl font-bold">Owner access required</h1>
          <p className="mb-6 text-muted-foreground">This account does not have permission to view the waitlist.</p>
          <Button onClick={() => void supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </> : <>
          <LockKeyhole className="mb-5 h-8 w-8 text-primary" />
          <h1 className="mb-3 text-3xl font-bold">Owner sign-in</h1>
          <p className="mb-7 text-muted-foreground">Sign in with your approved email to view the MeAI waitlist.</p>
          <form onSubmit={sendLink} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="owner-email">Owner email</Label><Input id="owner-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button type="submit" disabled={sending} className="w-full">{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send sign-in link</Button>
            {message && <p role="status" className="text-sm">{message}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </form>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back to KONOV</Link>
        </>}
      </main>
    </div>
  );
};

export default AdminPanel;
