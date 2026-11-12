/**
 * Server-only Supabase helpers (REST, no SDK). Every call is a no-op when Supabase isn't configured,
 * so the Google Sheet keeps working on its own.
 *
 * Environment: SUPABASE_URL and SUPABASE_SECRET_KEY (never exposed to the browser).
 */

type Row = Record<string, unknown>;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function supabaseInsert(table: string, row: Row, onConflict?: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    const response = await fetch(`${cfg.url}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: headers(cfg.key, {
        'Content-Type': 'application/json',
        Prefer: onConflict ? 'resolution=ignore-duplicates,return=minimal' : 'return=minimal'
      }),
      body: JSON.stringify(row),
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function supabaseUpdate(table: string, match: Record<string, string>, patch: Row): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  const filter = Object.entries(match)
    .map(([column, value]) => `${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`)
    .join('&');
  try {
    const response = await fetch(`${cfg.url}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: headers(cfg.key, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(patch),
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Uploads a sponsor logo (a data: URL) to the public "sponsor-logos" bucket and returns its URL. */
export async function uploadSponsorLogo(reference: string, dataUrl: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const match = /^data:(image\/(png|jpeg|svg\+xml|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[3], 'base64');
  if (bytes.length > 600 * 1024) return null;
  const extension = { png: 'png', jpeg: 'jpg', 'svg+xml': 'svg', webp: 'webp' }[match[2]] ?? 'png';
  const path = `${reference.replace(/[^A-Za-z0-9-]/g, '')}.${extension}`;
  try {
    const response = await fetch(`${cfg.url}/storage/v1/object/sponsor-logos/${path}`, {
      method: 'POST',
      headers: headers(cfg.key, { 'Content-Type': match[1], 'x-upsert': 'true' }),
      body: bytes,
      cache: 'no-store'
    });
    return response.ok ? `${cfg.url}/storage/v1/object/public/sponsor-logos/${path}` : null;
  } catch {
    return null;
  }
}

/** Reads rows (newest first). Returns null when Supabase isn't configured or the request fails. */
export async function supabaseSelect(table: string, order = 'submitted_at.desc', limit = 1000): Promise<Row[] | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const response = await fetch(`${cfg.url}/rest/v1/${table}?select=*&order=${order}&limit=${limit}`, {
      headers: headers(cfg.key),
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return (await response.json()) as Row[];
  } catch {
    return null;
  }
}

/** Rows matching simple equality filters, e.g. { email: 'a@b.co', status: 'Verified' }. */
export async function supabaseFind(table: string, match: Record<string, string>, limit = 5): Promise<Row[] | null> {
  const cfg = config();
  if (!cfg) return null;
  const filter = Object.entries(match)
    .map(([column, value]) => `${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`)
    .join('&');
  try {
    const response = await fetch(`${cfg.url}/rest/v1/${table}?select=*&${filter}&limit=${limit}`, { headers: headers(cfg.key), cache: 'no-store' });
    return response.ok ? ((await response.json()) as Row[]) : null;
  } catch {
    return null;
  }
}

/** True when this email already owns a verified Companion license. */
export async function emailHasLicense(email: string): Promise<boolean> {
  const rows = await supabaseFind('orders', { email: email.toLowerCase(), status: 'Verified' }, 1);
  return Boolean(rows && rows.length);
}
