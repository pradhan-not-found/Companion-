'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CheckoutSteps from '@/components/CheckoutSteps';
import StateSelect from '@/components/StateSelect';
import { UPI_APPS } from '@/lib/upiApps';
import { UPI_ID, newOrderId, qrSvg, upiLink } from '@/lib/upiQr';
import { sendToSheet } from '@/lib/sheets';

const PRICE = 250;
const PRODUCT = 'Companion license';
const QR_MINUTES = 10;

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

type Step = 'details' | 'pay' | 'done';
type Field = 'email' | 'name' | 'line1' | 'city' | 'state' | 'pin';

function AppMarks({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Google Pay, PhonePe, Paytm and any UPI app">
      {UPI_APPS.map(app => (
        <span
          key={app.title}
          title={app.title}
          className="inline-flex items-center justify-center rounded-[7px] bg-white"
          style={{ width: size + 10, height: size + 10, border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <path d={app.path} fill={app.hex} />
          </svg>
        </span>
      ))}
    </span>
  );
}

function Check({ size = 10, color = 'currentColor', weight = 3.2 }: { size?: number; color?: string; weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function CheckoutPage() {
  const [isDark] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [orderId, setOrderId] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [touch, setTouch] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    // Browser-only values, applied after the first paint to keep hydration stable.
    const frame = requestAnimationFrame(() => {
      setOrderId(newOrderId());
      setTouch(window.matchMedia('(pointer: coarse)').matches);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (step !== 'pay' || !revealed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, revealed]);

  useEffect(() => {
    if (step !== 'pay') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStep('details');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const link = useMemo(() => (orderId ? upiLink({ amount: PRICE, note: `${PRODUCT} ${orderId}` }) : ''), [orderId]);
  const qr = useMemo(() => (link ? qrSvg(link).svg : ''), [link]);
  const remaining = Math.max(0, deadline - now);
  const expired = step === 'pay' && revealed && deadline > 0 && remaining === 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  const c = {
    bg: isDark ? '#0E0E10' : '#FFFFFF',
    text: isDark ? '#F5F5F4' : '#1A1A1A',
    muted: isDark ? '#A1A1A1' : '#6B6B6B',
    subtle: isDark ? '#6E6E6E' : '#9A9A9A',
    card: isDark ? '#17171A' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
    field: isDark ? '#1F1F23' : '#F7F7F8',
    ink: isDark ? '#F5F5F4' : '#18181B',
    inkText: isDark ? '#111111' : '#FFFFFF',
    rowActive: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.025)',
    error: '#DC2626'
  };

  async function continueToPay(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Invalid email';
    if (!name.trim()) next.name = 'Required';
    if (!line1.trim()) next.line1 = 'Required';
    if (!city.trim()) next.city = 'Required';
    if (!region) next.state = 'Required';
    if (!/^[1-9]\d{5}$/.test(pin)) next.pin = 'Invalid';
    setErrors(next);
    if (Object.keys(next).length) return;
    // One license per email: stop before payment if this email already owns one.
    try {
      const response = await fetch('/api/license/owned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const body = (await response.json()) as { owned?: boolean };
      if (body.owned) {
        setErrors({ email: 'Already licensed' });
        return;
      }
    } catch {
      // If the check can't run, the server still refuses duplicates.
    }
    setStep('pay');
  }

  async function submitOrder() {
    if (sending) return;
    setSending(true);
    try {
      await sendToSheet({
        type: 'order',
        orderId,
        product: PRODUCT,
        amount: PRICE,
        email: email.trim(),
        name: name.trim(),
        address: { line1: line1.trim(), city: city.trim(), state: region, pin, country: 'India' }
      });
    } catch {
      // Still show confirmation; the buyer has their order reference.
    }
    setSending(false);
    setNoticeOpen(true);
    setStep('done');
  }

  function revealQr() {
    setDeadline(Date.now() + QR_MINUTES * 60_000);
    setNow(Date.now());
    setRevealed(true);
  }

  function restartQr() {
    setOrderId(newOrderId());
    setDeadline(Date.now() + QR_MINUTES * 60_000);
    setNow(Date.now());
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

  const steps: { id: Step; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'pay', label: 'Payment' },
    { id: 'done', label: 'Verification' }
  ];
  const stepIndex = steps.findIndex(item => item.id === step);

  const inputClass = (error?: string) => `ck-input${error ? ' is-invalid' : ''}`;
  const primary =
    'h-[46px] w-full rounded-[10px] text-[14.5px] font-semibold cursor-pointer transition-[transform,opacity] active:scale-[0.985] hover:opacity-90 disabled:opacity-40 disabled:cursor-default';

  const labelText = (text: string, error?: string) => (
    <span className="flex items-center justify-between text-[12.5px] font-medium" style={{ color: c.muted }}>
      {text}
      {error ? <span style={{ color: c.error }}>{error}</span> : null}
    </span>
  );

  const section = (title: string, children: ReactNode, extra = '') => (
    <fieldset className={`flex flex-col gap-3 ${extra}`}>
      <legend className="text-[13px] font-semibold mb-2.5">{title}</legend>
      {children}
    </fieldset>
  );

  return (
    <div className="ck min-h-dvh flex flex-col" style={{ background: c.bg, color: c.text }}>
      <style>{`
        .ck input::placeholder { color: ${c.subtle}; }
        .ck-reveal { animation: ckReveal 700ms cubic-bezier(0.16,1,0.3,1) both; }
        .ck-step { animation: ckStep 360ms cubic-bezier(0.16,1,0.3,1) both; }
        .ck-backdrop { animation: ckFade 240ms ease both; }
        .ck-dialog { animation: ckDialog 380ms cubic-bezier(0.16,1,0.3,1) both; }
        .ck-veil-btn { transition: transform 200ms ease; }
        .ck-veil:hover .ck-veil-btn { transform: translateY(-1px); }
        .ck-veil:active .ck-veil-btn { transform: scale(0.97); }
        @keyframes ckReveal { from { opacity: 0.25; filter: blur(12px); transform: scale(0.96); } to { opacity: 1; filter: blur(0); transform: none; } }
        @keyframes ckStep { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes ckFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ckDialog { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .ck-reveal, .ck-step, .ck-backdrop, .ck-dialog { animation: none; } }
      `}</style>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:min-h-dvh">
        {/* Order summary */}
        <aside className="ck-panel relative lg:sticky lg:top-0 lg:h-dvh flex flex-col px-6 sm:px-10 lg:px-14 pt-6 pb-8 lg:py-10">
          <section aria-label="Order summary" className="w-full max-w-[400px] lg:my-auto lg:mx-auto">
            <h2 className="text-[22px] font-semibold tracking-[-0.025em] text-[#18181B]">Companion license</h2>
            <p className="mt-2 text-[40px] sm:text-[44px] font-semibold tracking-[-0.035em] leading-none tabular-nums text-[#18181B]">₹{PRICE}.00</p>

            <div className="mt-8 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-[10px] overflow-hidden shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                <Image src="/icon-192.png" alt="" width={44} height={44} className="w-full h-full object-cover" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-[#18181B]">{PRODUCT}</span>
                <span className="block text-[12.5px] text-[#71717A]">Lifetime · every feature and update</span>
              </span>
              <span className="text-[14px] font-semibold tabular-nums text-[#18181B]">₹{PRICE}.00</span>
            </div>

            <dl className="ck-summary mt-6">
              <div>
                <dt>Subtotal</dt>
                <dd>₹{PRICE}.00</dd>
              </div>
              <div>
                <dt>Taxes</dt>
                <dd className="text-[#71717A]">Included</dd>
              </div>
              <div className="ck-summary__total">
                <dt>Total due today</dt>
                <dd>₹{PRICE}.00</dd>
              </div>
            </dl>

            <p className="mt-6 text-[12.5px] leading-relaxed text-[#71717A]">
              Includes every companion, focus mode, Compboard, coding agent alerts and lifetime updates. Your download link and
              license key are emailed once the payment is verified.
            </p>
          </section>
        </aside>

        {/* Checkout */}
        <main className="flex justify-center px-6 sm:px-10 lg:px-16 py-8 lg:py-12">
          <div className="w-full max-w-[460px] my-auto">
            <h1 className="sr-only">Checkout</h1>
            <CheckoutSteps steps={steps.map(item => item.label)} current={stepIndex} />

            <div className="mt-9">
            {step === 'details' || step === 'pay' ? (
              <form key="details" className="ck-step flex flex-col" onSubmit={event => void continueToPay(event)} noValidate>
                {section(
                  'Contact',
                  <div className="grid grid-cols-1 gap-3">
                    <label className="flex flex-col gap-1.5">
                      {labelText('Email', errors.email)}
                      <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass(errors.email)} aria-invalid={Boolean(errors.email)} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {labelText('Full name', errors.name)}
                      <input type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={inputClass(errors.name)} aria-invalid={Boolean(errors.name)} />
                    </label>
                  </div>
                )}

                {section(
                  'Billing address',
                  <>
                    <label className="flex flex-col gap-1.5">
                      {labelText('Street address', errors.line1)}
                      <input type="text" autoComplete="address-line1" value={line1} onChange={e => setLine1(e.target.value)} className={inputClass(errors.line1)} aria-invalid={Boolean(errors.line1)} />
                    </label>
                    <div className="grid grid-cols-[1fr_1fr_96px] gap-3">
                      <label className="flex flex-col gap-1.5 min-w-0">
                        {labelText('City', errors.city)}
                        <input type="text" autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} className={inputClass(errors.city)} aria-invalid={Boolean(errors.city)} />
                      </label>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {labelText('State', errors.state)}
                        <StateSelect label="State" value={region} options={INDIAN_STATES} onChange={setRegion} invalid={Boolean(errors.state)} />
                      </div>
                      <label className="flex flex-col gap-1.5 min-w-0">
                        {labelText('PIN', errors.pin)}
                        <input inputMode="numeric" autoComplete="postal-code" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass(errors.pin)} tabular-nums`} aria-invalid={Boolean(errors.pin)} />
                      </label>
                    </div>
                  </>,
                  'mt-5'
                )}

                {section(
                  'Payment method',
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="ck-method is-selected">
                      <span className="ck-method__radio" aria-hidden="true" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/upi.svg" alt="UPI" height={16} className="h-[16px] w-auto" />
                    </div>
                    <div className="ck-method is-disabled" aria-disabled="true">
                      <span className="ck-method__radio" aria-hidden="true" />
                      <span className="text-[13.5px] font-semibold">Card</span>
                      <span className="text-[11px] ml-auto" style={{ color: c.muted }}>
                        Soon
                      </span>
                    </div>
                  </div>,
                  'mt-5'
                )}

                <button type="submit" className={`${primary} mt-6`} style={{ background: c.ink, color: c.inkText }}>
                  Pay ₹{PRICE}.00
                </button>
              </form>
            ) : null}

            {step === 'done' ? (
              <div key="done" className="ck-step flex flex-col items-center text-center py-6" role="status">
                <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: c.ink, color: c.inkText }}>
                  <Check size={22} weight={2.6} />
                </span>
                <h2 className="text-[19px] font-semibold tracking-[-0.025em] mt-4">Payment under verification</h2>
                <p className="text-[13.5px] mt-2 leading-relaxed max-w-[340px]" style={{ color: c.muted }}>
                  We&apos;re confirming order <span style={{ color: c.text }}>{orderId}</span>. This usually takes about 10 minutes. Your license key and
                  download link will be emailed to <span style={{ color: c.text }}>{email.trim()}</span>.
                </p>
                <Link href="/" className="mt-6 h-[44px] px-6 rounded-[10px] inline-flex items-center justify-center text-[14px] font-semibold no-underline" style={{ border: `1px solid ${c.border}`, color: c.text }}>
                  Back to Companion
                </Link>
              </div>
            ) : null}
          </div>

          </div>
        </main>
      </div>


      {/* Verification popup */}
      {step === 'done' && noticeOpen ? (
        <div className="pay-backdrop" onClick={() => setNoticeOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="verify-title" className="pay-dialog" onClick={event => event.stopPropagation()}>
            <span className="verify-ring" aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="25" fill="none" stroke="#E4E4E7" strokeWidth="3" />
                <circle className="verify-ring__arc" cx="28" cy="28" r="25" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" pathLength="100" />
              </svg>
              <svg className="verify-ring__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <h2 id="verify-title" className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">
              Payment received
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed max-w-[330px] text-[#6B6B6B]">
              Your payment is being verified. This usually takes about 10 minutes, and your license key arrives by email at{' '}
              <span className="text-[#18181B]">{email.trim()}</span>.
            </p>
            <p className="mt-4 text-[12px] text-[#9A9A9A]">Order {orderId}</p>
            <button type="button" onClick={() => setNoticeOpen(false)} className="pay-primary mt-6">
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {/* Payment dialog */}
      {step === 'pay' ? (
        <div className="ck-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,10,12,0.48)', backdropFilter: 'blur(4px)' }} onClick={() => setStep('details')}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ck-pay-title"
            className="ck-dialog relative w-full max-w-[420px] rounded-2xl px-7 pt-9 pb-6 flex flex-col items-center text-center"
            style={{ background: c.card, color: c.text, border: `1px solid ${c.border}`, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.45)' }}
            onClick={event => event.stopPropagation()}
          >
            <button type="button" onClick={() => setStep('details')} aria-label="Close" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-black/5" style={{ color: c.muted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 id="ck-pay-title" className="text-[19px] font-semibold tracking-[-0.02em]">
              Authorize payment with your app
            </h2>
            <p className="text-[13px] mt-1.5 leading-relaxed max-w-[320px]" style={{ color: c.muted }}>
              Reveal the QR code, open your preferred UPI app and follow the instructions to pay ₹{PRICE}.00.
            </p>

            <div className="relative mt-5 rounded-2xl p-3 bg-white" style={{ border: `1px solid ${c.border}`, boxShadow: '0 8px 24px -14px rgba(0,0,0,0.25)' }}>
              <div
                key={`${orderId}-${revealed}`}
                className={`relative w-[200px] h-[200px] overflow-hidden ${!revealed ? 'blur-[9px] opacity-40' : expired ? 'opacity-15 blur-[3px]' : 'ck-reveal'}`}
                aria-hidden={!revealed}
              >
                <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[11px] bg-white p-[4px]" style={{ width: 46, height: 46 }}>
                  <Image src="/icon-192.png" alt="Companion" width={38} height={38} className="rounded-[8px] w-full h-full" />
                </span>
              </div>
              {!revealed ? (
                <button type="button" onClick={revealQr} className="ck-veil absolute inset-0 flex items-center justify-center cursor-pointer rounded-2xl">
                  <span className="ck-veil-btn inline-flex items-center gap-2 h-[38px] px-4 rounded-full text-[13px] font-semibold" style={{ background: '#18181B', color: '#FFFFFF', boxShadow: '0 8px 20px -8px rgba(0,0,0,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Click to reveal QR
                  </span>
                </button>
              ) : null}
              {expired ? (
                <button type="button" onClick={restartQr} className="absolute inset-0 m-auto w-[150px] h-[40px] rounded-full text-[13px] font-semibold cursor-pointer" style={{ background: '#18181B', color: '#FFFFFF' }}>
                  Generate new QR
                </button>
              ) : null}
            </div>

            <p className="text-[12px] mt-3 h-[16px] tabular-nums font-medium" style={{ color: expired ? c.error : c.subtle }}>
              {!revealed ? `Valid for ${QR_MINUTES} minutes once revealed` : expired ? 'This QR has expired' : `Expires in ${mm}:${ss}`}
            </p>

            <p className="text-[13px] font-semibold mt-4">UPI is supported in multiple apps</p>
            <div className="mt-2.5">
              <AppMarks size={16} />
            </div>

            <div className="w-full flex items-center justify-between mt-5 rounded-[10px] px-3.5 h-[40px] text-[12.5px]" style={{ background: c.field, border: `1px solid ${c.border}` }}>
              <span className="truncate">
                <span style={{ color: c.muted }}>UPI ID&nbsp;&nbsp;</span>
                {UPI_ID}
              </span>
              <button type="button" onClick={copyUpi} className="font-semibold cursor-pointer shrink-0 ml-3" style={{ color: c.text }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {touch && revealed && !expired ? (
              <a href={link} className="w-full mt-2.5 h-[44px] rounded-[10px] inline-flex items-center justify-center text-[14px] font-semibold no-underline" style={{ border: `1px solid ${c.border}`, color: c.text }}>
                Open UPI app
              </a>
            ) : null}

            <button type="button" disabled={!revealed || expired || sending} onClick={() => void submitOrder()} className={`${primary} mt-2.5`} style={{ background: c.ink, color: c.inkText }}>
              {sending ? 'Submitting…' : 'I’ve completed the payment'}
            </button>

            <p className="text-[11.5px] mt-4" style={{ color: c.subtle }}>
              Order {orderId}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
