'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { PETS, Sprite } from '@/components/PetStrip';

const PUPU = PETS.find(pet => pet.id === 'pupu')!;

const INCLUDES = [
  'Every companion, including new ones',
  'Focus mode that closes distractions',
  'Compboard with clipboard history',
  'Claude Code and Codex alerts',
  'Custom avatars and companion names',
  'Lifetime updates'
];

/** Emotes Pupu can pop when clicked. */
const EMOTES = [
  { label: 'love', color: '#F43F5E', path: 'M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 5.2 3 1.8-1.9 3.2-3 5.2-3 3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21Z' },
  { label: 'star', color: '#F59E0B', path: 'm12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z' },
  { label: 'music', color: '#6366F1', path: 'M9 18.5a2.5 2.5 0 1 1-2.5-2.5c.6 0 1.1.2 1.5.4V5.5l11-2v12a2.5 2.5 0 1 1-2.5-2.5c.6 0 1.1.2 1.5.4V8.1l-9 1.6v8.8Z' },
  { label: 'happy', color: '#10B981', path: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-3.5 7a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm7 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM7.6 14a.9.9 0 0 0-.8 1.3A5.9 5.9 0 0 0 12 18.2a5.9 5.9 0 0 0 5.2-2.9.9.9 0 0 0-.8-1.3H7.6Z' }
];

function Check() {
  return (
    <span className="lic-check" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

/** Pupu sitting on the card; click for a hop and a random emote. */
function PupuPerch() {
  const [frame, setFrame] = useState(0);
  const [emote, setEmote] = useState<{ index: number; key: number } | null>(null);
  const [hop, setHop] = useState(0);
  const last = useRef(-1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => value + 1), 180);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!emote) return;
    const id = window.setTimeout(() => setEmote(null), 1600);
    return () => window.clearTimeout(id);
  }, [emote]);

  function poke() {
    let index = Math.floor(Math.random() * EMOTES.length);
    if (index === last.current) index = (index + 1) % EMOTES.length;
    last.current = index;
    setEmote({ index, key: Date.now() });
    setHop(value => value + 1);
  }

  const shown = emote ? EMOTES[emote.index] : null;

  return (
    <button type="button" onClick={poke} className="lic-perch" aria-label="Pet Pupu">
      {shown ? (
        <span key={emote!.key} className="lic-emote" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill={shown.color}>
            <path d={shown.path} />
          </svg>
        </span>
      ) : null}
      <span key={hop} className={hop ? 'lic-hop block' : 'block'}>
        <Sprite pet={PUPU} frame={frame} scale={0.5} />
      </span>
    </button>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-white">
      <NavBar />

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 pt-[108px] pb-6 lg:pb-4">
        <section className="lic-window relative w-full max-w-[380px]" aria-labelledby="lic-title">
          <span className="lic-tab">
            <span className="gel__shine" aria-hidden="true" />
            <span className="relative z-10">lifetime</span>
          </span>
          <PupuPerch />

          <div className="lic-bar" aria-hidden="true">
            <span style={{ background: '#FF5F57' }} />
            <span style={{ background: '#FEBC2E' }} />
            <span style={{ background: '#28C840' }} />
          </div>

          <div className="lic-body">
            <div className="text-center px-8 pt-6">
              <h1 id="lic-title" className="text-[26px] font-semibold tracking-[-0.03em] text-[#111]">
                license
              </h1>
              <p className="mt-1.5 text-[17px] text-[#1f2937]">every feature, forever.</p>
              <p className="mt-1.5 text-[12.5px] text-[#8A8F9E]">one license for your Windows PC</p>
            </div>

            <hr className="lic-rule" />

            <div className="text-center px-8">
              <p className="text-[52px] font-semibold tracking-[-0.045em] leading-none text-[#111] tabular-nums">₹250</p>
              <p className="mt-3 text-[13.5px] text-[#3f4454]">one-time payment, no subscription</p>
              <Link href="/checkout" className="gel gel--blue mt-5 no-underline lic-cta">
                <span className="gel__shine" aria-hidden="true" />
                <span className="relative z-10">get license</span>
              </Link>
            </div>

            <hr className="lic-rule" />

            <div className="px-8 pb-7">
              <p className="text-[14px] text-[#8A8F9E]">includes</p>
              <ul className="mt-3 flex flex-col gap-2">
                {INCLUDES.map(item => (
                  <li key={item} className="flex items-center gap-3 text-[14px] leading-[20px] text-[#111] whitespace-nowrap">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <p className="mt-5 text-[12.5px] text-[#6B7080] text-center">
          Pay with any UPI app. The download link and license key arrive after checkout.
        </p>
      </main>
    </div>
  );
}
