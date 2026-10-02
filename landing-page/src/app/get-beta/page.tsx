'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  const inputBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const inputFocus = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
  const btnBg = isDark ? '#FFFFFF' : '#2E2E2D';
  const btnText = isDark ? '#111111' : '#FFFFFF';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 ease-in-out" style={{ backgroundColor: bg, color: title }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        
        {/* Subtle background glow - keep centered or move to left? Let's move it to the left slightly */}
        <div className="absolute top-1/2 left-[30%] -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-20 transition-opacity duration-700"
             style={{ 
               background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 60%)' : 'radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 60%)'
             }} 
        />

        <div className="w-full max-w-4xl relative z-10 transition-all duration-500">
          {state !== 'success' ? (
            <div className="flex flex-col items-start text-left max-w-[480px]">
              <div className="flex items-center gap-6 mb-10">
                {/* App Logo */}
                <div
                  className="w-20 h-20 rounded-[20px] flex shrink-0 overflow-hidden transition-all duration-500 shadow-xl"
                  style={{ background: isDark ? '#1C1C1C' : 'white', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)' }}
                >
                  <Image src="/applogo.png" alt="Companion Logo" width={80} height={80} className="object-cover w-full h-full rounded-[18px] p-[2px]" />
                </div>
                
                {/* Text & Beta Tag */}
                <div className="flex flex-col">
                  <h1 className="text-[26px] font-semibold tracking-[-0.02em] mb-1.5 transition-colors duration-500 flex items-center gap-3" style={{ color: title }}>
                    Companion
                    <span
                      className="px-2.5 py-[3px] rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors duration-500"
                      style={{ border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: sub }}
                    >
                      Beta
                    </span>
                  </h1>
                  <p className="text-[14px] leading-[1.65] max-w-[280px] transition-colors duration-500" style={{ color: sub }}>
                    Enter your invitation code below to unlock the download.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value); setState('idle'); }}
                    placeholder="Enter your beta code..."
                    className="w-full h-[52px] px-5 rounded-[12px] text-[15px] focus:outline-none transition-all duration-300"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${state === 'error' ? '#EF4444' : inputBorder}`,
                      color: title,
                      boxShadow: state === 'error' 
                        ? '0 0 0 4px rgba(239,68,68,0.1)' 
                        : isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputFocus;
                      if (state !== 'error') e.currentTarget.style.boxShadow = isDark ? '0 0 0 3px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.2)' : '0 0 0 3px rgba(0,0,0,0.03), inset 0 2px 4px rgba(0,0,0,0.02)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputBorder;
                      if (state !== 'error') e.currentTarget.style.boxShadow = isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)';
                    }}
                  />
                  {state === 'error' && (
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                       <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" className="w-5 h-5" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="h-[52px] rounded-[12px] text-[14px] font-semibold tracking-wide transition-all duration-300 hover:-translate-y-[1px] active:translate-y-[1px]"
                  style={{ 
                    background: btnBg, 
                    color: btnText,
                    boxShadow: isDark ? '0 4px 14px rgba(255,255,255,0.1)' : '0 4px 14px rgba(0,0,0,0.1)' 
                  }}
                >
                  Unlock Download
                </button>
              </form>

              <p className="text-[12px] mt-5 transition-colors duration-500" style={{ color: isDark ? '#555' : '#C0BDB8' }}>
                Press Enter to submit
              </p>
            </div>
          ) : (
            /* Success state */
            <div className="flex flex-col items-start text-left animate-in fade-in zoom-in duration-500 max-w-[480px]">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(34,197,94,0.1)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" className="w-8 h-8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <h2 className="text-[24px] font-semibold tracking-[-0.02em] mb-2 transition-colors duration-500" style={{ color: title }}>
                Code Accepted
              </h2>
              <p className="text-[14.5px] leading-[1.65] mb-10 transition-colors duration-500" style={{ color: sub }}>
                You're officially in. Download Companion below.
              </p>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-[12px] text-[14px] font-semibold transition-all duration-300 hover:-translate-y-[1px] w-auto inline-flex no-underline"
                style={{ 
                  background: btnBg, 
                  color: btnText,
                  boxShadow: isDark ? '0 4px 14px rgba(255,255,255,0.1)' : '0 4px 14px rgba(0,0,0,0.1)' 
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download for Windows
              </a>

              <button
                onClick={() => { setState('idle'); setCode(''); }}
                className="text-[12.5px] font-medium transition-opacity hover:opacity-80 mt-8"
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
