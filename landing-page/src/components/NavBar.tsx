'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NavBarProps {
  isDark: boolean;
  onToggleDark: () => void;
  stars?: number | null;
}

const NAV_LINKS = [
  { href: '/creator', label: 'Creator', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
  )},
  { href: '/pricing', label: 'Pricing', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  )},
  { href: '/changelog', label: 'Changelog', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
  { href: '/get-beta', label: 'Get Beta', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  )},
];

export default function NavBar({ isDark, onToggleDark, stars }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bg = isDark ? '#111111' : '#FAF9F6';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const text = isDark ? '#E0E0E0' : '#2E2E2D';
  const subtext = isDark ? '#A0A0A0' : '#6E6D6A';
  const pillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const pillBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const menuBg = isDark ? '#1C1C1B' : '#FFFFFF';
  const menuBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const menuHover = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const iconHover = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';

  return (
    <nav
      className="shrink-0 w-full py-4 px-8 flex items-center justify-between"
      style={{ borderBottom: `1px solid ${border}`, backgroundColor: bg, transition: 'background-color 0.3s, border-color 0.3s' }}
    >
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <div
          className="w-8 h-8 rounded-[8px] overflow-hidden flex shrink-0"
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.08)', background: isDark ? '#1C1C1C' : 'white', border: `1px solid ${pillBorder}` }}
        >
          <Image src="/applogo.png" alt="Companion" width={32} height={32} className="object-cover w-full h-full rounded-[6px]" />
        </div>
        <span className="font-semibold text-[17px] tracking-tight" style={{ color: text }}>Companion</span>
        <span
          className="px-2 py-[2px] rounded-full text-[10px] font-medium"
          style={{ border: `1px solid ${pillBorder}`, background: pillBg, color: subtext }}
        >Beta</span>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-5">

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:-translate-y-[1px]"
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
          className="flex items-center gap-2 hover:-translate-y-[1px] transition-all"
          style={{ color: text, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          {stars != null && <span className="text-[13px] font-medium">{stars}</span>}
        </a>

        {/* Settings dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
            style={{ background: menuOpen ? iconHover : iconBg, color: text }}
            onMouseEnter={e => (e.currentTarget.style.background = iconHover)}
            onMouseLeave={e => !menuOpen && (e.currentTarget.style.background = iconBg)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Dropdown */}
          <div
            className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-[10px] overflow-hidden z-50"
            style={{
              background: menuBg,
              border: `1px solid ${menuBorder}`,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0px) scale(1)' : 'translateY(-6px) scale(0.97)',
              pointerEvents: menuOpen ? 'auto' : 'none',
              transition: 'opacity 0.2s ease, transform 0.2s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors no-underline"
                style={{
                  color: text,
                  borderBottom: i < NAV_LINKS.length - 1 ? `1px solid ${menuBorder}` : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = menuHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: subtext }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
