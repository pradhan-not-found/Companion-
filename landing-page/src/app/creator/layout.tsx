import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator',
  description: 'Meet Souradeep Pradhan, the founder and creator of Companion, the desktop pet that keeps you company while you work.',
  alternates: { canonical: '/creator' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
