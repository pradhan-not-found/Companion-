import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'One license, every feature. Pay ₹250 once for every companion, focus mode, Compboard, coding agent alerts and lifetime updates.',
  alternates: { canonical: '/pricing' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
