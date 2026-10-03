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
    month: 'short',
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
        if (line.startsWith('## ')) {
          const text = line.replace(/^##\s*/, '');
          return (
            <h2 key={i} className="text-[22px] md:text-[26px] font-medium tracking-tight mb-4 mt-2 first:mt-0" style={{ color: colors.title }}>
              {text}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          const text = line.replace(/^###\s*/, '');
          return (
            <h3 key={i} className="text-[16px] font-bold mt-6 mb-2" style={{ color: colors.title }}>
              {text}
            </h3>
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
        // Full changelog link — ignore it entirely
        if (line.startsWith('**Full Changelog**')) {
          return null;
        }
        return (
          <p key={i} className="text-[15px] leading-[1.7]" style={{ color: colors.sub }}>
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

  const fallbackInitialReleaseBody = `
## Introducing Companion
Where it all started. A virtual pet that lives as a buddy on your desktop. It can roam your screen, remind you to stay hydrated, and even take breaks with you, kinda like having a real companion next to you.
  `.trim();

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: bg }}>
      <div className="relative z-10 flex flex-col min-h-screen">
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="w-full max-w-4xl">

          {/* Header */}
          {/* Removed big title header to match screenshot */}

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
          <div className="flex flex-col mt-12">
            {releases.map((release, idx) => {
              const bodyContent = release.body || fallbackInitialReleaseBody;
              return (
                <div key={release.id}>
                  <div className="flex flex-col md:flex-row gap-6 md:gap-14 items-start">
                    
                    {/* Left: Sticky Meta */}
                    <div className="md:w-[150px] shrink-0 md:sticky md:top-24 flex flex-col items-start gap-1.5">
                      <div className="relative rounded-[20px] flex items-center justify-center overflow-hidden px-3 py-[2px]"
                           style={{
                             background: 'linear-gradient(to bottom, #dbe4ff 0%, #b8cfff 100%)',
                             border: '1px solid #7592fb',
                             boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)'
                           }}>
                        <div className="absolute top-[1px] left-[2px] right-[2px] h-[45%] rounded-t-full pointer-events-none"
                             style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)' }} />
                        <span className="relative z-10 text-[#1e2a5c] font-[Arial,Helvetica,sans-serif] text-[12px] font-semibold tracking-wide">
                          {release.tag_name}
                        </span>
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: sub }}>
                        {formatDate(release.published_at)}
                      </span>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 min-w-0 pb-2 md:pb-4">
                      {/* Release name */}
                      {release.name && release.name !== release.tag_name && (
                        <h2 className="text-[22px] md:text-[26px] font-medium tracking-tight mb-4" style={{ color: title }}>
                          {release.name}
                        </h2>
                      )}

                      {/* Release body */}
                      {bodyContent && (
                        <div className="mb-8">
                          <ReleaseBody body={bodyContent} colors={bodyColors} />
                        </div>
                      )}
                    </div>
                  </div>

                {/* Divider Line between releases */}
                {idx !== releases.length - 1 && (
                  <div className="w-full h-px my-14 md:my-20" style={{ background: divider }} />
                )}
              </div>
              );
            })}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
