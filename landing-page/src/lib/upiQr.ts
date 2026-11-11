import QRCode from 'qrcode';

/** The UPI payee for Companion checkouts. */
export const UPI_ID = 'souradeeppradhan7@okicici';
export const PAYEE_NAME = 'Companion';

/** Standard UPI deep link understood by every UPI app (GPay, PhonePe, Paytm, BHIM, bank apps). */
export function upiLink({ amount, note }: { amount: number; note: string }): string {
  // Keep "@" literal in the VPA and encode spaces as %20: both parse in every UPI app.
  return (
    `upi://pay?pa=${UPI_ID}` +
    `&pn=${encodeURIComponent(PAYEE_NAME)}` +
    `&am=${amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(note)}`
  );
}

/**
 * Builds a styled QR as SVG markup: rounded modules, rounded finder "eyes",
 * and a clear centre for a logo. Error correction H tolerates the centre
 * being covered, so the code stays scannable.
 */
export function qrSvg(data: string, { logoRatio = 0.22, color = '#111111' } = {}): { svg: string; size: number } {
  const qr = QRCode.create(data, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const quiet = 2;
  const total = size + quiet * 2;
  const isFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  // Keep the logo area clear (rounded to whole modules, centred).
  const logoModules = Math.ceil(size * logoRatio) | 1;
  const logoStart = Math.floor((size - logoModules) / 2);
  const inLogo = (x: number, y: number) =>
    x >= logoStart - 1 && x <= logoStart + logoModules && y >= logoStart - 1 && y <= logoStart + logoModules;

  const dots: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!qr.modules.get(x, y) || isFinder(x, y) || inLogo(x, y)) continue;
      dots.push(`<rect x="${x + quiet + 0.03}" y="${y + quiet + 0.03}" width="0.94" height="0.94" rx="0.26"/>`);
    }
  }

  const eye = (cx: number, cy: number) => {
    const ox = cx + quiet;
    const oy = cy + quiet;
    return (
      `<path fill-rule="evenodd" d="M${ox + 2} ${oy}h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm0 1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"/>` +
      `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" rx="0.9"/>`
    );
  };

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="geometricPrecision">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<g fill="${color}">${dots.join('')}${eye(0, 0)}${eye(size - 7, 0)}${eye(0, size - 7)}</g>` +
    `</svg>`;
  return { svg, size: total };
}

/** Short, human-friendly order code shown in the payment note, e.g. CMP-7K3Q. */
export function newOrderId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let index = 0; index < 4; index += 1) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CMP-${id}`;
}
