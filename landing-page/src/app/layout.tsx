import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const switzer = localFont({
  src: "../../public/fonts/Switzer-Variable.ttf",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://companion.app";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  // ── Core ──────────────────────────────────────────────────
  title: {
    default: "Companion: a desktop pet that keeps you company while you work",
    template: "%s | Companion",
  },
  description:
    "Companion is a pixel desktop pet for Windows that lives on your screen, reminds you to drink water and take breaks, guards your focus sessions and pings you when your coding agent needs you. Free to download.",
  keywords: [
    "desktop pet",
    "productivity app",
    "focus timer",
    "hydration reminder",
    "companion app",
    "pixel pet",
    "desktop companion",
    "work from home",
    "pomodoro",
    "animated pet",
    "windows desktop pet",
    "virtual pet for pc",
    "claude code notifications",
    "codex notifications",
    "clipboard history",
  ],
  authors: [{ name: "Souradeep Pradhan", url: "/creator" }],
  creator: "Souradeep Pradhan",
  publisher: "Companion",
  category: "Productivity",

  // ── Canonical ─────────────────────────────────────────────
  alternates: {
    canonical: "/",
  },

  // ── Open Graph ────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Companion",
    title: "Companion: never work alone",
    description:
      "A pixel desktop pet for Windows that keeps you hydrated, focused and company while you work. Free to download.",
  },

  // ── Twitter / X ───────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Companion: never work alone",
    description:
      "A pixel desktop pet for Windows that keeps you hydrated, focused and company while you work. Free to download.",
  },

  // ── Robots ────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Icons ─────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.svg",  type: "image/svg+xml", sizes: "any"     },
      { url: "/applogo.png",  type: "image/png",     sizes: "512x512" },
    ],
    apple:    [{ url: "/applogo.png", sizes: "180x180" }],
    shortcut: "/applogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Companion",
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Windows 10, Windows 11",
              description:
                "A pixel desktop pet that lives on your screen, reminds you to drink water and take breaks, guards your focus sessions and pings you when your coding agent needs you.",
              url: BASE_URL,
              image: `${BASE_URL}/opengraph-image.png`,
              softwareVersion: "1.1.0",
              downloadUrl: "https://github.com/pradhan-not-found/Companion-/releases/latest",
              author: { "@type": "Person", name: "Souradeep Pradhan" },
              offers: [
                { "@type": "Offer", name: "Download", price: "0", priceCurrency: "INR" },
                { "@type": "Offer", name: "Companion Pro", price: "250", priceCurrency: "INR", url: `${BASE_URL}/pricing` },
              ],
            }),
          }}
        />
      </head>
      <body className={`h-full ${switzer.className}`}>{children}</body>
    </html>
  );
}
