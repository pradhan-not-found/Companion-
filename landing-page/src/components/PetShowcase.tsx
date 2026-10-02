'use client';

import { useEffect, useState } from 'react';

// Spritesheet truth (measured from actual files):
// All pets: 1536px wide = 8 cols × 192px per frame
// Most pets: 1872px tall = 9 rows × 208px per frame
// boba + jokebear-codexpet: 2288px tall = 11 rows × 208px per frame
// All use 6 frames per animation row, idle is row 0

interface PetConfig {
  id: string;
  name: string;
  src: string;
  frameW: number;    // px per frame width
  frameH: number;    // px per frame height
  gridCols: number;  // total columns in sheet
  gridRows: number;  // total rows in sheet
  framesPerRow: number;
  idleRow: number;
  cropBottom: number; // px to hide from bottom of frame (next-row bleed)
}

const PETS: PetConfig[] = [
  // 1536×1872 → 8×9 grid → 192×208 per frame
  { id: 'angry-cat',           name: 'Angry Cat',    src: '/pets/angry-cat/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'capy-puff',           name: 'Capy Puff',    src: '/pets/capy-puff/spritesheet.webp',           frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'wangcai',             name: 'Wangcai',      src: '/pets/wangcai/spritesheet.webp',             frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'whaledou',            name: 'Whaledou',     src: '/pets/whaledou/spritesheet.webp',            frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  // 1536×2288 → 8×11 grid → 192×208 per frame
  { id: 'boba',                name: 'Boba',         src: '/pets/boba/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'jokebear-codexpet',   name: 'JokeBear',     src: '/pets/jokebear-codexpet/spritesheet.webp',   frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  // remaining 1536×1872
  { id: 'daodun',              name: 'Daodun',       src: '/pets/daodun/spritesheet.webp',              frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'droid',               name: 'Droid',        src: '/pets/droid/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'oiiai',               name: 'Oiiai',        src: '/pets/oiiai/spritesheet.webp',               frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'pupu',                name: 'Pupu',         src: '/pets/pupu/spritesheet.webp',                frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'savage-codex-hacker', name: 'Hacker Dog',   src: '/pets/savage-codex-hacker/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
  { id: 'round-maodie',        name: 'Round Maodie', src: '/pets/round-maodie/spritesheet.webp',        frameW: 192, frameH: 208, gridCols: 8, gridRows: 9,  framesPerRow: 6, idleRow: 0, cropBottom: 0 },
]; // Ganesh removed (user request)

const SCALE = 0.55;

function PetSprite({ pet, frame }: { pet: PetConfig; frame: number }) {
  const displayW = Math.round(pet.frameW * SCALE);
  const displayH = Math.round(pet.frameH * SCALE);
  // maskH = frame height minus the bleed from the next row's head peeking in
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
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 180);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 12 pets → 4×3 perfect grid */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-8" style={{ alignItems: 'end' }}>
        {PETS.map((pet) => (
          <div
            key={pet.id}
            className="group relative flex items-end justify-center transition-transform duration-300 ease-out cursor-pointer"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.13))' }}
          >
            {/* Professional Glassy Tooltip */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out z-10 translate-y-2 group-hover:translate-y-0">
              <div className="bg-[#2E2E2D] text-white text-[11px] font-medium tracking-wide px-3 py-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] whitespace-nowrap relative">
                {pet.name}
                {/* Pointing Caret */}
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
