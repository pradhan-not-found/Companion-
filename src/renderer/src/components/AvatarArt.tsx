import type { JSX } from "react";

/*
 * Custom monoline avatar marks, drawn for Companion. They render in a colour
 * that contrasts with the chosen background so every swatch works.
 */

export const AVATAR_ART = ["orbit", "wave", "spark", "bloom", "peak", "grid"] as const;
export type AvatarArtId = (typeof AVATAR_ART)[number];

export const AVATAR_ART_LABELS: Record<AvatarArtId, string> = {
  orbit: "Orbit",
  wave: "Wave",
  spark: "Spark",
  bloom: "Bloom",
  peak: "Peak",
  grid: "Grid"
};

function paths(id: AvatarArtId): JSX.Element {
  switch (id) {
    case "orbit":
      return (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-28 12 12)" />
          <circle cx="19.2" cy="7.6" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "wave":
      return (
        <>
          <path d="M3 9c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 3.6-2.2 5 0" />
          <path d="M3 14c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 3.6-2.2 5 0" />
          <path d="M3 19c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 3.6-2.2 5 0" opacity="0.5" />
        </>
      );
    case "spark":
      return (
        <>
          <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
          <path d="m6.2 6.2 2.6 2.6M15.2 15.2l2.6 2.6M17.8 6.2l-2.6 2.6M8.8 15.2l-2.6 2.6" opacity="0.55" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </>
      );
    case "bloom":
      return (
        <>
          <circle cx="12" cy="7.5" r="3.4" />
          <circle cx="16.5" cy="12" r="3.4" />
          <circle cx="12" cy="16.5" r="3.4" />
          <circle cx="7.5" cy="12" r="3.4" />
        </>
      );
    case "peak":
      return (
        <>
          <path d="m3 19 6.5-10 4 6 2.5-3.5L21 19Z" />
          <circle cx="17" cy="6.5" r="1.8" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="3.25" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="3.25" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
        </>
      );
  }
}

function isDark(hex: string): boolean {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

export function AvatarArt({ id, color, size }: { id: AvatarArtId; color: string; size: number }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={Math.round(size * 0.5)}
      height={Math.round(size * 0.5)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: isDark(color) ? "rgba(255,255,255,0.92)" : "rgba(23,23,23,0.78)" }}
      aria-hidden="true"
    >
      {paths(id)}
    </svg>
  );
}

export function isAvatarArt(value: string): value is `art:${AvatarArtId}` {
  return value.startsWith("art:") && (AVATAR_ART as readonly string[]).includes(value.slice(4));
}
