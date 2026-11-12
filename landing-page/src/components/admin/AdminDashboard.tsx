'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminCompose from '@/components/admin/AdminCompose';

type Row = Record<string, string>;
type Page = 'overview' | 'orders' | 'licenses' | 'sponsors' | 'waitlist';
type Filter = 'pending' | 'verified' | 'all';
type Data = { orders: Row[]; sponsors: Row[]; waitlist: Row[] };

const VERIFIED = 'Verified';
const REJECTED = 'Rejected';
const MAX_DEVICES = 2;

const inr = (value: string | number) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

function when(iso: string) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function statusOf(row: Row): 'pending' | 'verified' | 'rejected' {
  if (row.status === VERIFIED) return 'verified';
  if (row.status === REJECTED) return 'rejected';
  return 'pending';
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="text-[#A1A1AA]">—</span>;
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
      title="Copy"
    >
      <span className="tabular-nums">{done ? 'Copied' : value}</span>
    </button>
  );
}

function StatusPill({ row }: { row: Row }) {
  const status = statusOf(row);
  return <span className={`ad-pill is-${status}`}>{status === 'pending' ? 'Pending' : status === 'verified' ? 'Verified' : 'Rejected'}</span>;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  orders: <><path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-3 2-3-2-3 2-2-1.3V3a1 1 0 0 1 1-1Z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  licenses: <><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2" /></>,
  sponsors: <path d="M12 20s-7-4.4-9-8.8C1.8 8.3 3.7 5 7 5c2 0 3.3 1 5 2.8C13.7 6 15 5 17 5c3.3 0 5.2 3.3 4 6.2C19 15.6 12 20 12 20Z" />,
  waitlist: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-2.8-5.3" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  signout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 16-4-4 4-4M6 12h10" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  compose: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  download: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>
};

function SearchResults({ data, query, onOpen }: { data: Data; query: string; onOpen: (page: Page) => void }) {
  const match = (row: Row) => [row.reference, row.name, row.email, row.company, row.licenseKey, row.licensedTo, row.website].some(v => String(v ?? '').toLowerCase().includes(query));
  const groups: { page: Page; label: string; items: Row[]; line: (row: Row) => string }[] = [
    { page: 'orders', label: 'Orders', items: data.orders.filter(match), line: r => `${r.reference} · ${r.name || r.email} · ${r.status}` },
    { page: 'licenses', label: 'Licenses', items: data.orders.filter(r => r.licenseKey && match(r)), line: r => `${r.licenseKey} · ${r.licensedTo || 'Not activated'}` },
    { page: 'sponsors', label: 'Sponsors', items: data.sponsors.filter(match), line: r => `${r.company || r.name} · ${r.reference} · ${r.status}` },
    { page: 'waitlist', label: 'Waitlist', items: data.waitlist.filter(match), line: r => r.email }
  ];
  const any = groups.some(g => g.items.length);
  if (!any) return <div className="ad-list ad-empty text-[#71717A]">No matches.</div>;
  return (
    <div className="flex flex-col gap-3">
      {groups.filter(g => g.items.length).map(group => (
        <section key={group.label} className="ad-list">
          <div className="ad-thead ad-thead--single">
            <span>{group.label}</span>
            <button type="button" className="ad-link" onClick={() => onOpen(group.page)}>
              Open {group.label.toLowerCase()}
            </button>
          </div>
          {group.items.slice(0, 6).map((row, i) => (
            <article key={`${group.label}-${i}`} className="ad-row ad-row--simple">
              <p className="truncate">{group.line(row)}</p>
              <p className="text-[12.5px] text-[#71717A] shrink-0">{when(row.submittedAt)}</p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

const PAGES: { id: Page; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'waitlist', label: 'Waitlist' }
];

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [filter, setFilter] = useState<Filter>('pending');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [compose, setCompose] = useState<string | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load data');
    }
    if (manual) window.setTimeout(() => setRefreshing(false), 300);
  }, []);

  // First load, then quiet background refreshes while the tab is visible.
  useEffect(() => {
    const first = requestAnimationFrame(() => void load());
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const id = window.setInterval(tick, 8000);
    window.addEventListener('focus', tick);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
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
      pendingOrders: orders.filter(row => statusOf(row) === 'pending').length,
      pendingSponsors: sponsors.filter(row => statusOf(row) === 'pending').length,
      licenses: verifiedOrders.length,
      activated: verifiedOrders.filter(row => row.licensedTo).length,
      revenue: [...verifiedOrders, ...verifiedSponsors].reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
      waitlist: data?.waitlist.length ?? 0
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (page === 'waitlist') return data.waitlist;
    if (page === 'licenses') return data.orders.filter(row => row.status === VERIFIED && row.licenseKey);
    const list = page === 'orders' ? data.orders : page === 'sponsors' ? data.sponsors : [];
    return filter === 'all' ? list : list.filter(row => statusOf(row) === filter);
  }, [data, page, filter]);

  function downloadCsv() {
    const columns: [string, string][] =
      page === 'licenses'
        ? [['licenseKey', 'License key'], ['reference', 'Order'], ['name', 'Buyer'], ['email', 'Buyer email'], ['licensedTo', 'Activated by'], ['devices', 'Devices'], ['verifiedAt', 'Issued at']]
        : page === 'orders'
          ? [['submittedAt', 'Submitted at'], ['reference', 'Order'], ['amount', 'Amount (INR)'], ['name', 'Name'], ['email', 'Email'], ['status', 'Status'], ['licenseKey', 'License key'], ['licensedTo', 'Licensed to'], ['line1', 'Address'], ['city', 'City'], ['state', 'State'], ['pin', 'PIN'], ['verifiedAt', 'Verified at']]
          : page === 'sponsors'
            ? [['submittedAt', 'Submitted at'], ['reference', 'Reference'], ['amount', 'Amount (INR)'], ['company', 'Company'], ['name', 'Name'], ['email', 'Email'], ['website', 'Website'], ['status', 'Status'], ['logo', 'Logo'], ['message', 'Message'], ['verifiedAt', 'Verified at']]
            : [['submittedAt', 'Submitted at'], ['email', 'Email'], ['name', 'Name'], ['mac', 'Mac']];
    const cell = (value: unknown) => {
      const text = String(value ?? '').replace(/^[=+\-@]/, "'$&");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [columns.map(([, label]) => cell(label)).join(','), ...rows.map(row => columns.map(([key]) => cell(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `companion-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const badge: Partial<Record<Page, number>> = { orders: stats.pendingOrders, sponsors: stats.pendingSponsors };
  const title = PAGES.find(item => item.id === page)?.label ?? '';

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <div className="flex items-center gap-2.5 px-2">
          <Image src="/icon-192.png" alt="" width={30} height={30} className="rounded-[8px]" />
          <span className="text-[15.5px] font-semibold tracking-[-0.02em]">Companion</span>
        </div>

        <nav className="mt-8 flex flex-col gap-0.5" aria-label="Sections">
          {PAGES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPage(item.id);
                setFilter('pending');
              }}
              className={`ad-nav${page === item.id ? ' is-on' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <span className="flex items-center gap-2.5">
                <Icon>{ICONS[item.id]}</Icon>
                {item.label}
              </span>
              {badge[item.id] ? <span className="ad-badge">{badge[item.id]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          <button type="button" onClick={() => void load(true)} className="ad-nav" disabled={refreshing}>
            <span className="flex items-center gap-2.5">
              <span className={refreshing ? 'ad-spin inline-flex' : 'inline-flex'}>
                <Icon>{ICONS.refresh}</Icon>
              </span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </span>
          </button>
          <button type="button" onClick={() => void signOut()} className="ad-nav">
            <span className="flex items-center gap-2.5">
              <Icon>{ICONS.signout}</Icon>
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-head">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]">{query.trim() ? 'Search' : page === 'overview' ? 'Overview' : title}</h1>
          <div className="ad-head__tools">
            {query.trim() ? null : page === 'overview' ? (
              <div className="ad-seg" role="radiogroup" aria-label="Range">
                {([7, 30, 90] as const).map(value => (
                  <button key={value} type="button" role="radio" aria-checked={range === value} onClick={() => setRange(value)} className={range === value ? 'is-on' : ''}>
                    {value} days
                  </button>
                ))}
              </div>
            ) : (
              <>
                {page === 'orders' || page === 'sponsors' ? (
                  <div className="ad-seg" role="radiogroup" aria-label="Status">
                    {(['pending', 'verified', 'all'] as Filter[]).map(value => (
                      <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)} className={filter === value ? 'is-on' : ''}>
                        {value[0].toUpperCase() + value.slice(1)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" onClick={downloadCsv} disabled={!rows.length} className="ad-btn inline-flex items-center gap-1.5">
                  <Icon>{ICONS.download}</Icon>
                  Export
                </button>
              </>
            )}
            <label className="ad-searchbar">
              <Icon>{ICONS.search}</Icon>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search orders, licenses, sponsors and waitlist" />
            </label>
            <button type="button" onClick={() => setCompose('')} className="gel gel--black gel--sm">
              <span className="gel__shine" aria-hidden="true" />
              <span className="relative z-10 inline-flex">
                <Icon>{ICONS.compose}</Icon>
              </span>
              <span className="relative z-10">compose</span>
            </button>
          </div>
        </header>

        {error ? (
          <div className="ad-list ad-empty">
            <p className="font-semibold">Couldn&apos;t load data</p>
            <p className="mt-1 text-[13px] text-[#71717A]">{error}</p>
          </div>
        ) : !data ? (
          <div className="ad-list ad-empty text-[#71717A]">Loading…</div>
        ) : query.trim() ? (
          <SearchResults data={data} query={query.trim().toLowerCase()} onOpen={next => { setQuery(''); setPage(next); setFilter('all'); }} />
        ) : page === 'overview' ? (
          <AdminOverview orders={data.orders} sponsors={data.sponsors} waitlist={data.waitlist} range={range} />
        ) : rows.length === 0 ? (
          <div className="ad-list ad-empty text-[#71717A]">
            {page === 'waitlist'
              ? 'No one on the waitlist yet.'
              : page === 'licenses'
                ? 'No licenses yet. Verify an order to issue one.'
                : `Nothing ${filter === 'all' ? 'here' : filter} yet.`}
          </div>
        ) : page === 'licenses' ? (
          <section className="ad-list">
            <div className="ad-thead">
              <span>License key</span>
              <span>Bought by</span>
              <span>Activated by</span>
              <span>PCs</span>
              <span />
            </div>
            {rows.map(row => {
              const devices = row.devices ? row.devices.split(',').filter(Boolean).length : 0;
              const resetKey = `reset:${row.reference}`;
              return (
                <article key={row.licenseKey} className="ad-lrow">
                  <span>
                    <CopyButton value={row.licenseKey} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{row.name || '—'}</span>
                    <span className="block text-[12.5px] text-[#71717A] truncate">{row.email}</span>
                  </span>
                  <span className="min-w-0 truncate">{row.licensedTo || <span className="text-[#A1A1AA]">Not activated</span>}</span>
                  <span className="tabular-nums">
                    {devices}/{MAX_DEVICES}
                  </span>
                  <span className="text-right">
                    {row.licensedTo ? (
                      <button type="button" disabled={busy !== null} onClick={() => void act('reset', 'order', row.reference)} className={`ad-btn${confirming === resetKey ? ' is-danger' : ''}`}>
                        {busy === resetKey ? 'Resetting…' : confirming === resetKey ? 'Confirm' : 'Reset'}
                      </button>
                    ) : null}
                  </span>
                </article>
              );
            })}
          </section>
        ) : page === 'waitlist' ? (
          <section className="ad-list">
            {rows.map((row, index) => (
              <article key={`${row.email}-${index}`} className="ad-row ad-row--simple">
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.email}</p>
                  <p className="text-[12.5px] text-[#71717A]">{[row.name, row.mac].filter(Boolean).join(' · ') || 'Waitlist'}</p>
                </div>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-[12.5px] text-[#71717A]">{when(row.submittedAt)}</span>
                  <button type="button" className="ad-icon" onClick={() => setCompose(row.email)} title={`Email ${row.email}`} aria-label={`Email ${row.email}`}>
                    <Icon>{ICONS.mail}</Icon>
                  </button>
                </span>
              </article>
            ))}
          </section>
        ) : (
          <section className="ad-list">
            {rows.map(row => {
              const type = page === 'orders' ? 'order' : 'sponsor';
              const status = statusOf(row);
              const verifyKey = `verify:${row.reference}`;
              const rejectKey = `reject:${row.reference}`;
              return (
                <article key={row.reference} className="ad-row">
                  <div className="ad-row__who">
                    {type === 'sponsor' && row.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.logo} alt="" className="ad-logo-img" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{type === 'sponsor' ? row.company || row.name : row.name}</p>
                      <p className="text-[12.5px] text-[#71717A] truncate">{row.email}</p>
                    </div>
                  </div>

                  <div className="ad-row__meta">
                    <p className="text-[15px] font-semibold tabular-nums">{inr(row.amount)}</p>
                    <p className="text-[12px] text-[#71717A]">
                      <CopyButton value={row.reference} /> · {when(row.submittedAt)}
                    </p>
                  </div>

                  <div className="ad-row__actions">
                    <button type="button" className="ad-icon" onClick={() => setCompose(row.email)} title={`Email ${row.email}`} aria-label={`Email ${row.email}`}>
                      <Icon>{ICONS.mail}</Icon>
                    </button>
                    <StatusPill row={row} />
                    {status === 'pending' ? (
                      <>
                        <button type="button" disabled={busy !== null} onClick={() => void act('reject', type, row.reference)} className={`ad-btn${confirming === rejectKey ? ' is-danger' : ''}`}>
                          {busy === rejectKey ? 'Rejecting…' : confirming === rejectKey ? 'Confirm' : 'Reject'}
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void act('verify', type, row.reference)} className={`ad-btn is-primary${confirming === verifyKey ? ' is-confirm' : ''}`}>
                          {busy === verifyKey ? 'Verifying…' : confirming === verifyKey ? 'Confirm' : 'Verify'}
                        </button>
                      </>
                    ) : status === 'verified' && type === 'order' ? (
                      <button type="button" disabled={busy !== null} onClick={() => void act('resend', type, row.reference)} className="ad-btn">
                        {busy === `resend:${row.reference}` ? 'Sending…' : 'Resend key'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {compose !== null ? (
        <AdminCompose
          initialTo={compose}
          waitlist={(data?.waitlist ?? []).map(row => row.email).filter(Boolean)}
          onClose={() => setCompose(null)}
          onSent={message => setToast(message)}
        />
      ) : null}

      {toast ? (
        <div className="ad-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
