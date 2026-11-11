/**
 * Abstract pixel-block art for the checkout brand panel: studded tiles forming
 * tumbling shapes over a periwinkle-to-navy gradient with a grid and film grain.
 */

type Shape = { rows: string[]; x: number; y: number; rotate: number; tile: number; fill: string; hole: string; opacity?: number };

const C_SHAPE = ['.11111.', '11...11', '11.....', '11.....', '11.....', '11.....', '11.....', '11...11', '.11111.'];
const RING = ['..11111..', '.1111111.', '111...111', '11.....11', '11.....11', '11.....11', '111...111', '.1111111.', '..11111..'];
const HEART = ['.11...11.', '1111.1111', '111111111', '111111111', '.1111111.', '..11111..', '...111...', '....1....'];
const BRACKET = ['11111', '1....', '1....', '1....'];
const STEP = ['1..', '11.', '.11'];

const LIGHT = '#DCE5FF';
const MID = '#AFC0FF';
const HOLE_LIGHT = '#8E9EEB';
const HOLE_MID = '#6E7FDB';

const SHAPES: Shape[] = [
  { rows: RING, x: 455, y: 455, rotate: 9, tile: 21, fill: LIGHT, hole: HOLE_LIGHT },
  { rows: C_SHAPE, x: 300, y: 600, rotate: 16, tile: 22, fill: MID, hole: HOLE_MID, opacity: 0.85 },
  { rows: HEART, x: 430, y: 715, rotate: -10, tile: 20, fill: LIGHT, hole: HOLE_LIGHT, opacity: 0.92 },
  { rows: BRACKET, x: 520, y: 130, rotate: 0, tile: 14, fill: LIGHT, hole: HOLE_LIGHT, opacity: 0.8 },
  { rows: STEP, x: 395, y: 360, rotate: 22, tile: 14, fill: LIGHT, hole: HOLE_LIGHT, opacity: 0.75 },
  { rows: STEP, x: 560, y: 640, rotate: -30, tile: 13, fill: MID, hole: HOLE_MID, opacity: 0.7 }
];

// Loose tiles scattered around the shapes.
const LOOSE: [number, number, number, number][] = [
  [430, 420, 12, 18], [385, 560, 11, -12], [540, 590, 10, 30], [330, 520, 12, 8], [560, 880, 13, -20],
  [500, 230, 9, 40], [560, 300, 10, -15], [470, 840, 11, 12], [600, 760, 12, 25], [600, 420, 10, -8]
];

function ShapeTiles({ shape }: { shape: Shape }) {
  const { rows, tile } = shape;
  const w = rows[0].length * tile;
  const h = rows.length * tile;
  return (
    <g transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotate} ${w / 2} ${h / 2})`} opacity={shape.opacity ?? 1}>
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '1' ? (
            <g key={`${x}-${y}`}>
              <rect x={x * tile + 0.6} y={y * tile + 0.6} width={tile - 1.2} height={tile - 1.2} rx={1.5} fill={shape.fill} />
              <circle cx={x * tile + tile / 2} cy={y * tile + tile / 2} r={tile * 0.27} fill={shape.hole} />
            </g>
          ) : null
        )
      )}
    </g>
  );
}

export default function CheckoutArt() {
  return (
    <div className="ck-art__bg" aria-hidden="true">
      <div className="ck-grid" />
      <svg className="ck-blocks" viewBox="0 0 640 960" preserveAspectRatio="xMaxYMax slice">
        {SHAPES.map((shape, index) => (
          <ShapeTiles key={index} shape={shape} />
        ))}
        {LOOSE.map(([x, y, size, rotate], index) => (
          <g key={index} transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`} opacity={0.85}>
            <rect x={x} y={y} width={size} height={size} rx={1.5} fill={index % 2 ? MID : LIGHT} />
            <circle cx={x + size / 2} cy={y + size / 2} r={size * 0.27} fill={index % 2 ? HOLE_MID : HOLE_LIGHT} />
          </g>
        ))}
      </svg>
      <div className="ck-grain" />
    </div>
  );
}
