'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

// Map of valid beta codes to download URLs
const BETA_CODES: Record<string, string> = {
  'COMPANION-BETA': 'https://github.com/pradhan-not-found/Companion-/releases/latest',
  'EARLY-ACCESS': 'https://github.com/pradhan-not-found/Companion-/releases/latest',
};

type State = 'idle' | 'success' | 'error';

export default function GetBetaPage() {
  const [isDark, setIsDark] = useState(false);
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>('idle');
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark(v => { localStorage.setItem('theme', !v ? 'dark' : 'light'); return !v; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (BETA_CODES[trimmed]) {
      setDownloadUrl(BETA_CODES[trimmed]);
      setState('success');
    } else {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const bg = isDark ? '#111111' : '#FAF9F6';
  const title = isDark ? '#FFFFFF' : '#2E2E2D';
  const sub = isDark ? '#A0A0A0' : '#6E6D6A';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBg = isDark ? '#111' : '#FAFAFA';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const inputFocus = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(46,46,45,0.4)';
  const btnBg = isDark ? '#EDEDEC' : '#2E2E2D';
  const btnText = isDark ? '#111' : '#FFF';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: bg, color: title }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">

          {state !== 'success' ? (
            <div
              className="rounded-[18px] p-8"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.4)' : '0 24px 64px rgba(0,0,0,0.07)' }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-6"
                style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: title }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>

              <h1 className="text-[20px] font-semibold tracking-[-0.02em] mb-1.5" style={{ color: title }}>
                Get Early Access
              </h1>
              <p className="text-[13px] leading-[1.7] mb-7" style={{ color: sub }}>
                Enter your beta code below to unlock the download. Don't have a code? Join the waitlist on the homepage.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value); setState('idle'); }}
                    placeholder="Enter your beta code"
                    className="w-full h-11 px-4 rounded-[9px] text-[13px] font-mono tracking-wider uppercase focus:outline-none transition-all"
                    style={{
                      background: inputBg,
                      border: `1px solid ${state === 'error' ? '#EF4444' : inputBorder}`,
                      color: title,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputFocus)}
                    onBlur={e => (e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputBorder)}
                  />
                </div>

                {state === 'error' && (
                  <p className="text-[12px] text-red-500 flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Invalid code. Please check and try again.
                  </p>
                )}

                <button
                  type="submit"
                  className="h-11 rounded-[9px] text-[13px] font-medium transition-all duration-150 hover:-translate-y-[1px] cursor-pointer"
                  style={{ background: btnBg, color: btnText }}
                >
                  Unlock Download
                </button>
              </form>

              <p className="text-[11.5px] text-center mt-5" style={{ color: isDark ? '#555' : '#C0BDB8' }}>
                Codes are case-insensitive.
              </p>
            </div>
          ) : (
            /* Success state */
            <div
              className="rounded-[18px] p-8 text-center flex flex-col items-center gap-5"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.4)' : '0 24px 64px rgba(0,0,0,0.07)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" className="w-6 h-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: title }}>You're in!</h2>
                <p className="text-[13px] mt-1.5 leading-[1.65]" style={{ color: sub }}>
                  Your code is valid. Click below to download Companion.
                </p>
              </div>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-11 px-6 rounded-[9px] text-[13px] font-medium no-underline transition-all duration-150 hover:-translate-y-[1px] w-full"
                style={{ background: btnBg, color: btnText }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Companion
              </a>

              <button
                onClick={() => { setState('idle'); setCode(''); }}
                className="text-[12px] transition-opacity hover:opacity-80"
                style={{ color: sub }}
              >
                Use a different code
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
