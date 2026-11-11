import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'New features, improvements and fixes in every Companion release.',
  alternates: { canonical: '/changelog' }
};

const DOWNLOAD = 'https://github.com/pradhan-not-found/Companion-/releases/latest';

type Release = {
  version: string;
  date: string;
  title: string;
  summary: string;
  latest?: boolean;
  sections: { heading: 'New' | 'Improved' | 'Fixed'; items: { name: string; detail: string }[] }[];
};

const RELEASES: Release[] = [
  {
    version: 'v1.1.0',
    date: '2026-11-11',
    title: 'Accounts, Compboard and a smarter focus mode',
    summary:
      'The biggest update yet. Companion now knows who you are, keeps your clipboard close, guards your focus sessions and lets your pet deliver every message.',
    latest: true,
    sections: [
      {
        heading: 'New',
        items: [
          { name: 'Accounts', detail: 'Create an account, sign in and sign out. Your companion, name and progress stay with you.' },
          { name: 'Onboarding', detail: 'Pick your first companion and give it a name the first time you open the app.' },
          { name: 'Profile', detail: 'Edit your name and choose a pet avatar or upload your own photo.' },
          { name: 'Compboard', detail: 'Click your pet to open quick actions and your recent clipboard history, right beside it.' },
          { name: 'Focus mode', detail: 'Distracting tabs and games close automatically during a focus session. Add your own sites.' },
          { name: 'Coding agent alerts', detail: 'Your pet pokes you when Claude Code or Codex needs your input.' },
          { name: 'Pet check-ins', detail: 'If you have been away for a while, your companion says hello when you return.' },
          { name: 'Updates page', detail: 'See your version and install new releases from inside the app.' }
        ]
      },
      {
        heading: 'Improved',
        items: [
          { name: 'Notifications', detail: 'Reminders now arrive as speech bubbles from your pet instead of system toasts.' },
          { name: 'Movement', detail: 'Smoother walking and turning, including during focus sessions.' },
          { name: 'Dashboard', detail: 'A redesigned dashboard with trend charts, a full-width activity heatmap and a realistic water glass.' },
          { name: 'Launch at login', detail: 'Companion can start with Windows and greet you when it opens.' }
        ]
      },
      {
        heading: 'Fixed',
        items: [
          { name: 'Scaled displays', detail: 'The pet window no longer grows on displays set above 100% scaling.' },
          { name: 'Click-through', detail: 'Only your pet is clickable, so the rest of your screen works normally around it.' }
        ]
      }
    ]
  },
  {
    version: 'v1.0.1',
    date: '2026-10-02',
    title: 'Companion beta',
    summary: 'Where it all started: a pixel pet that lives on your desktop and keeps you company while you work.',
    sections: [
      {
        heading: 'New',
        items: [
          { name: 'Desktop pets', detail: 'Animated pixel companions that roam your screen while you work.' },
          { name: 'Hydration reminders', detail: 'Set a daily water goal and get gentle reminders through the day.' },
          { name: 'Break reminders', detail: 'Regular nudges to stand up, stretch and rest your eyes.' },
          { name: 'Transparent overlay', detail: 'Built for Windows to blend into your workspace without getting in the way.' }
        ]
      }
    ]
  }
];

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

const SECTION_DOT: Record<Release['sections'][number]['heading'], string> = {
  New: '#3B82F6',
  Improved: '#16A34A',
  Fixed: '#F59E0B'
};

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-[#111]">
      <NavBar />

      <main className="flex-1 w-full max-w-[920px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <header className="mb-14 sm:mb-20">
          <h1 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.035em] leading-[1.05]">Changelog</h1>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-[#6D6D6D] max-w-[480px]">
            Every new feature, improvement and fix in Companion.
          </p>
        </header>

        <ol className="flex flex-col">
          {RELEASES.map((release, index) => (
            <li key={release.version} className="relative">
              <article className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-5 md:gap-12">
                <div className="md:sticky md:top-24 self-start flex md:flex-col items-center md:items-start gap-3 md:gap-2">
                  <span className="gel gel--blue gel--tag no-underline">
                    <span className="gel__shine" aria-hidden="true" />
                    <span className="relative z-10">{release.version}</span>
                  </span>
                  <time dateTime={release.date} className="text-[13px] text-[#8A8A8A]">
                    {formatDate(release.date)}
                  </time>
                  {release.latest ? <span className="text-[12px] font-medium text-[#16A34A]">Latest</span> : null}
                </div>

                <div className="min-w-0">
                  <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.03em] leading-[1.15]">{release.title}</h2>
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
                    <a href={DOWNLOAD} className="gel gel--white mt-9 no-underline">
                      <span className="gel__shine" aria-hidden="true" />
                      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className="relative z-10">
                        <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
                        <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
                        <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
                        <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
                      </svg>
                      <span className="relative z-10">download {release.version} for windows</span>
                    </a>
                  ) : null}
                </div>
              </article>
              {index < RELEASES.length - 1 ? <div className="h-px bg-black/[0.07] my-14 sm:my-20" /> : null}
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
