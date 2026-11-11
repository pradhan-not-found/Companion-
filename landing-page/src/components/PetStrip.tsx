'use client';

import { useEffect, useRef, useState } from 'react';

interface PetConfig {
  id: string;
  name: string;
  src: string;
  frameW: number;
  frameH: number;
  gridCols: number;
  gridRows: number;
  framesPerRow: number;
}

const PETS: PetConfig[] = [
  { id: 'angry-cat', name: 'Angry Cat', src: '/pets/angry-cat/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
  { id: 'capy-puff', name: 'Capy Puff', src: '/pets/capy-puff/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
  { id: 'jokebear-codexpet', name: 'JokeBear', src: '/pets/jokebear-codexpet/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6 },
  { id: 'pupu', name: 'Pupu', src: '/pets/pupu/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
  { id: 'droid', name: 'Droid', src: '/pets/droid/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
  { id: 'boba', name: 'Boba', src: '/pets/boba/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 11, framesPerRow: 6 },
  { id: 'wangcai', name: 'Wangcai', src: '/pets/wangcai/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
  { id: 'whaledou', name: 'Whaledou', src: '/pets/whaledou/spritesheet.webp', frameW: 192, frameH: 208, gridCols: 8, gridRows: 9, framesPerRow: 6 },
];

const TILES: { pet: number; color: string; column: string; row: string }[] = [
  { pet: 0, color: '#FF2D20', column: '1 / 3', row: '1 / 2' },
  { pet: 1, color: '#FFE14A', column: '3 / 4', row: '1 / 2' },
  { pet: 2, color: '#2F6BFF', column: '4 / 5', row: '1 / 2' },
  { pet: 3, color: '#7C5CFF', column: '1 / 2', row: '2 / 3' },
  { pet: 4, color: '#3DDC6A', column: '2 / 4', row: '2 / 3' },
  { pet: 5, color: '#FF8A00', column: '4 / 5', row: '2 / 3' },
  { pet: 6, color: '#111111', column: '1 / 3', row: '3 / 4' },
  { pet: 7, color: '#C6F24E', column: '3 / 5', row: '3 / 4' },
];

function Sprite({ pet, frame, scale }: { pet: PetConfig; frame: number; scale: number }) {
  const displayW = Math.round(pet.frameW * scale);
  const displayH = Math.round(pet.frameH * scale);
  return (
    <div style={{ width: displayW, height: displayH }}>
      <div
        style={{
          width: displayW,
          height: displayH,
          backgroundImage: `url('${pet.src}')`,
          backgroundPosition: `${-(frame % pet.framesPerRow) * displayW}px 0px`,
          backgroundSize: `${displayW * pet.gridCols}px ${displayH * pet.gridRows}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

export default function PetStrip() {
  const [frame, setFrame] = useState(0);
  const [phone, setPhone] = useState(false);
  const [height, setHeight] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setFrame(value => value + 1), 180);
    return () => window.clearInterval(id);
  }, []);

  // Track the strip size so every pet is sized from the same row height.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setPhone(window.innerWidth < 1024);
      setHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowHeight = phone ? height / 4 : height / 3;
  // One shared scale: each pet fills ~58% of its row, clamped for very small/large screens.
  const scale = rowHeight ? Math.min(0.72, Math.max(0.26, (rowHeight * 0.58) / 208)) : 0.44;

  return (
    <div
      ref={box}
      className={`h-full w-full grid ${phone ? 'grid-cols-2 grid-rows-4' : ''}`}
      style={phone ? undefined : { gridTemplateColumns: '1.15fr 0.85fr 1.05fr 0.95fr', gridTemplateRows: '1fr 1fr 1fr' }}
    >
      {TILES.map(tile => {
        const pet = PETS[tile.pet];
        return (
          <div
            key={pet.id}
            className="flex items-center justify-center overflow-hidden"
            style={{ background: tile.color, ...(phone ? {} : { gridColumn: tile.column, gridRow: tile.row }) }}
            title={pet.name}
          >
            <Sprite pet={pet} frame={frame} scale={scale} />
          </div>
        );
      })}
    </div>
  );
}
