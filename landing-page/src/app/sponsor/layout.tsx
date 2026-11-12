import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sponsor',
  description: 'Sponsor Companion with any amount through UPI and feature your company and logo on our sponsor ring.',
  alternates: { canonical: '/sponsor' }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
