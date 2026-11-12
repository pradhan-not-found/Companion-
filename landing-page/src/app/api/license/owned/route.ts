import { NextResponse } from 'next/server';
import { emailHasLicense, emailHasPendingOrder } from '@/lib/supabase';

/**
 * Lets checkout recognise an email that already owns a license, or already has an
 * order waiting for verification, so nobody pays twice.
 */
export async function POST(request: Request) {
  let email = '';
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    // fall through
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ owned: false, pending: false });
  const [owned, pending] = await Promise.all([emailHasLicense(email), emailHasPendingOrder(email)]);
  return NextResponse.json({ owned, pending: !owned && pending });
}
