import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/session';
import { adminCall } from '@/lib/admin/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const result = await adminCall('list');
  if (!result.ok || !Array.isArray(result.orders)) {
    const error =
      result.error === 'unauthorized'
        ? 'SHEETS_ADMIN_KEY does not match the ADMIN_KEY script property in Apps Script.'
        : 'Your Apps Script is out of date. Paste the new google-apps-script.gs into Apps Script and deploy a new version.';
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, orders: result.orders ?? [], sponsors: result.sponsors ?? [], waitlist: result.waitlist ?? [] });
}
