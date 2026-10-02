'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import PetShowcase from '@/components/PetShowcase';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const fetchStars = () => {
      fetch('https://api.github.com/repos/pradhan-not-found/Companion-')
        .then(res => res.json())
        .then(data => {
          if (typeof data.stargazers_count === 'number') {
            setStars(data.stargazers_count);
          }
        })
        .catch(() => {});
    };

    fetchStars(); // Fetch immediately on mount
    const interval = setInterval(fetchStars, 60_000); // Re-sync every 60s
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setJoined(true);
      setEmail('');
    }
  };

  return (
    <div
      className={`h-screen overflow-hidden relative selection:bg-black/10 flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#111111] text-[#E0E0E0]' : 'bg-[#FAF9F6] text-[#2E2E2D]'}`}
    >
      <nav className={`shrink-0 w-full py-4 px-8 flex items-center justify-between border-b transition-colors duration-300 ${isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[8px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)] border flex shrink-0 ${isDark ? 'bg-[#1C1C1C] border-white/10' : 'bg-white border-black/5'}`}>
            <Image src="/applogo.png" alt="Companion" width={32} height={32} className="object-cover w-full h-full rounded-[6px]" />
          </div>
          <span className="font-semibold text-[17px] tracking-tight">Companion</span>
          <span className={`px-2 py-[2px] rounded-full border text-[10px] font-medium transition-colors duration-300 ${isDark ? 'border-white/10 bg-white/5 text-[#A0A0A0]' : 'border-black/10 bg-black/[0.03] text-[#6E6D6A]'}`}>Beta</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:-translate-y-[1px] ${isDark ? 'bg-white/10 text-[#E0E0E0] hover:bg-white/20' : 'bg-black/5 text-[#2E2E2D] hover:bg-black/10'}`}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[15px] h-[15px]" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          <a href="https://github.com/pradhan-not-found/Companion-" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 hover:-translate-y-[1px] transition-all opacity-70 hover:opacity-100 ${isDark ? 'text-[#E0E0E0] hover:text-white' : 'text-[#2E2E2D] hover:text-black'}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          {stars !== null && (
            <span className="text-[13px] font-medium tracking-wide">
              {stars}
            </span>
          )}
        </a>
        </div>
      </nav>

      {/* Hero — fills remaining height */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row items-center lg:items-stretch gap-0">

        {/* ── Left: Copy & CTA ─────────────────────────────── */}
        <div className={`w-full lg:w-[42%] shrink-0 flex flex-col justify-center px-10 lg:px-14 py-8 border-r transition-colors duration-300 ${isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'}`}>
          <h1 className={`text-[36px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.08] mb-4 transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`}>
            Welcome to Companion.
          </h1>

          <p className={`text-[14px] font-light mb-7 leading-[1.7] max-w-sm transition-colors duration-300 ${isDark ? 'text-[#A0A0A0]' : 'text-[#6E6D6A]'}`}>
            A beautifully crafted desktop pet that lives on your screen.
            Stay hydrated, stay focused, never work alone.
          </p>

          {!joined ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className={`flex-1 h-[40px] px-3.5 rounded-[5px] border text-[13px] focus:outline-none transition-colors ${isDark ? 'bg-[#1C1C1C] border-white/10 text-white placeholder-[#777] focus:border-white/30' : 'bg-white border-[rgba(0,0,0,0.14)] text-[#2E2E2D] placeholder-[#AEADA8] focus:border-[rgba(46,46,45,0.4)]'}`}
              />
              <button
                type="submit"
                className={`inline-flex items-center justify-center gap-1.5 px-4 h-[40px] rounded-[5px] text-[13px] font-medium border-2 hover:-translate-y-[1px] shadow-[inset_0_0_2px_2px_rgba(255,255,255,0.07)] transition-all duration-200 cursor-pointer group shrink-0 ${isDark ? 'bg-[#EDEDEC] text-black border-[#EDEDEC] hover:bg-white hover:border-white' : 'bg-[#2E2E2D] text-white border-[#2E2E2D] hover:bg-black hover:border-black'}`}
              >
                Join Waitlist
                <svg viewBox="0 0 24 24" fill="none" className="w-[13px] h-[13px] transition-transform duration-200 group-hover:translate-x-1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>
                </svg>
              </button>
            </form>
          ) : (
            <div className={`flex items-center gap-2 max-w-sm h-[40px] px-3.5 rounded-[5px] border transition-colors ${isDark ? 'border-white/10 bg-white/5' : 'border-[rgba(0,0,0,0.14)] bg-[rgba(0,0,0,0.02)]'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-[14px] h-[14px] ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className={`text-[13px] font-medium ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`}>
                Added <span className="opacity-60">{email}</span> to the waitlist
              </span>
            </div>
          )}

          <p className={`text-[11px] mt-3 font-light transition-colors duration-300 ${isDark ? 'text-[#777]' : 'text-[#AEADA8]'}`}>
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>

        {/* ── Right: Animated Pets ──────────────────────────── */}
        <div className="flex-1 overflow-hidden flex items-center justify-center px-8 py-4">
          <PetShowcase isDark={isDark} />
        </div>

      </main>
    </div>
  );
}
