'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PetStrip from '@/components/PetStrip';
import { UPI_APPS } from '@/lib/upiApps';
import { UPI_ID, newOrderId, qrSvg, upiLink } from '@/lib/upiQr';

const PRICE = 250;
const PRODUCT = 'Companion Pro';
const QR_MINUTES = 10;
// Same Apps Script as the waitlist; it receives { type: "order", ... }.
const ORDER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycby_GJ4ySv8fRd1odv_mo4eLrle9Kbx-UDa8lKg68koy1CpgBS7Jul9bNUFrmpEQimafrQ/exec';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

type Step = 'details' | 'pay' | 'confirm' | 'done';
type Field = 'email' | 'name' | 'line1' | 'city' | 'state' | 'pin' | 'utr';

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

function UpiBadge({ ink }: { ink: string }) {
  return (
    <span
      className="inline-flex items-center rounded-[5px] px-1.5 h-[20px] text-[10px] font-bold italic tracking-[0.02em]"
      style={{ border: `1px solid ${ink}`, color: ink }}
    >
      UPI
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
  const [utr, setUtr] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [orderId, setOrderId] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [touch, setTouch] = useState(false);
  const [revealed, setRevealed] = useState(false);

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

  function continueToPay(event: FormEvent) {
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
    setStep('pay');
  }

  async function submitUtr(event: FormEvent) {
    event.preventDefault();
    const clean = utr.replace(/\s+/g, '');
    if (!/^\d{12}$/.test(clean)) {
      setErrors({ utr: 'The UPI reference (UTR) is the 12-digit number in your payment receipt.' });
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          type: 'order',
          orderId,
          product: PRODUCT,
          amount: PRICE,
          email: email.trim(),
          name: name.trim(),
          address: { line1: line1.trim(), city: city.trim(), state: region, pin, country: 'India' },
          utr: clean
        })
      });
    } catch {
      // Still show confirmation; the buyer has their order ID and UTR.
    }
    setSending(false);
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
    { id: 'confirm', label: 'Confirm' }
  ];
  const stepIndex = step === 'done' ? 3 : steps.findIndex(item => item.id === step);

  const fieldClass = 'ck-field h-[42px] w-full min-w-0 rounded-[10px] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow]';
  const fieldStyle = (bad?: boolean) => ({ background: c.field, border: `1px solid ${bad ? c.error : c.border}`, color: c.text });
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
    <div className="ck min-h-screen lg:h-screen lg:overflow-hidden flex flex-col" style={{ background: c.bg, color: c.text }}>
      <style>{`
        .ck input::placeholder { color: ${c.subtle}; }
        .ck-field:focus { border-color: ${c.ink} !important; box-shadow: 0 0 0 3px ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.07)'}; }
        .ck select.ck-field { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
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

      <NavBar />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:min-h-0">
        <div className="hidden lg:block lg:min-h-0">
          <PetStrip />
        </div>

      <main className="min-h-0 lg:overflow-y-auto flex items-center justify-center px-5 sm:px-10 lg:px-14 py-8 lg:py-6">
        <div className="w-full max-w-[480px] flex flex-col gap-5">
        {/* Summary */}
        <section aria-label="Order summary">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.035em] leading-[1.1]">Get {PRODUCT}</h1>
            <span
              className="px-2 py-[2px] rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                background: 'linear-gradient(to bottom, #dbe4ff 0%, #b8cfff 100%)',
                border: '1px solid #7592fb',
                color: '#142a70',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
              }}
            >
              Beta
            </span>
          </div>
          <p className="text-[14px] mt-1.5 leading-relaxed" style={{ color: c.muted }}>
            ₹{PRICE}.00, paid once. Every companion, focus mode, Compboard and lifetime updates.
          </p>
        </section>

        {/* Payment panel */}
        <section
          aria-label="Payment"
          className="w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ background: c.card, border: `1px solid ${c.border}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04), 0 18px 44px -20px rgba(0,0,0,0.16)' }}
        >
          {/* Panel header with progress */}
          <div className="flex items-center justify-between px-6 h-[54px] shrink-0" style={{ borderBottom: `1px solid ${c.border}` }}>
            <span className="text-[14px] font-semibold">Checkout</span>
            <ol className="flex items-center gap-1.5" aria-label="Progress">
              {steps.map((item, index) => {
                const done = index < stepIndex;
                const active = index === stepIndex;
                return (
                  <li key={item.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 h-[24px] pl-1 pr-1 sm:pr-2.5 rounded-full text-[11.5px] font-medium transition-colors"
                      style={{ background: active ? c.ink : done ? c.rowActive : 'transparent', color: active ? c.inkText : done ? c.text : c.subtle }}
                      aria-current={active ? 'step' : undefined}
                    >
                      <span
                        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9.5px] font-semibold tabular-nums"
                        style={{ background: active ? c.inkText : done ? c.ink : c.field, color: active ? c.ink : done ? c.inkText : c.subtle }}
                      >
                        {done ? <Check size={9} weight={3.4} /> : index + 1}
                      </span>
                      <span className={active ? '' : 'hidden sm:inline'}>{item.label}</span>
                    </span>
                    {index < steps.length - 1 ? <span className="w-3 h-px" style={{ background: c.border }} /> : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="px-6 py-5 flex-1">
            {step === 'details' || step === 'pay' ? (
              <form key="details" className="ck-step flex flex-col" onSubmit={continueToPay} noValidate>
                {section(
                  'Contact',
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      {labelText('Email', errors.email)}
                      <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={fieldClass} style={fieldStyle(Boolean(errors.email))} aria-invalid={Boolean(errors.email)} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {labelText('Full name', errors.name)}
                      <input type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Name on the license" className={fieldClass} style={fieldStyle(Boolean(errors.name))} aria-invalid={Boolean(errors.name)} />
                    </label>
                  </div>
                )}

                {section(
                  'Billing address',
                  <>
                    <label className="flex flex-col gap-1.5">
                      {labelText('Street address', errors.line1)}
                      <input type="text" autoComplete="address-line1" value={line1} onChange={e => setLine1(e.target.value)} placeholder="House number, street, area" className={fieldClass} style={fieldStyle(Boolean(errors.line1))} aria-invalid={Boolean(errors.line1)} />
                    </label>
                    <div className="grid grid-cols-[1fr_1fr_96px] gap-3">
                      <label className="flex flex-col gap-1.5 min-w-0">
                        {labelText('City', errors.city)}
                        <input type="text" autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="City" className={fieldClass} style={fieldStyle(Boolean(errors.city))} aria-invalid={Boolean(errors.city)} />
                      </label>
                      <label className="flex flex-col gap-1.5 min-w-0">
                        {labelText('State', errors.state)}
                        <select autoComplete="address-level1" value={region} onChange={e => setRegion(e.target.value)} className={`${fieldClass} cursor-pointer`} style={{ ...fieldStyle(Boolean(errors.state)), color: region ? c.text : c.subtle }} aria-invalid={Boolean(errors.state)}>
                          <option value="" disabled>
                            Select
                          </option>
                          {INDIAN_STATES.map(item => (
                            <option key={item} value={item} style={{ color: '#1A1A1A' }}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 min-w-0">
                        {labelText('PIN', errors.pin)}
                        <input inputMode="numeric" autoComplete="postal-code" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="560001" className={`${fieldClass} tabular-nums`} style={fieldStyle(Boolean(errors.pin))} aria-invalid={Boolean(errors.pin)} />
                      </label>
                    </div>
                  </>,
                  'mt-5'
                )}

                {section(
                  'Payment method',
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-[10px] px-3.5 h-[48px] flex items-center gap-2.5" style={{ border: `1.5px solid ${c.ink}`, background: c.rowActive }}>
                      <span className="w-[16px] h-[16px] rounded-full flex items-center justify-center shrink-0" style={{ background: c.ink }}>
                        <Check size={9} color={c.inkText} weight={3.4} />
                      </span>
                      <UpiBadge ink={c.text} />
                      <span className="text-[13.5px] font-semibold">UPI</span>
                    </div>
                    <div className="rounded-[10px] px-3.5 h-[48px] flex items-center gap-2.5 opacity-50" style={{ border: `1px solid ${c.border}` }} aria-disabled="true">
                      <svg width="20" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="5" width="20" height="14" rx="2.5" />
                        <path d="M2 10h20" />
                      </svg>
                      <span className="text-[13.5px] font-semibold">Card</span>
                      <span className="text-[11px] ml-auto" style={{ color: c.muted }}>
                        Soon
                      </span>
                    </div>
                  </div>,
                  'mt-5'
                )}

                <button type="submit" className={`${primary} mt-5`} style={{ background: c.ink, color: c.inkText }}>
                  Pay ₹{PRICE}.00
                </button>
              </form>
            ) : null}

            {step === 'confirm' ? (
              <form key="confirm" className="ck-step flex flex-col" onSubmit={submitUtr} noValidate>
                <button type="button" onClick={() => setStep('pay')} className="self-start inline-flex items-center gap-1.5 text-[12.5px] font-medium cursor-pointer" style={{ color: c.muted }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m12 19-7-7 7-7" />
                    <path d="M19 12H5" />
                  </svg>
                  Back to QR
                </button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] mt-4">Confirm your payment</h2>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: c.muted }}>
                  Enter the 12-digit UPI reference number (UTR) from your receipt so we can match it to order{' '}
                  <span style={{ color: c.text }}>{orderId}</span>.
                </p>
                <label className="flex flex-col gap-1.5 mt-5">
                  {labelText('UPI reference (UTR)')}
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={utr}
                    onChange={e => setUtr(e.target.value.replace(/[^\d\s]/g, '').slice(0, 14))}
                    placeholder="e.g. 412345678901"
                    className={`${fieldClass} tracking-[0.06em] tabular-nums text-[15px]`}
                    style={fieldStyle(Boolean(errors.utr))}
                    aria-invalid={Boolean(errors.utr)}
                    autoFocus
                  />
                  <span className="text-[12px]" style={{ color: errors.utr ? c.error : c.subtle }}>
                    {errors.utr ?? 'Listed as "UPI transaction ID" or "UTR" in your UPI app.'}
                  </span>
                </label>
                <button type="submit" disabled={sending} className={`${primary} mt-5`} style={{ background: c.ink, color: c.inkText }}>
                  {sending ? 'Submitting…' : 'Submit for verification'}
                </button>
              </form>
            ) : null}

            {step === 'done' ? (
              <div key="done" className="ck-step flex flex-col items-center text-center py-6" role="status">
                <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: c.ink, color: c.inkText }}>
                  <Check size={22} weight={2.6} />
                </span>
                <h2 className="text-[19px] font-semibold tracking-[-0.025em] mt-4">Payment submitted</h2>
                <p className="text-[13.5px] mt-2 leading-relaxed max-w-[320px]" style={{ color: c.muted }}>
                  We&apos;re verifying order <span style={{ color: c.text }}>{orderId}</span>. Your license key will be emailed to{' '}
                  <span style={{ color: c.text }}>{email.trim()}</span> once it&apos;s confirmed.
                </p>
                <Link href="/" className="mt-6 h-[44px] px-6 rounded-[10px] inline-flex items-center justify-center text-[14px] font-semibold no-underline" style={{ border: `1px solid ${c.border}`, color: c.text }}>
                  Back to Companion
                </Link>
              </div>
            ) : null}
          </div>

          {/* Panel footer: order line */}
          <div className="flex items-center justify-between px-6 h-[50px] shrink-0 text-[13px]" style={{ borderTop: `1px solid ${c.border}`, background: c.field }}>
            <span className="flex items-center gap-2.5 min-w-0">
              <Image src="/applogo.png" alt="" width={22} height={22} className="rounded-[6px] shrink-0" />
              <span className="font-medium truncate">{PRODUCT}</span>
              <span style={{ color: c.subtle }}>Lifetime license</span>
            </span>
            <span className="font-semibold tabular-nums">₹{PRICE}.00</span>
          </div>
        </section>
        </div>
      </main>
      </div>

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
                  <Image src="/applogo.png" alt="Companion" width={38} height={38} className="rounded-[8px] w-full h-full" />
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

            <button type="button" disabled={!revealed || expired} onClick={() => setStep('confirm')} className={`${primary} mt-2.5`} style={{ background: c.ink, color: c.inkText }}>
              I&apos;ve completed the payment
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
