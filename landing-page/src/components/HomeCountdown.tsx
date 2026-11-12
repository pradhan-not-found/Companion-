'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Counts down, then sends the visitor home. */
export default function HomeCountdown({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const id = window.setInterval(() => setLeft(value => Math.max(0, value - 1)), 1000);
    const go = window.setTimeout(() => router.replace('/'), seconds * 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(go);
    };
  }, [router, seconds]);

  return (
    <p className="mt-3 text-[15px] text-[#6D6D6D] tabular-nums">
      Taking you home in {left} second{left === 1 ? '' : 's'}.
    </p>
  );
}
