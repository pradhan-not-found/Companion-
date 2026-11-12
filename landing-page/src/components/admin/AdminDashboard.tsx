'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

type Row = Record<string, string>;
type Tab = 'orders' | 'sponsors' | 'waitlist';
type Filter = 'pending' | 'verified' | 'rejected' | 'all';
type Data = { orders: Row[]; sponsors: Row[]; waitlist: Row[] };

const VERIFIED = 'Verified';
const REJECTED = 'Rejected';

const inr = (value: string | number) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function statusOf(row: Row): Filter {
  if (row.status === VERIFIED) return 'verified';
  if (row.status === REJECTED) return 'rejected';
  return 'pending';
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ad-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          // clipboard unavailable
        }
      }}
      title={`Copy ${label ?? value}`}
    >
      <span className="tabular-nums">{label ?? value}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {done ? <path d="M20 6 9 17l-5-5" /> : <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>}
      </svg>
    </button>
  );
}

function StatusPill({ row }: { row: Row }) {
  const status = statusOf(row);
  return <span className={`ad-pill is-${status}`}>{status === 'pending' ? 'Pending' : status === 'verified' ? 'Verified' : 'Rejected'}</span>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');
  const [filter, setFilter] = useState<Filter>('pending');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [updatedAt, setUpdatedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/adminpanel/data', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const body = (await response.json()) as { ok?: boolean; error?: string } & Partial<Data>;
      if (!body.ok) throw new Error(body.error ?? 'Could not load data');
      setData({ orders: body.orders ?? [], sponsors: body.sponsors ?? [], waitlist: body.waitlist ?? [] });
      setError('');
      setUpdatedAt(Date.now());
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : 'Could not load data');
    }
    setLoading(false);
  }, []);

  // Live: refresh every few seconds while the tab is open and visible, and right away on focus.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const id = window.setInterval(tick, 6000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.clearInterval(clock);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(null), 3500);
    return () => window.clearTimeout(id);
  }, [confirming]);

  async function act(action: 'verify' | 'reject' | 'resend' | 'reset', type: 'order' | 'sponsor', reference: string) {
    const key = `${action}:${reference}`;
    if (action !== 'resend' && confirming !== key) {
      setConfirming(key);
      return;
    }
    setConfirming(null);
    setBusy(key);
    try {
      const response = await fetch('/api/adminpanel/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, type, reference })
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; record?: Row };
      if (!body.ok || !body.record) throw new Error(body.error ?? 'Action failed');
      const record = body.record;
      setData(current => {
        if (!current) return current;
        const listKey = type === 'order' ? 'orders' : 'sponsors';
        return { ...current, [listKey]: current[listKey].map(row => (row.reference === reference ? { ...row, ...record } : row)) };
      });
      setToast(
        action === 'verify'
          ? type === 'order'
            ? `Verified ${reference}. License emailed.`
            : `Verified ${reference}. Sponsor is live.`
          : action === 'reject'
            ? `Rejected ${reference}. Buyer notified.`
            : action === 'reset'
              ? `Activations cleared for ${reference}.`
              : `License email resent for ${reference}.`
      );
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : 'Action failed');
    }
    setBusy(null);
  }

  async function signOut() {
    await fetch('/api/adminpanel/logout', { method: 'POST' });
    window.location.reload();
  }

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const sponsors = data?.sponsors ?? [];
    const verifiedOrders = orders.filter(row => row.status === VERIFIED);
    const verifiedSponsors = sponsors.filter(row => row.status === VERIFIED);
    return {
      pending: orders.filter(row => statusOf(row) === 'pending').length + sponsors.filter(row => statusOf(row) === 'pending').length,
      licenses: verifiedOrders.length,
      revenue: [...verifiedOrders, ...verifiedSponsors].reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
      waitlist: data?.waitlist.length ?? 0
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const list = tab === 'waitlist' ? data.waitlist : tab === 'orders' ? data.orders : data.sponsors;
    const byStatus = tab === 'waitlist' || filter === 'all' ? list : list.filter(row => statusOf(row) === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(row =>
      [row.reference, row.name, row.email, row.company, row.licenseKey, row.website].some(value => String(value ?? '').toLowerCase().includes(q))
    );
  }, [data, tab, filter, query]);

  function downloadCsv() {
    const columns: [string, string][] =
      tab === 'orders'
        ? [['submittedAt', 'Submitted at'], ['reference', 'Order'], ['amount', 'Amount (INR)'], ['name', 'Name'], ['email', 'Email'], ['status', 'Status'], ['licenseKey', 'License key'], ['licensedTo', 'Licensed to'], ['devices', 'Devices'], ['line1', 'Address'], ['city', 'City'], ['state', 'State'], ['pin', 'PIN'], ['verifiedAt', 'Verified at']]
        : tab === 'sponsors'
          ? [['submittedAt', 'Submitted at'], ['reference', 'Reference'], ['amount', 'Amount (INR)'], ['company', 'Company'], ['name', 'Name'], ['email', 'Email'], ['website', 'Website'], ['status', 'Status'], ['logo', 'Logo'], ['message', 'Message'], ['verifiedAt', 'Verified at']]
          : [['submittedAt', 'Submitted at'], ['email', 'Email'], ['name', 'Name'], ['mac', 'Mac'], ['page', 'Page']];
    const cell = (value: unknown) => {
      const text = String(value ?? '').replace(/^[=+\-@]/, "'$&");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [columns.map(([, label]) => cell(label)).join(','), ...rows.map(row => columns.map(([key]) => cell(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `companion-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const liveLabel = seconds === null ? 'Connecting…' : seconds < 5 ? 'Updated just now' : `Updated ${seconds}s ago`;

  const pendingCount = (list: Row[]) => list.filter(row => statusOf(row) === 'pending').length;

  return (
    <div className="ad min-h-dvh bg-[#FAFAFA] text-[#18181B]">
      <header className="ad-top">
        <div className="flex items-center gap-2.5">
          <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-[7px]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Companion</span>
          <span className="ad-tag">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`ad-live${error ? ' is-off' : ''}`} aria-live="polite">
            <span className="ad-live__dot" aria-hidden="true" />
            {error ? 'Offline' : `Live · ${liveLabel}`}
          </span>
          <button type="button" onClick={() => void signOut()} className="ad-signout">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 sm:px-8 py-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Waiting for you', value: String(stats.pending) },
            { label: 'Licenses issued', value: String(stats.licenses) },
            { label: 'Verified revenue', value: inr(stats.revenue) },
            { label: 'Mac waitlist', value: String(stats.waitlist) }
          ].map(stat => (
            <div key={stat.label} className="ad-stat">
              <p className="text-[12.5px] text-[#71717A]">{stat.label}</p>
              <p className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] tabular-nums">{data ? stat.value : '–'}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="tablist" aria-label="Section">
            {([
              ['orders', 'Orders', data ? pendingCount(data.orders) : 0],
              ['sponsors', 'Sponsors', data ? pendingCount(data.sponsors) : 0],
              ['waitlist', 'Mac waitlist', 0]
            ] as [Tab, string, number][]).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`gel gel--sm ${tab === id ? 'gel--black' : 'gel--white'}`}
              >
                <span className="gel__shine" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
                {count ? <span className="relative z-10 ad-count">{count}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search name, email or reference"
            aria-label="Search"
            className="ad-search"
          />
          {tab !== 'waitlist' ? (
            <div className="ad-seg" role="radiogroup" aria-label="Status">
              {(['pending', 'verified', 'rejected', 'all'] as Filter[]).map(value => (
                <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)} className={filter === value ? 'is-on' : ''}>
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={downloadCsv} disabled={!rows.length} className="ad-btn">
            Download CSV
          </button>
          </div>
        </div>

        <section className="ad-list mt-4">
          {error ? (
            <div className="ad-empty">
              <p className="font-semibold">Couldn&apos;t load data</p>
              <p className="mt-1 text-[13px] text-[#71717A]">{error}</p>
            </div>
          ) : !data ? (
            <div className="ad-empty text-[#71717A]">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="ad-empty text-[#71717A]">{tab === 'waitlist' ? 'No one on the waitlist yet.' : `No ${filter === 'all' ? '' : filter + ' '}${tab} right now.`}</div>
          ) : tab === 'waitlist' ? (
            rows.map((row, index) => (
              <article key={`${row.email}-${index}`} className="ad-row">
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.email}</p>
                  <p className="text-[12.5px] text-[#71717A]">{[row.name, row.mac].filter(Boolean).join(' · ') || 'Waitlist'}</p>
                </div>
                <p className="text-[12.5px] text-[#71717A] shrink-0">{when(row.submittedAt)}</p>
              </article>
            ))
          ) : (
            rows.map(row => {
              const type = tab === 'orders' ? 'order' : 'sponsor';
              const status = statusOf(row);
              const verifyKey = `verify:${row.reference}`;
              const rejectKey = `reject:${row.reference}`;
              return (
                <article key={row.reference} className="ad-row">
                  <div className="ad-row__who">
                    {type === 'sponsor' ? (
                      row.logo ? (
                        <a href={row.logo} target="_blank" rel="noopener noreferrer" className="ad-logo" title="Open logo in Drive">
                          Logo
                        </a>
                      ) : (
                        <span className="ad-logo is-empty">No logo</span>
                      )
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{type === 'sponsor' ? row.company || row.name : row.name}</p>
                      <p className="text-[12.5px] text-[#71717A] truncate">
                        {row.email}
                        {type === 'sponsor' && row.website ? (
                          <>
                            {' · '}
                            <a href={/^https?:\/\//i.test(row.website) ? row.website : `https://${row.website}`} target="_blank" rel="noopener noreferrer" className="underline decoration-[#D4D4D8] underline-offset-2">
                              {row.website.replace(/^https?:\/\//i, '')}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="ad-row__meta">
                    <p className="text-[15px] font-semibold tabular-nums">{inr(row.amount)}</p>
                    <p className="text-[12px] text-[#71717A]">
                      {row.reference} · {when(row.submittedAt)}
                    </p>
                  </div>

                  <div className="ad-row__utr" title="Find this in the payment note in your UPI app">
                    <span className="text-[11.5px] text-[#A1A1AA]">{row.utr ? 'UTR' : 'Note'}</span>
                    <CopyButton value={row.utr || row.reference} />
                  </div>

                  <div className="ad-row__actions">
                    <StatusPill row={row} />
                    {status === 'pending' ? (
                      <>
                        <button type="button" disabled={busy !== null} onClick={() => void act('reject', type, row.reference)} className={`ad-btn${confirming === rejectKey ? ' is-danger' : ''}`}>
                          {busy === rejectKey ? 'Rejecting…' : confirming === rejectKey ? 'Confirm reject' : 'Reject'}
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void act('verify', type, row.reference)} className={`ad-btn is-primary${confirming === verifyKey ? ' is-confirm' : ''}`}>
                          {busy === verifyKey ? 'Verifying…' : confirming === verifyKey ? 'Confirm verify' : 'Verify'}
                        </button>
                      </>
                    ) : status === 'verified' && type === 'order' ? (
                      <>
                        {row.licenseKey ? <CopyButton value={row.licenseKey} /> : null}
                        <span className="text-[12px] text-[#71717A] whitespace-nowrap" title={row.licensedTo ? `Activated by ${row.licensedTo}` : 'Not activated yet'}>
                          {row.licensedTo ? `${row.devices ? row.devices.split(',').filter(Boolean).length : 0} PC` : 'Not activated'}
                        </span>
                        {row.licensedTo ? (
                          <button type="button" disabled={busy !== null} onClick={() => void act('reset', type, row.reference)} className={`ad-btn${confirming === `reset:${row.reference}` ? ' is-danger' : ''}`}>
                            {busy === `reset:${row.reference}` ? 'Resetting…' : confirming === `reset:${row.reference}` ? 'Confirm reset' : 'Reset'}
                          </button>
                        ) : null}
                        <button type="button" disabled={busy !== null} onClick={() => void act('resend', type, row.reference)} className="ad-btn">
                          {busy === `resend:${row.reference}` ? 'Sending…' : 'Resend email'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      {toast ? (
        <div className="ad-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
