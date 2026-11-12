'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Write and send an email as Companion (through Gmail), to anyone, a buyer or the whole waitlist. */
export default function AdminCompose({
  initialTo,
  waitlist,
  onClose,
  onSent
}: {
  initialTo: string;
  waitlist: string[];
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (initialTo ? subjectRef : toRef).current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [initialTo, onClose]);

  const recipients = [...new Set(to.split(/[\s,;]+/).map(v => v.trim().toLowerCase()).filter(Boolean))];
  const invalid = recipients.filter(v => !EMAIL.test(v));

  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!recipients.length || invalid.length) {
      setError(invalid.length ? `Check ${invalid[0]}` : 'Add who it’s for.');
      return;
    }
    if (recipients.length > 50) {
      setError('Send to at most 50 people at a time.');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError('Add a subject and a message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/adminpanel/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject: subject.trim(), message: message.trim() })
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; sent?: number };
      if (!body.ok) throw new Error(body.error ?? 'Couldn’t send.');
      onSent(`Sent to ${body.sent ?? recipients.length} ${recipients.length === 1 ? 'person' : 'people'}.`);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t send.');
      setSending(false);
    }
  }

  return (
    <div className="ad-modal" onClick={onClose}>
      <form className="ad-compose" onClick={event => event.stopPropagation()} onSubmit={send} noValidate aria-labelledby="compose-title">
        <header className="flex items-center justify-between">
          <h2 id="compose-title" className="text-[16px] font-semibold tracking-[-0.02em]">
            New email
          </h2>
          <span className="text-[12px] text-[#A1A1AA]">From Companion</span>
        </header>

        <label className="ad-compose__field">
          <span>To</span>
          <input ref={toRef} value={to} onChange={event => setTo(event.target.value)} placeholder="name@example.com" autoComplete="off" />
          {waitlist.length ? (
            <button type="button" className="ad-compose__chip" onClick={() => setTo(waitlist.slice(0, 50).join(', '))}>
              Waitlist ({Math.min(waitlist.length, 50)})
            </button>
          ) : null}
        </label>
        <label className="ad-compose__field">
          <span>Subject</span>
          <input ref={subjectRef} value={subject} onChange={event => setSubject(event.target.value.slice(0, 150))} autoComplete="off" />
        </label>
        <textarea className="ad-compose__body" value={message} onChange={event => setMessage(event.target.value.slice(0, 5000))} placeholder="Write your message…" rows={9} />

        <footer className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-[12.5px] ${error ? 'text-[#DC2626]' : 'text-[#A1A1AA]'}`}>
            {error || (recipients.length ? `${recipients.length} recipient${recipients.length === 1 ? '' : 's'}` : 'Sent with your Gmail, as Companion')}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="gel gel--white gel--sm">
              <span className="gel__shine" aria-hidden="true" />
              <span className="relative z-10">cancel</span>
            </button>
            <button type="submit" disabled={sending} className="gel gel--black gel--sm disabled:opacity-60">
              <span className="gel__shine" aria-hidden="true" />
              <span className="relative z-10">{sending ? 'sending…' : 'send'}</span>
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
