import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Download Companion free for Windows. Unlock every companion, focus mode, Compboard and coding agent alerts with a one-time ₹250 Pro license.',
  alternates: { canonical: '/pricing' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
