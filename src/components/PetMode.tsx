import { useRef } from 'react';

interface PetModeProps {
  bgImage: string;
  bgPos: string;
  bgSize?: string;
  nativeWidth: number;
  nativeHeight: number;
  scale: number;
  flipX: number;
  onClick: () => void;
}

const eAPI = () => (window as any).electronAPI as {
  petDragStart: (offset: {x: number, y: number}) => void;
  petDragStop: () => void;
} | undefined;

export default function PetMode({ bgImage, bgPos, bgSize, nativeWidth, nativeHeight, scale, flipX, onClick }: PetModeProps) {
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean; pointerId: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      pointerId: e.pointerId
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const distance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (!drag.dragging && distance > 5) {
      drag.dragging = true;
      eAPI()?.petDragStart({ x: drag.startX, y: drag.startY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag.dragging) {
      eAPI()?.petDragStop();
    } else {
      onClick();
    }
    dragRef.current = null;
  };

  return (
    <div className="pet-mode-root">
      <div
        className="cat-sprite-widget"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Click me!"
        style={{
          width: `${nativeWidth}px`,
          height: `${nativeHeight}px`,
          backgroundImage: bgImage,
          backgroundPosition: bgPos,
          backgroundSize: bgSize,
          transform: `scale(${scale}) scaleX(${flipX})`,
          transformOrigin: 'center center',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}
