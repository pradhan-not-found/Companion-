'use client';

import { useEffect, useState, useCallback } from 'react';

interface PetConfig {
  id: string;
  name: string;
  src: string;
  frameW: number;
  frameH: number;
  gridCols: number;
  gridRows: number;
  framesPerRow: number;
  idleRow: number;
  cropBottom: number;
  tagline: string;
  description: string;
}

const PETS: PetConfig[] = [
  { id: 'angry-cat',           name: 'Angry Cat',    src: '/pets/angry-cat/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Always grumpy, never leaving.', description: 'Reminds you to take breaks by glaring at you until you do. Surprisingly effective.' },
  { id: 'capy-puff',           name: 'Capy Puff',    src: '/pets/capy-puff/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Laid-back and unbothered.', description: 'The chillest companion. Floats through your day with zero stress and maximum vibes.' },
  { id: 'wangcai',             name: 'Wangcai',      src: '/pets/wangcai/spritesheet.webp',             frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Lucky charm, always present.', description: 'A traditional good-luck companion who promises to bring fortune to every coding session.' },
  { id: 'whaledou',            name: 'Whaledou',     src: '/pets/whaledou/spritesheet.webp',            frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Deep thoughts, shallow sea.', description: 'Drifts peacefully across your desktop, occasionally surfacing with wisdom you didn\'t ask for.' },
  { id: 'boba',                name: 'Boba',         src: '/pets/boba/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Sweet, bubbly, always refreshing.', description: 'Nudges you to drink water, take breaks, and slow down. Your designated hydration buddy.' },
  { id: 'jokebear-codexpet',   name: 'JokeBear',     src: '/pets/jokebear-codexpet/spritesheet.webp',   frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Funny, warm, and always watching.', description: 'Delivers questionable puns at exactly the wrong moment. 10/10 morale booster regardless.' },
  { id: 'daodun',              name: 'Daodun',       src: '/pets/daodun/spritesheet.webp',              frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Stubborn and determined.', description: 'Sits on your screen and refuses to move until you finish your task. Accountability unlocked.' },
  { id: 'droid',               name: 'Droid',        src: '/pets/droid/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Efficient, precise, binary at heart.', description: 'Built for productivity. Zero fluff, maximum function. Beeps softly when you\'re unfocused.' },
  { id: 'oiiai',               name: 'Oiiai',        src: '/pets/oiiai/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Rhythmic, joyful, perpetually spinning.', description: 'Spins to the beat of your keyboard. The more you type, the more it grooves.' },
  { id: 'pupu',                name: 'Pupu',         src: '/pets/pupu/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Soft, round, impossibly cute.', description: 'Does absolutely nothing stressful. Exists purely to make your workspace feel warmer.' },
  { id: 'savage-codex-hacker', name: 'Savage Codex Hacker', src: '/pets/savage-codex-hacker/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'In the zone, always shipping.', description: 'Types faster than you. Judges your commit messages. Silently proud when you ship.' },
  { id: 'round-maodie',        name: 'Round Maodie', src: '/pets/round-maodie/spritesheet.webp',        frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Round. Bouncy. Irreversibly adorable.', description: 'Rolls across your taskbar. Cannot be stopped. Has never had a bad day.' },
];

const SCALE_GRID = 0.48;
const SCALE_FOCUS = 1.5;

function PetSprite({ pet, frame, scale }: { pet: PetConfig; frame: number; scale: number }) {
  const displayW = Math.round(pet.frameW * scale);
  const displayH = Math.round(pet.frameH * scale);
  const maskH    = Math.round((pet.frameH - pet.cropBottom) * scale);
  const sheetW   = displayW * pet.gridCols;
  const sheetH   = displayH * pet.gridRows;
  const bgPosX   = -(frame % pet.framesPerRow) * displayW;
  const bgPosY   = -(pet.idleRow * displayH);
  return (
    <div style={{ width: displayW, height: maskH, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        width: displayW, height: displayH,
        backgroundImage: `url('${pet.src}')`,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }} />
    </div>
  );
}

export default function PetShowcase({ isDark = false }: { isDark?: boolean }) {
  const [frame, setFrame] = useState(0);
  const [selectedPet, setSelectedPet] = useState<PetConfig | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 180);
    return () => clearInterval(id);
  }, []);

  const openPet = useCallback((pet: PetConfig) => {
    setSelectedPet(pet);
    requestAnimationFrame(() => requestAnimationFrame(() => setFocusVisible(true)));
  }, []);

  const closePet = useCallback(() => {
    setFocusVisible(false);
    setTimeout(() => setSelectedPet(null), 320);
  }, []);

  const navigatePet = useCallback((dir: 1 | -1) => {
    if (!selectedPet) return;
    const idx = PETS.findIndex(p => p.id === selectedPet.id);
    setFocusVisible(false);
    setTimeout(() => {
      setSelectedPet(PETS[(idx + dir + PETS.length) % PETS.length]);
      requestAnimationFrame(() => requestAnimationFrame(() => setFocusVisible(true)));
    }, 160);
  }, [selectedPet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePet();
      if (e.key === 'ArrowRight') navigatePet(1);
      if (e.key === 'ArrowLeft') navigatePet(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePet, navigatePet]);

  // Dark mode color tokens
  const c = {
    title:     isDark ? '#FFFFFF' : '#2E2E2D',
    tagline:   isDark ? '#A0A0A0' : '#6E6D6A',
    body:      isDark ? '#777777' : '#9E9D9A',
    tooltip:   isDark ? '#EDEDEC' : '#2E2E2D',
    tooltipTx: isDark ? '#1C1C1B' : '#FFFFFF',
    divider:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    counter:   isDark ? '#666' : '#AEADA8',
    btn:       isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    btnBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    btnIcon:   isDark ? '#A0A0A0' : '#6E6D6A',
    btnHover:  isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    close:     isDark ? '#666' : '#AEADA8',
    closeHover:isDark ? '#ccc' : '#2E2E2D',
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Preload sprite sheets */}
      {PETS.map(pet => (
        <link key={pet.id} rel="preload" href={pet.src} as="image" />
      ))}

      {/* ── Grid View ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 transition-all duration-300 ease-out"
        style={{
          alignItems: 'end',
          opacity: focusVisible ? 0 : 1,
          filter: focusVisible ? 'blur(8px)' : 'blur(0px)',
          transform: focusVisible ? 'scale(0.96)' : 'scale(1)',
          pointerEvents: selectedPet ? 'none' : 'auto',
        }}
      >
        {PETS.map((pet) => (
          <div
            key={pet.id}
            onClick={() => openPet(pet)}
            className="group relative flex items-end justify-center cursor-pointer"
            style={{
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.13))',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0px)')}
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out z-10 translate-y-2 group-hover:translate-y-0">
              <div
                className="text-[11px] font-medium tracking-wide px-3 py-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] whitespace-nowrap relative"
                style={{ background: c.tooltip, color: c.tooltipTx, transition: 'background 0.3s, color 0.3s' }}
              >
                {pet.name}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 rounded-[1px]" style={{ background: c.tooltip, transition: 'background 0.3s' }} />
              </div>
            </div>
            <PetSprite pet={pet} frame={frame} scale={SCALE_GRID} />
          </div>
        ))}
      </div>

      {/* ── Focus Overlay ───────────────────────────────────────── */}
      {selectedPet && (
        <div className="absolute inset-0 flex items-center justify-center" onClick={closePet}>
          <div
            className="relative flex flex-col lg:flex-row items-center gap-6 lg:gap-10 px-6 lg:px-8 select-none -mt-4 lg:-mt-6 w-full max-w-sm lg:max-w-none"
            onClick={e => e.stopPropagation()}
            style={{
              opacity: focusVisible ? 1 : 0,
              filter: focusVisible ? 'blur(0px)' : 'blur(12px)',
              transform: focusVisible ? 'translateY(0px) scale(1)' : 'translateY(16px) scale(0.96)',
              transition: 'opacity 0.32s cubic-bezier(0.22,1,0.36,1), filter 0.32s ease, transform 0.32s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {/* Left — Pet sprite */}
            <div style={{ filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.18))', flexShrink: 0 }}>
              <PetSprite pet={selectedPet} frame={frame} scale={SCALE_FOCUS} />
            </div>

            {/* Divider */}
            <div className="hidden lg:block self-stretch w-px shrink-0" style={{ background: c.divider, transition: 'background 0.3s' }} />
            <div className="lg:hidden w-full h-px shrink-0 max-w-[200px]" style={{ background: c.divider, transition: 'background 0.3s' }} />

            {/* Right — Info */}
            <div className="flex flex-col gap-4 lg:gap-4 max-w-[260px] lg:max-w-[260px] items-center lg:items-start text-center lg:text-left relative w-full">
              {/* Close */}
              <button
                onClick={closePet}
                className="absolute -top-3 right-0 lg:static lg:-top-auto lg:right-auto lg:self-end w-8 h-8 lg:w-6 lg:h-6 flex items-center justify-center rounded-full transition-colors z-10"
                style={{ color: c.close }}
                onMouseEnter={e => (e.currentTarget.style.color = c.closeHover)}
                onMouseLeave={e => (e.currentTarget.style.color = c.close)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>

              <div>
                <h3
                  className="text-[22px] lg:text-[26px] font-semibold tracking-[-0.03em] leading-[1.1] transition-colors duration-300"
                  style={{ color: c.title }}
                >
                  {selectedPet.name}
                </h3>
                <p
                  className="text-[13px] font-medium mt-1.5 leading-snug tracking-[-0.01em] transition-colors duration-300"
                  style={{ color: c.tagline }}
                >
                  {selectedPet.tagline}
                </p>
              </div>

              <p
                className="text-[13px] font-normal leading-[1.75] transition-colors duration-300"
                style={{ color: c.body }}
              >
                {selectedPet.description}
              </p>

              {/* Prev / Next */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => navigatePet(-1)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                  style={{ border: `1px solid ${c.btnBorder}`, color: c.btnIcon, background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.btnHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  aria-label="Previous"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-[10px] font-medium tabular-nums" style={{ color: c.counter, transition: 'color 0.3s' }}>
                  {PETS.findIndex(p => p.id === selectedPet.id) + 1} / {PETS.length}
                </span>
                <button
                  onClick={() => navigatePet(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                  style={{ border: `1px solid ${c.btnBorder}`, color: c.btnIcon, background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.btnHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
