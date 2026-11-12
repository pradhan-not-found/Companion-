'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Row = Record<string, string>;
type Range = 7 | 30 | 90;

const ACCENT = '#2563EB';
const INK = '#18181B';
const GRID = '#EEEEF1';
const MUTED = '#71717A';
const VERIFIED = 'Verified';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const shortDate = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function days(count: number, offset = 0): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = count - 1 + offset; i >= offset; i -= 1) {
    out.push(dayKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))));
  }
  return out;
}

/** Rounds up to a "nice" axis maximum and returns evenly spaced ticks. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4].slice(0, count + 1);
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) ?? raw;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

function compact(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`;
  return String(n);
}

function series(rows: Row[], keys: string[], pick: (row: Row) => { day: string; value: number } | null) {
  const map = new Map(keys.map(k => [k, 0]));
  for (const row of rows) {
    const point = pick(row);
    if (point && map.has(point.day)) map.set(point.day, (map.get(point.day) ?? 0) + point.value);
  }
  return keys.map(key => ({ key, value: map.get(key) ?? 0 }));
}

/** Measures an element's width so charts draw at their real size (crisp text, fixed height). */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...values);
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A small change badge, shown only when both periods have data. */
function Delta({ now, before }: { now: number; before: number }) {
  if (!now || !before) return null;
  const change = Math.round(((now - before) / before) * 100);
  if (!change) return null;
  return <span className={`ad-delta ${change > 0 ? 'is-up' : 'is-down'}`}>{`${change > 0 ? '+' : ''}${change}%`}</span>;
}

function Kpi({ label, value, now, before, spark }: { label: string; value: string; now: number; before: number; spark: number[] }) {
  const hasTrend = spark.some(Boolean);
  return (
    <div className="ad-stat">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-[#71717A]">{label}</p>
        <Delta now={now} before={before} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums leading-none">{value}</p>
        {hasTrend ? <Sparkline values={spark} /> : null}
      </div>
    </div>
  );
}

/** Area chart: 2px line, soft fill, y-axis ticks, crosshair with tooltip. */
function EmptyChart({ title, message }: { title: string; message: string }) {
  return (
    <section className="ad-chart">
      <p className="text-[13px] font-semibold">{title}</p>
      <div className="ad-chart-empty">{message}</div>
    </section>
  );
}

function AreaChart({ title, data, format, empty }: { title: string; data: { key: string; value: number }[]; format: (n: number) => string; empty: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [box, measured] = useWidth();
  const W = measured || 600;
  const H = 200;
  const L = 44;
  const R = 12;
  const T = 12;
  const B = 26;
  const pw = W - L - R;
  const ph = H - T - B;
  const ticks = niceTicks(Math.max(...data.map(d => d.value)));
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) => L + (data.length === 1 ? pw / 2 : (i / (data.length - 1)) * pw);
  const y = (v: number) => T + ph - (v / top) * ph;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${T + ph} L${x(0).toFixed(1)},${T + ph} Z`;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart title={title} message={empty} />;
  const shown = hover === null ? null : data[hover];
  const labels = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <section className="ad-chart">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{format(total)}</p>
        </div>
      </header>
      <div ref={box} className="relative mt-2">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          role="img"
          aria-label={`${title}: ${format(total)}`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={event => {
            const box = event.currentTarget.getBoundingClientRect();
            const px = ((event.clientX - box.left) / box.width) * W;
            const i = Math.round(((px - L) / pw) * (data.length - 1));
            setHover(Math.min(data.length - 1, Math.max(0, i)));
          }}
        >
          <defs>
            <linearGradient id="adArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill={MUTED}>
                {compact(t)}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#adArea)" />
          <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {labels.map(i => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill={MUTED}>
              {shortDate(data[i].key)}
            </text>
          ))}
          {shown ? (
            <g>
              <line x1={x(hover!)} x2={x(hover!)} y1={T} y2={T + ph} stroke="#A1A1AA" strokeDasharray="3 3" />
              <circle cx={x(hover!)} cy={y(shown.value)} r="4.5" fill="#FFFFFF" stroke={ACCENT} strokeWidth="2" />
            </g>
          ) : null}
        </svg>
        {shown ? (
          <div className="ad-tip" style={{ left: x(hover!) }}>
            <span className="text-[#A1A1AA]">{shortDate(shown.key)}</span>
            <span className="font-semibold tabular-nums">{format(shown.value)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Column chart with y-axis ticks and per-bar tooltips. */
function BarChart({ title, data, format, empty }: { title: string; data: { key: string; value: number }[]; format: (n: number) => string; empty: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [box, measured] = useWidth();
  const W = measured || 600;
  const H = 200;
  const L = 36;
  const R = 8;
  const T = 12;
  const B = 26;
  const pw = W - L - R;
  const ph = H - T - B;
  const ticks = niceTicks(Math.max(...data.map(d => d.value)));
  const top = ticks[ticks.length - 1] || 1;
  const slot = pw / data.length;
  const bar = Math.max(3, Math.min(22, slot - 3));
  const y = (v: number) => T + ph - (v / top) * ph;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart title={title} message={empty} />;
  const shown = hover === null ? null : data[hover];
  const labels = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <section className="ad-chart">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{format(total)}</p>
      <div ref={box} className="relative mt-2">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`${title}: ${format(total)}`} onMouseLeave={() => setHover(null)}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill={MUTED}>
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = d.value ? Math.max(2, ((d.value / top) * ph)) : 0;
            const bx = L + i * slot + (slot - bar) / 2;
            const by = T + ph - h;
            const r = Math.min(3, bar / 2, h);
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)}>
                <rect x={L + i * slot} y={T} width={slot} height={ph} fill="transparent" />
                {h ? (
                  <path
                    d={`M${bx},${T + ph} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bar - r} Q${bx + bar},${by} ${bx + bar},${by + r} V${T + ph} Z`}
                    fill={INK}
                    opacity={hover === null || hover === i ? 1 : 0.3}
                  />
                ) : null}
              </g>
            );
          })}
          {labels.map(i => (
            <text key={i} x={L + i * slot + slot / 2} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill={MUTED}>
              {shortDate(data[i].key)}
            </text>
          ))}
        </svg>
        {shown ? (
          <div className="ad-tip" style={{ left: L + hover! * slot + slot / 2 }}>
            <span className="text-[#A1A1AA]">{shortDate(shown.key)}</span>
            <span className="font-semibold tabular-nums">{format(shown.value)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map(s => s.value));
  return (
    <section className="ad-chart">
      <p className="text-[13px] font-semibold">License funnel</p>
      <ul className="mt-4 flex flex-col gap-4">
        {steps.map((step, index) => {
          const share = index && steps[0].value ? Math.round((step.value / steps[0].value) * 100) : null;
          return (
            <li key={step.label}>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="text-[#3F3F46]">{step.label}</span>
                <span className="tabular-nums font-semibold">
                  {step.value}
                  {share !== null ? <span className="ml-1.5 font-normal text-[#A1A1AA]">{share}%</span> : null}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[#F1F1F3] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(step.value / max) * 100}%`, background: ACCENT }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Activity({ orders, sponsors, waitlist }: { orders: Row[]; sponsors: Row[]; waitlist: Row[] }) {
  const events = useMemo(() => {
    const list: { at: string; text: string; tone: 'new' | 'ok' | 'muted' }[] = [];
    for (const o of orders) {
      list.push({ at: o.submittedAt, text: `${o.name || o.email} placed order ${o.reference}`, tone: 'new' });
      if (o.status === VERIFIED && o.verifiedAt) list.push({ at: o.verifiedAt, text: `License issued for ${o.reference}`, tone: 'ok' });
    }
    for (const s of sponsors) {
      list.push({ at: s.submittedAt, text: `${s.company || s.name} sponsored ${inr(Number(s.amount) || 0)}`, tone: 'new' });
      if (s.status === VERIFIED && s.verifiedAt) list.push({ at: s.verifiedAt, text: `${s.company || s.name} is now live`, tone: 'ok' });
    }
    for (const w of waitlist) list.push({ at: w.submittedAt, text: `${w.email} joined the waitlist`, tone: 'muted' });
    return list.filter(e => e.at).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  }, [orders, sponsors, waitlist]);

  return (
    <section className="ad-chart">
      <p className="text-[13px] font-semibold">Recent activity</p>
      {events.length ? (
        <ul className="mt-3 flex flex-col">
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="ad-event">
              <span className={`ad-event__dot is-${e.tone}`} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">{e.text}</span>
              <span className="text-[12px] text-[#A1A1AA] shrink-0 tabular-nums">
                {new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-[#A1A1AA]">Nothing yet. New orders and sponsors show up here.</p>
      )}
    </section>
  );
}

export default function AdminOverview({ orders, sponsors, waitlist, range }: { orders: Row[]; sponsors: Row[]; waitlist: Row[]; range: Range }) {

  const view = useMemo(() => {
    const current = days(range);
    const previous = days(range, range);
    const verified = [...orders, ...sponsors].filter(r => r.status === VERIFIED);
    const revenuePick = (r: Row) => ({ day: (r.verifiedAt || r.submittedAt || '').slice(0, 10), value: Number(r.amount) || 0 });
    const countPick = (r: Row) => ({ day: (r.submittedAt || '').slice(0, 10), value: 1 });
    const licensePick = (r: Row) => (r.licenseKey ? { day: (r.verifiedAt || '').slice(0, 10), value: 1 } : null);
    const revenue = series(verified, current, revenuePick);
    const revenuePrev = series(verified, previous, revenuePick);
    const placed = series(orders, current, countPick);
    const placedPrev = series(orders, previous, countPick);
    const licenses = series(orders.filter(r => r.status === VERIFIED), current, licensePick);
    const licensesPrev = series(orders.filter(r => r.status === VERIFIED), previous, licensePick);
    const joined = series(waitlist, current, countPick);
    const joinedPrev = series(waitlist, previous, countPick);
    const sum = (s: { value: number }[]) => s.reduce((a, b) => a + b.value, 0);
    const tail = (s: { value: number }[]) => s.slice(-14).map(p => p.value);
    return {
      revenue,
      placed,
      kpis: [
        { label: 'Revenue', value: inr(sum(revenue)), now: sum(revenue), before: sum(revenuePrev), spark: tail(revenue) },
        { label: 'Orders', value: String(sum(placed)), now: sum(placed), before: sum(placedPrev), spark: tail(placed) },
        { label: 'Licenses issued', value: String(sum(licenses)), now: sum(licenses), before: sum(licensesPrev), spark: tail(licenses) },
        { label: 'Waitlist signups', value: String(sum(joined)), now: sum(joined), before: sum(joinedPrev), spark: tail(joined) }
      ],
      funnel: [
        { label: 'Orders placed', value: orders.length },
        { label: 'Payments verified', value: orders.filter(r => r.status === VERIFIED).length },
        { label: 'Licenses activated', value: orders.filter(r => r.status === VERIFIED && r.licensedTo).length }
      ]
    };
  }, [orders, sponsors, waitlist, range]);

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {view.kpis.map(kpi => (
          <Kpi key={kpi.label} {...kpi} />
        ))}
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AreaChart title="Revenue" data={view.revenue} format={inr} empty={`No revenue in the last ${range} days`} />
        <BarChart title="Orders" data={view.placed} format={n => `${n} order${n === 1 ? '' : 's'}`} empty={`No orders in the last ${range} days`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        <Funnel steps={view.funnel} />
        <Activity orders={orders} sponsors={sponsors} waitlist={waitlist} />
      </div>
    </div>
  );
}
