import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Companion for Mac',
  description: 'Companion for Mac is coming soon. Join the waitlist and get an email the day it launches.',
  alternates: { canonical: '/mac' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
