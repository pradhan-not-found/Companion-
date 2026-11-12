import { SHEETS_ENDPOINT } from '@/lib/sheets';

/**
 * Server-only calls to the Apps Script admin actions. The SHEETS_ADMIN_KEY never
 * leaves the server: the browser talks to /api/adminpanel/*, which calls this.
 */

export type AdminRecord = Record<string, string>;

export type AdminList = {
  orders: AdminRecord[];
  sponsors: AdminRecord[];
  waitlist: AdminRecord[];
};

type AdminResponse = { ok: boolean; error?: string; status?: string; email?: string; devices?: string[]; sent?: number; remaining?: number } & Partial<AdminList> & { record?: AdminRecord };

export async function adminCall(
  action: 'list' | 'verify' | 'reject' | 'resend' | 'reset' | 'activate' | 'mail',
  extra: Record<string, string> = {}
): Promise<AdminResponse> {
  const key = process.env.SHEETS_ADMIN_KEY;
  if (!key) return { ok: false, error: 'SHEETS_ADMIN_KEY is not set' };
  const response = await fetch(process.env.SHEETS_ENDPOINT || SHEETS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ admin: true, key, action, ...extra }),
    cache: 'no-store',
    redirect: 'follow'
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as AdminResponse;
  } catch {
    return { ok: false, error: `Unexpected response from Google Sheets (${response.status})` };
  }
}
