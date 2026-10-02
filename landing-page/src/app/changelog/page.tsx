'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface Asset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  assets: Asset[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatBytes(bytes: number) {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

function ReleaseBody({ body, colors }: { body: string; colors: { title: string; sub: string; body: string; dot: string } }) {
  if (!body) return null;
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('## ') || line.startsWith('### ')) {
          const text = line.replace(/^#{2,3}\s*/, '');
          return (
            <p key={i} className="text-[11px] font-semibold tracking-[0.08em] uppercase mt-3 first:mt-0" style={{ color: colors.body }}>
              {text}
            </p>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ background: colors.dot }} />
              <p className="text-[13px] leading-[1.65]" style={{ color: colors.sub }}>
                {line.replace(/^[-*]\s*/, '')}
              </p>
            </div>
          );
        }
        // Full changelog link — render as link
        if (line.startsWith('**Full Changelog**')) {
          const urlMatch = line.match(/https?:\/\/[^\s)]+/);
          return (
            <a key={i} href={urlMatch?.[0]} target="_blank" rel="noopener noreferrer"
              className="text-[12px] mt-1 no-underline hover:underline"
              style={{ color: colors.body }}>
              View full diff on GitHub →
            </a>
          );
        }
        return (
          <p key={i} className="text-[13px] leading-[1.65]" style={{ color: colors.sub }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function ChangelogPage() {
  const [isDark, setIsDark] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/pradhan-not-found/Companion-/releases')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReleases(data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleDark = () => {
    setIsDark(v => { localStorage.setItem('theme', !v ? 'dark' : 'light'); return !v; });
  };

  const bg = isDark ? '#111111' : '#FAF9F6';
  const title = isDark ? '#FFFFFF' : '#2E2E2D';
  const sub = isDark ? '#A0A0A0' : '#6E6D6A';
  const body = isDark ? '#666' : '#A8A7A4';
  const cardBg = isDark ? '#171717' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tagBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const assetBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const assetBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const bodyColors = { title, sub, body, dot: body };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: bg }}>
      <div className="relative z-10 flex flex-col min-h-screen">
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="w-full max-w-4xl">

          {/* Header */}
          <div className="mb-20 text-center">
            <h1 className="text-[48px] md:text-[64px] font-medium tracking-tight mb-2" style={{ color: title }}>what's new</h1>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="flex flex-col gap-4">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className="h-40 rounded-[14px] animate-pulse"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && releases.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-[16px] gap-3 text-center"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 opacity-25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: sub }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-[14px]" style={{ color: sub }}>No releases yet. Check back soon.</p>
            </div>
          )}

          {/* Releases */}
          <div className="flex flex-col gap-16 md:gap-24 mt-12">
            {releases.map((release, idx) => (
              <div
                key={release.id}
                className="flex flex-col md:flex-row gap-8 md:gap-20 items-start"
              >
                {/* Left: Sticky Meta */}
                <div className="md:w-[200px] shrink-0 sticky top-24 flex flex-col items-start gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[12px] font-medium px-3.5 py-1 rounded-full tracking-wide"
                        style={{ 
                          background: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)', 
                          color: isDark ? '#93C5FD' : '#2563EB',
                          border: isDark ? '1px solid rgba(96, 165, 250, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)' 
                        }}
                      >
                        {release.tag_name}
                      </span>
                      {idx === 0 && !release.prerelease && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                          Latest
                        </span>
                      )}
                      {release.prerelease && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: '#CA8A04' }}>
                          Pre-release
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: sub }}>
                    {formatDate(release.published_at)}
                  </span>
                </div>

                {/* Right: Content */}
                <div className="flex-1 min-w-0 pb-4">
                  {/* Release name */}
                  <h2 className="text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mb-4" style={{ color: title }}>
                    {release.name && release.name !== release.tag_name ? release.name : `Release ${release.tag_name}`}
                  </h2>

                  {/* Release body */}
                  {release.body && (
                    <div className="mb-8">
                      <ReleaseBody body={release.body} colors={bodyColors} />
                    </div>
                  )}

                  {/* Assets / Download */}
                  {release.assets && release.assets.length > 0 && (
                    <div className="mt-8 flex flex-col gap-2">
                      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1" style={{ color: body }}>
                        Downloads
                      </p>
                      {release.assets.map(asset => (
                        <a
                          key={asset.id}
                          href={asset.browser_download_url}
                          className="flex items-center gap-3 px-4 py-3 rounded-[10px] no-underline transition-all duration-150 group"
                          style={{ background: assetBg, border: `1px solid ${assetBorder}`, color: sub }}
                          onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = assetBg; }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 shrink-0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: sub }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[13px] font-medium truncate" style={{ color: title }}>{asset.name}</span>
                            <span className="text-[11px]" style={{ color: body }}>{formatBytes(asset.size)}</span>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 opacity-30 group-hover:opacity-70 shrink-0 transition-opacity" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7M17 7H7M17 7v10"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Footer links */}
                  <div className="mt-6 flex items-center">
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] font-medium no-underline transition-opacity hover:opacity-70"
                      style={{ color: body }}
                    >
                      View on GitHub
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7M17 7H7M17 7v10"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
