import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin session for /adminpanel. Server-only: imported by route handlers and the
 * adminpanel page, never by client components.
 *
 * Environment variables (set in Vercel, never committed):
 *   ADMIN_PASSWORD        the password you type to sign in
 *   ADMIN_SESSION_SECRET  a long random string used to sign the session cookie
 */

export const SESSION_COOKIE = 'cmp_admin';
const SESSION_HOURS = 8;

function secret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && secret() && process.env.SHEETS_ADMIN_KEY);
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** A token is "<expiry ms>.<signature>". */
export function createSessionToken(): { token: string; maxAge: number } | null {
  const key = secret();
  if (!key) return null;
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `admin.${expires}`;
  return { token: `${payload}.${sign(payload, key)}`, maxAge: SESSION_HOURS * 60 * 60 };
}

export function tokenIsValid(token: string | undefined): boolean {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(parts[2], sign(`${parts[0]}.${parts[1]}`, key));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return tokenIsValid(store.get(SESSION_COOKIE)?.value);
}

/** Rejects cross-site POSTs: the request must come from this site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
