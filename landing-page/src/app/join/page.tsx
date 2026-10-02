'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import Image from 'next/image';

type State = 'idle' | 'loading' | 'success' | 'error';

export default function JoinPage() {
  const [isDark, setIsDark] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: '', url: '' });
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark(v => { localStorage.setItem('theme', !v ? 'dark' : 'light'); return !v; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
      return;
    }
    setState('loading');
    
    // Simulate API call
    setTimeout(() => {
      setState('success');
    }, 800);
  };

  const bg = isDark ? '#111111' : '#FAF9F6';
  const title = isDark ? '#FFFFFF' : '#2E2E2D';
  const sub = isDark ? '#A0A0A0' : '#6E6D6A';
  const inputBg = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const inputFocus = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
  const btnBg = isDark ? '#FFFFFF' : '#2E2E2D';
  const btnText = isDark ? '#111111' : '#FFFFFF';

  const commonInputStyles = {
    background: inputBg,
    border: `1px solid ${state === 'error' ? '#EF4444' : inputBorder}`,
    color: title,
    boxShadow: state === 'error' 
      ? '0 0 0 4px rgba(239,68,68,0.1)' 
      : isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputFocus;
    if (state !== 'error') e.currentTarget.style.boxShadow = isDark ? '0 0 0 3px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.2)' : '0 0 0 3px rgba(0,0,0,0.03), inset 0 2px 4px rgba(0,0,0,0.02)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = state === 'error' ? '#EF4444' : inputBorder;
    if (state !== 'error') e.currentTarget.style.boxShadow = isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)';
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 ease-in-out relative" style={{ backgroundColor: bg, color: title }}>
      <div className="relative z-10 flex flex-col min-h-screen">
        <NavBar isDark={isDark} onToggleDark={toggleDark} />

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
          
          <div className="w-full max-w-[440px] relative z-10 transition-all duration-500">
            {state !== 'success' ? (
              <div className="flex flex-col items-center text-center">
                {/* App Logo */}
                <div
                  className="w-16 h-16 rounded-[16px] flex shrink-0 mb-6 overflow-hidden transition-all duration-500 shadow-xl"
                  style={{ background: isDark ? '#1C1C1C' : 'white', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)' }}
                >
                  <Image src="/applogo.png" alt="Companion Logo" width={64} height={64} className="object-cover w-full h-full rounded-[14px] p-[2px]" priority />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-widest transition-colors duration-500" style={{ color: sub }}>
                    Careers
                  </span>
                </div>
                <h1 className="text-[32px] font-semibold tracking-tight mb-3 transition-colors duration-500" style={{ color: title }}>
                  Join Companion
                </h1>
                <p className="text-[14.5px] leading-[1.65] mb-8 transition-colors duration-500" style={{ color: sub }}>
                  Help us build the most delightful desktop experience. Apply for an open role below.
                </p>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5 text-left">
                  
                  <div className="flex flex-col sm:flex-row gap-3.5">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => { setFormData({...formData, name: e.target.value}); setState('idle'); }}
                      placeholder="Full Name"
                      className="w-full h-[52px] px-4 rounded-[12px] text-[14.5px] focus:outline-none transition-all duration-300 placeholder-opacity-50"
                      style={commonInputStyles}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => { setFormData({...formData, email: e.target.value}); setState('idle'); }}
                      placeholder="Email Address"
                      className="w-full h-[52px] px-4 rounded-[12px] text-[14.5px] focus:outline-none transition-all duration-300 placeholder-opacity-50"
                      style={commonInputStyles}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>

                  <div className="relative">
                    <select
                      required
                      value={formData.role}
                      onChange={e => { setFormData({...formData, role: e.target.value}); setState('idle'); }}
                      className="w-full h-[52px] px-4 rounded-[12px] text-[14.5px] focus:outline-none transition-all duration-300 appearance-none cursor-pointer"
                      style={{ 
                        ...commonInputStyles, 
                        color: formData.role ? title : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')
                      }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    >
                      <option value="" disabled>Select a Role</option>
                      <option value="Frontend Engineer" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Frontend Engineer</option>
                      <option value="Backend Engineer" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Backend Engineer</option>
                      <option value="Product Designer" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Product Designer</option>
                      <option value="Developer Advocate" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Developer Advocate</option>
                      <option value="Marketing & Growth" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Marketing & Growth</option>
                      <option value="Community Manager" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Community Manager</option>
                      <option value="Other" style={{color: isDark ? '#FFF' : '#000', background: isDark ? '#111' : '#FFF'}}>Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 opacity-50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: title }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={formData.url}
                    onChange={e => { setFormData({...formData, url: e.target.value}); setState('idle'); }}
                    placeholder="Portfolio or LinkedIn URL (Optional)"
                    className="w-full h-[52px] px-4 rounded-[12px] text-[14.5px] focus:outline-none transition-all duration-300 placeholder-opacity-50"
                    style={commonInputStyles}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />

                  {state === 'error' && (
                    <p className="text-[12px] text-red-500 mt-1 flex items-center justify-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Please fill out all required fields.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className="h-[52px] mt-2 rounded-[12px] text-[14px] font-semibold tracking-wide transition-all duration-300 hover:-translate-y-[1px] active:translate-y-[1px] flex items-center justify-center gap-2"
                    style={{ 
                      background: btnBg, 
                      color: btnText,
                      boxShadow: isDark ? '0 4px 14px rgba(255,255,255,0.1)' : '0 4px 14px rgba(0,0,0,0.1)',
                      opacity: state === 'loading' ? 0.7 : 1
                    }}
                  >
                    {state === 'loading' ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>

              </div>
            ) : (
              /* Success state */
              <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'rgba(34,197,94,0.1)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" className="w-8 h-8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>

                <h2 className="text-[24px] font-semibold tracking-[-0.02em] mb-2 transition-colors duration-500" style={{ color: title }}>
                  Application Received
                </h2>
                <p className="text-[14.5px] leading-[1.65] mb-10 transition-colors duration-500" style={{ color: sub }}>
                  Thanks for applying to Companion. Our team will review your application and be in touch soon.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
