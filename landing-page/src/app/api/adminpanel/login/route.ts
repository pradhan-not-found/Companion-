import { NextResponse } from 'next/server';
import { SESSION_COOKIE, adminConfigured, createSessionToken, passwordMatches, sameOrigin } from '@/lib/admin/session';

// Best-effort throttle per IP (serverless instances are short-lived, so this slows guessing rather than blocking it forever).
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: 'The admin panel is not set up yet.' }, { status: 503 });
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.until > now) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    // fall through with an empty password
  }

  if (!password || !passwordMatches(password)) {
    const count = (entry?.count ?? 0) + 1;
    attempts.set(ip, { count, until: count >= MAX_ATTEMPTS ? now + LOCK_MS : 0 });
    await new Promise(resolve => setTimeout(resolve, 700));
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  attempts.delete(ip);
  const session = createSessionToken();
  if (!session) return NextResponse.json({ ok: false, error: 'The admin panel is not set up yet.' }, { status: 503 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge
  });
  return response;
}
