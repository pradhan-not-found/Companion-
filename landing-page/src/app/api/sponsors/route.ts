import { NextResponse } from 'next/server';
import { SHEETS_ENDPOINT } from '@/lib/sheets';

type Sponsor = { name: string; url: string; logo: string };

/** Approved sponsors from the Google Sheet, cached for a minute. */
export async function GET() {
  try {
    const response = await fetch(`${process.env.SHEETS_ENDPOINT || SHEETS_ENDPOINT}?action=sponsors`, { next: { revalidate: 60 } });
    const data = (await response.json()) as { ok?: boolean; sponsors?: Sponsor[] };
    const sponsors = Array.isArray(data.sponsors)
      ? data.sponsors
          .filter(item => item && typeof item.logo === 'string' && item.logo.startsWith('https://drive.google.com/'))
          .map(item => ({ name: String(item.name ?? '').slice(0, 80), url: /^https?:\/\//i.test(item.url ?? '') ? item.url : '', logo: item.logo }))
      : [];
    return NextResponse.json({ sponsors }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ sponsors: [] });
  }
}
