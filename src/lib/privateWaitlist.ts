import { supabase } from '@/integrations/supabase/client';

export interface WaitlistSignup {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  position: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

export const hasWaitlistOwnerRole = (roles: readonly { role: string }[]) =>
  roles.some(({ role }) => role === 'waitlist_owner');

export const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function loadPrivateWaitlist(): Promise<WaitlistSignup[]> {
  const rows: WaitlistSignup[] = [];
  let total = 0;
  do {
    const { data, error } = await supabase.rpc('get_private_waitlist', { p_offset: rows.length });
    if (error) throw error;
    const page = data as unknown as { total: number; rows: WaitlistSignup[] };
    if (!page || !Array.isArray(page.rows)) throw new Error('Could not read waitlist');
    total = page.total;
    rows.push(...page.rows);
    if (!page.rows.length) break;
  } while (rows.length < total);
  return rows;
}