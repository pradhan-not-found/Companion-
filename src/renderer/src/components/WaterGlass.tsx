import { useId } from "react";
import type { JSX } from "react";

/**
 * A glass that fills one level per glass of water logged, with a slowly
 * moving surface and quiet level marks.
 */
export function WaterGlass({ filled, goal, size = 64 }: { filled: number; goal: number; size?: number }): JSX.Element {
  const id = useId().replace(/:/g, "");
  const ratio = Math.max(0, Math.min(filled / goal, 1));
  // Interior spans y=10..84 inside the 64x92 viewBox.
  const top = 10;
  const bottom = 84;
  const level = bottom - (bottom - top) * ratio;
  const height = (size * 92) / 64;

  return (
    <svg
      className="glass"
      viewBox="0 0 64 92"
      width={size}
      height={height}
      role="img"
      aria-label={`${filled} of ${goal} glasses`}
    >
      <defs>
        <clipPath id={`${id}-inside`}>
          <path d="M9 8h46l-5.2 74.2a4 4 0 0 1-4 3.8H18.2a4 4 0 0 1-4-3.8Z" />
        </clipPath>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--glass-water-top)" />
          <stop offset="100%" stopColor="var(--glass-water-bottom)" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* glass body */}
      <path className="glass__body" d="M9 8h46l-5.2 74.2a4 4 0 0 1-4 3.8H18.2a4 4 0 0 1-4-3.8Z" />

      {/* water with a moving surface */}
      <g clipPath={`url(#${id}-inside)`}>
        <g className="glass__water" style={{ transform: `translateY(${level - top}px)` }}>
          <path
            className="glass__wave glass__wave--back"
            d={`M-64 ${top + 2} q8 -3 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V96 H-64 Z`}
          />
          <path
            className="glass__wave"
            fill={`url(#${id}-water)`}
            d={`M-64 ${top + 3} q8 3 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V96 H-64 Z`}
          />
        </g>
      </g>

      {/* level marks, one per glass */}
      {Array.from({ length: goal - 1 }, (_, index) => {
        const y = bottom - ((bottom - top) * (index + 1)) / goal;
        return <line key={index} className="glass__tick" x1="47" x2="51" y1={y} y2={y} />;
      })}

      {/* rim, outline and highlight */}
      <path className="glass__outline" d="M9 8h46l-5.2 74.2a4 4 0 0 1-4 3.8H18.2a4 4 0 0 1-4-3.8Z" />
      <path className="glass__shine" d="M14 12h5l-3.2 66h-3Z" fill={`url(#${id}-shine)`} />
    </svg>
  );
}
