'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MacWaitlist from '@/components/MacWaitlist';
import type { Release } from '@/lib/releases';

type Platform = 'all' | 'mac' | 'windows';

const FILTERS: { id: Platform; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mac', label: 'Mac' },
  { id: 'windows', label: 'Windows' }
];

const SECTION_DOT: Record<string, string> = {
  "What's new": '#3B82F6',
  Improved: '#16A34A',
  Fixed: '#F59E0B'
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function WindowsMark() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}

function MacComingSoon() {
  return (
    <section className="cl-soon">
      <Image src="/icon-192.png" alt="" width={64} height={64} className="rounded-[16px] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)]" />
      <h2 className="mt-6 text-[26px] sm:text-[30px] font-semibold tracking-[-0.03em]">Companion for Mac is coming soon</h2>
      <p className="mt-2.5 text-[15px] leading-[1.6] text-[#6D6D6D] max-w-[420px]">
        We&apos;re bringing every companion, focus mode and the Compboard to macOS. Leave your email and we&apos;ll let you know the day it ships.
      </p>
      <div className="mt-7 flex flex-col items-center gap-1.5">
        <MacWaitlist />
        <span className="text-[11.5px] text-[#6D6D6D]">one email when it launches · no spam</span>
      </div>
    </section>
  );
}

export default function ChangelogView({ releases }: { releases: Release[] }) {
  const [platform, setPlatform] = useState<Platform>('all');
  const shown = releases.filter(release => platform === 'all' || release.platform === platform);

  return (
    <>
      <div className="flex items-center gap-2.5 mb-12 sm:mb-16" role="tablist" aria-label="Platform">
        {FILTERS.map(filter => {
          const active = filter.id === platform;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPlatform(filter.id)}
              className={`gel gel--sm ${active ? 'gel--blue' : 'gel--white'}`}
            >
              <span className="gel__shine" aria-hidden="true" />
              <span className="relative z-10">{filter.label}</span>
            </button>
          );
        })}
      </div>

      {platform === 'mac' ? (
        <MacComingSoon key="mac" />
      ) : (
        <ol key={platform} className="flex flex-col cl-fade">
          {shown.map((release, index) => (
            <li key={release.version}>
              <article className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-5 md:gap-12">
                <div className="md:sticky md:top-24 self-start flex md:flex-col items-center md:items-start gap-3 md:gap-2">
                  <span className="gel gel--blue gel--tag">
                    <span className="gel__shine" aria-hidden="true" />
                    <span className="relative z-10">{release.version}</span>
                  </span>
                  <time dateTime={release.date} className="text-[13px] text-[#8A8A8A]">
                    {formatDate(release.date)}
                  </time>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8A8A8A]">
                    <WindowsMark />
                    Windows
                  </span>
                  {release.latest ? <span className="text-[12px] font-medium text-[#16A34A]">Latest</span> : null}
                </div>

                <div className="min-w-0">
                  <div className="cl-cover">
                    <Image
                      src={release.image}
                      alt={release.imageAlt}
                      width={1600}
                      height={800}
                      sizes="(min-width: 768px) 700px, 100vw"
                      className="w-full h-auto"
                      priority={index === 0}
                    />
                  </div>

                  <h2 className="mt-8 text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] leading-[1.15]">{release.title}</h2>
                  <p className="mt-3 text-[15.5px] leading-[1.7] text-[#5F5F5D]">{release.summary}</p>

                  {release.sections.map(section => (
                    <section key={section.heading} className="mt-9">
                      <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: SECTION_DOT[section.heading] }} aria-hidden="true" />
                        {section.heading}
                      </h3>
                      <ul className="mt-3 flex flex-col divide-y divide-black/[0.06] border-y border-black/[0.06]">
                        {section.items.map(item => (
                          <li key={item.name} className="py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-6">
                            <span className="text-[14.5px] font-medium">{item.name}</span>
                            <span className="text-[14.5px] leading-[1.6] text-[#6D6D6D]">{item.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}

                  {release.latest ? (
                    <Link href="/checkout" className="gel gel--white mt-9 no-underline">
                      <span className="gel__shine" aria-hidden="true" />
                      <span className="relative z-10 inline-flex">
                        <WindowsMark />
                      </span>
                      <span className="relative z-10">download {release.version} for windows</span>
                    </Link>
                  ) : null}
                </div>
              </article>
              {index < shown.length - 1 ? <div className="h-px bg-black/[0.07] my-14 sm:my-20" /> : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
