'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import NavBar from '@/components/NavBar';



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
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: bg }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col max-w-[800px] mx-auto px-6 lg:px-8 py-16 lg:py-24 w-full">
        
        {/* Header */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-[100px] h-[100px] rounded-full overflow-hidden shrink-0 shadow-sm border bg-white" style={{ borderColor: divider }}>
            <Image src="/creator.png" alt="Souradeep Pradhan" width={100} height={100} className="object-cover w-full h-full" priority />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[30px] font-medium tracking-tight flex items-center gap-2" style={{ color: title }}>
              Souradeep Pradhan
              <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] shrink-0" style={{ color: '#1D9BF0', marginTop: '2px' }} fill="currentColor">
                <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
              </svg>
            </h1>
            <p className="text-[17px] font-medium" style={{ color: '#4b5563' }}>
              Founder & Creator of Companion
            </p>
          </div>
        </div>

        {/* Content Stack */}
        <div className="flex flex-col gap-10 text-[18.5px] leading-[1.8] font-normal" style={{ color: title }}>
          <p>
            I built Companion for a very simple, personal reason: she loves cats, and I loved creating something special just for her. What started as a heartfelt project has grown into a little desktop friend designed to sit on your screen and make every day feel a little bit better.
          </p>

          <p>
            Reach me via{' '}
            <a href="mailto:pradhan@example.com" className="inline-flex items-center mx-1 text-[20px] translate-y-[4px] hover:underline" style={{ color: title }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <strong className="ml-1.5 text-[18.5px] font-semibold">email</strong>
            </a>{' '}
            · see my code and contributions on{' '}
            <a href="https://github.com/pradhan-not-found" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-1 text-[20px] translate-y-[4px] hover:underline" style={{ color: title }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <strong className="ml-1.5 text-[18.5px] font-semibold">GitHub</strong>
            </a>.
          </p>

          <p>
            Find me on{' '}
            <a href="https://www.linkedin.com/in/souradeep-pradhan/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-1 text-[20px] translate-y-[4px] hover:opacity-70 transition-opacity" style={{ color: title }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>,{' '}
            <a href="https://x.com/bysoura" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-1 text-[17px] translate-y-[3px] hover:opacity-70 transition-opacity" style={{ color: title }}>
              <svg viewBox="0 0 1200 1227" width="17" height="17" fill="currentColor"><path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"/></svg>
            </a>{' '}
            and{' '}
            <a href="https://www.youtube.com/@Pradhan_Da" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mx-1 text-[20px] translate-y-[4px] hover:opacity-70 transition-opacity" style={{ color: title }}>
              <svg viewBox="0 0 576 512" fill="currentColor" width="20" height="20">
                <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"/>
              </svg>
            </a>.
          </p>
        </div>
      </main>
    </div>
  );
}
