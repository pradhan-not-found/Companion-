'use client';

import { useEffect, useState } from 'react';

const WORKERS = {
  // Savage Codex Hacker: row 0 is the typing loop.
  hacker: { sheet: '/pets/savage-codex-hacker/spritesheet.webp', rows: 9, row: 0, frames: 6 },
  // JokeBear: row 1 is the calm laptop-typing loop.
  jokebear: { sheet: '/pets/jokebear-codexpet/spritesheet.webp', rows: 11, row: 1, frames: 8 }
} as const;

const FRAME_W = 192;
const FRAME_H = 208;
const COLS = 8;

/** A pet typing on its laptop. Sized in em so it tracks the text beside it. */
export default function CodexHacker({
  pet = 'hacker',
  width = 0.82,
  className = ''
}: {
  pet?: keyof typeof WORKERS;
  width?: number;
  className?: string;
}) {
  const worker = WORKERS[pet];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => (value + 1) % worker.frames), 150);
    return () => window.clearInterval(id);
  }, [worker.frames]);

  const height = (width * FRAME_H) / FRAME_W;
  return (
    <span
      className={`block pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{
        width: `${width}em`,
        height: `${height}em`,
        backgroundImage: `url('${worker.sheet}')`,
        backgroundPosition: `${-frame * width}em ${-worker.row * height}em`,
        backgroundSize: `${width * COLS}em ${height * worker.rows}em`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    />
  );
}
