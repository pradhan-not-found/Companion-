'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
  { id: 'angry-cat',           name: 'Angry Cat',     src: '/pets/angry-cat/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Always grumpy, never leaving.',          description: 'Reminds you to take breaks by glaring at you until you do. Surprisingly effective.' },
  { id: 'capy-puff',           name: 'Capy Puff',     src: '/pets/capy-puff/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Laid-back and unbothered.',              description: 'The chillest companion. Floats through your day with zero stress and maximum vibes.' },
  { id: 'wangcai',             name: 'Wangcai',       src: '/pets/wangcai/spritesheet.webp',             frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Lucky charm, always present.',            description: 'A traditional good-luck companion who promises to bring fortune to every coding session.' },
  { id: 'whaledou',            name: 'Whaledou',      src: '/pets/whaledou/spritesheet.webp',            frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Deep thoughts, shallow sea.',            description: "Drifts peacefully across your desktop, occasionally surfacing with wisdom you didn't ask for." },
  { id: 'boba',                name: 'Boba',          src: '/pets/boba/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Sweet, bubbly, always refreshing.',       description: 'Nudges you to drink water, take breaks, and slow down. Your designated hydration buddy.' },
  { id: 'jokebear-codexpet',   name: 'JokeBear',      src: '/pets/jokebear-codexpet/spritesheet.webp',   frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Funny, warm, and always watching.',      description: 'Delivers questionable puns at exactly the wrong moment. 10/10 morale booster regardless.' },
  { id: 'daodun',              name: 'Daodun',        src: '/pets/daodun/spritesheet.webp',              frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Stubborn and determined.',               description: 'Sits on your screen and refuses to move until you finish your task. Accountability unlocked.' },
  { id: 'droid',               name: 'Droid',         src: '/pets/droid/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Efficient, precise, binary at heart.',   description: "Built for productivity. Zero fluff, maximum function. Beeps softly when you're unfocused." },
  { id: 'oiiai',               name: 'Oiiai',         src: '/pets/oiiai/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Rhythmic, joyful, perpetually spinning.',description: 'Spins to the beat of your keyboard. The more you type, the more it grooves.' },
  { id: 'pupu',                name: 'Pupu',          src: '/pets/pupu/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Soft, round, impossibly cute.',          description: 'Does absolutely nothing stressful. Exists purely to make your workspace feel warmer.' },
  { id: 'savage-codex-hacker', name: 'Savage Hacker', src: '/pets/savage-codex-hacker/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'In the zone, always shipping.',          description: 'Types faster than you. Judges your commit messages. Silently proud when you ship.' },
  { id: 'round-maodie',        name: 'Round Maodie',  src: '/pets/round-maodie/spritesheet.webp',        frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, tagline: 'Round. Bouncy. Irreversibly adorable.',  description: 'Rolls across your taskbar. Cannot be stopped. Has never had a bad day.' },
];

/** Renders one animated frame from a spritesheet at a given pixel scale */
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

/** Returns the number of grid columns for a given container width */
function colsForWidth(w: number) {
  if (w < 340) return 2;
  if (w < 560) return 3;
  return 4;
}

export default function PetShowcase({ isDark = false }: { isDark?: boolean }) {
  const [frame,        setFrame]        = useState(0);
  const [selectedPet,  setSelectedPet]  = useState<PetConfig | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const [gridScale,    setGridScale]    = useState(0.44);
  const [gridCols,     setGridCols]     = useState(3);
  const [isMobile,     setIsMobile]     = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Container-aware sprite scaling via ResizeObserver ─────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => {
      const cols  = colsForWidth(w);
      const gap   = cols <= 2 ? 10 : cols === 3 ? 12 : 14;
      const cellW = (w - gap * (cols - 1)) / cols;
      // sprite is 192px wide; leave 6px padding each side
      const scale = Math.min((cellW - 12) / 192, 0.7);
      setGridScale(Math.max(scale, 0.22));
      setGridCols(cols);
      setIsMobile(w < 560);
    };
    const ro = new ResizeObserver(entries => update(entries[0]?.contentRect.width ?? el.offsetWidth));
    ro.observe(el);
    update(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // ── Animation ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 180);
    return () => clearInterval(id);
  }, []);

  // ── Pet selection ─────────────────────────────────────────────────────────
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
      if (e.key === 'Escape')     closePet();
      if (e.key === 'ArrowRight') navigatePet(1);
      if (e.key === 'ArrowLeft')  navigatePet(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePet, navigatePet]);

  // ── Color tokens ──────────────────────────────────────────────────────────
  const c = {
    title:      isDark ? '#FFFFFF'                : '#2E2E2D',
    tagline:    isDark ? '#A0A0A0'                : '#6E6D6A',
    body:       isDark ? '#777777'                : '#9E9D9A',
    tooltip:    isDark ? '#EDEDEC'                : '#2E2E2D',
    tooltipTx:  isDark ? '#1C1C1B'                : '#FFFFFF',
    divider:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    counter:    isDark ? '#666'                   : '#AEADA8',
    btnBorder:  isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.1)',
    btnIcon:    isDark ? '#A0A0A0'                : '#6E6D6A',
    btnHover:   isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    close:      isDark ? '#666'                   : '#AEADA8',
    closeHover: isDark ? '#ccc'                   : '#2E2E2D',
    nameLabel:  isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.35)',
  };

  const gap       = gridCols <= 2 ? 10 : gridCols === 3 ? 12 : 14;
  const focusScale = isMobile ? 0.82 : 1.5;

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden">

      {/* Preload sprite sheets */}
      {PETS.map(pet => (
        <link key={pet.id} rel="preload" href={pet.src} as="image" />
      ))}

      {/* ── Pet Grid ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: `${gap}px`,
          alignItems: 'end',
          width: '100%',
          opacity:       focusVisible ? 0 : 1,
          filter:        focusVisible ? 'blur(6px)' : 'none',
          transform:     focusVisible ? 'scale(0.95)' : 'scale(1)',
          pointerEvents: selectedPet ? 'none' : 'auto',
          transition:    'opacity 0.28s ease, filter 0.28s ease, transform 0.28s ease',
        }}
      >
        {PETS.map(pet => (
          <div
            key={pet.id}
            onClick={() => openPet(pet)}
            className="group relative flex flex-col items-center justify-end cursor-pointer"
            style={{
              filter:     'drop-shadow(0 3px 8px rgba(0,0,0,0.11))',
              transition: 'transform 0.18s ease',
              paddingTop: '8px',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {/* Desktop tooltip */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 translate-y-1.5 group-hover:translate-y-0 transition-all duration-150 z-10 hidden sm:block">
              <div
                className="whitespace-nowrap px-2.5 py-[5px] rounded-[5px] text-[10px] font-medium tracking-wide shadow-[0_4px_12px_rgba(0,0,0,0.14)] relative"
                style={{ background: c.tooltip, color: c.tooltipTx }}
              >
                {pet.name}
                <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] rotate-45 rounded-[1px]" style={{ background: c.tooltip }} />
              </div>
            </div>

            {/* Sprite */}
            <PetSprite pet={pet} frame={frame} scale={gridScale} />

            {/* Name label — shown always on mobile, hidden on sm+ (tooltip handles it) */}
            <span
              className="sm:hidden mt-[5px] text-center w-full truncate leading-none"
              style={{ fontSize: '9px', fontWeight: 600, color: c.nameLabel, letterSpacing: '-0.01em' }}
            >
              {pet.name}
            </span>
          </div>
        ))}
      </div>

      {/* ── Focus / Detail Overlay ─────────────────────────────────────── */}
      {selectedPet && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          onClick={closePet}
        >
          <div
            className="relative flex flex-col lg:flex-row items-center select-none w-full"
            style={{
              gap:        isMobile ? '14px' : '40px',
              padding:    isMobile ? '0 20px' : '0 32px',
              maxWidth:   isMobile ? '300px' : 'none',
              opacity:    focusVisible ? 1 : 0,
              filter:     focusVisible ? 'none' : 'blur(10px)',
              transform:  focusVisible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
              transition: 'opacity 0.3s cubic-bezier(0.22,1,0.36,1), filter 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sprite */}
            <div style={{ filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.16))', flexShrink: 0 }}>
              <PetSprite pet={selectedPet} frame={frame} scale={focusScale} />
            </div>

            {/* Dividers */}
            <div className="hidden lg:block self-stretch w-px shrink-0" style={{ background: c.divider }} />
            <div className="lg:hidden shrink-0" style={{ width: '60px', height: '1px', background: c.divider }} />

            {/* Info */}
            <div
              className="flex flex-col relative"
              style={{
                gap:       isMobile ? '8px' : '16px',
                maxWidth:  isMobile ? '220px' : '260px',
                width:     '100%',
                alignItems:  isMobile ? 'center' : 'flex-start',
                textAlign:   isMobile ? 'center' : 'left',
              }}
            >
              {/* Close button */}
              <button
                onClick={closePet}
                className="absolute -top-1 right-0 lg:static lg:self-end flex items-center justify-center rounded-full transition-colors"
                style={{ width: '26px', height: '26px', color: c.close }}
                onMouseEnter={e => (e.currentTarget.style.color = c.closeHover)}
                onMouseLeave={e => (e.currentTarget.style.color = c.close)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '11px', height: '11px' }} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>

              {/* Name + tagline */}
              <div>
                <h3 style={{ fontSize: isMobile ? '17px' : '26px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: c.title }}>
                  {selectedPet.name}
                </h3>
                <p style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 500, marginTop: '4px', lineHeight: 1.4, letterSpacing: '-0.01em', color: c.tagline }}>
                  {selectedPet.tagline}
                </p>
              </div>

              {/* Description */}
              <p style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 400, lineHeight: 1.65, color: c.body }}>
                {selectedPet.description}
              </p>

              {/* Prev / Next */}
              <div className="flex items-center gap-2">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => navigatePet(dir)}
                    className="flex items-center justify-center rounded-full transition-all"
                    style={{ width: '28px', height: '28px', border: `1px solid ${c.btnBorder}`, color: c.btnIcon, background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = c.btnHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    aria-label={dir === -1 ? 'Previous' : 'Next'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '11px', height: '11px' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {dir === -1 ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
                    </svg>
                  </button>
                ))}
                <span style={{ fontSize: '10px', fontWeight: 500, color: c.counter, fontVariantNumeric: 'tabular-nums' }}>
                  {PETS.findIndex(p => p.id === selectedPet.id) + 1} / {PETS.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}