import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/admin/session';
import { adminCall } from '@/lib/admin/sheets';
import { supabaseUpdate } from '@/lib/supabase';

const ACTIONS = new Set(['verify', 'reject', 'resend', 'reset', 'revoke', 'restore']);
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

  const result = await adminCall(action as 'verify' | 'reject' | 'resend' | 'reset' | 'revoke' | 'restore', { type, reference: reference.slice(0, 40) });
  if (!result.ok || !result.record) return NextResponse.json({ ok: false, error: result.error ?? 'Action failed' }, { status: 502 });

  // Mirror the change into Supabase.
  const record = result.record;
  if (type === 'order') {
    await supabaseUpdate('orders', { reference }, {
      status: record.status,
      license_key: record.licenseKey || null,
      verified_at: record.verifiedAt || null,
      ...(action === 'reset' ? { licensed_to: null, devices: [] } : {})
    });
  } else {
    await supabaseUpdate('sponsors', { reference }, { status: record.status, verified_at: record.verifiedAt || null });
  }
  return NextResponse.json({ ok: true, record });
}
