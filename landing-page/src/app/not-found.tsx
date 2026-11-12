import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import HomeCountdown from '@/components/HomeCountdown';
import WavingPupu from '@/components/WavingPupu';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-white text-[#111]">
      <NavBar />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-5 py-16">
        <WavingPupu size={104} />
        <p className="mt-6 text-[13px] font-semibold tracking-[0.12em] text-[#A1A1AA]">404</p>
        <h1 className="mt-2 text-[34px] sm:text-[44px] font-semibold tracking-[-0.035em] leading-[1.05]">This page wandered off.</h1>
        <HomeCountdown />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="gel gel--blue no-underline">
            <span className="gel__shine" aria-hidden="true" />
            <span className="relative z-10">go home</span>
          </Link>
          <Link href="/pricing" className="gel gel--white no-underline">
            <span className="gel__shine" aria-hidden="true" />
            <span className="relative z-10">see pricing</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
