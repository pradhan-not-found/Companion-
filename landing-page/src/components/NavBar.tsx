'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavBarProps {
  isDark?: boolean;
  onToggleDark?: () => void;
  stars?: number | null;
}

const NAV_LINKS = [
  { href: '/creator', label: 'Creator' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/sponsor', label: 'Sponsor' },
];

export default function NavBar({ isDark = false, onToggleDark }: NavBarProps) {
  const pathname = usePathname();
  const text = isDark ? '#F5F5F5' : '#111111';
  const quiet = isDark ? '#9A9A9A' : '#737373';
  const bg = isDark ? '#0E0E0E' : '#FFFFFF';
  const line = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';

  return (
    <header
      className="shrink-0 h-14 px-4 sm:px-7 flex items-center gap-5 sm:gap-7 border-b"
      style={{ background: bg, borderColor: line }}
    >
      <Link href="/" className="flex items-center gap-2 h-full no-underline shrink-0" style={{ color: text }}>
        <Image src="/icon-192.png" alt="" width={24} height={24} className="block rounded-[6px]" priority />
        <span className="text-[16px] font-semibold tracking-[-0.04em] leading-none">Companion</span>
      </Link>

      <nav className="flex items-center h-full gap-4 sm:gap-5 min-w-0 overflow-x-auto [scrollbar-width:none]" aria-label="Primary">
        {NAV_LINKS.map(link => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className="relative inline-flex items-center h-full text-[13px] leading-none no-underline whitespace-nowrap"
              style={{
                color: active ? text : quiet,
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.01em',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center h-full gap-2 shrink-0">
        {onToggleDark ? (
          <button
            onClick={onToggleDark}
            className="w-8 h-8 inline-flex items-center justify-center cursor-pointer"
            style={{ color: quiet }}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" />
              </svg>
            )}
          </button>
        ) : null}
        <Link
          href="/checkout"
          className="h-8 px-3.5 rounded-full inline-flex items-center text-[13px] font-medium no-underline whitespace-nowrap"
          style={{ color: text, border: `1px solid ${line}` }}
        >
          Get license
        </Link>
      </div>
    </header>
  );
}
