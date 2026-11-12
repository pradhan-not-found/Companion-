'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/adminpanel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        window.location.reload();
        return;
      }
      setError(data.error ?? 'Could not sign in.');
    } catch {
      setError('Network error. Try again.');
    }
    setBusy(false);
    setPassword('');
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA] px-5">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={44} height={44} className="rounded-[11px] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.4)]" />
          <span className="text-[22px] font-semibold tracking-[-0.03em] text-[#18181B]">Companion</span>
        </div>
        {configured ? (
          <form onSubmit={submit} className="mt-10 flex flex-col gap-3" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-[#6B6B6B]">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className={`ck-input${error ? ' is-invalid' : ''}`}
                autoFocus
              />
            </label>
            {error ? <p className="text-[13px] text-[#DC2626]">{error}</p> : null}
            <button type="submit" disabled={busy || !password} className="gel gel--black pr-cta mt-2 disabled:opacity-50">
              <span className="gel__shine" aria-hidden="true" />
              <span className="relative z-10">{busy ? 'signing in…' : 'sign in'}</span>
            </button>
          </form>
        ) : (
          <p className="mt-3 text-[14px] leading-[1.6] text-[#6B6B6B]">
            The admin panel isn&apos;t set up yet. Add ADMIN_PASSWORD, ADMIN_SESSION_SECRET and SHEETS_ADMIN_KEY to the environment variables, then redeploy.
          </p>
        )}
      </div>
    </div>
  );
}
