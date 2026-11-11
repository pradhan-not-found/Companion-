import { useId } from "react";
import type { JSX } from "react";

/*
 * A realistic tumbler: tapered body with an elliptical rim, a thick glass
 * base, cylindrical shading and reflections. The water column fills one step
 * per glass logged and has a 3D surface with a bright meniscus.
 */

const RIM_Y = 10;
const BASE_Y = 84; // outer bottom of the glass
const FLOOR_Y = 77; // top of the thick glass base (inner floor)
const TOP_HALF = 22; // outer half-width at the rim
const BOTTOM_HALF = 16.5; // outer half-width at the base
const WALL = 1.6;
const CX = 32;

function halfWidth(y: number): number {
  const t = (y - RIM_Y) / (BASE_Y - RIM_Y);
  return TOP_HALF - (TOP_HALF - BOTTOM_HALF) * t;
}

export function WaterGlass({ filled, goal, size = 64 }: { filled: number; goal: number; size?: number }): JSX.Element {
  const id = useId().replace(/:/g, "");
  const ratio = Math.max(0, Math.min(filled / goal, 1));
  const maxLevel = RIM_Y + 7;
  const level = FLOOR_Y - (FLOOR_Y - maxLevel) * ratio;
  const hasWater = ratio > 0;

  const outerTop = halfWidth(RIM_Y);
  const outerBottom = halfWidth(BASE_Y);
  const innerAt = (y: number): number => halfWidth(y) - WALL;
  const levelHalf = innerAt(level);
  const floorHalf = innerAt(FLOOR_Y);

  const outer = `M${CX - outerTop} ${RIM_Y} L${CX - outerBottom} ${BASE_Y} A${outerBottom} 3.4 0 0 0 ${CX + outerBottom} ${BASE_Y} L${CX + outerTop} ${RIM_Y}`;
  const inner = `M${CX - innerAt(RIM_Y)} ${RIM_Y} L${CX - floorHalf} ${FLOOR_Y} A${floorHalf} 3 0 0 0 ${CX + floorHalf} ${FLOOR_Y} L${CX + innerAt(RIM_Y)} ${RIM_Y} Z`;
  const water = `M${CX - levelHalf} ${level} L${CX - floorHalf} ${FLOOR_Y} A${floorHalf} 3 0 0 0 ${CX + floorHalf} ${FLOOR_Y} L${CX + levelHalf} ${level} Z`;
  const height = (size * 96) / 64;

  return (
    <svg className="glass" viewBox="0 0 64 96" width={size} height={height} role="img" aria-label={`${filled} of ${goal} glasses`}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--glass-edge)" />
          <stop offset="0.18" stopColor="var(--glass-mid)" />
          <stop offset="0.5" stopColor="var(--glass-center)" />
          <stop offset="0.82" stopColor="var(--glass-mid)" />
          <stop offset="1" stopColor="var(--glass-edge)" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--water-edge)" />
          <stop offset="0.3" stopColor="var(--water-mid)" />
          <stop offset="0.55" stopColor="var(--water-center)" />
          <stop offset="1" stopColor="var(--water-edge)" />
        </linearGradient>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--glass-base-top)" />
          <stop offset="1" stopColor="var(--glass-base-bottom)" />
        </linearGradient>
        <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.2" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-inner`}>
          <path d={inner} />
        </clipPath>
      </defs>

      {/* contact shadow */}
      <ellipse cx={CX} cy={BASE_Y + 3.4} rx={outerBottom + 5} ry="3.6" fill={`url(#${id}-shadow)`} />

      {/* back rim (seen through the glass) */}
      <path
        d={`M${CX - outerTop} ${RIM_Y} A${outerTop} 4.4 0 0 1 ${CX + outerTop} ${RIM_Y}`}
        fill="none"
        className="glass__rim-back"
      />

      {/* glass body */}
      <path d={`${outer} Z`} fill={`url(#${id}-glass)`} />

      {/* water */}
      {hasWater ? (
        <g clipPath={`url(#${id}-inner)`}>
          <path d={water} fill={`url(#${id}-water)`} />
          <path d={water} fill={`url(#${id}-depth)`} />
          {/* bubbles */}
          <circle className="glass__bubble" cx={CX - 4} cy={FLOOR_Y - 3} r="0.9" />
          <circle className="glass__bubble glass__bubble--b" cx={CX + 5} cy={FLOOR_Y - 2} r="0.7" />
          <circle className="glass__bubble glass__bubble--c" cx={CX + 1} cy={FLOOR_Y - 4} r="0.6" />
        </g>
      ) : null}

      {/* water surface with meniscus */}
      {hasWater ? (
        <g className="glass__surface" style={{ transformOrigin: `${CX}px ${level}px` }}>
          <ellipse cx={CX} cy={level} rx={levelHalf} ry="2.6" className="glass__surface-fill" />
          <path
            d={`M${CX - levelHalf} ${level} A${levelHalf} 2.6 0 0 0 ${CX + levelHalf} ${level}`}
            fill="none"
            className="glass__meniscus"
          />
          <ellipse cx={CX - levelHalf * 0.35} cy={level - 0.4} rx={levelHalf * 0.32} ry="0.7" className="glass__glint" />
        </g>
      ) : null}

      {/* thick base */}
      <path
        d={`M${CX - floorHalf - WALL} ${FLOOR_Y} L${CX - outerBottom} ${BASE_Y} A${outerBottom} 3.4 0 0 0 ${CX + outerBottom} ${BASE_Y} L${CX + floorHalf + WALL} ${FLOOR_Y} A${floorHalf + WALL} 3 0 0 1 ${CX - floorHalf - WALL} ${FLOOR_Y} Z`}
        fill={`url(#${id}-base)`}
      />
      <path d={`M${CX - floorHalf} ${FLOOR_Y} A${floorHalf} 3 0 0 0 ${CX + floorHalf} ${FLOOR_Y}`} fill="none" className="glass__floor" />

      {/* outline */}
      <path d={outer} fill="none" className="glass__outline" />

      {/* reflections */}
      <path d={`M${CX - outerTop + 4.2} ${RIM_Y + 4} L${CX - outerBottom + 3.4} ${BASE_Y - 8}`} className="glass__streak" stroke={`url(#${id}-streak)`} strokeWidth="2.6" />
      <path d={`M${CX - outerTop + 8} ${RIM_Y + 6} L${CX - outerBottom + 6.6} ${BASE_Y - 14}`} className="glass__streak" stroke={`url(#${id}-streak)`} strokeWidth="0.8" />
      <path d={`M${CX + outerTop - 3.2} ${RIM_Y + 8} L${CX + outerBottom - 2.6} ${BASE_Y - 10}`} className="glass__streak" stroke={`url(#${id}-streak)`} strokeWidth="1" opacity="0.6" />

      {/* front rim */}
      <path
        d={`M${CX - outerTop} ${RIM_Y} A${outerTop} 4.4 0 0 0 ${CX + outerTop} ${RIM_Y}`}
        fill="none"
        className="glass__rim-front"
      />
    </svg>
  );
}
