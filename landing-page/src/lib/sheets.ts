/**
 * Google Apps Script web app that appends rows to the Companion Google Sheet.
 * The script itself lives in `landing-page/google-apps-script.gs`; paste it into
 * the Apps Script editor bound to the sheet and redeploy the web app.
 */
export const SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycby_GJ4ySv8fRd1odv_mo4eLrle9Kbx-UDa8lKg68koy1CpgBS7Jul9bNUFrmpEQimafrQ/exec';

/** Saves a submission through the site's server, which stores it in Supabase and the Google Sheet. */
export async function sendToSheet(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, page: window.location.pathname })
  });
  if (!response.ok) throw new Error('Could not save');
}
