'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { sendToSheet } from '@/lib/sheets';

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

type Mode = 'button' | 'form' | 'sending' | 'done';

/**
 * "download for mac": the button opens an inline email field in place,
 * sends it to the waitlist sheet, confirms, then turns back into the button.
 */
export default function MacWaitlist() {
  const [mode, setMode] = useState<Mode>('button');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'form') input.current?.focus();
    if (mode !== 'done') return;
    const id = window.setTimeout(() => {
      setMode('button');
      setEmail('');
    }, 2600);
    return () => window.clearTimeout(id);
  }, [mode]);

  // Close the field when clicking elsewhere, unless something was typed.
  useEffect(() => {
    if (mode !== 'form') return;
    const away = (event: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node) && !email.trim()) setMode('button');
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [mode, email]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setInvalid(true);
      input.current?.focus();
      return;
    }
    setInvalid(false);
    setMode('sending');
    try {
      await sendToSheet({ type: 'mac-waitlist', email: email.trim().toLowerCase() });
    } catch {
      // The request is fire-and-forget (opaque response); still confirm.
    }
    setMode('done');
  }

  return (
    <div ref={wrap} className="mac-morph relative h-10" data-mode={mode}>
      {mode === 'button' ? (
        <button key="button" type="button" onClick={() => setMode('form')} className="gel gel--blue mac-swap">
          <span className="gel__shine" aria-hidden="true" />
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className="relative z-10 text-[#111]">
            <path d={APPLE_PATH} fill="currentColor" />
          </svg>
          <span className="relative z-10 text-[#111]">download for mac</span>
        </button>
      ) : null}

      {mode === 'form' || mode === 'sending' ? (
        <form key="form" onSubmit={submit} noValidate className={`mac-field mac-swap${invalid ? ' is-invalid' : ''}`}>
          <input
            ref={input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              setInvalid(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') setMode('button');
            }}
            placeholder="Email for the Mac launch"
            aria-label="Email for the Mac launch"
            aria-invalid={invalid}
            disabled={mode === 'sending'}
          />
          <button type="submit" className="mac-send" aria-label="Join the Mac waitlist" disabled={mode === 'sending'}>
            {mode === 'sending' ? (
              <span className="mac-spinner" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            )}
          </button>
        </form>
      ) : null}

      {mode === 'done' ? (
        <div key="done" className="mac-done mac-swap" role="status">
          <span className="mac-done__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          You&apos;re on the list
        </div>
      ) : null}
    </div>
  );
}
