import { createPrivateKey, sign } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminCall } from '@/lib/admin/sheets';
import { supabaseUpdate } from '@/lib/supabase';

/**
 * License activation for the Companion desktop app.
 *
 * The app sends { key, email, device }. The Google Sheet checks that the key belongs to a verified
 * order, binds it to the first account email that activates it, and allows a limited number of
 * devices. When it passes, this route signs the result with LICENSE_PRIVATE_KEY (Ed25519). The app
 * only trusts responses carrying a valid signature, so a fake server or edited response can't unlock it.
 */

const KEY_PATTERN = /^CMPN-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const DEVICE_PATTERN = /^[a-f0-9]{32}$/;
// Short approvals so a revoked license stops working quickly, even on a computer that stays offline.
const VALID_DAYS = 7;

const attempts = new Map<string, { count: number; reset: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 20;
}

function signingKey() {
  const raw = process.env.LICENSE_PRIVATE_KEY;
  if (!raw) return null;
  try {
    return createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (throttled(ip)) return NextResponse.json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });

  const key = signingKey();
  if (!key) return NextResponse.json({ ok: false, error: 'Licensing is not set up on the server yet.' }, { status: 503 });

  let body: { key?: unknown; email?: unknown; device?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const licenseKey = typeof body.key === 'string' ? body.key.trim().toUpperCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const device = typeof body.device === 'string' ? body.device.trim().toLowerCase() : '';
  if (!KEY_PATTERN.test(licenseKey)) return NextResponse.json({ ok: false, error: 'That doesn’t look like a Companion license key.' }, { status: 400 });
  if (!EMAIL_PATTERN.test(email) || !DEVICE_PATTERN.test(device)) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });

  const result = await adminCall('activate', { licenseKey, email, device });
  // Only an explicit "activated" answer counts, so an outdated or misconfigured script can never approve a key.
  if (result.ok && (result.status !== 'activated' || result.email !== email)) {
    return NextResponse.json({ ok: false, error: 'Licensing is being updated. Try again shortly.' }, { status: 503 });
  }
  if (!result.ok) {
    const known: Record<string, [string, string]> = {
      'not found': ['not-found', 'That license key wasn’t found. Check it against your email.'],
      'not verified': ['not-verified', 'This license isn’t active yet. It activates once your payment is verified.'],
      'other account': ['other-account', 'This license belongs to a different email. Sign in to Companion with the email you used at checkout.'],
      'device limit': ['device-limit', 'This license is already active on the maximum number of computers.'],
      revoked: ['revoked', 'This license has been revoked. Get a new license to keep using Companion.']
    };
    const [code, message] = known[result.error ?? ''] ?? ['unavailable', 'Couldn’t check the license. Try again shortly.'];
    return NextResponse.json({ ok: false, code, error: message }, { status: code === 'unavailable' ? 503 : 403 });
  }

  await supabaseUpdate('orders', { license_key: licenseKey }, { licensed_to: email, devices: result.devices ?? [device] });

  const now = Date.now();
  const payload = JSON.stringify({
    v: 1,
    key: licenseKey,
    email,
    device,
    issuedAt: now,
    expiresAt: now + VALID_DAYS * 24 * 60 * 60 * 1000
  });
  const signature = sign(null, Buffer.from(payload), key).toString('base64');
  return NextResponse.json({ ok: true, payload, signature });
}
