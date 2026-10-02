'use client';

import { useEffect, useState } from 'react';

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
  description: string;
  personality: string;
}

const PETS: PetConfig[] = [
  { id: 'angry-cat',           name: 'Angry Cat',    src: '/pets/angry-cat/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Always grumpy, never leaving.', personality: 'Reminds you to take breaks by glaring at you until you do. Surprisingly effective.' },
  { id: 'capy-puff',           name: 'Capy Puff',    src: '/pets/capy-puff/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Laid-back and unbothered.', personality: 'The chillest companion. Floats through your day with zero stress and maximum vibes.' },
  { id: 'wangcai',             name: 'Wangcai',      src: '/pets/wangcai/spritesheet.webp',             frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Lucky charm, always by your side.', personality: 'A traditional good-luck companion who promises to bring fortune to every coding session.' },
  { id: 'whaledou',            name: 'Whaledou',     src: '/pets/whaledou/spritesheet.webp',            frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Deep thoughts, shallow sea.', personality: 'Drifts peacefully across your desktop, occasionally surfacing with wisdom you didn\'t ask for.' },
  { id: 'boba',                name: 'Boba',         src: '/pets/boba/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Sweet, bubbly, always refreshing.', personality: 'Nudges you to drink water, take breaks, and slow down. Your designated hydration buddy.' },
  { id: 'jokebear-codexpet',   name: 'JokeBear',     src: '/pets/jokebear-codexpet/spritesheet.webp',   frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Funny, warm, and always watching.', personality: 'Delivers questionable puns at exactly the wrong moment. 10/10 morale booster regardless.' },
  { id: 'daodun',              name: 'Daodun',       src: '/pets/daodun/spritesheet.webp',              frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Stubborn and determined.', personality: 'Sits on your screen and refuses to move until you finish your task. Accountability unlocked.' },
  { id: 'droid',               name: 'Droid',        src: '/pets/droid/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Efficient, precise, binary at heart.', personality: 'Built for productivity. Zero fluff, maximum function. Beeps softly when you\'re unfocused.' },
  { id: 'oiiai',               name: 'Oiiai',        src: '/pets/oiiai/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Rhythmic, joyful, perpetually spinning.', personality: 'Spins to the beat of your keyboard. The more you type, the more it grooves.' },
  { id: 'pupu',                name: 'Pupu',         src: '/pets/pupu/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Soft, round, impossibly cute.', personality: 'Does absolutely nothing stressful. Exists purely to make your workspace feel warmer.' },
  { id: 'savage-codex-hacker', name: 'Hacker Dog',   src: '/pets/savage-codex-hacker/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'In the zone, always shipping.', personality: 'Types faster than you. Judges your commit messages. Silently proud when you ship.' },
  { id: 'round-maodie',        name: 'Round Maodie', src: '/pets/round-maodie/spritesheet.webp',        frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0, description: 'Round. Bouncy. Irreversibly adorable.', personality: 'Rolls across your taskbar. Cannot be stopped. Has never had a bad day.' },
];

const SCALE = 0.55;

function PetSprite({ pet, frame }: { pet: PetConfig; frame: number }) {
  const displayW = Math.round(pet.frameW * SCALE);
  const displayH = Math.round(pet.frameH * SCALE);
  const maskH    = Math.round((pet.frameH - pet.cropBottom) * SCALE);
  const sheetW   = displayW * pet.gridCols;
  const sheetH   = displayH * pet.gridRows;
  const bgPosX   = -(frame % pet.framesPerRow) * displayW;
  const bgPosY   = -(pet.idleRow * displayH);

  return (
    <div style={{ width: displayW, height: maskH, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        width: displayW,
        height: displayH,
        backgroundImage: `url('${pet.src}')`,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }} />
    </div>
  );
}

export default function PetShowcase() {
  const [frame, setFrame] = useState(0);
  const [selectedPet, setSelectedPet] = useState<PetConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [displayedPet, setDisplayedPet] = useState<PetConfig | null>(null);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 180);
    return () => clearInterval(id);
  }, []);

  const handlePetClick = (pet: PetConfig) => {
    if (selectedPet?.id === pet.id) {
      // Deselect
      setVisible(false);
      setTimeout(() => {
        setSelectedPet(null);
        setDisplayedPet(null);
      }, 250);
      return;
    }
    // Hide current, swap, then show
    setVisible(false);
    setTimeout(() => {
      setSelectedPet(pet);
      setDisplayedPet(pet);
      setVisible(true);
    }, displayedPet ? 200 : 0);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-4">

      {/* Pet Info Panel */}
      <div
        className="w-full max-w-sm min-h-[88px] flex items-center"
        style={{ transition: 'all 0.25s ease' }}
      >
        {displayedPet ? (
          <div
            className="w-full rounded-[10px] border border-black/[0.08] bg-white/60 backdrop-blur-sm px-5 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
            style={{
              opacity: visible ? 1 : 0,
              filter: visible ? 'blur(0px)' : 'blur(6px)',
              transform: visible ? 'translateY(0px)' : 'translateY(6px)',
              transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#2E2E2D] tracking-[-0.01em] leading-snug">
                  {displayedPet.name}
                </p>
                <p className="text-[12px] text-[#6E6D6A] font-medium mt-0.5 leading-snug">
                  {displayedPet.description}
                </p>
                <p className="text-[11.5px] text-[#9E9D9A] font-light mt-2 leading-[1.6]">
                  {displayedPet.personality}
                </p>
              </div>
              <button
                onClick={() => handlePetClick(displayedPet)}
                className="text-[#AEADA8] hover:text-[#6E6D6A] transition-colors shrink-0 mt-0.5"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-[12px] text-[#AEADA8] font-light w-full text-center"
            style={{
              opacity: visible ? 0 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            Click any companion to learn more
          </p>
        )}
      </div>

      {/* Pet Grid */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-8" style={{ alignItems: 'end' }}>
        {PETS.map((pet) => (
          <div
            key={pet.id}
            onClick={() => handlePetClick(pet)}
            className="group relative flex items-end justify-center cursor-pointer"
            style={{
              filter: selectedPet && selectedPet.id !== pet.id
                ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.08)) opacity(0.5)'
                : 'drop-shadow(0 4px 10px rgba(0,0,0,0.13))',
              transform: selectedPet?.id === pet.id ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
              transition: 'transform 0.25s ease, filter 0.25s ease',
              opacity: selectedPet && selectedPet.id !== pet.id ? 0.5 : 1,
            }}
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out z-10 translate-y-2 group-hover:translate-y-0">
              <div className="bg-[#2E2E2D] text-white text-[11px] font-medium tracking-wide px-3 py-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] whitespace-nowrap relative">
                {pet.name}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#2E2E2D] rotate-45 rounded-[1px]" />
              </div>
            </div>

            <PetSprite pet={pet} frame={frame} />
          </div>
        ))}
      </div>
    </div>
  );
}
