'use client';

import { useEffect, useRef, useState } from 'react';

const FRAME_W = 192;
const FRAME_H = 208;
const COLS = 8;

/** A lane is a horizontal band (in % of the container) a pet can stroll along. */
type Lane = { pet: string; top: string; from: number; to: number; scale?: number; delay?: number };

/**
 * One pet that idles, then walks to a random spot in its lane, turns and idles
 * again. Sprite sheet rows: 0 idle (6 frames), 1 walk right, 2 walk left (8 frames).
 */
function Wanderer({ pet, top, from, to, scale = 0.38, delay = 0 }: Lane) {
  const [x, setX] = useState((from + to) / 2);
  const [walk, setWalk] = useState<0 | 1 | 2>(0);
  const [duration, setDuration] = useState(0);
  const [frame, setFrame] = useState(0);
  const position = useRef((from + to) / 2);

  useEffect(() => {
    const id = window.setInterval(() => setFrame(value => value + 1), 130);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const idle = (ms: number) => {
      timer = window.setTimeout(stroll, ms);
    };
    const stroll = () => {
      const target = from + Math.random() * (to - from);
      const distance = Math.abs(target - position.current);
      if (distance < 4) {
        idle(1500);
        return;
      }
      const ms = distance * 260;
      setWalk(target > position.current ? 1 : 2);
      setDuration(ms);
      setX(target);
      position.current = target;
      timer = window.setTimeout(() => {
        setWalk(0);
        idle(2500 + Math.random() * 4500);
      }, ms);
    };
    idle(1200 + delay);
    return () => window.clearTimeout(timer);
  }, [from, to, delay]);

  const w = Math.round(FRAME_W * scale);
  const h = Math.round(FRAME_H * scale);
  const frames = walk ? 8 : 6;
  return (
    <span
      className="wander"
      style={{ top, left: `${x}%`, width: w, height: h, transition: `left ${duration}ms linear` }}
      aria-hidden="true"
    >
      <span
        style={{
          display: 'block',
          width: w,
          height: h,
          backgroundImage: `url('/sprites/${pet}-wander.webp')`,
          backgroundSize: `${w * COLS}px ${h * 3}px`,
          backgroundPosition: `${-(frame % frames) * w}px ${-walk * h}px`,
          imageRendering: 'pixelated'
        }}
      />
    </span>
  );
}

/** A few pets strolling through a page's open space (wide screens only). */
export default function Wanderers({ lanes }: { lanes: Lane[] }) {
  return (
    <div className="wanderers" aria-hidden="true">
      {lanes.map(lane => (
        <Wanderer key={lane.pet} {...lane} />
      ))}
    </div>
  );
}
