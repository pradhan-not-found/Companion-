'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import UpiPayDialog from '@/components/UpiPayDialog';
import CodexHacker from '@/components/CodexHacker';
import { PETS, Sprite } from '@/components/PetStrip';
import { SPONSORS } from '@/lib/sponsors';
import { sendToSheet } from '@/lib/sheets';
import { newOrderId } from '@/lib/upiQr';

const MIN = 1;
const MAX = 100000;
const PRESETS = [100, 500, 1000, 2500];
const LOGO_MAX_BYTES = 500 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const SLOTS = 10;
const GITHUB = 'https://github.com/pradhan-not-found/Companion-';
const X_PROFILE = 'https://x.com/bysoura';
// Pupu's waving loop (row 3 of its sheet), cut into its own strip.
const MASCOT = {
  ...PETS.find(pet => pet.id === 'pupu')!,
  src: '/sprites/pupu-wave.webp',
  gridCols: 4,
  gridRows: 1,
  framesPerRow: 4
};

type Step = 'closed' | 'details' | 'pay' | 'confirm' | 'done';
type Mode = 'sponsor' | 'tip';
type Field = 'amount' | 'name' | 'email' | 'company' | 'website' | 'logo' | 'utr';

const inr = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function domainOf(url: string) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function Mascot() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => value + 1), 200);
    return () => window.clearInterval(id);
  }, []);
  return <Sprite pet={MASCOT} frame={frame} scale={0.2} />;
}

const PlusIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 4.5v15M4.5 12h15" />
  </svg>
);

export default function SponsorPage() {
  const [step, setStep] = useState<Step>('closed');
  const [mode, setMode] = useState<Mode>('sponsor');
  const [slot, setSlot] = useState<number | null>(null);
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [logo, setLogo] = useState<{ dataUrl: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [utr, setUtr] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [reference, setReference] = useState('');
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const total = custom ? Number(custom) : amount;
  const sponsor = mode === 'sponsor';
  const sheetOpen = step === 'details' || step === 'confirm' || step === 'done';

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && step !== 'done') setStep('closed');
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen, step]);

  function open(nextMode: Mode, index: number | null) {
    setMode(nextMode);
    setSlot(index);
    setErrors({});
    setUtr('');
    if (nextMode === 'tip') {
      setAmount(100);
      setCustom('');
    }
    setReference(newOrderId().replace('CMP', nextMode === 'tip' ? 'TIP' : 'SPN'));
    setStep('details');
  }

  function close() {
    setStep('closed');
    setSlot(null);
  }

  function readLogo(file: File | undefined) {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setErrors(current => ({ ...current, logo: 'Use PNG, JPG, SVG or WebP' }));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setErrors(current => ({ ...current, logo: 'Keep it under 500 KB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo({ dataUrl: String(reader.result), name: file.name });
      setErrors(current => ({ ...current, logo: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function continueToPay(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!Number.isInteger(total) || total < MIN) next.amount = 'Enter an amount';
    else if (total > MAX) next.amount = `UPI allows up to ${inr(MAX)} at once`;
    if (!name.trim()) next.name = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Invalid email';
    if (sponsor && !company.trim()) next.company = 'Required';
    if (sponsor && !logo) next.logo = 'Add your logo';
    if (sponsor && website.trim() && !domainOf(website.trim())) next.website = 'Invalid link';
    setErrors(next);
    if (Object.keys(next).length) return;
    setStep('pay');
  }

  async function submitUtr(event: FormEvent) {
    event.preventDefault();
    const clean = utr.replace(/\s+/g, '');
    if (!/^\d{12}$/.test(clean)) {
      setErrors({ utr: 'Enter the 12-digit UTR from your receipt' });
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await sendToSheet({
        type: 'sponsor',
        orderId: reference,
        amount: total,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: sponsor ? company.trim() : '',
        website: sponsor ? website.trim() : '',
        feature: sponsor,
        message: message.trim(),
        logoName: sponsor ? (logo?.name ?? '') : '',
        logo: sponsor ? (logo?.dataUrl ?? '') : '',
        utr: clean
      });
    } catch {
      // Opaque request; the sponsor still has their reference and UTR.
    }
    setSending(false);
    setStep('done');
  }

  const label = (text: string, error?: string, hint?: string) => (
    <span className="flex items-center justify-between text-[12.5px] font-medium text-[#6B6B6B]">
      <span>
        {text}
        {hint ? <span className="font-normal text-[#A1A1AA]"> {hint}</span> : null}
      </span>
      {error ? <span className="text-[#DC2626]">{error}</span> : null}
    </span>
  );
  const input = (error?: string) => `ck-input${error ? ' is-invalid' : ''}`;

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-white text-[#18181B]">
      <NavBar />

      <main className="flex-1 min-h-0 flex items-center justify-center px-5 py-8">
        <section className="sp-card relative w-full max-w-[600px]" aria-labelledby="sp-title">
          <span className="sp-side sp-side--left" aria-hidden="true">
            <CodexHacker pet="hacker" width={1.5} />
          </span>
          <span className="sp-side sp-side--right" aria-hidden="true">
            <CodexHacker pet="jokebear" width={1.5} />
          </span>
          <h1 id="sp-title" className="flex items-center gap-1.5 text-[28px] font-semibold tracking-[-0.035em]">
            Sponsors.
            <span className="inline-flex -mb-1" aria-hidden="true">
              <Mascot />
            </span>
          </h1>
          <p className="mt-3 text-[16px] leading-[1.6] font-medium text-[#3F3F46] max-w-[480px]">
            You just found the most important part of the website. Companion is made by one developer and sponsored by:
          </p>

          <ul className="sp-grid mt-8">
            {Array.from({ length: SLOTS }, (_, index) => {
              const filled = SPONSORS[index];
              if (filled) {
                return (
                  <li key={index}>
                    <a href={filled.url ?? '#'} target="_blank" rel="noopener noreferrer sponsored" className="sp-tile is-filled" aria-label={filled.name} title={filled.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={filled.logo} alt="" />
                    </a>
                  </li>
                );
              }
              const previewing = slot === index && sheetOpen && sponsor && logo;
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => open('sponsor', index)}
                    className={`sp-tile is-empty${previewing ? ' is-preview' : ''}`}
                    aria-label="Sponsor Companion and add your logo here"
                  >
                    {previewing ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo!.dataUrl} alt="" />
                    ) : (
                      <PlusIcon />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-9 flex items-end justify-between gap-6">
            <p className="text-[16px] leading-[1.6] font-medium text-[#3F3F46]">
              Thank you all.
              <br />
              Souradeep.
            </p>
            <div className="flex items-center gap-2.5">
              <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="sp-mini" aria-label="Star Companion on GitHub" title="Star on GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <button type="button" onClick={() => open('tip', null)} className="sp-mini" aria-label="Send a tip with UPI" title="Send a tip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                  <path d="M6 2v2M10 2v2M14 2v2" />
                </svg>
              </button>
              <a href={X_PROFILE} target="_blank" rel="noopener noreferrer" className="sp-mini" aria-label="Follow on X" title="Follow on X">
                <svg width="15" height="15" viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
                  <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      {sheetOpen ? (
        <div className="sp-backdrop" onClick={step === 'done' ? close : () => setStep('closed')}>
          <div role="dialog" aria-modal="true" aria-labelledby="sp-sheet-title" className="sp-sheet" onClick={event => event.stopPropagation()}>
            <button type="button" onClick={close} aria-label="Close" className="pay-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {step === 'details' ? (
              <form onSubmit={continueToPay} noValidate className="sp-form sp-step">
                <div className="sp-form__side">
                  <span className={`sp-tile sp-tile--lg${sponsor && logo ? ' is-preview' : sponsor ? ' is-empty' : ' sp-tile--warm'}`} aria-hidden="true">
                    {sponsor && logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo.dataUrl} alt="" />
                    ) : sponsor ? (
                      <PlusIcon />
                    ) : (
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                        <path d="M6 2v2M10 2v2M14 2v2" />
                      </svg>
                    )}
                  </span>
                  <p className="mt-4 text-[15px] font-semibold truncate">{sponsor ? company.trim() || 'Your company' : 'A tip for Companion'}</p>
                  <p className="text-[12.5px] text-[#71717A] truncate">{sponsor ? domainOf(website.trim()) || 'Sponsor of Companion' : 'Thank you for the coffee'}</p>

                  <div className="mt-6 flex flex-col gap-1.5">
                    {label('Amount', errors.amount)}
                    <div className="sp-amounts" role="radiogroup" aria-label="Amount">
                      {PRESETS.map(value => {
                        const on = !custom && amount === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              setAmount(value);
                              setCustom('');
                              setErrors(current => ({ ...current, amount: undefined }));
                            }}
                            className={on ? 'is-on' : ''}
                          >
                            {inr(value)}
                          </button>
                        );
                      })}
                      <span className={`sp-amounts__custom${custom ? ' is-on' : ''}`}>
                        <span aria-hidden="true">₹</span>
                        <input
                          inputMode="numeric"
                          value={custom}
                          aria-label="Your own amount"
                          placeholder="Your own amount"
                          onChange={event => {
                            setCustom(event.target.value.replace(/[^\d]/g, '').slice(0, 6));
                            setErrors(current => ({ ...current, amount: undefined }));
                          }}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sp-form__main">
                  <h2 id="sp-sheet-title" className="text-[20px] font-semibold tracking-[-0.025em]">
                    {sponsor ? 'Sponsor Companion' : 'Send a tip'}
                  </h2>
                  <p className="mt-1 text-[13px] text-[#71717A]">
                    {sponsor ? 'Your logo takes this slot once the payment is verified.' : 'A small thank-you that keeps Companion going.'}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      {label('Full name', errors.name)}
                      <input autoComplete="name" value={name} onChange={event => setName(event.target.value)} className={input(errors.name)} aria-invalid={Boolean(errors.name)} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {label('Email', errors.email)}
                      <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={input(errors.email)} aria-invalid={Boolean(errors.email)} />
                    </label>
                    {sponsor ? (
                      <>
                        <label className="flex flex-col gap-1.5">
                          {label('Company', errors.company)}
                          <input autoComplete="organization" value={company} onChange={event => setCompany(event.target.value)} className={input(errors.company)} aria-invalid={Boolean(errors.company)} />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          {label('Website', errors.website, '(optional)')}
                          <input type="url" autoComplete="url" value={website} onChange={event => setWebsite(event.target.value)} className={input(errors.website)} aria-invalid={Boolean(errors.website)} />
                        </label>
                      </>
                    ) : null}
                  </div>

                  {sponsor ? (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {label('Logo', errors.logo, '(square, up to 500 KB)')}
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        onDragOver={event => {
                          event.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={event => {
                          event.preventDefault();
                          setDragging(false);
                          readLogo(event.dataTransfer.files[0]);
                        }}
                        className={`sp-drop${dragging ? ' is-dragging' : ''}${errors.logo ? ' is-invalid' : ''}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 16V4" />
                          <path d="m6 10 6-6 6 6" />
                          <path d="M4 20h16" />
                        </svg>
                        <span className="min-w-0 truncate">
                          <span className="font-semibold text-[#18181B]">{logo ? 'Replace logo' : 'Upload logo'}</span>
                          <span className="text-[#A1A1AA]"> {logo ? `· ${logo.name}` : 'or drop it here'}</span>
                        </span>
                      </button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept={LOGO_TYPES.join(',')}
                        className="hidden"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          readLogo(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </div>
                  ) : (
                    <label className="mt-3 flex flex-col gap-1.5">
                      {label('Message', undefined, '(optional)')}
                      <textarea value={message} onChange={event => setMessage(event.target.value.slice(0, 280))} rows={3} className="ck-input sp-textarea" />
                    </label>
                  )}

                  <button type="submit" className="gel gel--blue pr-cta mt-5">
                    <span className="gel__shine" aria-hidden="true" />
                    <span className="relative z-10">
                      {sponsor ? 'sponsor' : 'send'} {Number.isFinite(total) && total > 0 ? inr(total) : ''}
                    </span>
                  </button>
                  <p className="mt-2.5 text-[11.5px] text-center text-[#A1A1AA]">
                    Pay with any UPI app.{sponsor ? ' Logos are reviewed before they go live.' : ''}
                  </p>
                </div>
              </form>
            ) : null}

            {step === 'confirm' ? (
              <form onSubmit={submitUtr} noValidate className="flex flex-col sp-step">
                <h2 id="sp-sheet-title" className="text-[22px] font-semibold tracking-[-0.025em]">
                  Confirm your payment
                </h2>
                <p className="text-[13.5px] mt-1.5 leading-relaxed text-[#71717A]">
                  Enter the 12-digit UPI reference (UTR) from your receipt so we can match your {inr(total)} payment to {reference}.
                </p>
                <label className="flex flex-col gap-1.5 mt-5">
                  {label('UPI reference (UTR)', errors.utr)}
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={utr}
                    onChange={event => setUtr(event.target.value.replace(/[^\d\s]/g, '').slice(0, 14))}
                    className={`${input(errors.utr)} tracking-[0.06em] tabular-nums`}
                    aria-invalid={Boolean(errors.utr)}
                    autoFocus
                  />
                </label>
                <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                  <button type="button" onClick={() => setStep('pay')} className="h-[46px] px-4 rounded-[10px] border border-[#E4E4E7] text-[14px] font-semibold cursor-pointer hover:bg-[#FAFAFA]">
                    Back to QR
                  </button>
                  <button type="submit" disabled={sending} className="pay-primary">
                    {sending ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : null}

            {step === 'done' ? (
              <div className="flex flex-col items-center text-center py-6 sp-step" role="status">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-[#18181B] text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h2 id="sp-sheet-title" className="text-[22px] font-semibold tracking-[-0.025em] mt-5">
                  Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}
                </h2>
                <p className="text-[14px] mt-2 leading-relaxed max-w-[340px] text-[#71717A]">
                  We&apos;re verifying {reference}.
                  {sponsor ? ` Once it's confirmed, ${company.trim() || 'your company'} takes its slot and we'll email you.` : ' We really appreciate it.'}
                </p>
                <Link href="/" className="gel gel--white mt-7 no-underline">
                  <span className="gel__shine" aria-hidden="true" />
                  <span className="relative z-10">Back to Companion</span>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 'pay' ? (
        <UpiPayDialog
          amount={total}
          note={`Companion ${sponsor ? 'sponsor' : 'tip'} ${reference}`}
          reference={reference}
          onClose={() => setStep('details')}
          onPaid={() => setStep('confirm')}
        />
      ) : null}
    </div>
  );
}
