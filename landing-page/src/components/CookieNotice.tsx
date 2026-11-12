'use client';

import { useEffect, useState } from 'react';
import { readConsent, writeConsent } from '@/lib/consent';

/** A small card asking once whether Companion may use cookies on this device. */
export default function CookieNotice() {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(readConsent() === null), 700);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(value: 'yes' | 'no') {
    writeConsent(value);
    setLeaving(true);
    window.setTimeout(() => setOpen(false), 220);
  }

  if (!open) return null;

  return (
    <div className={`cookie-card${leaving ? ' is-leaving' : ''}`} role="dialog" aria-live="polite" aria-label="Cookies">
      <p className="cookie-card__title">Cookies</p>
      <p className="cookie-card__text">
        We use a cookie to remember your order on this device, so you can see its status when you come back. Nothing is used for ads or tracking.
      </p>
      <div className="cookie-card__actions">
        <button type="button" onClick={() => choose('no')} className="gel gel--white gel--sm">
          <span className="gel__shine" aria-hidden="true" />
          <span className="relative z-10">decline</span>
        </button>
        <button type="button" onClick={() => choose('yes')} className="gel gel--black gel--sm">
          <span className="gel__shine" aria-hidden="true" />
          <span className="relative z-10">accept</span>
        </button>
      </div>
    </div>
  );
}
