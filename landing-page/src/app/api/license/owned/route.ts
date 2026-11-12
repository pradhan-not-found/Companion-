import { NextResponse } from 'next/server';
import { emailHasLicense } from '@/lib/supabase';

/** Lets checkout stop a second purchase for an email that already owns a license. */
export async function POST(request: Request) {
  let email = '';
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    // fall through
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ owned: false });
  return NextResponse.json({ owned: await emailHasLicense(email) });
}
