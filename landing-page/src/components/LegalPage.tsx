import type { ReactNode } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

export type LegalSection = { title: string; body: ReactNode };

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Shared layout for the privacy policy and terms: a calm, readable column with a contents list. */
export default function LegalPage({
  title,
  summary,
  updated,
  sections
}: {
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh bg-white text-[#111] flex flex-col">
      <NavBar />
      <main className="flex-1 w-full max-w-[1040px] mx-auto px-5 sm:px-10 py-12 sm:py-16">
        <header className="max-w-[640px]">
          <p className="text-[12.5px] text-[#8a8a8a]">Last updated {updated}</p>
          <h1 className="mt-2 text-[34px] sm:text-[42px] font-semibold tracking-[-0.04em] leading-[1.05]">{title}</h1>
          <p className="mt-4 text-[15px] leading-[1.6] text-[#6d6d6d]">{summary}</p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Contents" className="legal-toc hidden lg:block">
            <p className="text-[12px] font-semibold text-[#111]">Contents</p>
            <ol className="mt-3 flex flex-col gap-2">
              {sections.map(section => (
                <li key={section.title}>
                  <a href={`#${slug(section.title)}`} className="text-[13px] text-[#737373] no-underline hover:text-[#111]">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal-body max-w-[680px]">
            {sections.map((section, index) => (
              <section key={section.title} id={slug(section.title)} className="scroll-mt-20">
                <h2>
                  <span className="legal-body__num">{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </h2>
                {section.body}
              </section>
            ))}
          </article>
        </div>
      </main>
      <footer className="border-t border-[#ececec]">
        <div className="max-w-[1040px] mx-auto px-5 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#8a8a8a]">
          <span>© 2026 Companion. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="no-underline text-[#8a8a8a] hover:text-[#111]">
              Privacy
            </Link>
            <Link href="/terms" className="no-underline text-[#8a8a8a] hover:text-[#111]">
              Terms
            </Link>
            <Link href="/" className="no-underline text-[#8a8a8a] hover:text-[#111]">
              Home
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
