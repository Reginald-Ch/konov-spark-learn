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
  // Profile and attribution fields (0002_waitlist_profile_and_attribution);
  // absent until that migration is applied, null when a signup skipped them.
  role?: string | null;
  child_age_bands?: string[] | null;
  goal?: string | null;
  device?: string | null;
  location?: string | null;
  class_interest?: string | null;
  school_name?: string | null;
  learner_count?: string | null;
  wishlist?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  profile_completed_at?: string | null;
}

// Turns stored answer values such as "after_school" or "6-8" into readable text.
export const answerLabel = (value: string | string[] | null | undefined) =>
  (Array.isArray(value) ? value.join(', ') : value ?? '').replace(/_/g, ' ');

// Where a signup came from: the UTM source/campaign, else the referring site's host.
export const signupSource = (r: WaitlistSignup) => {
  if (r.utm_source) return [r.utm_source, r.utm_campaign].filter(Boolean).join(' / ');
  if (r.referrer) {
    try { return new URL(r.referrer).hostname; } catch { return r.referrer; }
  }
  return r.referred_by ? 'friend referral' : '';
};

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