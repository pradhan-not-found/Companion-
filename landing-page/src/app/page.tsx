'use client';

import { useState, useEffect } from 'react';
import PetShowcase from '@/components/PetShowcase';
import NavBar from '@/components/NavBar';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    try {
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_GJ4ySv8fRd1odv_mo4eLrle9Kbx-UDa8lKg68koy1CpgBS7Jul9bNUFrmpEQimafrQ/exec';
      
      await fetch(SCRIPT_URL, {
        method: 'POST',
        // 'no-cors' is required for Google Apps Script Web Apps when called directly from frontend
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      setJoined(true);
      setEmail('');
    } catch (err) {
      console.error(err);
      alert('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          {!joined ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-[380px] w-full">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className={`w-full h-[46px] px-4 rounded-[8px] border text-[14.5px] focus:outline-none transition-colors ${isDark ? 'bg-[#1C1C1C] border-white/10 text-white placeholder-[#777] focus:border-white/30' : 'bg-white border-[rgba(0,0,0,0.14)] text-[#2E2E2D] placeholder-[#AEADA8] focus:border-[rgba(46,46,45,0.4)]'}`}
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 px-4 h-[46px] rounded-[8px] text-[15px] font-medium border-2 shadow-[inset_0_0_2px_2px_rgba(255,255,255,0.07)] transition-all duration-200 group ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-[1px] cursor-pointer'} ${isDark ? 'bg-[#EDEDEC] text-black border-[#EDEDEC] hover:bg-white hover:border-white' : 'bg-[#2E2E2D] text-white border-[#2E2E2D] hover:bg-black hover:border-black'}`}
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
                {!loading && (
                  <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px] transition-transform duration-200 group-hover:translate-x-1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>
                  </svg>
                )}
              </button>
            </form>
          ) : (
            <div className={`flex items-center gap-2.5 max-w-[380px] h-[46px] px-4 rounded-[8px] border transition-colors ${isDark ? 'border-white/10 bg-white/5' : 'border-[rgba(0,0,0,0.14)] bg-[rgba(0,0,0,0.02)]'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-[15px] h-[15px] ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className={`text-[14.5px] font-medium ${isDark ? 'text-white' : 'text-[#2E2E2D]'}`}>
                Added <span className="opacity-60">{email}</span> to the waitlist
              </span>
            </div>
          )}

          <p className={`text-[12px] mt-3 font-normal tracking-[-0.01em] transition-colors duration-300 ${isDark ? 'text-[#666]' : 'text-[#9E9D9A]'}`}>
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>

        {/* ── Right: Animated Pets ── */}
        <div className="flex-1 overflow-hidden flex items-start lg:items-center justify-center px-5 sm:px-8 py-6 lg:py-4">
          <PetShowcase isDark={isDark} />
        </div>

      </main>
    </div>
  );
}
