'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import NavBar from '@/components/NavBar';

const SOCIALS = [
  {
    label: 'GitHub',
    handle: '@pradhan-not-found',
    href: 'https://github.com/pradhan-not-found',
    icon: (
      <svg viewBox="0 0 98 96" fill="currentColor" className="w-[18px] h-[18px]">
        <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    handle: '@bysoura',
    href: 'https://x.com/bysoura',
    icon: (
      <svg viewBox="0 0 1200 1227" fill="currentColor" className="w-[16px] h-[16px]">
        <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    handle: 'Souradeep Pradhan',
    href: 'https://www.linkedin.com/in/souradeep-pradhan/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    handle: '@Pradhan_Da',
    href: 'https://www.youtube.com/@Pradhan_Da',
    icon: (
      <svg viewBox="0 0 576 512" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"/>
      </svg>
    ),
  },
];

export default function CreatorPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark(v => { localStorage.setItem('theme', !v ? 'dark' : 'light'); return !v; });
  };

  const bg = isDark ? '#111111' : '#FAF9F6';
  const title = isDark ? '#FFFFFF' : '#2E2E2D';
  const sub = isDark ? '#A0A0A0' : '#6E6D6A';
  const body = isDark ? '#777' : '#9E9D9A';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const socialBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const socialBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const socialHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: bg }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-24 px-10 lg:px-24 py-16">

        {/* Left — Photo */}
        <div className="shrink-0 flex flex-col items-center lg:items-start gap-5">
          <div className="w-52 h-52 lg:w-64 lg:h-64 rounded-[24px] overflow-hidden">
            <Image src="/creator.png" alt="Souradeep Pradhan" width={256} height={256} className="object-cover w-full h-full" priority />
          </div>
        </div>

        {/* Right — Info */}
        <div className="flex flex-col gap-0 max-w-md w-full">
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase mb-3" style={{ color: body }}>Creator</p>

          <h1 className="text-[32px] lg:text-[40px] font-semibold tracking-[-0.03em] leading-[1.1] mb-2 flex items-center gap-3" style={{ color: title }}>
            Souradeep Pradhan
            <svg viewBox="0 0 24 24" className="w-6 h-6 lg:w-7 lg:h-7 shrink-0" style={{ color: isDark ? '#60A5FA' : '#1D9BF0' }} fill="currentColor">
              <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
            </svg>
          </h1>

          <p className="text-[15px] font-medium mb-4" style={{ color: sub }}>
            Building Companion
          </p>

          <p className="text-[14px] leading-[1.8] mb-8" style={{ color: body }}>
            Passionate about crafting things that sit on your screen and make the day feel a little bit better.
            Companion started as a personal project that turned into something much bigger.
          </p>

          {/* Divider */}
          <div className="h-px w-full mb-7" style={{ background: divider }} />

          {/* Social Links */}
          <div className="grid grid-cols-2 gap-2.5">
            {SOCIALS.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-[10px] no-underline transition-all duration-150 group"
                style={{ background: socialBg, border: `1px solid ${socialBorder}`, color: sub }}
                onMouseEnter={e => { e.currentTarget.style.background = socialHover; e.currentTarget.style.color = title; }}
                onMouseLeave={e => { e.currentTarget.style.background = socialBg; e.currentTarget.style.color = sub; }}
              >
                <span className="shrink-0">{s.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-medium truncate" style={{ color: title }}>{s.label}</span>
                  <span className="text-[11px] truncate" style={{ color: body }}>{s.handle}</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 ml-auto opacity-20 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
