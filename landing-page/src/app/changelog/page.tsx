import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import ChangelogView from '@/components/ChangelogView';
import { RELEASES } from '@/lib/releases';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'New features, improvements and fixes in every Companion release, for Windows and Mac.',
  alternates: { canonical: '/changelog' }
};

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-[#111]">
      <NavBar />
      <main className="flex-1 w-full max-w-[960px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.035em] leading-[1.05]">Changelog</h1>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-[#6D6D6D] max-w-[480px]">
            Every new feature, improvement and fix in Companion.
          </p>
        </header>
        <ChangelogView releases={RELEASES} />
      </main>
    </div>
  );
}
