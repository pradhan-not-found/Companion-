'use client';

import { useEffect, useState } from 'react';

const SHEET = '/pets/savage-codex-hacker/spritesheet.webp';
const FRAME_W = 192;
const FRAME_H = 208;
const COLS = 8;
const ROWS = 9;
// Row 0 is the typing loop.
const WORK_FRAMES = 6;

/** The Codex hacker pet, typing away on its laptop. Sized in em so it tracks the text beside it. */
export default function CodexHacker({ width = 0.82, className = '' }: { width?: number; className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => (value + 1) % WORK_FRAMES), 150);
    return () => window.clearInterval(id);
  }, []);

  const height = (width * FRAME_H) / FRAME_W;
  return (
    <span
      className={`block pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{
        width: `${width}em`,
        height: `${height}em`,
        backgroundImage: `url('${SHEET}')`,
        backgroundPosition: `${-frame * width}em 0em`,
        backgroundSize: `${width * COLS}em ${height * ROWS}em`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    />
  );
}
