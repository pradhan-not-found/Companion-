'use client';

import { useState, useEffect, useRef } from 'react';

export default function CreatorPet() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [target, setTarget] = useState({ x: -100, y: -100 });
  const [isMoving, setIsMoving] = useState(false);
  const [frame, setFrame] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  // Initialize random position on mount
  useEffect(() => {
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const startX = Math.random() * maxX;
    const startY = Math.random() * maxY;
    setPosition({ x: startX, y: startY });
    setTarget({ x: startX, y: startY });
    setIsReady(true);
  }, []);

  // Run away when hovered
  const handleHover = () => {
    if (typeof window === 'undefined') return;
    
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    
    // Pick a new random target at least 300px away
    let newX = position.x;
    let newY = position.y;
    while (Math.abs(newX - position.x) < 300 && Math.abs(newY - position.y) < 300) {
      newX = Math.max(20, Math.min(maxX - 20, Math.random() * maxX));
      newY = Math.max(20, Math.min(maxY - 20, Math.random() * maxY));
    }
    
    setTarget({ x: newX, y: newY });
    setIsMoving(true);
  };

  // Movement loop
  useEffect(() => {
    if (!isMoving) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updatePosition = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1); // seconds, capped at 0.1s
      lastTime = time;

      setPosition(prev => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          setIsMoving(false);
          return target;
        }

        // Speed in pixels per second
        const speed = 400; 
        const moveDist = Math.min(speed * delta, dist);
        
        return {
          x: prev.x + (dx / dist) * moveDist,
          y: prev.y + (dy / dist) * moveDist,
        };
      });

      // Continue animation if we're still far enough from target
      animationFrameId = requestAnimationFrame(updatePosition);
    };

    animationFrameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isMoving, target]);

  // Stop moving when distance is small (to break out of potential loop state bugs)
  useEffect(() => {
    if (isMoving) {
      const dist = Math.sqrt(Math.pow(target.x - position.x, 2) + Math.pow(target.y - position.y, 2));
      if (dist < 5) {
        setIsMoving(false);
      }
    }
  }, [position, target, isMoving]);

  // Animation frame loop for spritesheet
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 6); // V2 uses 6 frames per anim
    }, 120); // 120ms per frame
    return () => clearInterval(interval);
  }, []);

  if (!isReady) return null;

  // Determine direction for flipping the sprite
  const isFacingLeft = target.x < position.x;

  // Row 0 is idle, Row 2 is walk right. (Based on common PetDex mapping, 0 is idle, 1 is walk, etc. Let's use 1 for walk)
  const rowIndex = isMoving ? 1 : 0; 

  return (
    <div
      onMouseEnter={handleHover}
      onTouchStart={handleHover}
      className="fixed z-50 cursor-pointer"
      style={{
        left: position.x,
        top: position.y,
        width: 96,
        height: 104,
        transform: `scaleX(${isFacingLeft ? -1 : 1})`,
        transition: isMoving ? 'none' : 'transform 0.2s',
      }}
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/pets/pupu/spritesheet.webp)',
          backgroundSize: '768px 936px', // Scaled 1536x1872 by 0.5
          backgroundPosition: `${-(frame % 6) * 96}px ${-rowIndex * 104}px`,
          filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.1))',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
}
