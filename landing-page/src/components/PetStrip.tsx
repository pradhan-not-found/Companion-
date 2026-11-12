'use client';

import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';

interface PetConfig {
  id: string;
  name: string;
  src: string;
  frameW: number;
  frameH: number;
  gridCols: number;
  gridRows: number;
  framesPerRow: number;
  /** Spritesheet row to loop (defaults to 0, idle). */
  row?: number;
}

export const PETS: PetConfig[] = [
  { id: 'angry-cat', name: 'Angry Cat', src: '/sprites/angry-cat.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'capy-puff', name: 'Capy Puff', src: '/sprites/capy-puff.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'jokebear-codexpet', name: 'JokeBear', src: '/sprites/jokebear-codexpet.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'pupu', name: 'Pupu', src: '/sprites/pupu.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'droid', name: 'Droid', src: '/sprites/droid.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'boba', name: 'Boba', src: '/sprites/boba.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'wangcai', name: 'Wangcai', src: '/sprites/wangcai.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
  { id: 'whaledou', name: 'Whaledou', src: '/sprites/whaledou.webp', frameW: 192, frameH: 208, gridCols: 6, gridRows: 1, framesPerRow: 6 },
];

const TILES: { pet: number; color: string }[] = [
  { pet: 0, color: '#FF2D20' },
  { pet: 1, color: '#FFE14A' },
  { pet: 2, color: '#2F6BFF' },
  { pet: 3, color: '#7C5CFF' },
  { pet: 4, color: '#3DDC6A' },
  { pet: 5, color: '#FF8A00' },
  { pet: 6, color: '#111111' },
  { pet: 7, color: '#C6F24E' },
];

/*
 * Mosaic layouts, one string per row. A digit is that pet on its own colour,
 * a letter is a plain square in the colour of pet a-h (a = pet 0's colour),
 * and "." is an empty white square.
 */
const LAYOUTS = {
  // Desktop: 5 equal columns; as many rows as the height needs.
  wide: ['.01.f', 'h2.3.', '..4.b', '5.c.6', '.7.a.', 'd.e.c', '.g.f.', 'b.a.h'],
  // Tablet: 6 columns, 3 rows.
  medium: ['0.1.2.', '.3.4.5', '6.a.7c'],
  // Phone: 4 columns, 3 rows.
  narrow: ['0.12', '.34.', '56.7'],
};

type Layout = keyof typeof LAYOUTS;

export function Sprite({ pet, frame, scale }: { pet: PetConfig; frame: number; scale: number }) {
  const displayW = Math.round(pet.frameW * scale);
  const displayH = Math.round(pet.frameH * scale);
  return (
    <div style={{ width: displayW, height: displayH }}>
      <div
        style={{
          width: displayW,
          height: displayH,
          backgroundImage: `url('${pet.src}')`,
          backgroundPosition: `${-(frame % pet.framesPerRow) * displayW}px ${-(pet.row ?? 0) * displayH}px`,
          backgroundSize: `${displayW * pet.gridCols}px ${displayH * pet.gridRows}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

// Light tiles need dark text for the name label.
const LIGHT = new Set(['#FFE14A', '#C6F24E']);

export default function PetStrip() {
  // Start downloading every sprite strip with the page, before hydration.
  PETS.forEach(pet => preload(pet.src, { as: 'image', fetchPriority: 'high' }));
  const [frame, setFrame] = useState(0);
  const [layout, setLayout] = useState<Layout>('wide');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setFrame(value => value + 1), 230);
    return () => window.clearInterval(id);
  }, []);

  // Track the strip size so every pet is sized from the same row height.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const viewport = window.innerWidth;
      setLayout(viewport < 640 ? 'narrow' : viewport < 1024 ? 'medium' : 'wide');
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rows = LAYOUTS[layout];
  const columns = rows[0].length;
  const cell = size.width ? size.width / columns : 0;
  // Fill the height with whole squares (the last row may be cut off, like a crop of a larger pattern).
  const rowCount = layout === 'wide' && cell ? Math.min(rows.length, Math.ceil(size.height / cell)) : rows.length;
  // Each pet fills ~62% of its square.
  const scale = cell ? Math.min(0.8, Math.max(0.2, (cell * 0.62) / 208)) : 0.44;
  const bigScale = size.height ? Math.min(1.5, Math.max(0.5, (size.height * 0.42) / 208)) : 1;

  function focus(index: number, target: HTMLElement) {
    const outer = box.current?.getBoundingClientRect();
    const tile = target.getBoundingClientRect();
    if (outer) {
      setOrigin({
        x: ((tile.left + tile.width / 2 - outer.left) / outer.width) * 100,
        y: ((tile.top + tile.height / 2 - outer.top) / outer.height) * 100
      });
    }
    setActive(index);
    setLast(index);
  }

  function close() {
    setActive(null);
  }

  const open = active !== null;
  // Keep the last pet's colour while the flood shrinks back.
  const shown = last === null ? null : TILES[last];
  const shownPet = shown ? PETS[shown.pet] : null;

  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden"
      onMouseLeave={close}
    >
      <div
        className="w-full grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {rows.slice(0, rowCount).flatMap((row, r) =>
          row.split('').map((mark, c) => {
            const key = `${r}-${c}`;
            if (mark === '.') return <div key={key} className="aspect-square" aria-hidden="true" />;
            if (!/[0-9]/.test(mark)) {
              return <div key={key} className="aspect-square" aria-hidden="true" style={{ background: TILES[mark.charCodeAt(0) - 97].color }} />;
            }
            const index = Number(mark);
            const tile = TILES[index];
            const pet = PETS[tile.pet];
            return (
              <div
                key={key}
                style={{ background: tile.color }}
                role="button"
                tabIndex={0}
                aria-label={`Show ${pet.name}`}
                className="aspect-square flex items-center justify-center overflow-hidden cursor-pointer outline-none"
                onClick={event => focus(index, event.currentTarget)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    focus(index, event.currentTarget);
                  }
                }}
              >
                <Sprite pet={pet} frame={frame + index * 2} scale={scale} />
              </div>
            );
          })
        )}
      </div>

      {/* Full-strip colour flood with the focused pet and its name. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5"
        style={{
          background: shown?.color ?? 'transparent',
          clipPath: `circle(${open ? 150 : 0}% at ${origin.x}% ${origin.y}%)`,
          transition: open
            ? 'clip-path 680ms cubic-bezier(0.22, 1, 0.36, 1), background-color 420ms ease'
            : 'clip-path 460ms cubic-bezier(0.65, 0, 0.35, 1)',
          pointerEvents: open ? 'auto' : 'none',
          cursor: open ? 'pointer' : undefined
        }}
        onClick={close}
        aria-hidden={!open}
      >
        {shownPet ? (
          <div key={shownPet.id} className="pet-pop flex flex-col items-center gap-5">
            <Sprite pet={shownPet} frame={frame} scale={bigScale} />
            <span
              className="pet-name text-[clamp(28px,4.4vw,56px)] font-semibold tracking-[-0.045em] leading-none"
              style={{ color: LIGHT.has(shown!.color) ? '#111111' : '#FFFFFF' }}
            >
              {shownPet.name}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
