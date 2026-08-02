const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PASSPHRASE_KEY = 'forge-admin-passphrase';

export const getStoredAdminPassphrase = () => sessionStorage.getItem(PASSPHRASE_KEY) || '';
export const setStoredAdminPassphrase = (value: string) => sessionStorage.setItem(PASSPHRASE_KEY, value);
export const clearStoredAdminPassphrase = () => sessionStorage.removeItem(PASSPHRASE_KEY);
export const hasStoredAdminPassphrase = () => getStoredAdminPassphrase().length > 0;

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

export async function verifyAdminPassphrase(passphrase: string): Promise<boolean> {
  setStoredAdminPassphrase(passphrase);
  try {
    await callAdminAction('verify');
    return true;
  } catch {
    clearStoredAdminPassphrase();
    return false;
  }
}
