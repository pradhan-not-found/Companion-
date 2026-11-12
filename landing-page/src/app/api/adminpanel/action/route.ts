import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/admin/session';
import { adminCall } from '@/lib/admin/sheets';

const ACTIONS = new Set(['verify', 'reject', 'resend']);
const TYPES = new Set(['order', 'sponsor']);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: { action?: unknown; type?: unknown; reference?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const { action, type, reference } = body;
  if (typeof action !== 'string' || !ACTIONS.has(action) || typeof type !== 'string' || !TYPES.has(type) || typeof reference !== 'string' || !reference) {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const result = await adminCall(action as 'verify' | 'reject' | 'resend', { type, reference: reference.slice(0, 40) });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? 'Action failed' }, { status: 502 });
  return NextResponse.json({ ok: true, record: result.record });
}
