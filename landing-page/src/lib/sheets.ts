/**
 * Google Apps Script web app that appends rows to the Companion Google Sheet.
 * The script itself lives in `landing-page/google-apps-script.gs`; paste it into
 * the Apps Script editor bound to the sheet and redeploy the web app.
 */
export const SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycby_GJ4ySv8fRd1odv_mo4eLrle9Kbx-UDa8lKg68koy1CpgBS7Jul9bNUFrmpEQimafrQ/exec';

/** Posts one row. Apps Script web apps do not send CORS headers, so the response is opaque. */
export async function sendToSheet(payload: Record<string, unknown>): Promise<void> {
  await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...payload, submittedAt: new Date().toISOString(), page: window.location.pathname })
  });
}
