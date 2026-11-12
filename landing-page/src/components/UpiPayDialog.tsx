'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { UPI_APPS } from '@/lib/upiApps';
import { UPI_ID, qrSvg, upiLink } from '@/lib/upiQr';

const QR_MINUTES = 10;

function AppMarks() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Google Pay, PhonePe, Paytm and any UPI app">
      {UPI_APPS.map(app => (
        <span key={app.title} title={app.title} className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px] bg-white border border-black/[0.08]">
          <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
            <path d={app.path} fill={app.hex} />
          </svg>
        </span>
      ))}
    </span>
  );
}

/**
 * UPI payment dialog: click to reveal the QR (valid for 10 minutes), pay in any
 * UPI app, then confirm. Used by the sponsor page.
 */
export default function UpiPayDialog({
  amount,
  note,
  reference,
  onClose,
  onPaid,
  busy = false
}: {
  amount: number;
  note: string;
  reference: string;
  onClose: () => void;
  onPaid: () => void;
  busy?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [touch, setTouch] = useState(false);

  const link = useMemo(() => upiLink({ amount, note }), [amount, note]);
  const qr = useMemo(() => qrSvg(link).svg, [link]);
  const remaining = Math.max(0, deadline - now);
  const expired = revealed && deadline > 0 && remaining === 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  const rupees = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTouch(window.matchMedia('(pointer: coarse)').matches));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [revealed]);

  function startTimer() {
    setDeadline(Date.now() + QR_MINUTES * 60_000);
    setNow(Date.now());
    setRevealed(true);
  }

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="pay-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pay-title" className="pay-dialog" onClick={event => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="pay-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 id="pay-title" className="text-[19px] font-semibold tracking-[-0.02em]">
          Authorize payment with your app
        </h2>
        <p className="text-[13px] mt-1.5 leading-relaxed max-w-[320px] text-[#6B6B6B]">
          Reveal the QR code, open your preferred UPI app and pay ₹{rupees}.
        </p>

        <div className="relative mt-5 rounded-2xl p-3 bg-white border border-black/[0.09] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.25)]">
          <div
            key={`${revealed}-${deadline}`}
            className={`relative w-[200px] h-[200px] overflow-hidden ${!revealed ? 'blur-[9px] opacity-40' : expired ? 'opacity-15 blur-[3px]' : 'pay-reveal'}`}
            aria-hidden={!revealed}
          >
            <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[11px] bg-white p-[4px] w-[46px] h-[46px]">
              <Image src="/icon-192.png" alt="Companion" width={38} height={38} className="rounded-[8px] w-full h-full" />
            </span>
          </div>
          {!revealed ? (
            <button type="button" onClick={startTimer} className="pay-veil">
              <span className="pay-veil__btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Click to reveal QR
              </span>
            </button>
          ) : null}
          {expired ? (
            <button type="button" onClick={startTimer} className="pay-veil">
              <span className="pay-veil__btn">Generate new QR</span>
            </button>
          ) : null}
        </div>

        <p className={`text-[12px] mt-3 h-[16px] tabular-nums font-medium ${expired ? 'text-[#DC2626]' : 'text-[#9A9A9A]'}`}>
          {!revealed ? `Valid for ${QR_MINUTES} minutes once revealed` : expired ? 'This QR has expired' : `Expires in ${mm}:${ss}`}
        </p>

        <p className="text-[13px] font-semibold mt-4">UPI is supported in multiple apps</p>
        <div className="mt-2.5">
          <AppMarks />
        </div>

        <div className="w-full flex items-center justify-between mt-5 rounded-[10px] px-3.5 h-[40px] text-[12.5px] bg-[#F7F7F8] border border-black/[0.09]">
          <span className="truncate">
            <span className="text-[#6B6B6B]">UPI ID&nbsp;&nbsp;</span>
            {UPI_ID}
          </span>
          <button type="button" onClick={copyUpi} className="font-semibold cursor-pointer shrink-0 ml-3">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {touch && revealed && !expired ? (
          <a href={link} className="w-full mt-2.5 h-[44px] rounded-[10px] inline-flex items-center justify-center text-[14px] font-semibold no-underline text-[#18181B] border border-black/[0.09]">
            Open UPI app
          </a>
        ) : null}

        <button type="button" disabled={!revealed || expired || busy} onClick={onPaid} className="pay-primary mt-2.5">
          {busy ? 'Submitting…' : 'I’ve completed the payment'}
        </button>

        <p className="text-[11.5px] mt-4 text-[#9A9A9A]">Reference {reference}</p>
      </div>
    </div>
  );
}
