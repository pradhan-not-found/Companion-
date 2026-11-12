import { NextResponse } from 'next/server';
import { SHEETS_ENDPOINT } from '@/lib/sheets';
import { emailHasLicense, supabaseInsert, uploadSponsorLogo } from '@/lib/supabase';

/**
 * Public submissions (orders, sponsors, waitlist). Each one is saved to Supabase and to the
 * Google Sheet. The browser never sees either backend's address or keys.
 */

const TYPES = new Set(['order', 'sponsor', 'mac-waitlist', 'waitlist']);
const text = (value: unknown, max = 300) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const ref = (value: unknown) => text(value, 40).replace(/[^A-Za-z0-9-]/g, '');

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 1_200_000) return NextResponse.json({ ok: false, error: 'Too large' }, { status: 413 });
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const type = typeof data.type === 'string' && TYPES.has(data.type) ? data.type : null;
  const email = text(data.email, 254).toLowerCase();
  if (!type || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });

  if (type === 'order' && (await emailHasLicense(email))) {
    return NextResponse.json({ ok: false, error: 'This email already has a Companion license.' }, { status: 409 });
  }

  const submittedAt = new Date().toISOString();
  const payload = { ...data, type, email, submittedAt };

  // Google Sheet (and its emails) via Apps Script.
  const toSheet = fetch(process.env.SHEETS_ENDPOINT || SHEETS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  }).then(response => response.ok).catch(() => false);

  // Supabase.
  let toDatabase: Promise<boolean>;
  if (type === 'order') {
    const address = (data.address ?? {}) as Record<string, unknown>;
    toDatabase = supabaseInsert('orders', {
      reference: ref(data.orderId),
      product: text(data.product, 80),
      amount: Number(data.amount) || null,
      email,
      name: text(data.name, 120),
      address_line1: text(address.line1),
      city: text(address.city, 120),
      state: text(address.state, 80),
      pin: text(address.pin, 12),
      country: text(address.country, 60),
      submitted_at: submittedAt
    }, 'reference');
  } else if (type === 'sponsor') {
    const reference = ref(data.orderId);
    toDatabase = (async () => {
      const logoUrl = typeof data.logo === 'string' && data.logo ? await uploadSponsorLogo(reference, data.logo) : null;
      return supabaseInsert('sponsors', {
        reference,
        amount: Number(data.amount) || null,
        name: text(data.name, 120),
        email,
        company: text(data.company, 120),
        website: text(data.website, 200),
        feature: Boolean(data.feature),
        logo_url: logoUrl,
        message: text(data.message, 280),
        submitted_at: submittedAt
      }, 'reference');
    })();
  } else {
    toDatabase = supabaseInsert('waitlist', { email, name: text(data.name, 120), mac: text(data.mac, 40), page: text(data.page, 80), submitted_at: submittedAt }, 'email');
  }

  const [sheet, database] = await Promise.all([toSheet, toDatabase]);
  if (!sheet && !database) return NextResponse.json({ ok: false, error: 'Could not save. Try again.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
