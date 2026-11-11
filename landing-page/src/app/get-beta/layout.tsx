import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beta access',
  description: 'Enter your invitation code to download the Companion beta.',
  alternates: { canonical: '/get-beta' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
