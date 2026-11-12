import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/admin/session';
import { adminCall } from '@/lib/admin/sheets';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Sends an email written in the admin panel, through the Apps Script (Gmail), as Companion. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: { to?: unknown; subject?: unknown; message?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const to = Array.isArray(body.to) ? [...new Set(body.to.filter((v): v is string => typeof v === 'string').map(v => v.trim().toLowerCase()).filter(v => EMAIL.test(v)))] : [];
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 150) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
  if (!to.length) return NextResponse.json({ ok: false, error: 'Add at least one valid email address.' }, { status: 400 });
  if (to.length > 50) return NextResponse.json({ ok: false, error: 'Send to at most 50 people at a time.' }, { status: 400 });
  if (!subject || !message) return NextResponse.json({ ok: false, error: 'Add a subject and a message.' }, { status: 400 });

  const result = await adminCall('mail', { to: to.join(','), subject, body: message });
  if (result.ok && result.status === 'sent') return NextResponse.json({ ok: true, sent: result.sent, remaining: result.remaining });
  const error =
    result.error === 'quota'
      ? 'Gmail’s daily sending limit is reached. Try again tomorrow.'
      : result.ok
        ? 'Update the Apps Script to the latest version to send mail.'
        : 'Couldn’t send the email. Try again.';
  return NextResponse.json({ ok: false, error }, { status: 502 });
}
