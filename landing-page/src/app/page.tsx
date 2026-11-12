'use client';

import Image from 'next/image';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import PetStrip from '@/components/PetStrip';
import CodexHacker from '@/components/CodexHacker';
import AskAI from '@/components/AskAI';
import MacWaitlist from '@/components/MacWaitlist';


export default function LandingPage() {


  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-white text-[#111] flex flex-col">
      <NavBar />

      <div className="flex-1 grid grid-rows-[240px_auto] sm:grid-rows-[300px_auto] lg:grid-rows-1 lg:grid-cols-2 lg:min-h-0">
      <PetStrip />

      <section className="min-h-0 flex flex-col justify-between px-5 sm:px-12 lg:px-16 py-7 sm:py-9">
        <div className="flex flex-col justify-center lg:flex-1">
          <div className="flex items-center gap-2.5 mb-6">
            <Image src="/icon-192.png" alt="" width={36} height={36} className="rounded-[9px]" priority />
            <span className="text-[18px] font-semibold tracking-[-0.04em] leading-none">Companion</span>
          </div>
          <h1 className="font-semibold tracking-[-0.05em] leading-[0.92] text-[clamp(38px,9.4vw,78px)] lg:text-[clamp(52px,6.1vw,78px)]">
            <span className="relative inline-block">
              Never work
              <CodexHacker pet="jokebear" width={0.8} className="absolute left-full bottom-[0.02em] ml-[0.02em]" />
            </span>
            <br />
            <span className="relative inline-block">
              alone.
              <CodexHacker width={0.8} className="absolute left-full bottom-[0.02em] ml-[0.14em]" />
            </span>
          </h1>
          <p className="mt-4 text-[15px] leading-[1.55] text-[#6d6d6d]">
            A desktop pet that lives on your screen. Stay hydrated,
            <br className="hidden sm:block" /> stay focused, and keep company while you work.
          </p>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start gap-x-4 gap-y-3">
            <div className="flex flex-col items-center gap-1.5">
              <MacWaitlist />
              <span className="text-[11.5px] leading-none text-center text-[#111]">coming soon · mac</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Link href="/checkout" className="gel gel--white no-underline">
                <span className="gel__shine" aria-hidden="true" />
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className="relative z-10">
                  <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
                  <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
                  <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
                  <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
                </svg>
                <span className="relative z-10">download for windows</span>
              </Link>
              <span className="text-[11.5px] leading-none text-center text-[#111]">lifetime license · windows 10 or higher</span>
            </div>
          </div>


          </div>
        </div>

        <div>
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-[#8a8a8a]">
            <span>© 2026 Companion. All rights reserved.</span>
            <AskAI />
          </footer>
        </div>
      </section>
      </div>
    </div>
  );
}
