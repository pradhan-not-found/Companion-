'use client';

import { useEffect, useState } from 'react';
import { preload } from 'react-dom';

const WORKERS = {
  // Savage Codex Hacker typing loop.
  hacker: { sheet: '/sprites/savage-codex-hacker.webp', frames: 6 },
  // JokeBear's calm laptop-typing loop.
  jokebear: { sheet: '/sprites/jokebear-codexpet-typing.webp', frames: 8 }
} as const;

const FRAME_W = 192;
const FRAME_H = 208;

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
  preload(worker.sheet, { as: 'image', fetchPriority: 'high' });
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => (value + 1) % worker.frames), pet === 'hacker' ? 220 : 240);
    return () => window.clearInterval(id);
  }, [worker.frames, pet]);

  const height = (width * FRAME_H) / FRAME_W;
  return (
    <span
      className={`block pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{
        width: `${width}em`,
        height: `${height}em`,
        backgroundImage: `url('${worker.sheet}')`,
        backgroundPosition: `${-frame * width}em 0em`,
        backgroundSize: `${width * worker.frames}em ${height}em`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    />
  );
}
