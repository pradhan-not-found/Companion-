'use client';

import { useState, useEffect } from 'react';
import PetShowcase from '@/components/PetShowcase';
import NavBar from '@/components/NavBar';

export default function LandingPage() {
  const [stars, setStars] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark(v => {
      localStorage.setItem('theme', !v ? 'dark' : 'light');
      return !v;
    });
  };

  useEffect(() => {
    const fetchStars = () => {
      fetch('https://api.github.com/repos/pradhan-not-found/Companion-')
        .then(res => res.json())
        .then(data => {
          if (typeof data.stargazers_count === 'number') setStars(data.stargazers_count);
        })
        .catch(() => {});
    };
    fetchStars();
    const interval = setInterval(fetchStars, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden relative selection:bg-black/10 flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#111111] text-[#E0E0E0]' : 'bg-[#FAF9F6] text-[#2E2E2D]'}`}
    >
      <NavBar isDark={isDark} onToggleDark={toggleDark} stars={stars} />

      {/* Hero */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row items-center lg:items-stretch gap-0">

        {/* ── Left: Copy & CTA ── */}
        <div className={`w-full lg:w-[42%] shrink-0 flex flex-col justify-center px-10 lg:px-14 py-8 border-r transition-colors duration-300 ${isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'}`}>
          <h1 className={`text-[36px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.08] mb-4 transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`}>
            Welcome to Companion.
          </h1>

          <p className={`text-[15px] font-normal mb-7 leading-[1.75] max-w-sm transition-colors duration-300 ${isDark ? 'text-[#C0C0C0]' : 'text-[#4E4E4D]'}`}>
            A beautifully crafted desktop pet that lives on your screen.
            Stay hydrated, stay focused, never work alone.
          </p>

          <div className="flex flex-col gap-4 max-w-[380px] w-full mt-2">
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase transition-colors duration-300 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'}`}>
                Latest Release
              </span>
              <span className={`text-[13px] font-medium transition-colors duration-300 ${isDark ? 'text-[#888]' : 'text-[#666]'}`}>
                v1.0.1 • Windows
              </span>
            </div>
            
            <a
              href="https://github.com/pradhan-not-found/Companion-/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-between p-4 rounded-[12px] border transition-all duration-300 group cursor-pointer hover:-translate-y-[2px] ${isDark ? 'bg-[#1C1C1C] border-white/10 hover:border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]' : 'bg-white border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.2)] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-white/10 group-hover:bg-white/20' : 'bg-black/5 group-hover:bg-black/10'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 group-hover:translate-y-[1.5px] ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`}>
                    Download for Windows
                  </span>
                  <span className={`text-[13px] font-medium transition-colors duration-300 ${isDark ? 'text-[#888]' : 'text-[#888]'}`}>
                    meowdration.0.0.0.exe • 133.2 MB
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* ── Right: Animated Pets ── */}
        <div className="flex-1 overflow-hidden flex items-start lg:items-center justify-center px-5 sm:px-8 py-6 lg:py-4">
          <PetShowcase isDark={isDark} />
        </div>

      </main>
    </div>
  );
}
