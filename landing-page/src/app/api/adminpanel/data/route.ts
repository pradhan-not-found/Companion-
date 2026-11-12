import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/session';
import { adminCall } from '@/lib/admin/sheets';
import { supabaseSelect } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;
const str = (value: unknown) => (value === null || value === undefined ? '' : String(value));

// Supabase rows use snake_case; the dashboard uses the same field names as the Sheet.
function order(row: Row) {
  return {
    reference: str(row.reference),
    submittedAt: str(row.submitted_at),
    product: str(row.product),
    amount: str(row.amount),
    email: str(row.email),
    name: str(row.name),
    utr: '',
    line1: str(row.address_line1),
    city: str(row.city),
    state: str(row.state),
    pin: str(row.pin),
    country: str(row.country),
    status: str(row.status),
    licenseKey: str(row.license_key),
    verifiedAt: str(row.verified_at),
    licensedTo: str(row.licensed_to),
    devices: Array.isArray(row.devices) ? row.devices.join(',') : str(row.devices)
  };
}

function sponsor(row: Row) {
  return {
    reference: str(row.reference),
    submittedAt: str(row.submitted_at),
    amount: str(row.amount),
    name: str(row.name),
    email: str(row.email),
    company: str(row.company),
    website: str(row.website),
    feature: row.feature ? 'Yes' : 'No',
    logo: str(row.logo_url),
    message: str(row.message),
    utr: '',
    status: str(row.status),
    verifiedAt: str(row.verified_at)
  };
}

function waitlist(row: Row) {
  return { submittedAt: str(row.submitted_at), email: str(row.email), name: str(row.name), mac: str(row.mac), page: str(row.page) };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Supabase is the source of truth.
  const [orders, sponsors, list] = await Promise.all([supabaseSelect('orders'), supabaseSelect('sponsors'), supabaseSelect('waitlist')]);
  if (orders && sponsors && list) {
    return NextResponse.json(
      { ok: true, source: 'database', orders: orders.map(order), sponsors: sponsors.map(sponsor), waitlist: list.map(waitlist) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Fallback: the Google Sheet, if the database can't be reached.
  const result = await adminCall('list');
  if (!result.ok || !Array.isArray(result.orders)) {
    const error =
      result.error === 'unauthorized'
        ? 'SHEETS_ADMIN_KEY does not match the ADMIN_KEY script property in Apps Script.'
        : 'Could not reach the database or the Google Sheet.';
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, source: 'sheet', orders: result.orders, sponsors: result.sponsors ?? [], waitlist: result.waitlist ?? [] });
}
