'use client';

import { useState } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

const WINDOWS_DOWNLOAD = 'https://github.com/pradhan-not-found/Companion-/releases/latest';

const FREE_FEATURES = ['1 companion of your choice', 'Hydration and break reminders', 'Transparent desktop overlay'];

const PRO_FEATURES = [
  'Every companion, including new ones',
  'Focus mode that closes distractions',
  'Compboard with clipboard history',
  'Coding agent alerts (Claude Code, Codex)',
  'Custom avatars and companion names',
  'Lifetime updates'
];

function Check({ color }: { color: string }) {
  return (
    <svg className="mt-[3px] shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PricingPage() {
  const [isDark, setIsDark] = useState(false);

  const toggleDark = () => {
    setIsDark(v => {
      localStorage.setItem('theme', !v ? 'dark' : 'light');
      return !v;
    });
  };

  const c = {
    bg: isDark ? '#111111' : '#FFFFFF',
    text: isDark ? '#F5F5F4' : '#2E2E2D',
    muted: isDark ? '#A0A0A0' : '#6E6D6A',
    subtle: isDark ? '#6E6E6E' : '#9E9D9A',
    card: isDark ? '#181818' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    proCard: isDark ? '#F5F5F4' : '#1C1C1E',
    proText: isDark ? '#111111' : '#FFFFFF',
    proMuted: isDark ? '#5A5A5A' : 'rgba(255,255,255,0.62)'
  };

  return (
    <div className="h-dvh overflow-hidden flex flex-col transition-colors duration-300" style={{ backgroundColor: c.bg, color: c.text }}>
      <NavBar />

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 py-4">
        <div className="text-center mb-5">
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] leading-[1.05]">Pay once. Keep it forever.</h1>
          <p className="text-[14.5px] mt-2" style={{ color: c.muted }}>
            The download is free. A license is required to use Companion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-[820px]">
          {/* Free */}
          <section
            className="rounded-2xl px-6 py-5 flex flex-col min-h-0"
            style={{ background: c.card, border: `1px solid ${c.border}`, boxShadow: '0 12px 40px -20px rgba(0,0,0,0.12)' }}
          >
            <p className="text-[15px] font-semibold">Download</p>
            <p className="text-[13.5px] mt-1" style={{ color: c.muted }}>
              Free to download. A license turns it on.
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-[36px] font-semibold tracking-[-0.035em] leading-none">₹0</span>
              <span className="text-[13px]" style={{ color: c.muted }}>
                forever
              </span>
            </p>
            <ul className="flex flex-col gap-2 mt-4 mb-4 text-[13.5px] flex-1">
              {FREE_FEATURES.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <Check color={c.text} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center gap-2">
              <a href={WINDOWS_DOWNLOAD} className="gel gel--white gel--block">
                <span className="gel__shine" aria-hidden="true" />
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="relative z-10">
                  <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
                  <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
                  <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
                  <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
                </svg>
                <span className="relative z-10">download for windows</span>
              </a>
              <span className="text-[11.5px]" style={{ color: c.subtle }}>
                free download · windows 10 or higher
              </span>
            </div>
          </section>

          {/* Pro */}
          <section
            className="rounded-2xl px-6 py-5 flex flex-col relative min-h-0"
            style={{ background: c.proCard, color: c.proText, boxShadow: '0 24px 60px -24px rgba(0,0,0,0.45)' }}
          >
            <span
              className="absolute top-7 right-7 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: isDark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)', color: c.proText }}
            >
              Best value
            </span>
            <p className="text-[15px] font-semibold">Pro</p>
            <p className="text-[13.5px] mt-1" style={{ color: c.proMuted }}>
              Every feature, unlocked for life.
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-[36px] font-semibold tracking-[-0.035em] leading-none">₹250</span>
              <span className="text-[13px]" style={{ color: c.proMuted }}>
                one-time
              </span>
            </p>
            <ul className="flex flex-col gap-2 mt-4 mb-4 text-[13.5px] flex-1">
              {PRO_FEATURES.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <Check color={c.proText} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center gap-2">
              <Link href="/checkout" className="gel gel--white gel--block">
                <span className="gel__shine" aria-hidden="true" />
                <span className="relative z-10">get license</span>
              </Link>
              <span className="text-[11.5px]" style={{ color: c.proMuted }}>
                required to use · pay once, lifetime
              </span>
            </div>
          </section>
        </div>

        <p className="text-[12.5px] mt-4" style={{ color: c.subtle }}>
          No subscriptions, no renewals. Pay with any UPI app.
        </p>
      </main>
    </div>
  );
}
