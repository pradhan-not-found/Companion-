import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://companion.app";

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  // ── Core ──────────────────────────────────────────────────
  title: {
    default: "Companion — Your Desktop Pet, Always By Your Side",
    template: "%s | Companion",
  },
  description:
    "Companion is a beautifully crafted desktop pet that lives on your screen. Stay hydrated, stay focused, and never work alone. Join the private beta waitlist.",
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
  ],
  authors: [{ name: "Companion" }],
  creator: "Companion",
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
    title: "Companion — Your Desktop Pet, Always By Your Side",
    description:
      "A beautifully crafted desktop pet that lives on your screen. Stay hydrated, stay focused, never work alone. Join the waitlist.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Companion — Desktop Pet App",
      },
    ],
  },

  // ── Twitter / X ───────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Companion — Your Desktop Pet, Always By Your Side",
    description:
      "A beautifully crafted desktop pet that lives on your screen. Stay hydrated, stay focused, never work alone.",
    images: ["/og-image.png"],
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
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: "/applogo.png",
    shortcut: "/applogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
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
              operatingSystem: "Windows, macOS",
              description:
                "A beautifully crafted desktop pet that lives on your screen. Stay hydrated, stay focused, and never work alone.",
              url: BASE_URL,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/PreOrder",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "5",
                reviewCount: "1",
              },
            }),
          }}
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
