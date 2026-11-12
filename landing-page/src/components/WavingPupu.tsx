'use client';

import { useEffect, useState } from 'react';

/** Pupu waving (a 4-frame strip), sized to sit beside a line of text. */
export default function WavingPupu({ size = 40 }: { size?: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame(value => (value + 1) % 4), 260);
    return () => window.clearInterval(id);
  }, []);

  const width = Math.round((size * 192) / 208);
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width,
        height: size,
        backgroundImage: "url('/sprites/pupu-wave.webp')",
        backgroundSize: `${width * 4}px ${size}px`,
        backgroundPosition: `${-frame * width}px 0px`,
        imageRendering: 'pixelated'
      }}
    />
  );
}
