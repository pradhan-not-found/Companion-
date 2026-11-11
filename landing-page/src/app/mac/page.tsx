'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import CodexHacker from '@/components/CodexHacker';
import { sendToSheet } from '@/lib/sheets';

const CHIPS = ['Apple silicon', 'Intel', 'Not sure'] as const;
type Chip = (typeof CHIPS)[number];

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

export default function MacWaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [chip, setChip] = useState<Chip>('Apple silicon');
  const [error, setError] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setState('sending');
    try {
      await sendToSheet({ type: 'mac-waitlist', email: email.trim().toLowerCase(), name: name.trim(), mac: chip });
      setState('done');
    } catch {
      setState('idle');
      setError('Something went wrong. Check your connection and try again.');
    }
  }

  const field =
    'mac-field h-[46px] w-full rounded-[12px] px-4 text-[15px] text-[#111] outline-none transition-[border-color,box-shadow] bg-[#F7F7F8] border border-black/10 placeholder:text-[#9A9A9A]';

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-white text-[#111] flex flex-col">
      <NavBar />

      <main className="flex-1 min-h-0 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[440px]">
          {state !== 'done' ? (
            <div className="ck-step">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-[16px] bg-[#111] text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)]">
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path d={APPLE_PATH} fill="currentColor" />
                </svg>
              </span>
              <h1 className="mt-6 text-[32px] sm:text-[38px] font-semibold tracking-[-0.035em] leading-[1.05]">
                Companion for Mac
              </h1>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#6D6D6D]">
                It&apos;s on the way. Join the waitlist and we&apos;ll email you the day it launches. No spam, one email.
              </p>

              <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-[#5F5F5D]">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={field}
                    style={error ? { borderColor: '#DC2626' } : undefined}
                    aria-invalid={Boolean(error)}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-[#5F5F5D]">
                    Name <span className="text-[#9A9A9A] font-normal">(optional)</span>
                  </span>
                  <input type="text" autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className={field} />
                </label>

                <fieldset className="flex flex-col gap-1.5">
                  <legend className="text-[13px] font-medium text-[#5F5F5D] mb-1.5">Your Mac</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {CHIPS.map(option => {
                      const on = chip === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setChip(option)}
                          aria-pressed={on}
                          className="h-[40px] rounded-[10px] text-[13px] font-medium cursor-pointer transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]"
                          style={{
                            background: on ? '#111' : '#FFFFFF',
                            color: on ? '#FFFFFF' : '#3A3A3A',
                            border: `1px solid ${on ? '#111' : 'rgba(0,0,0,0.12)'}`
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {error ? <p className="text-[13px] text-[#DC2626]">{error}</p> : null}

                <button type="submit" disabled={state === 'sending'} className="gel gel--blue gel--block mt-2 disabled:opacity-60">
                  <span className="gel__shine" aria-hidden="true" />
                  <span className="relative z-10">{state === 'sending' ? 'Joining…' : 'Join the Mac waitlist'}</span>
                </button>
                <p className="text-[12.5px] text-center text-[#9A9A9A]">
                  On Windows?{' '}
                  <a href="https://github.com/pradhan-not-found/Companion-/releases/latest" className="text-[#111] font-medium no-underline hover:underline">
                    Download it free
                  </a>
                </p>
              </form>
            </div>
          ) : (
            <div className="ck-step flex flex-col items-center text-center" role="status">
              <span className="text-[64px] leading-none">
                <CodexHacker pet="jokebear" width={1.4} />
              </span>
              <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.03em]">You&apos;re on the list</h1>
              <p className="mt-2 text-[15px] leading-[1.6] text-[#6D6D6D] max-w-[340px]">
                We&apos;ll email <span className="text-[#111] font-medium">{email.trim()}</span> the moment Companion for Mac is ready.
              </p>
              <Link href="/" className="gel gel--white mt-7 no-underline">
                <span className="gel__shine" aria-hidden="true" />
                <span className="relative z-10">Back to Companion</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
