'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NavBarProps {
  isDark: boolean;
  onToggleDark: () => void;
  stars?: number | null;
}

const NAV_LINKS = [
  { href: '/creator', label: 'creator' },
  { href: '/pricing', label: 'pricing' },
  { href: '/changelog', label: 'changelog' },
  { href: '/get-beta', label: 'get beta' },
  { href: '/join', label: 'careers' },
];

export default function NavBar({ isDark, onToggleDark, stars }: NavBarProps) {
  const bg = isDark ? '#111111' : '#FAF9F6';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const text = isDark ? '#E0E0E0' : '#2E2E2D';
  const subtext = isDark ? '#A0A0A0' : '#6E6D6A';
  const linkText = isDark ? '#888888' : '#888888'; // Off-white / mute gray with no hover
  const pillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const pillBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const iconHover = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';

  return (
    <nav
      className="shrink-0 w-full py-4 px-6 lg:px-8 flex flex-wrap items-center justify-between relative gap-y-4"
      style={{ borderBottom: `1px solid ${border}`, backgroundColor: bg, transition: 'background-color 0.5s ease, border-color 0.5s ease' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 w-auto">
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          <div
            className="w-8 h-8 rounded-[8px] overflow-hidden flex shrink-0 transition-colors duration-500"
            style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.08)', background: isDark ? '#1C1C1C' : 'white', border: `1px solid ${pillBorder}` }}
          >
            <Image src="/applogo.png" alt="Companion" width={32} height={32} className="object-cover w-full h-full rounded-[6px]" priority />
          </div>
          <span className="font-semibold text-[17px] tracking-tight transition-colors duration-500" style={{ color: text }}>Companion</span>
          <span
            className="px-2 py-[2px] rounded-full text-[10px] font-semibold inline-block shadow-sm tracking-wide"
            style={{
              background: 'linear-gradient(to bottom, #dbe4ff 0%, #b8cfff 100%)',
              border: '1px solid #7592fb',
              color: '#142a70',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
            }}
          >Beta</span>
        </Link>
      </div>

      {/* Center: Inline Links (Perfectly centered on desktop, wraps below on mobile) */}
      <div className="flex md:absolute md:left-1/2 md:-translate-x-1/2 items-center justify-start md:justify-center gap-5 lg:gap-8 order-3 md:order-none w-full md:w-auto overflow-x-auto no-scrollbar pt-2 md:pt-0">
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13.5px] font-medium no-underline transition-colors duration-500 whitespace-nowrap cursor-pointer hover:text-foreground"
            style={{ color: linkText }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 md:gap-5 order-2 md:order-none ml-auto md:ml-0 shrink-0">

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:-translate-y-[1px]"
          style={{ background: iconBg, color: text }}
          onMouseEnter={e => (e.currentTarget.style.background = iconHover)}
          onMouseLeave={e => (e.currentTarget.style.background = iconBg)}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

        {/* GitHub */}
        <a
          href="https://github.com/pradhan-not-found/Companion-"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:-translate-y-[1px] transition-all duration-300"
          style={{ color: text, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          {stars != null && <span className="text-[13px] font-medium transition-colors duration-500">{stars}</span>}
        </a>
      </div>
    </nav>
  );
}
