import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'One Companion license, paid once: every companion, focus mode, Compboard, coding agent alerts and every future update for ₹250. No subscription.',
  alternates: { canonical: '/pricing' }
};

const INCLUDES = [
  'Every companion, including new ones',
  'Focus mode that closes distractions',
  'Compboard with clipboard history',
  'Claude Code and Codex alerts',
  'Custom avatars and companion names',
  'Every future update'
];

const STEPS: { title: string; detail: string }[] = [
  { title: 'Pay once with UPI', detail: 'Check out with Google Pay, PhonePe, Paytm or any UPI app. There is no subscription and no card needed.' },
  { title: 'Get your license key', detail: 'Once your payment is verified, your download link and license key arrive by email.' },
  { title: 'Install and unlock', detail: 'Install Companion on Windows 10 or 11 and enter your key to unlock every feature.' },
  { title: 'Keep every update', detail: 'New companions and features install from inside the app at no extra cost, for as long as Companion exists.' }
];

const FEATURES: { title: string; tint: string; detail: string; icon: ReactNode }[] = [
  {
    title: 'Every companion',
    tint: '#FFEDC7',
    detail: 'The full cast of pixel pets, plus every new one we release.',
    icon: (
      <>
        <circle cx="11" cy="4" r="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="20" cy="16" r="2" />
        <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
      </>
    )
  },
  {
    title: 'Focus mode',
    tint: '#D6E4FF',
    detail: 'Distracting tabs and games close automatically while a focus session runs.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    )
  },
  {
    title: 'Compboard',
    tint: '#FFC9DE',
    detail: 'Click your pet for quick actions and your recent clipboard history.',
    icon: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      </>
    )
  },
  {
    title: 'Coding agent alerts',
    tint: '#D7F2E1',
    detail: 'Your pet pokes you when Claude Code or Codex needs your input.',
    icon: (
      <>
        <path d="m4 17 6-6-6-6" />
        <path d="M12 19h8" />
      </>
    )
  },
  {
    title: 'Hydration and breaks',
    tint: '#E6DCFF',
    detail: 'Gentle reminders to drink water, stretch and rest your eyes.',
    icon: <path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3Z" />
  },
  {
    title: 'Lifetime updates',
    tint: '#FFDCC8',
    detail: 'Pay once and keep every improvement and fix that ships after.',
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </>
    )
  }
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Is this a subscription?', a: 'No. The license is a single payment of ₹250. You will never be charged again.' },
  { q: 'Do future updates cost extra?', a: 'No. Every update, new feature and new companion is included with your license.' },
  { q: 'How do I pay?', a: 'Scan the UPI QR at checkout with any UPI app, then enter the 12-digit UPI reference from your receipt so we can match your payment.' },
  { q: 'When do I get my license?', a: 'Your download link and license key are emailed to you as soon as the payment is verified.' },
  { q: 'Is there a Mac version?', a: 'Companion for Mac is on the way. Join the waitlist from the home page and we will email you the day it launches.' }
];

function Check() {
  return (
    <span className="pr-check" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function GetLicense({ className = '' }: { className?: string }) {
  return (
    <Link href="/checkout" className={`gel gel--blue no-underline ${className}`}>
      <span className="gel__shine" aria-hidden="true" />
      <span className="relative z-10">get license</span>
    </Link>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-[#111]">
      <NavBar />

      <main className="flex-1 w-full max-w-[1040px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <header className="max-w-[620px]">
          <h1 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.035em] leading-[1.05]">One license. Every feature.</h1>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-[#6D6D6D]">
            Companion is a one-time purchase. Pay once and keep every companion, every feature and every future update.
          </p>
        </header>

        {/* License + how it works */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 lg:gap-14 items-start">
          <div className="pr-license">
            <p className="text-[15px] font-semibold">Companion license</p>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-[52px] font-semibold tracking-[-0.045em] leading-none tabular-nums">₹250</span>
              <span className="text-[13.5px] text-[#6D6D6D]">one-time</span>
            </p>
            <p className="mt-2 text-[13.5px] text-[#6D6D6D]">No subscription. No renewals.</p>
            <GetLicense className="pr-cta mt-6" />
            <div className="pr-rule" />
            <p className="text-[13px] font-medium text-[#6D6D6D]">Includes</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {INCLUDES.map(item => (
                <li key={item} className="flex items-center gap-3 text-[14px]">
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12px] text-[#8A8A8A]">Windows 10 or 11 · Mac coming soon</p>
          </div>

          <div>
            <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.03em]">How your license works</h2>
            <ol className="pr-steps mt-7">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="pr-steps__num">{index + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold">{step.title}</p>
                    <p className="mt-1 text-[14.5px] leading-[1.6] text-[#6D6D6D]">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Everything included */}
        <section className="mt-20 sm:mt-24">
          <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.03em]">Everything in the license</h2>
          <p className="mt-2 text-[15.5px] leading-[1.6] text-[#6D6D6D]">No tiers and no add-ons. Every license unlocks all of it.</p>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(feature => (
              <li key={feature.title} className="pr-feature" style={{ background: feature.tint }}>
                <span className="pr-feature__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {feature.icon}
                  </svg>
                </span>
                <p className="mt-4 text-[15px] font-semibold">{feature.title}</p>
                <p className="mt-1 text-[14px] leading-[1.6] text-[#3F3F46]">{feature.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mt-20 sm:mt-24 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 lg:gap-14">
          <div>
            <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.03em]">Questions</h2>
            <p className="mt-2 text-[15.5px] leading-[1.6] text-[#6D6D6D]">Everything you need to know before you buy.</p>
          </div>
          <div className="pr-faq">
            {FAQ.map(item => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="pr-closing mt-20 sm:mt-24">
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em]">Never work alone.</h2>
            <p className="mt-1.5 text-[15.5px] leading-[1.6] text-[#6D6D6D]">₹250 once, and Companion is yours for good.</p>
          </div>
          <GetLicense className="pr-cta" />
        </section>
      </main>
    </div>
  );
}
