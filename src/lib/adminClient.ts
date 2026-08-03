const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PASSPHRASE_KEY = 'forge-admin-passphrase';
const ROLE_KEY = 'forge-admin-role';

export type AdminRole = 'organizer' | 'judge';

export const getStoredAdminPassphrase = () => sessionStorage.getItem(PASSPHRASE_KEY) || '';
export const setStoredAdminPassphrase = (value: string) => sessionStorage.setItem(PASSPHRASE_KEY, value);
export const clearStoredAdminPassphrase = () => {
  sessionStorage.removeItem(PASSPHRASE_KEY);
  sessionStorage.removeItem(ROLE_KEY);
};
export const hasStoredAdminPassphrase = () => getStoredAdminPassphrase().length > 0;

export const getStoredAdminRole = (): AdminRole | null => {
  const role = sessionStorage.getItem(ROLE_KEY);
  return role === 'organizer' || role === 'judge' ? role : null;
};
const setStoredAdminRole = (role: AdminRole) => sessionStorage.setItem(ROLE_KEY, role);

export async function callAdminAction<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const passphrase = getStoredAdminPassphrase();
  const resp = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ passphrase, action, payload }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok) {
    if (resp.status === 401) clearStoredAdminPassphrase();
    throw new Error(data?.error || `Admin action failed (${resp.status})`);
  }
  return data.data as T;
}

export async function verifyAdminPassphrase(passphrase: string): Promise<AdminRole | null> {
  setStoredAdminPassphrase(passphrase);
  try {
    const result = await callAdminAction<{ role: AdminRole }>('verify');
    setStoredAdminRole(result.role);
    return result.role;
  } catch {
    clearStoredAdminPassphrase();
    return null;
  }
}
